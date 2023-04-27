/* ---------------------------------------------------------------------------
                                Knucklebones
----------------------------------------------------------------------------*/
document.addEventListener('DOMContentLoaded', (e) => {
    //Dom Content Loaded

    // -------- Dom Element Variables --------
    const nav = document.querySelector('nav');
    const menu = document.querySelector('.nav-menu')
    const chars = ['The Lamb', 'Ratau'];
    const diceTrays = document.querySelectorAll('.dice-tray');
    const columnEls = document.querySelectorAll('.column');
    const boardContainerEls = document.querySelectorAll('.board-container');
    const cellEls = document.querySelectorAll('.cell');
    const playerEls = document.querySelectorAll('player');
    const scoreCellsCol = document.querySelectorAll('.col-score');
    const scoreCellsPlayer = document.querySelectorAll('.player-score');

    const playerName = document.querySelectorAll('.name');
    const bgGame = document.querySelector('.bg.game');
    const playerImgTop = document.getElementById('profile-img-top');
    const playerImgBottom = document.getElementById('profile-img-top');


    // ---------------- Constants ----------------
    let turn = 0; //0 or 1
    let turnNo = 0;
    let diceRoll = null;
    let colObjClicked = null;

    // ---------------- Events ----------------
    const eventNextTurn = new Event("nextTurn");
    const eventWin = new Event("win");
    const eventReset = new Event("reset");

    const initOptions = {
        singleplayer: true,
        playerName: '',
        playerChar: ''
    }

    const player1 = {
        name: '',
        score: 0,
        char:
        {
            charName: '',
            charGifPath: {
                idle: '',
                "lose-dice": '',
                "lose-game": '',
                "lose-game-loop": '',
                "play-dice": '',
                "take-dice": '',
                "win-game": '',
                "win-game-loop": ''
            }
        },
        renderChar(str) {
            //Check which character player selected (str) using chars[]
            chars.forEach(char => {
                if (str === char) {
                    this.setCharVariables(str);
                }
            });
        },
        setCharVariables(str) {
            this.char.charName = str;
            for (property in this.char.charGifPath) {
                let gifPath = `assets/gifs/${str}/${str}-knucklebones-${property}.gif`;
                this.char.charGifPath[property] = gifPath;
            }
        }
    }

    // -------- Event Listeners --------
    nav.addEventListener('click', e => {
        menu.classList.toggle('menu-open');
        menu.classList.toggle('nav-menu');

    });

    //If we are on menu screen
    if (window.location.href.includes('menu')) {
        const btnPlayGame = document.getElementById('play-game');
        btnPlayGame.addEventListener('click', handlePlayGameClick);
    }

    // -------- GSAP --------
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    gsap.registerPlugin(Flip);

    tl.from(".bg.game", {
        opacity: 0,
        y: 100,
        duration: 1
    });

    // -------- Functions --------
    function handlePlayGameClick() {
        window.location.href = window.location.href.replace('menu', 'index');
    }

    class Board {
        constructor() {
            this.columns = [null, null, null, null, null, null];
            this.playerScore = [0, 0];
            this.topBoardCont = boardContainerEls[0];
            this.botBoardCont = boardContainerEls[1];

            //initialize six columns
            for (let i = 0; i < 6; i++) {
                this.columns[i] = new Column(i);
                this.boardArray = this.columns[i].values
                this.columns[i].board = this;
            }
            //assign each column the value of the column opposite it in oppCo property
            this.assignOppCols();
        }

        assignOppCols() {
            for (let i = 0; i < 6; i++) {
                let j = null;

                //index of opposing column is yourself+3 if you're 0,1,2 indices, or yourself-3 if you're indices 3,4,5
                if (i < 3) {
                    j = i + 3;
                }
                else {
                    j = i - 3;
                }
                this.columns[i].oppCol = this.columns[j];
            }
        }

        setPlayerScore(boardNo) {

            let start = boardNo * 3;
            this.playerScore[boardNo] = 0;

            for (let i = start; i < start + 3; i++) {
                this.playerScore[boardNo] += this.columns[i].colScore;
            }
            //render results
            scoreCellsPlayer[boardNo].textContent = this.playerScore[boardNo];
        }

        checkWin() {
            //this function is called after a player makes a move, but before the turn value switches to start a next player's turn
            let currTurn = turn;
            let start = currTurn * 3;

            //check if any spaces are empty in the columns of the person who just finished their turn
            for (let i = start; i < start + 3; i++) {
                if (this.columns[i].values.includes(0)) {
                    return false;
                }
            }
            return true;
        }
    }
    class Column {
        constructor(num) {
            this.colNo = num;
            this.colScore = 0;
            this.oppCol = null;
            this.cellElements = [null, null, null];
            this.colElement = columnEls[num];
            this.scoreElement = scoreCellsCol[num];
            this.board = null;

            if (num < 3) {
                let j = 0;
                for (let i = 2; i > -1; i--) {
                    this.cellElements[j] = cellEls[i + (3 * num)];
                    j++;
                }
            }
            else {
                for (let i = 0; i < 3; i++) {
                    this.cellElements[i] = cellEls[i + (3 * num)];
                }
            }

            //values of dice in column
            this.values = [0, 0, 0];

            //where to place the next dice in values
            //we know you're in board 0 if your colNo is 0-2, and 1 if it's 3-5
            if (num < 3) {
                this.boardNo = 0;
            }
            else {
                this.boardNo = 1;
            }
        }

        //smashes dice in opposing column based on parameter, the dice to be smashed
        smashDice(diceToSmash) {
            //called on: column clicked
            //traversing array of values of opposing column, where dice will be smashed
            for (let i = 0; i < this.values.length; i++) {
                if (this.values[i] === diceToSmash.value) {
                    //remove dice HTML element
                    this.cellElements[i].removeChild(this.cellElements[i].lastChild);
                    //set the column value
                    this.values[i] = 0;
                    //remove "glow" class if it exists from dice-bg element in the cell
                    this.renderRemoveGlow(i);
                }
            }
            this.shiftDice();
            //i'm no longer full, so remove no-click if it exists
            this.colElement.classList.remove('no-click')
        }

        checkSmash() {
            let smash = false;
            this.values.forEach(value => {
                if (this.oppCol.values.includes(value) && value != 0) {
                    smash = true;
                }
            })
            return smash;
        }

        //calculates the score inside itself, adds render effects for multiplied dice
        setScore() {
            //set clicked col score
            this.colScore = 0;
            //for loop to add up score in values array of col obj
            for (let i = 0; i < this.values.length; i++) {
                //multiply dice
                for (let j = i + 1; j < this.values.length; j++) {
                    if (this.values[i] === this.values[j] && this.values[i] !== 0) {
                        this.colScore += this.values[i] * 2;
                        this.renderGlow(i, j);
                    }
                }
                this.colScore += this.values[i];
            }
            this.scoreElement.innerText = this.colScore;
            this.board.setPlayerScore(this.boardNo);
        }

        renderGlow(...indices) {
            indices.forEach(idx => {
                this.cellElements[idx].classList.add('glow');
            });
        }

        renderRemoveGlow(...indices) {
            indices.forEach(idx => {
                this.cellElements[idx].classList.remove('glow');
            });
        }

        shiftDice() {
            for (let i = 0; i < this.values.length; i++) {
                if (this.values[i] === 0) {
                    for (let j = i + 1; j < this.values.length; j++) {
                        if (this.values[j] != 0) {
                            this.values[i] = this.values[j];
                            this.values[j] = 0;

                            let dice = this.cellElements[j].lastElementChild;

                            this.renderAppendDice(dice, i);
                            // this.cellElements[i].append(dice);

                            //move classes with dice. The .value method is used to avoid pointing to the live classList object,
                            //so the classes variable instead holds a static string copy of the classList
                            let classes = this.cellElements[i].classList.value;
                            this.cellElements[i].className = this.cellElements[j].classList.value;
                            this.cellElements[j].className = classes;
                            break;
                        }
                    }
                }
            }
        }

        appendDice(dice) {
            let idx = this.values.indexOf(0);

            this.values[idx] = dice.value;
            this.renderAppendDice(dice, idx);

            //if i'm full, add no-click class
            if (this.values.indexOf(0) === -1) {
                this.colElement.classList.add('no-click');
            }
        }

        renderAppendDice(dice, idx) {
            //using GSAP to animate while appending
            const state = Flip.getState(dice.element);

            this.cellElements[idx].append(dice.element);

            Flip.from(state, {
                duration: 1,
                ease: "power4.inOut"
            });
        }
    }

    class Dice {
        constructor(num) {
            this.element = document.createElement('img');
            this.value = num;
            this.element.src = `assets/images/dice/dice-0${num}.svg`;
            this.element.classList = "dice";
            this[data - flip - id] = "dice";
        }
    }
    class DiceRoll {
        constructor(num) {
            this.element = document.createElement('img');
            this.value = num;
            this.element.src = `assets/images/dice/dice-0${num}.svg`;
            this.element.classList = "dice";
            this.element.id = "dice-roll";
        }
    }
    class KnucklebonesGame {
        constructor(numPlayers) {
            this.winner = null;
            this.player1 = null;
            this.player2 = null;
            turnNo = 0;

            this.board = new Board();
            boardContainerEls[0].addEventListener('click', this.handlePlayerMove.bind(this), false);
            boardContainerEls[1].addEventListener('click', this.handlePlayerMove.bind(this), false);
        }

        resetGame() {
            let deleteBoard = this.board;
            this.board = new Board();
            // delete deleteBoard;
        }

        rollDice() {
            // it++;
            // if (it >= mydice.length) {
            return Math.floor((Math.random() * 5) + 1);
            // }
            // return mydice[it];
        }

        playTurn() {
            let roll = this.rollDice();
            diceRoll = new DiceRoll(roll);

            this.renderAppendDiceRoll(diceRoll);
        }

        renderAppendDiceRoll(diceRoll) {
            diceTrays[turn].append(diceRoll.element);
            boardContainerEls[turn].classList.toggle('no-click');
        }

        handlePlayerMove(e) {
            if (!e.target.className.includes('column')) {
                return;
            }
            let idx = e.target.id;

            colObjClicked = this.board.columns[idx];
            //append the dice to the cell in the column using method
            colObjClicked.appendDice(diceRoll);
            //multiply dice and set score
            colObjClicked.setScore();

            //check if opposing dice can be smashed
            if (colObjClicked.oppCol.checkSmash()) {
                //if so, call smashDice
                colObjClicked.oppCol.smashDice(diceRoll);

                //multiply dice and set score
                colObjClicked.oppCol.setScore();
            }

            boardContainerEls[turn].classList.toggle('no-click');

            //check if someone has won
            if (turnNo >= 16) {
                if (this.board.checkWin()) {
                    document.dispatchEvent(eventWin);
                    return;
                }
            }
            //if no win, next turn
            this.nextTurn();
        }

        nextTurn() {
            //increments turn variables and toggles the visual effects
            this.renderPlayerBG();
            (turn === 0) ? (turn = 1) : (turn = 0)
            turnNo++;
            document.dispatchEvent(eventNextTurn);
        }

        renderPlayerBG() {
            playerEls.forEach(el => {
                el.classList.toggle('player-active');
            });
        }

        win() {
            //display the win message
            let winMsg = '', winScore, loseScore;

            if (this.board.playerScore[0] > this.board.playerScore[1]) {
                winMsg = `${player1.name} Wins!`;
                winScore = this.board.playerScore[0];
                loseScore = this.board.playerScore[1];
            }
            else if (this.board.playerScore[0] === this.board.playerScore[1]) {
                winMsg = "It's a Tie!";
                winScore = this.board.playerScore[0];
                loseScore = this.board.playerScore[1];
            }
            else {
                winMsg = `Ratau Wins!`;
                winScore = this.board.playerScore[1];
                loseScore = this.board.playerScore[0];
            }
            this.renderWin(winMsg, winScore, loseScore);
        }

        renderWin(winMsg, winScore, loseScore) {
            //toggle HTML classes
            document.querySelector('.win-container').classList.remove('hidden');
            document.getElementById('win-msg').innerText = winMsg;
            document.getElementById('p1-score').innerText = winScore;
            document.getElementById('p2-score').innerText = loseScore;
            document.querySelector('.play-again').addEventListener("click", (e) => {
                document.dispatchEvent('reset');
            });
        }
    }

    function init() {
        //render player char and name
        player1.renderChar('Lamb');
        player1.name = 'The Lamb';

        //if player chose singleplayer game
        if (initOptions.singleplayer) {
            const game = new KnucklebonesGame(1);

            game.playTurn();

            document.addEventListener("nextTurn", (e) => {
                game.playTurn();
            });
            document.addEventListener("win", (e) => {
                game.win();
            });
        }
    }

    init();

});