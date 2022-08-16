// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

import "./GameToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CoinFlip is Ownable {

    enum Status { PENDING, WIN, LOSE }

    struct Game {
        address player;
        uint256 depositAmount;
        uint256 choice;
        uint256 result;
        uint256 prize;
        Status status;
    }

    uint256 public totalGamesCount;
    uint256 public minDepositAmount;
    uint256 public maxDepositAmount;
    uint256 public profit;
    uint256 public coeff;
    GameToken public token;

    mapping(uint256 => Game) public games;

    event GameFinished(
        address indexed player, 
        uint256 depAmount, 
        uint256 chocie,
        uint256 result,
        uint256 prize,
        Status indexed status
    );

    constructor() {
        coeff = 195;
        minDepositAmount = 100;
        maxDepositAmount = 1 ether;
        token = new GameToken();
    }

    function changeCoeff(uint256 _coeff) external onlyOwner {
        require(_coeff > 100, "CoinFlip: wrong coeff");
        coeff = _coeff;
    }

    function changeMaxMinBet(uint256 _minDepositAmount, uint256 _maxDepositAmount) external onlyOwner {
        require(_minDepositAmount < _maxDepositAmount, "CoinFlip: Wrong dep amount!");
        maxDepositAmount = _maxDepositAmount;
        minDepositAmount = _minDepositAmount;
    }

    function play(uint256 depAmount, uint256 choice) payable external {
        require(choice == 0 || choice == 1, "CoinFlip: Incorrect choice");
        if(msg.value == 0){
            require(depAmount >= minDepositAmount && depAmount <= maxDepositAmount, "CoinFlip: Incorrect deposit amount");
            require(token.balanceOf(msg.sender) >= depAmount, "CoinFlip: Not enough funds");
            require(token.allowance(msg.sender, address(this)) >= depAmount, "CoinFlip: Not enough allowance");
            token.transferFrom(msg.sender, address(this), depAmount);
            require(token.balanceOf(address(this)) > depAmount * coeff / 100, "CoinFlip: Not enough balance");
        }
        else{
            require(msg.value >= minDepositAmount && msg.value <= maxDepositAmount, "CoinFlip: Wrong deposit amount");
            depAmount = msg.value;
        }

        Game memory game = Game(msg.sender, depAmount, choice, 0, 0,  Status.PENDING);
        uint256 result = block.number % 2;

        if(result == choice) {
            game.result = result;
            game.status = Status.WIN;
            game.prize = depAmount * coeff / 100;
            if(msg.value == 0){
                token.transfer(msg.sender, game.prize);
            }else{
                payable(msg.sender).transfer(game.prize);
            }
            games[totalGamesCount] = game;
            
        } else {
            game.result = result;
            game.status = Status.LOSE;
            game.prize = 0;
            profit += game.depositAmount;
            games[totalGamesCount] = game;
        }
        
        totalGamesCount += 1;

        emit GameFinished(game.player, game.depositAmount, game.choice, game.result, game.prize, game.status);
    }

    function withdraw(uint256 amount) external onlyOwner {
        require(token.balanceOf((address(this))) >= amount, "CoinFlip: Not enough funds");
        token.transfer(msg.sender, amount);
    }
}