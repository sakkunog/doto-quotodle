const gameBoard = document.getElementById('game-board');
const keyBoard = document.getElementById('keyboard');
const questionEl = document.querySelector('#game-question');
const quoteFl = document.querySelector('#game-flavour');

const d = new Date();
const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

let username = "";
let completedQuotes = [];
let savedQuotes = [];
let dailyCombo = 0;
let currentCombo = 0;

let gameState = 0;

let theQuote = {
    number: "0",
    author: "name",
    year: 1337,
    quote: "word",
    answer: "",
    context: ""
};

let currentGuess = 0;
let currentAnswer = "";
let answerGrid = [];
let colourGrid = [];

let listWords = [
    '',
    '',
    'https://raw.githubusercontent.com/mstgnz/words/refs/heads/main/lang/en/length/2_letter_words.txt',
    'https://raw.githubusercontent.com/mstgnz/words/refs/heads/main/lang/en/length/3_letter_words.txt',
    'https://raw.githubusercontent.com/mstgnz/words/refs/heads/main/lang/en/length/4_letter_words.txt',
    'https://raw.githubusercontent.com/mstgnz/words/refs/heads/main/lang/en/length/5_letter_words.txt',
    'https://raw.githubusercontent.com/mstgnz/words/refs/heads/main/lang/en/length/6_letter_words.txt',
    'https://raw.githubusercontent.com/mstgnz/words/refs/heads/main/lang/en/length/7_letter_words.txt',
    'https://raw.githubusercontent.com/mstgnz/words/refs/heads/main/lang/en/length/8_letter_words.txt'
];

let currentWords = ['sakkunmynuts'];

function saveCurrentGrid() {
    const gameData = {
        savedQuote: [currentGuess, theQuote.number, d],
        savedGrid: [
            answerGrid,
            colourGrid,
            keyBoard.innerHTML,
            gameBoard.innerHTML
        ],
        savedUser: [
            username,
            dailyCombo,
            currentCombo
        ],
        completedQuotes: completedQuotes
    };

    localStorage.setItem('gameData', JSON.stringify(gameData));
    console.log("complete saved!");
}

function loadCurrentGrid() {
    const saved = localStorage.getItem('gameData');

    if (!saved) console.log("failed LOAD!");return null;

    const {
        savedQuote,
        savedGrid,
        savedUser,
        completedQuotes: savedCompleted
    } = JSON.parse(saved);

    if (savedGrid) {
        keyBoard.innerHTML = savedGrid[2];
        gameBoard.innerHTML = savedGrid[3];
        console.log("saved GRDIS!");
    }

    return {
        savedQuote: savedQuote
            ? {
                savedGuess: savedQuote[0],
                savedQuote: savedQuote[1],
                savedDate: savedQuote[2]
            }
            : null,
        savedGrid: savedGrid
            ? {
                answerGrid: savedGrid[0],
                colourGrid: savedGrid[1],
                keyBoard: keyBoard,
                gameBoard: gameBoard
            }
            : null,
        savedUser: savedUser
            ? {
                username: savedUser[0],
                savedDaily: savedUser[1],
                savedCombo: savedUser[2]
            }
            : null,
        completedQuotes: savedCompleted || []
    };
}

async function getQuotelist() {
    try {
        const url = await fetch("https://docs.google.com/spreadsheets/d/1pWXDY6PTEJTpWq10yV4XQdiR-ZE6lyyzfcynk7Owt-0/export?format=tsv&gid=1876830211");

        if (!url.ok) {
            throw new Error();
        }

        const text = await url.text();

        const rows = text
            .trim()
            .split(/\r?\n/)
            .map(row => row.split('\t'));

        return rows.slice(1);
    } catch {
        try {
            const url = await fetch('quotes.tsv');

            if (!url.ok) {
                throw new Error();
            }

            const text = await url.text();

            const rows = text
                .trim()
                .split(/\r?\n/)
                .map(row => row.split('\t'));

            return rows.slice(1);
        } catch {
            return [];
        }
    }
}

function getQuote(aNumber) {
    let setIndex;

    if (!savedQuotes.length) {
        return {
            number: "0",
            author: "Unknown",
            year: "",
            quote: "No quotes available",
            answer: "",
            context: ""
        };
    }

    if (aNumber) {
        const number = aNumber.toString();

        if (savedQuotes.some(row => row[0] === number)) {
            setIndex = savedQuotes.findIndex(row => row[0] === number);
        } else {
            let hash = 0;

            for (let i = 0; i < today.length; i++) {
                hash = today.charCodeAt(i) + ((hash << 5) - hash);
            }

            setIndex = Math.abs(hash) % savedQuotes.length;
        }
    } else {
        setIndex = Math.floor(Math.random() * savedQuotes.length);
    }

    const [quoteNumber, author, year, quote, currentAnswer, flavour] = savedQuotes[setIndex];

    return {
        number: quoteNumber,
        author: author,
        year: year,
        quote: quote,
        answer: currentAnswer.trim(),
        context: flavour
    };
}

