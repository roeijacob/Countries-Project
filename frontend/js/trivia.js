"use strict";

let triviaQuestions = [];
let triviaCurrentQuestionIndex = 0;
let triviaCurrentScore = 0;
let triviaCorrectAnswersCount = 0;
let triviaSecondsRemaining = 60;

let triviaTimerIdentifier = null;
let triviaAnswerLocked = false;
let triviaGameFinished = false;

function initializeTriviaPage() {
    let replayButton =
        document.getElementById("triviaReplayButton");

    if (replayButton) {
        replayButton.addEventListener(
            "click",
            startNewTriviaGame
        );
    }

    startNewTriviaGame();
}

function startNewTriviaGame() {
    stopTriviaTimer();

    triviaQuestions = [];
    triviaCurrentQuestionIndex = 0;
    triviaCurrentScore = 0;
    triviaCorrectAnswersCount = 0;
    triviaSecondsRemaining = 60;
    triviaAnswerLocked = false;
    triviaGameFinished = false;

    document.getElementById("triviaResultOverlay").hidden = true;
    document.getElementById("triviaCard").hidden = false;
    document.body.classList.remove("trivia-result-open");
    clearStatusMessage(document.getElementById("triviaSaveMessage"));

    document.getElementById(
        "triviaCard"
    ).hidden = false;

    clearElementChildren(
        document.getElementById("triviaAnswers")
    );

    updateTriviaStats();

    displayLoadingMessage(
        document.getElementById("triviaStatus"),
        "Loading trivia questions..."
    );

    ajaxCall(
        "GET",
        SERVER_API_BASE_URL + "/TriviaQuestions",
        null,
        function (questions) {
            triviaQuestions =
                Array.isArray(questions)
                    ? questions
                    : [];

            if (triviaQuestions.length === 0) {
                displayErrorMessage(
                    document.getElementById(
                        "triviaStatus"
                    ),
                    "No trivia questions were returned."
                );

                return;
            }

            clearStatusMessage(
                document.getElementById(
                    "triviaStatus"
                )
            );

            renderCurrentTriviaQuestion();
            startTriviaTimer();
        },
        function (error) {
            displayErrorMessage(
                document.getElementById(
                    "triviaStatus"
                ),
                getAjaxErrorMessage(
                    error,
                    "Trivia questions could not be loaded."
                )
            );
        }
    );
}

function renderCurrentTriviaQuestion() {
    if (
        triviaCurrentQuestionIndex >=
        triviaQuestions.length
    ) {
        finishTriviaGame("completed");
        return;
    }

    triviaAnswerLocked = false;

    let question =
        triviaQuestions[
        triviaCurrentQuestionIndex
        ];

    let questionElement =
        document.getElementById("triviaQuestion");

    let progressElement =
        document.getElementById("triviaProgress");

    let answersContainer =
        document.getElementById("triviaAnswers");

    questionElement.textContent =
        question.questionText;

    progressElement.textContent =
        "Question " +
        (triviaCurrentQuestionIndex + 1) +
        " of " +
        triviaQuestions.length;

    clearElementChildren(answersContainer);

    let answers =
        Array.isArray(question.answers)
            ? question.answers
            : [
                question.correctAnswer,
                question.wrongAnswer1,
                question.wrongAnswer2,
                question.wrongAnswer3
            ];

    answers.forEach(function (answer) {
        let button =
            createElementSafely(
                "button",
                "trivia-answer-button",
                answer
            );

        button.type = "button";

        button.addEventListener(
            "click",
            function () {
                handleTriviaAnswer(
                    button,
                    answer,
                    question.correctAnswer
                );
            }
        );

        answersContainer.appendChild(button);
    });

    updateTriviaStats();
}

