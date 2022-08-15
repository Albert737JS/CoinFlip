const {
    time,
    loadFixture,
    mine
  } = require("@nomicfoundation/hardhat-network-helpers");
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  const { expect } = require("chai");
  const { ethers } = require("hardhat");
  
  describe("Lock", function () {
      async function deployCoinFlipFixture() {
          const [owner, caller, otherAccount] = await ethers.getSigners();
          const CoinFlip = await ethers.getContractFactory("CoinFlip");
          const game = await CoinFlip.deploy();
          const tokenAddress = await game.token();
          const token = await ethers.getContractAt("GameToken", tokenAddress);
          await token.mint(owner.address, 1000000);
      
          return { game, token, owner, caller, otherAccount };
      }
  
      describe("Initialization: ", function() {
          it("Should init with correct args: ", async function () {
              const { game, token, owner, caller, otherAccount } = await loadFixture(deployCoinFlipFixture);
              expect(await game.coeff()).to.equal(ethers.BigNumber.from("195"));
              expect(await game.minDepositAmount()).to.equal(ethers.BigNumber.from("100"));
              const maxDep = 1e18;
              expect(await game.maxDepositAmount()).to.equal(ethers.BigNumber.from(maxDep.toString()));
              expect(await game.token()).to.equal(token.address);
          });
      });
  
      describe("Setter function: ", function() {
          it("Should change coeff: ", async function() {
              const { game, token, owner, caller, otherAccount } = await loadFixture(deployCoinFlipFixture);
              await game.changeCoeff(ethers.BigNumber.from("120"));
              expect(await game.coeff()).to.equal(ethers.BigNumber.from("120"));
          });
  
          it("Should change max/min deposit amount: ", async function() {
              const { game, token, owner, caller, otherAccount } = await loadFixture(deployCoinFlipFixture);
              await game.changeMaxMinBet(200, 2000);
              expect(await game.minDepositAmount()).to.equal(ethers.BigNumber.from("200"));
              expect(await game.maxDepositAmount()).to.equal(ethers.BigNumber.from("2000"));
          });
      });
  
      describe("Setter function requires: ", function() {
          it("Should reverte with message \"CoinFlip: wrong coeff\"", async function() {
              const { game, token, owner, caller, otherAccount } = await loadFixture(deployCoinFlipFixture);
              
              await expect(game.changeCoeff(ethers.BigNumber.from("1"))).to.be.revertedWith("CoinFlip: wrong coeff");
          });
  
          it("Should reverte with message \"\": ", async function() {
              const { game, token, owner, caller, otherAccount } = await loadFixture(deployCoinFlipFixture);
              const min = ethers.BigNumber.from("10000000");
              const max = ethers.BigNumber.from("1");
              await expect(game.changeMaxMinBet(min, max)).to.be.revertedWith("CoinFlip: Wrong dep amount!");
          });
      });
  
      describe("Function play: ", function() {
          it("Should create game win game with correct args: ", async function() {
              const { game, token, caller } = await loadFixture(deployCoinFlipFixture);
              await mine(1);
              
              const choice = ethers.BigNumber.from("1");
              const depAmount = ethers.BigNumber.from("1000");
              const contractMintAmount = ethers.BigNumber.from("10000000000000000000000000000000000");
              const callerMintAmount = ethers.BigNumber.from("1000");
  
              await token.mint(game.address, contractMintAmount);
              await token.mint(caller.address, callerMintAmount);
              await token.connect(caller).approve(game.address, depAmount);
    
              await game.connect(caller).play(depAmount, choice);
  
              const winGame = await game.games(0);
              const prize = 1000 * 195 / 100;
              expect(winGame.player).to.equal(caller.address);
              expect(winGame.depositAmount).to.equal(1000);
              expect(winGame.choice).to.equal(1);
              expect(winGame.result).to.equal(1);
              expect(winGame.prize).to.equal(prize);
              expect(winGame.status).to.equal(1);
  
          });
  
          it("Should create game lose game with correct args: ", async function() {
            const { game, token, caller } = await loadFixture(deployCoinFlipFixture);
            await mine(1);
            
            const choice = ethers.BigNumber.from("0");
            const depAmount = ethers.BigNumber.from("1000");
            const contractMintAmount = ethers.BigNumber.from("10000000000000000000000000000000000");
            const callerMintAmount = ethers.BigNumber.from("1000");
  
            await token.mint(game.address, contractMintAmount);
            await token.mint(caller.address, callerMintAmount);
            await token.connect(caller).approve(game.address, depAmount);
            await game.connect(caller).play(depAmount, choice);
  
            const winGame = await game.games(0);
  
            expect(winGame.player).to.equal(caller.address);
            expect(winGame.depositAmount).to.equal(depAmount);
            expect(winGame.choice).to.equal(0);
            expect(winGame.result).to.equal(1);
            expect(winGame.prize).to.equal(0);
            expect(winGame.status).to.equal(2)
        });
  
        it("Should transfer with correct args on Player Win: ", async function() {
          const { game, token, caller } = await loadFixture(deployCoinFlipFixture);
          await mine(1);
          
          const choice = ethers.BigNumber.from("1");
          const depAmount = ethers.BigNumber.from("1000");
          const contractMintAmount = ethers.BigNumber.from("10000000000000000000000000000000000");
          const callerMintAmount = ethers.BigNumber.from("1000");
  
          await token.mint(game.address, contractMintAmount);
          await token.mint(caller.address, callerMintAmount);
          await token.connect(caller).approve(game.address, depAmount);
  
          const prize = depAmount * 195 / 100;
  
          await expect(() => game.connect(caller).play(depAmount, choice)).to.changeTokenBalances(token, [game, caller], [depAmount - prize, prize - depAmount]);
        });
  
        it("Should transfer with correct args on Player Lose", async function() {
          const { game, token, caller } = await loadFixture(deployCoinFlipFixture);
          await mine(1);
          
          const choice = ethers.BigNumber.from("0");
          const depAmount = ethers.BigNumber.from("1000");
          const contractMintAmount = ethers.BigNumber.from("10000000000000000000000000000000000");
          const callerMintAmount = ethers.BigNumber.from("1000");
  
          await token.mint(game.address, contractMintAmount);
          await token.mint(caller.address, callerMintAmount);
          await token.connect(caller).approve(game.address, depAmount);
  
          await expect(game.connect(caller).play(depAmount, choice)).to.changeTokenBalances(token, [game, caller], [depAmount, 0 - depAmount]);
        });
  
        it("Should fail with correct choice args", async function () {
          const { game, token, caller } = await loadFixture(deployCoinFlipFixture);
          
          const choice = ethers.BigNumber.from("10000");
          const depAmount = ethers.BigNumber.from("1000");
          const contractMintAmount = ethers.BigNumber.from("10000000000000000000000000000000000");
          const callerMintAmount = ethers.BigNumber.from("1000");
  
          await token.mint(game.address, contractMintAmount);
          await token.mint(caller.address, callerMintAmount);
          await token.connect(caller).approve(game.address, depAmount);
    
          await expect(game.connect(caller).play(depAmount, choice)).to.be.revertedWith("CoinFlip: Incorrect choice");
        });
  
        it("Should fail with correct amount args", async function () {
          const { game, token, caller } = await loadFixture(deployCoinFlipFixture);
          
          const choice = ethers.BigNumber.from("0");
          const depAmount = ethers.BigNumber.from("10");
          const contractMintAmount = ethers.BigNumber.from("10000000000000000000000000000000000");
          const callerMintAmount = ethers.BigNumber.from("1000");
  
          await token.mint(game.address, contractMintAmount);
          await token.mint(caller.address, callerMintAmount);
          await token.connect(caller).approve(game.address, depAmount);
    
          await expect(game.connect(caller).play(depAmount, choice)).to.be.revertedWith("CoinFlip: Incorrect deposit amount");
        });
  
        it("Should fail with correct funds args", async function () {
          const { game, token, caller } = await loadFixture(deployCoinFlipFixture);
          
          const choice = ethers.BigNumber.from("0");
          const depAmount = ethers.BigNumber.from("10000");
          const contractMintAmount = ethers.BigNumber.from("10000000000000000000000000000000000");
          const callerMintAmount = ethers.BigNumber.from("1000");
  
          await token.mint(game.address, contractMintAmount);
          await token.mint(caller.address, callerMintAmount);
          await token.connect(caller).approve(game.address, depAmount);
    
          await expect(game.connect(caller).play(depAmount, choice)).to.be.revertedWith("CoinFlip: Not enough funds");
        });
  
        it("Should fail with correct allowance args", async function () {
          const { game, token, caller } = await loadFixture(deployCoinFlipFixture);
          
          const choice = ethers.BigNumber.from("1");
          const depAmount = ethers.BigNumber.from("1000");
          const contractMintAmount = ethers.BigNumber.from("10000000000000000000000000000000000");
          const callerMintAmount = ethers.BigNumber.from("1000");
  
          await token.mint(game.address, contractMintAmount);
          await token.mint(caller.address, callerMintAmount);
          await token.connect(caller).approve(game.address, ethers.BigNumber.from("100"));
    
          await expect(game.connect(caller).play(depAmount, choice)).to.be.revertedWith("CoinFlip: Not enough allowance");
        });
  
        it("Should fail with correct balance args", async function () {
          const { game, token, caller } = await loadFixture(deployCoinFlipFixture);
          
          const choice = ethers.BigNumber.from("0");
          const depAmount = ethers.BigNumber.from("1000");
          const contractMintAmount = ethers.BigNumber.from("100");
          const callerMintAmount = ethers.BigNumber.from("1000");
  
          await token.mint(game.address, contractMintAmount);
          await token.mint(caller.address, callerMintAmount);
          await token.connect(caller).approve(game.address, depAmount);
    
          await expect(game.connect(caller).play(depAmount, choice)).to.be.revertedWith("CoinFlip: Not enough balance");
        });
  
        it("Should emit Play event", async function () {
          const { game, token, caller } = await loadFixture(deployCoinFlipFixture);
          await mine(1);
  
          const choice = ethers.BigNumber.from("1");
          const depAmount = ethers.BigNumber.from("1000");
          const contractMintAmount = ethers.BigNumber.from("10000000000000000000000000000000000");
          const callerMintAmount = ethers.BigNumber.from("1000");
  
          await token.mint(game.address, contractMintAmount);
          await token.mint(caller.address, callerMintAmount);
          await token.connect(caller).approve(game.address, depAmount);
  
          const prize = 1000 * 195 / 100;
    
          await expect(game.connect(caller).play(depAmount, choice)).to.emit(game, "GameFinished").withArgs(
            caller.address, depAmount, 1, 1, prize, 1
            );
        });
      });
  
      describe("Withdraw", function() {
        it("Should create withdraw with correct args", async function() {
            const { game, token, owner } = await loadFixture(deployCoinFlipFixture);
            
            const amount = ethers.BigNumber.from("1000");
            const contractMintAmount = ethers.BigNumber.from("10000000000000000000000000000000000");
            await token.mint(game.address, contractMintAmount);
  
            await expect(game.withdraw(amount)).to.changeTokenBalances(token, [game, owner], [0 - amount, amount]);
  
        });
  
        it("Should fail if not owner", async function () {
          const { game, token, caller } = await loadFixture(deployCoinFlipFixture);
            
          const amount = ethers.BigNumber.from("1000");
          const contractMintAmount = ethers.BigNumber.from("10000000000000000000000000000000000");
          await token.mint(game.address, contractMintAmount);
    
          await expect(game.connect(caller).withdraw(amount)).to.be.revertedWith("Ownable: caller is not the owner");
        });
  
        it("Should fail with correct args", async function () {
          const { game, token, caller } = await loadFixture(deployCoinFlipFixture);
            
          const amount = ethers.BigNumber.from("1000");
          const contractMintAmount = ethers.BigNumber.from("100");
          await token.mint(game.address, contractMintAmount);
    
          await expect(game.withdraw(amount)).to.be.revertedWith("CoinFlip: Not enough funds");
        });
      });
  });