async function getWordlist(word) {
    const url = listWords[word.length];

    if (url) {
        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error();
            }

            const text = await response.text();

            currentWords = text
                .toUpperCase()
                .split(/\r?\n/)
                .map(w => w.trim())
                .filter(w => w.length > 0);
        } catch {
            currentWords = [word.toUpperCase()];
        }
    } else {
        currentWords = [word.toUpperCase()];
    }
}

function createBoard(word, rows) {
    gameBoard.innerHTML = '';
    answerGrid = [];
    colourGrid = [];

    for (let i = 0; i < rows; i++) {
        let colourRow = [];
        let rowArray = [];
        let row = document.createElement('div');

        row.classList.add('grid-row');
        row.style.gridTemplateColumns = `repeat(${word.length}, 1fr)`;

        for (let char of word) {
            let colourBlock = "";
            let block = document.createElement('span');

            if (char !== ' ') {
                block.classList.add('letter-box');
                rowArray.push(block);
            } else {
                block.classList.add('air');
            }

            row.append(block);
            colourRow.push(colourBlock);
        }

        gameBoard.append(row);
        answerGrid.push(rowArray);
        colourGrid.push(colourRow);
    }
}

function createGame(theQuote) {
    const formattedQuote = theQuote.quote.replaceAll(
        '$$ITEM$$',
        '_'.repeat(theQuote.answer.length) + "<sub>" + theQuote.answer.length + "</sub>"
    );

    const finalQuestionText = `Quote #${'-'.repeat(theQuote.number.length)} <br> ${formattedQuote} <br><br> - ${theQuote.author}, ${theQuote.year}`;

    const formattedFlavour = theQuote.context.replaceAll(
        '$$ITEM$$',
        '_'.repeat(theQuote.answer.length)
    );

    if (questionEl) questionEl.innerHTML = finalQuestionText;
    if (quoteFl) quoteFl.innerHTML = formattedFlavour;
}

function createKeyboard(keyBoard) {
    const keys = [
        ['Q','W','E','R','T','Y','U','I','O','P'],
        ['A','S','D','F','G','H','J','K','L'],
        ['Enter','Z','X','C','V','B','N','M','Backspace']
    ];

    keyBoard.innerHTML = '';

    for (let k = 0; k < keys.length; k++) {
        let row = document.createElement('div');

        row.style.display = 'grid';
        row.style.gridTemplateColumns = `repeat(${keys[k].length}, auto)`;

        for (let i = 0; i < keys[k].length; i++) {
            let button = document.createElement('button');

            button.classList.add('key-button');
            button.textContent = keys[k][i];

            row.append(button);
        }

        keyBoard.append(row);
    }
}

document.addEventListener('keydown', event => {
    if (gameState == 1) {
        keyPress(event.key);
    }
});

document.addEventListener('click', event => {
    if (event.target.classList.contains('key-button')) {
        keyPress(event.target.textContent);
    }
});