function handleTriviaAnswer(selectedButton, selectedAnswer, correctAnswer) {
    if (triviaAnswerLocked || triviaGameFinished) return;

    triviaAnswerLocked = true;

    let answerButtons = document.querySelectorAll(".trivia-answer-button");

    answerButtons.forEach(function (button) {
        button.disabled = true;

        if (button.textContent.trim() === String(correctAnswer).trim()) {
            button.classList.add("trivia-answer-correct");

            if (selectedAnswer !== correctAnswer) {
                button.classList.add("trivia-answer-revealed");
            }
        }
    });

    selectedButton.classList.add("trivia-answer-selected");

    if (selectedAnswer === correctAnswer) {
        triviaCorrectAnswersCount++;
        triviaCurrentScore += 10;
        selectedButton.classList.add("trivia-answer-correct");
    } else {
        selectedButton.classList.add("trivia-answer-incorrect");
    }

    updateTriviaStats();

    window.setTimeout(function () {
        if (triviaGameFinished) return;

        triviaCurrentQuestionIndex++;
        renderCurrentTriviaQuestion();
    }, 1300);
}

function startTriviaTimer() {
    stopTriviaTimer();

    triviaTimerIdentifier =
        window.setInterval(function () {
            triviaSecondsRemaining--;
            updateTriviaStats();

            if (triviaSecondsRemaining <= 0) {
                finishTriviaGame("time");
            }
        }, 1000);
}

function stopTriviaTimer() {
    if (triviaTimerIdentifier !== null) {
        window.clearInterval(
            triviaTimerIdentifier
        );

        triviaTimerIdentifier = null;
    }
}

function finishTriviaGame(reason) {
    if (triviaGameFinished) return;

    triviaGameFinished = true;
    stopTriviaTimer();
    updateTriviaStats();

    let resultOverlay = document.getElementById("triviaResultOverlay");
    let resultTitle = document.getElementById("triviaResultTitle");
    let resultText = document.getElementById("triviaResultText");

    resultTitle.textContent = reason === "time" ? "Time Is Up" : "Trivia Complete";

    resultText.textContent =
        "You answered " +
        triviaCorrectAnswersCount +
        " of " +
        triviaQuestions.length +
        " questions correctly and earned " +
        triviaCurrentScore +
        " points.";

    resultOverlay.hidden = false;
    document.body.classList.add("trivia-result-open");
    document.getElementById("triviaReplayButton").focus();

    saveTriviaResult();
}
function saveTriviaResult() {
    let saveMessage =
        document.getElementById(
            "triviaSaveMessage"
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
        userID: Number(session.userID),
        score: triviaCurrentScore,
        correctAnswers:
            triviaCorrectAnswersCount,
        totalQuestions:
            triviaQuestions.length
    };

    displayLoadingMessage(
        saveMessage,
        "Saving result..."
    );

    ajaxCall(
        "POST",
        SERVER_API_BASE_URL + "/TriviaResults",
        JSON.stringify(result),
        function () {
            displaySuccessMessage(
                saveMessage,
                "The trivia result was saved."
            );
        },
        function (error) {
            displayErrorMessage(
                saveMessage,
                getAjaxErrorMessage(
                    error,
                    "The trivia result could not be saved."
                )
            );
        }
    );
}

function updateTriviaStats() {
    setTriviaStatText(
        "triviaTimer",
        triviaSecondsRemaining
    );

    setTriviaStatText(
        "triviaQuestionNumber",
        triviaQuestions.length === 0
            ? 0
            : Math.min(
                triviaCurrentQuestionIndex + 1,
                triviaQuestions.length
            )
    );

    setTriviaStatText(
        "triviaScore",
        triviaCurrentScore
    );

    setTriviaStatText(
        "triviaCorrectCount",
        triviaCorrectAnswersCount
    );
}

function setTriviaStatText(identifier, value) {
    let element = document.getElementById(identifier);

    if (element) {
        element.textContent = String(value);
    }
}

document.addEventListener(
    "DOMContentLoaded",
    initializeTriviaPage
);