/* ---------------------------------------------------------------------------
                                Knucklebones
----------------------------------------------------------------------------*/
document.addEventListener('DOMContentLoaded', (e) => {
    //Dom Content Loaded

    // -------- Dom Element Variables --------
    const playerImgTop = document.getElementById('profile-img-top');
    const playerImgBottom = document.getElementById('profile-img-top');
    const nav = document.querySelector('nav');
    const menu = document.querySelector('.nav-menu')
    const bgGame = document.querySelector('.bg.game');
    const chars = ['The Lamb', 'Ratau'];
    const playerName = document.querySelectorAll('.name');
    const diceTrays = document.querySelectorAll('.dice-tray');
    const columnEls = document.querySelectorAll('.column');
    const boardContainerEls = document.querySelectorAll('.board-container');
    const cellEls = document.querySelectorAll('.cell');
    const playerEls = document.querySelectorAll('player');
    const scoreCellsCol = document.querySelectorAll('.col-score');
    const scoreCellsPlayer = document.querySelectorAll('.player-score');

    // ---------------- Constants ----------------
    let diceArray = [];
    let turn = 0; //0 or 1
    let turnNo = 1;
    let diceRoll = null;
    let columnObjClicked = null;
 
    // ---------------- Events ----------------
    const event = new Event("nextTurn");
    const eventWin = new Event("win");
    const eventReset = new Event("reset");

    // DELETE ME AFTER YOU'RE DONE TESTING
    let mydice = [5, 2, 5, 2, 5, 5, 5, 5];
    let it = -1;

    let gameBoardArray = [
        [
            [0, 0, 0], //col 1
            [0, 0, 0], //col 2
            [0, 0, 0], //col 3
        ],
        [
            [0, 0, 0], //col 1
            [0, 0, 0], //col 2
            [0, 0, 0], //col 3
        ]
    ];

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
            for (char of chars) {
                if (str === char) {
                    this.setCharVariables(str);
                }
            }
        },
        setCharVariables(str) {
            this.char.charName = str;
            for (property in this.char.charGifPath) {
                let gifPath = `../assets/gifs/${str}/${str}-knucklebones-${property}.gif`;
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

            console.log("boardArr", this.boardArray);
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

        setPlayerScore(opp) {
            let currTurn;
            //if opp is true, add up opp board's score
            if (opp) {
                (turn === 0) ? (currTurn = 1) : (currTurn = 0)
            }
            else {
                currTurn = turn;
            }

            let start = currTurn * 3;
            this.playerScore[currTurn] = 0;

            for (let i = start; i < start + 3; i++) {
                this.playerScore[currTurn] += this.columns[i].colScore;
            }
            //render results
            scoreCellsPlayer[currTurn].textContent = this.playerScore[currTurn];
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

            for (let i = 0; i < 3; i++) {
                this.cellElements[i] = cellEls[i + (3 * num)];
            }

            //values of dice in column
            this.values = [0, 0, 0];

            //where to place the next dice in values
            this.openCellIdx = 0;

            //we know you're in board 0 if your colNo is 0-2, and 1 if it's 3-5
            if (num < 3) {
                this.boardNo = 0;
                this.openCellIdx = this.values.length - 1;
            }
            else {
                this.boardNo = 1;
                this.openCellIdx = 0;
            }
        }

        //smashes dice in opposing column based on parameter, the dice to be smashed
        smashDice(diceToSmash) {
            //called on: column clicked
            let smashIndices = [];

            //traversing array of values of opposing column, where dice will be smashed
            for (let i = 0; i < this.oppCol.values.length; i++) {
                //if the value of the dice to be smashed is equal to the value at opp col's array
                if (this.oppCol.values[i] === diceToSmash.value) {
                    smashIndices.push(i);
                    this.oppCol.cellElements[i].removeChild(this.oppCol.cellElements[i].lastChild);
                    this.renderGlow(false, i);
                    this.oppCol.values[i] = 0;
                    if(turn === 0 && this.oppCol.openCellIdx != 0 ) {
                        this.oppCol.openCellIdx--;
                    } 
                    else if(turn === 1 && this.oppCol.openCellIdx != 2){
                        this.oppCol.openCellIdx++;
                    }
                }
            }
            console.log("smash", smashIndices, "\noppcolValues", this.oppCol.values, "this.OpenCellIdx", this.openCellIdx, "\nopp.OpenCellIdx", this.oppCol.openCellIdx);
            if (smashIndices.length > 0) {
                this.oppCol.colElement.classList.remove('no-click');
                this.oppCol.shiftDice()
                return true;
            } 
        }

        checkSmash(){
            this.values.forEach(value => {
                if(this.oppCol.values.contains(value))
                    return true;
            });
            return false;
        }

        //calculates the score inside itself, adds render effects for multiplied dice
        setColScore() {
            //set clicked col score
            this.colScore = 0;
            //for loop to add up score in values array of col obj
            for (let i = 0; i < this.values.length; i++) {
                //multiply dice
                for (let j = i + 1; j < this.values.length; j++) {
                    if (this.values[i] === this.values[j] && this.values[i] !== 0) {
                        this.colScore += this.values[i] * 2;
                        this.renderGlow(true, i, j);
                    }
                }
                this.colScore += this.values[i];
            }

            this.scoreElement.innerText = this.colScore;
            this.board.setPlayerScore(false);
        }

        renderGlow(target, ...indices) {
            console.log("indices", indices);
            //if target is true, toggle glow on own cell elements
            //if target is false, toggle glow on opp col's cell elements
            if (target) {
                indices.forEach(idx => {
                    this.cellElements[idx].classList.add('glow');
                });
            }
            else {
                indices.forEach(idx => {
                    this.oppCol.cellElements[idx].classList.remove('glow');

                });
            }
        }

        shiftDice() {
            console.log("--- SHIFT ---");
            if (this.boardNo === 0) {
                for (let i = 2; i > 0; i--) {
                    if (this.values[i] === 0) {
                        for (let j = i - 1; j >= 0; j--) {
                            if (this.values[j] != 0) {
                                this.values[i] = this.values[j];
                                this.values[j] = 0;

                                let dice = this.cellElements[j].lastElementChild;

                                this.cellElements[i].append(dice);
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
            else {
                for (let i = 0; i < this.values.length; i++) {
                    if (this.values[i] === 0) {
                        for (let j = i + 1; j < this.values.length; j++) {
                            if (this.values[j] != 0) {
                                this.values[i] = this.values[j];
                                this.values[j] = 0;

                                let dice = this.cellElements[j].lastElementChild;

                                this.cellElements[i].append(dice);
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
        }

        appendDice(dice) {
            let colNum = 0;

            // console.log("dice",dice.element);

            this.cellElements[this.openCellIdx].append(dice.element);
            this.values[this.openCellIdx] = dice.value;
            console.log("pre-inc openCellIdx", this.openCellIdx);
            console.log("turn", turn, "\nthis.colNo", this.colNo, "\nthis.colNum", colNum, "\nthis.openCellIdx", this.openCellIdx);
            if (turn === 1) {
                colNum = this.colNo - 3;
            }
            gameBoardArray[turn][colNum][this.openCellIdx] = dice.value;
            console.log(gameBoardArray[turn]);

            if (this.boardNo === 0 && 0 <= this.openCellIdx <= 2) {

                if (this.openCellIdx === 0) {
                    this.full = true;
                    this.colElement.classList.add('no-click')
                }
                else {
                    this.full = false;
                }
                this.openCellIdx--;
            }
            else if (this.boardNo === 1 && 0 < this.openCellIdx <= 2) {
                if (this.openCellIdx === 2) {
                    this.full = true;
                    this.colElement.classList.add('no-click')
                }
                else {
                    this.full = false;
                }
                this.openCellIdx++;
            }

            if (this.openCellIdx > 2)
                this.openCellIdx = 2;
            else if (this.openCellIdx < 0)
                this.openCellIdx = 0;

            console.log("inc-ed openCellIdx", this.openCellIdx);
        }
    }

    class Dice {
        constructor(num) {
            this.element = document.createElement('img');
            this.value = num;
            this.element.src = `../assets/images/dice/dice-0${num}.svg`;
            this.element.classList = "dice";
        }
    }
    class DiceRoll {
        constructor(num) {
            this.element = document.createElement('img');
            this.value = num;
            this.element.src = `../assets/images/dice/dice-0${num}.svg`;
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
            boardContainerEls[0].addEventListener('click', this.handleColumnClick.bind(this), false);
            boardContainerEls[1].addEventListener('click', this.handleColumnClick.bind(this), false);
        }

        rollDice() {
            // it++;
            // if (it >= mydice.length) {
                return Math.floor((Math.random() * 5) + 1);
            // }
            return mydice[it];
        }

        playTurn() {
            console.log("-------------------- NEW TURN --------------------")
            console.log("Board Cols at start of turn", this.board.columns[1]);

            let roll = this.rollDice();
            console.log("roll", roll, "\nturnNo", turnNo);
            diceRoll = new DiceRoll(roll);

            diceArray.push(diceRoll);

            diceTrays[turn].append(diceRoll.element);
            boardContainerEls[turn].classList.toggle('no-click');
        }

        handleColumnClick(e) {
            let idx = e.target.id;

            // console.log("Player click!", "\nidx", idx, "\ne.target", e.target, "\nBoard", this.board);

            columnObjClicked = this.board.columns[idx];

            console.log("Board Cols", this.board.columns[idx]);

            // console.log("colobj",columnObjClicked);
            // columnObjClicked.cellElements

            //append the dice to the cell in the column using method

            columnObjClicked.appendDice(diceRoll);
            let smashOccurred = columnObjClicked.smashDice(diceRoll);
            columnObjClicked.setColScore();
            //if smash occurred, also set opposing column's score
            if (smashOccurred) {
                columnObjClicked.oppCol.setColScore();
            }

            // console.log("idx",idx,"typeofopenidx",typeof(openCellIndexOfCol), "colObjClicked",columnObjClicked);

            boardContainerEls[turn].classList.toggle('no-click');

            //checkWin
            if (turnNo >= 18) {
                console.log('\n------------- Win --------------')
                if (this.board.checkWin()) {
                    document.dispatchEvent(eventWin);
                    return;
                }
            }

            console.log("open cell index before next turn",columnObjClicked.openCellIdx)
            this.nextTurn();
            document.dispatchEvent(event);
        }

        nextTurn() {

            playerEls[turn].classList.toggle('player-active');
            (turn === 0) ? (turn = 1) : (turn = 0)
            playerEls[turn].classList.toggle('player-active');

            turnNo++;
        }

        win() {
            //display the win message
            let winner = (turn === 0) ? ('Ratau') : (player1.name);
            let winMsg = `${winner} Wins!`;

            this.renderWin(winMsg);

        }
        renderWin(winMsg) {
            //toggle HTML classes

            let p1score = this.board.playerScore[0];
            let p2score = this.board.playerScore[1];
            const winContainer = document.querySelector('.win-container').classList.remove('hidden');
            document.getElementById('win-msg').innerText = winMsg;
            document.getElementById('p1-score').innerText = p1score;
            document.getElementById('p2-score').innerText = p2score;
            document.querySelector('.play-again').addEventListener(click, (e) => {
                document.dispatchEvent('reset');
            });
        }
    }

    function init() {
        //render player char and name

        player1.renderChar('The Lamb');
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


            function resetGame() {
                game.board.columns.forEach(col => {
                    delete this;
                })
                delete game.board;
                delete game;

                init();
            }
        }

        else {
            // runMultiPlayerGame();
        }
    }

    init();

   
});