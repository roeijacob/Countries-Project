import { db, auth } from "./firebase-config.js";
import { signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { ref, push, query, orderByChild, limitToLast, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";

const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatStatus = document.getElementById("chatStatus");

let firebaseUser = null;
let chatStarted = false;

document.addEventListener("DOMContentLoaded", initChat);

function initChat() {
    const currentUser = getCurrentUser();

    if (currentUser == null) {
        chatStatus.textContent = "You must be logged in to use the chat.";
        chatForm.style.display = "none";
        return;
    }

    onAuthStateChanged(auth, async function (user) {
        if (user != null) {
            firebaseUser = user;

            if (!chatStarted) {
                chatStarted = true;
                listenToMessages();
                chatForm.addEventListener("submit", sendMessage);
            }
        }
        else {
            try {
                await signInAnonymously(auth);
            }
            catch (error) {
                console.error(error);
                chatStatus.textContent = "Could not connect to the chat.";
            }
        }
    });
}

function getCurrentUser() {
    return window.getLoggedInUserSession();
}

async function sendMessage(event) {
    event.preventDefault();

    const currentUser = getCurrentUser();
    const messageText = chatInput.value.trim();

    if (currentUser == null || firebaseUser == null || messageText == "") return;

    try {
        await push(ref(db, "chatMessages"), {
            firebaseUid: firebaseUser.uid,
            userId: currentUser.userID,
            fullName: currentUser.fullName,
            text: messageText,
            sentAt: serverTimestamp()
        });

        chatInput.value = "";
        chatStatus.textContent = "";
    }
    catch (error) {
        console.error(error);
        chatStatus.textContent = "The message could not be sent.";
    }
}

function listenToMessages() {
    const messagesQuery = query(ref(db, "chatMessages"), orderByChild("sentAt"), limitToLast(100));

    onValue(messagesQuery, function (snapshot) {
        chatMessages.innerHTML = "";

        snapshot.forEach(function (messageSnapshot) {
            displayMessage(messageSnapshot.val());
        });

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, function (error) {
        console.error(error);
        chatStatus.textContent = "The messages could not be loaded.";
    });
}

function displayMessage(message) {
    const currentUser = getCurrentUser();
    const isOwnMessage = currentUser != null && Number(currentUser.userID) === Number(message.userId);

    const messageElement = document.createElement("div");
    const messageHeader = document.createElement("div");
    const nameElement = document.createElement("strong");
    const timeElement = document.createElement("span");
    const textElement = document.createElement("p");

    messageElement.className = isOwnMessage ? "chat-message chat-message-own" : "chat-message chat-message-other";
    messageHeader.className = "chat-message-header";
    nameElement.textContent = isOwnMessage ? "You" : message.fullName || "Traveler";
    textElement.textContent = message.text || "";
    textElement.dir = "auto";

    if (message.sentAt != null) {
        timeElement.textContent = new Date(message.sentAt).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    messageHeader.appendChild(nameElement);
    messageHeader.appendChild(timeElement);
    messageElement.appendChild(messageHeader);
    messageElement.appendChild(textElement);
    chatMessages.appendChild(messageElement);
}