"use strict";

let memoryCountries = [];
let memoryCards = [];

let memoryFirstCard = null;
let memorySecondCard = null;

let memoryBoardLocked = false;
let memoryMovesCount = 0;
let memoryMatchedCount = 0;
let memorySecondsRemaining = 50;
let memoryCurrentPoints = 0;

let memoryTimerIdentifier = null;
let memoryGameFinished = false;

function initializeMemoryGamePage() {
    let replayButton =
        document.getElementById(
            "memoryReplayButton"
        );

    if (replayButton) {
        replayButton.addEventListener(
            "click",
            startNewMemoryGame
        );
    }

    startNewMemoryGame();
}

function startNewMemoryGame() {
    stopMemoryTimer();

    memoryCountries = [];
    memoryCards = [];
    memoryFirstCard = null;
    memorySecondCard = null;
    memoryBoardLocked = false;
    memoryMovesCount = 0;
    memoryMatchedCount = 0;
    memorySecondsRemaining = 50;
    memoryCurrentPoints = 0;
    memoryGameFinished = false;

    document.getElementById("memoryResultOverlay").hidden = true;
    document.body.classList.remove("memory-result-open");

    document.getElementById(
        "memoryBoard"
    ).hidden = false;

    clearElementChildren(
        document.getElementById("memoryBoard")
    );

    updateMemoryStats();

    displayLoadingMessage(
        document.getElementById(
            "memoryGameStatus"
        ),
        "Loading countries for the game..."
    );

    ajaxCall(
        "GET",
        SERVER_API_BASE_URL +
        "/Countries/memory-game",
        null,
        function (countries) {
            memoryCountries =
                normalizeCountriesFromServer(countries);

            if (memoryCountries.length === 0) {
                displayErrorMessage(
                    document.getElementById(
                        "memoryGameStatus"
                    ),
                    "No countries were returned for the game."
                );

                return;
            }

            buildMemoryCards();
            renderMemoryBoard();

            clearStatusMessage(
                document.getElementById(
                    "memoryGameStatus"
                )
            );

            startMemoryTimer();
        },
        function (error) {
            displayErrorMessage(
                document.getElementById(
                    "memoryGameStatus"
                ),
                getAjaxErrorMessage(
                    error,
                    "The memory game countries could not be loaded."
                )
            );
        }
    );
}

function buildMemoryCards() {
    memoryCards = [];

    memoryCountries.forEach(function (country) {
        memoryCards.push({
            cardId:
                country.alpha3Code + "-flag",
            pairCode: country.alpha3Code,
            cardType: "flag",
            countryName: country.name,
            flagUrl: getCountryFlagUrl(country),
            isFlipped: false,
            isMatched: false
        });

        memoryCards.push({
            cardId:
                country.alpha3Code + "-name",
            pairCode: country.alpha3Code,
            cardType: "name",
            countryName: country.name,
            flagUrl: "",
            isFlipped: false,
            isMatched: false
        });
    });

    memoryCards = shuffleMemoryCards(memoryCards);
}

function shuffleMemoryCards(cards) {
    let shuffledCards = cards.slice();

    for (
        let index = shuffledCards.length - 1;
        index > 0;
        index--
    ) {
        let randomIndex =
            Math.floor(Math.random() * (index + 1));

        let temporaryCard =
            shuffledCards[index];

        shuffledCards[index] =
            shuffledCards[randomIndex];

        shuffledCards[randomIndex] =
            temporaryCard;
    }

    return shuffledCards;
}

function renderMemoryBoard() {
    let board =
        document.getElementById("memoryBoard");

    if (!board) {
        return;
    }

    clearElementChildren(board);

    memoryCards.forEach(function (cardData) {
        board.appendChild(
            createMemoryCardElement(cardData)
        );
    });
}

function createMemoryCardElement(cardData) {
    let button =
        createElementSafely(
            "button",
            "memory-card",
            null
        );

    button.type = "button";

    button.setAttribute(
        "data-memory-card-id",
        cardData.cardId
    );

    let inner =
        createElementSafely(
            "span",
            "memory-card-inner",
            null
        );

    let front =
        createElementSafely(
            "span",
            "memory-card-face memory-card-front",
            "🌍"
        );

    let back =
        createElementSafely(
            "span",
            "memory-card-face memory-card-back",
            null
        );

    if (cardData.cardType === "flag") {
        let flag = document.createElement("img");
        flag.src = cardData.flagUrl;
        flag.alt = cardData.countryName + " flag";

        setImageFallback(
            flag,
            DEFAULT_PROFILE_IMAGE_URL
        );

        back.appendChild(flag);
    } else {
        back.textContent = cardData.countryName;
    }

    inner.appendChild(front);
    inner.appendChild(back);
    button.appendChild(inner);

    button.addEventListener("click", function () {
        handleMemoryCardClick(
            cardData,
            button
        );
    });

    return button;
}

function handleMemoryCardClick(cardData, button) {
    if (
        memoryBoardLocked ||
        memoryGameFinished ||
        cardData.isFlipped ||
        cardData.isMatched
    ) {
        return;
    }

    flipMemoryCard(cardData, button, true);

    if (memoryFirstCard === null) {
        memoryFirstCard = cardData;
        return;
    }

    memorySecondCard = cardData;
    memoryMovesCount++;
    memoryBoardLocked = true;

    updateMemoryStats();

    if (
        memoryFirstCard.pairCode ===
        memorySecondCard.pairCode &&
        memoryFirstCard.cardType !==
        memorySecondCard.cardType
    ) {
        window.setTimeout(
            markMemoryPairMatched,
            450
        );
    } else {
        window.setTimeout(
            hideUnmatchedMemoryPair,
            850
        );
    }
}