function keyPress(key) {
    if (gameState != 1) return;

    const cleanAnswer = theQuote.answer.replace(/\s+/g, '').toUpperCase();

    if (key == "Enter" && cleanAnswer.length == currentAnswer.length) {
        if (currentWords.includes(currentAnswer) || cleanAnswer == currentAnswer) {
            const thisGuess = currentGuess;
            let letters = cleanAnswer.split('');

            for (let i = 0; i < currentAnswer.length; i++) {
                if (currentAnswer[i] === cleanAnswer[i]) {
                    colourGrid[thisGuess][i] = "MediumSeaGreen";
                    letters.splice(letters.indexOf(currentAnswer[i]), 1);
                }
            }

            for (let i = 0; i < currentAnswer.length; i++) {
                if (colourGrid[thisGuess][i] === "MediumSeaGreen") continue;

                const char = currentAnswer[i];

                if (letters.includes(char)) {
                    colourGrid[thisGuess][i] = "Orange";
                    letters.splice(letters.indexOf(char), 1);
                } else {
                    colourGrid[thisGuess][i] = "DimGray";

                    const keyBtn = Array.from(
                        keyBoard.querySelectorAll('.key-button')
                    ).find(b => b.textContent === char);

                    if (keyBtn) {
                        keyBtn.style.backgroundColor = "DimGray";
                    }
                }
            }

            for (let i = 0; i < currentAnswer.length; i++) {
                const tile = answerGrid[thisGuess][i];

                tile.style.backgroundColor = "";
                tile.style.animationDelay = `${i * 0.2}s`;
                tile.classList.remove('tile-flip');

                void tile.offsetWidth;

                tile.classList.add('tile-flip');

                setTimeout(() => {
                    tile.style.backgroundColor = colourGrid[thisGuess][i];
                }, (i * 200) + 300);
            }

            if (currentAnswer !== cleanAnswer) {
                currentAnswer = '';
            } else {
                const tile = answerGrid[thisGuess][0];

                setTimeout(() => {
                    tile.parentElement.classList.remove('enlarge-row');
                    void tile.parentElement.offsetWidth;
                    tile.parentElement.classList.add('enlarge-row');

                    gameState = 2;

                    const afterQuote = questionEl.innerHTML
                        .replaceAll(
                            /(_+)\d*(?:<sub>\d+<\/sub>)?/g,
                            (match, underscores) => {
                                return underscores.length > 3
                                    ? "<u>" + theQuote.answer + "</u>"
                                    : match;
                            }
                        )
                        .replace(/#(-+)/g, "#" + theQuote.number);

                    const afterFlavour = quoteFl.textContent.replaceAll(
                        /(_+)/g,
                        (match, underscores) => {
                            return underscores.length > 3
                                ? "<u>" + theQuote.answer + "</u>"
                                : match;
                        }
                    );

                    if (questionEl) questionEl.innerHTML = afterQuote;
                    if (quoteFl) quoteFl.innerHTML = afterFlavour;
                }, ((currentAnswer.length - 1) * 200) + 600);

                completedQuotes.push(theQuote.number);
                gameState = 2;
            }
            currentGuess += 1;
            saveCurrentGrid();
        } else {
            answerGrid[currentGuess][0].parentElement.classList.remove('shake-row');
            void answerGrid[currentGuess][0].parentElement.offsetWidth;
            answerGrid[currentGuess][0].parentElement.classList.add('shake-row');
        }
    } else if (key == "Backspace" && currentAnswer.length > 0) {
        answerGrid[currentGuess][currentAnswer.length - 1].classList.remove('filled');
        answerGrid[currentGuess][currentAnswer.length - 1].textContent = "";
        currentAnswer = currentAnswer.slice(0, -1);
    } else if (/^[a-zA-Z]$/.test(key) && currentAnswer.length < cleanAnswer.length) {
        answerGrid[currentGuess][currentAnswer.length].classList.add('filled');
        answerGrid[currentGuess][currentAnswer.length].textContent = key.toUpperCase();
        answerGrid[currentGuess][currentAnswer.length].classList.remove('enlarge-row');

        void answerGrid[currentGuess][currentAnswer.length].offsetWidth;

        answerGrid[currentGuess][currentAnswer.length].style.setProperty('--duration', '0.05s');
        answerGrid[currentGuess][currentAnswer.length].classList.add('enlarge-row');

        currentAnswer += key.toUpperCase();
    }
}

async function generateGame(gameType) {
    if (gameState == 0) {
        const currentQuote = loadCurrentGrid();
        console.log(currentQuote);
        if (
            currentQuote &&
            currentQuote.savedQuote &&
            currentQuote.savedGrid &&
            currentQuote.savedQuote.savedDate === d
        ) {
            console.log("success load");
            currentGuess = currentQuote.savedQuote.savedGuess;
            theQuote = getQuote(currentQuote.savedQuote.savedQuote);

            createGame(theQuote);
            await getWordlist(theQuote.answer);

            gameBoard.innerHTML = currentQuote.savedGrid.gameBoard.innerHTML;
            keyBoard.innerHTML = currentQuote.savedGrid.keyBoard.innerHTML;

            answerGrid = currentQuote.savedGrid.answerGrid;
            colourGrid = currentQuote.savedGrid.colourGrid;

            gameState = 1;
        } else {
            console.log("fail log");
            theQuote = getQuote(gameType);

            createGame(theQuote);
            await getWordlist(theQuote.answer);

            createBoard(theQuote.answer, 6);
            createKeyboard(keyBoard);

            gameState = 1;
        }
    } else if (gameState == 2) {
        theQuote = getQuote(gameType);

        createGame(theQuote);
        await getWordlist(theQuote.answer);

        createBoard(theQuote.answer, 6);
        createKeyboard(keyBoard);

        currentGuess = 0;
        currentAnswer = "";

        gameState = 1;
    }
}

async function init() {
    savedQuotes = await getQuotelist();
    await generateGame(1);
}


console.log(localStorage.getItem("test"));

init();