function flipMemoryCard(cardData, button, shouldFlip) {
    cardData.isFlipped = shouldFlip;

    button.classList.toggle(
        "memory-card-flipped",
        shouldFlip
    );
}

function markMemoryPairMatched() {
    if (
        memoryGameFinished ||
        memoryFirstCard === null ||
        memorySecondCard === null
    ) {
        return;
    }

    memoryFirstCard.isMatched = true;
    memorySecondCard.isMatched = true;

    markMemoryCardElementMatched(
        memoryFirstCard.cardId
    );

    markMemoryCardElementMatched(
        memorySecondCard.cardId
    );

    memoryMatchedCount++;

    // כמו בטריוויה:
    // כל תשובה/התאמה נכונה שווה 10 נקודות.
    memoryCurrentPoints += 10;

    resetMemoryTurn();
    updateMemoryStats();

    if (
        memoryMatchedCount ===
        memoryCountries.length
    ) {
        finishMemoryGame(true);
    }
}

function markMemoryCardElementMatched(cardId) {
    let element = document.querySelector(
        "[data-memory-card-id='" +
        cardId +
        "']"
    );

    if (element) {
        element.classList.add(
            "memory-card-matched"
        );

        element.disabled = true;
    }
}

function hideUnmatchedMemoryPair() {
    let firstElement =
        document.querySelector(
            "[data-memory-card-id='" +
            memoryFirstCard.cardId +
            "']"
        );

    let secondElement =
        document.querySelector(
            "[data-memory-card-id='" +
            memorySecondCard.cardId +
            "']"
        );

    if (firstElement) {
        flipMemoryCard(
            memoryFirstCard,
            firstElement,
            false
        );
    }

    if (secondElement) {
        flipMemoryCard(
            memorySecondCard,
            secondElement,
            false
        );
    }

    resetMemoryTurn();
}

function resetMemoryTurn() {
    memoryFirstCard = null;
    memorySecondCard = null;
    memoryBoardLocked = false;
}

function startMemoryTimer() {
    stopMemoryTimer();

    memoryTimerIdentifier =
        window.setInterval(function () {
            memorySecondsRemaining--;

            // הטיימר מעדכן רק את הזמן.
            // הוא לא משנה את הניקוד.
            updateMemoryStats();

            if (memorySecondsRemaining <= 0) {
                finishMemoryGame(false);
            }
        }, 1000);
}

function stopMemoryTimer() {
    if (memoryTimerIdentifier !== null) {
        window.clearInterval(
            memoryTimerIdentifier
        );

        memoryTimerIdentifier = null;
    }
}

function finishMemoryGame(completedAllPairs) {
    if (memoryGameFinished) {
        return;
    }

    memoryGameFinished = true;
    stopMemoryTimer();

    // הניקוד כבר נצבר במהלך המשחק.
    // אין לחשב אותו מחדש בסיום.
    updateMemoryStats();

    document.getElementById("memoryResultOverlay").hidden = false;
    document.body.classList.add("memory-result-open");

    let titleElement =
        document.getElementById(
            "memoryResultTitle"
        );

    let textElement =
        document.getElementById(
            "memoryResultText"
        );

    titleElement.textContent =
        completedAllPairs
            ? "Game Complete"
            : "Time Is Up";

    textElement.textContent =
        "You matched " +
        memoryMatchedCount +
        " of " +
        memoryCountries.length +
        " pairs in " +
        memoryMovesCount +
        " moves and earned " +
        memoryCurrentPoints +
        " points.";

    document.getElementById("memoryReplayButton").focus();
    saveMemoryGameResult(completedAllPairs);
}

function saveMemoryGameResult(completedAllPairs) {
    let saveMessage =
        document.getElementById(
            "memorySaveMessage"
        );

    let session = getLoggedInUserSession();

    if (!session) {
        displayLoadingMessage(
            saveMessage,
            "Log in to save your result."
        );

        return;
    }

    let result = {
        userId: Number(session.userID),
        points: memoryCurrentPoints,
        moves: memoryMovesCount,
        matchedPairs: memoryMatchedCount,
        isCompleted: completedAllPairs
    };

    displayLoadingMessage(
        saveMessage,
        "Saving result..."
    );

    ajaxCall(
        "POST",
        SERVER_API_BASE_URL +
        "/MemoryGameResults",
        JSON.stringify(result),
        function () {
            displaySuccessMessage(
                saveMessage,
                "The memory game result was saved."
            );
        },
        function (error) {
            displayErrorMessage(
                saveMessage,
                getAjaxErrorMessage(
                    error,
                    "The game result could not be saved."
                )
            );
        }
    );
}

function updateMemoryStats() {
    setMemoryStatText(
        "memoryTimer",
        memorySecondsRemaining
    );

    setMemoryStatText(
        "memoryMoves",
        memoryMovesCount
    );

    setMemoryStatText(
        "memoryMatchedPairs",
        memoryMatchedCount
    );

    setMemoryStatText(
        "memoryPoints",
        memoryCurrentPoints
    );
}

function setMemoryStatText(identifier, value) {
    let element = document.getElementById(identifier);

    if (element) {
        element.textContent = String(value);
    }
}

document.addEventListener(
    "DOMContentLoaded",
    initializeMemoryGamePage
);