import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBr5M3bXDtaY4DwTkolCJUZI14qqXQlrno",
    authDomain: "countries-chat-37237.firebaseapp.com",
    databaseURL: "https://countries-chat-37237-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "countries-chat-37237",
    storageBucket: "countries-chat-37237.firebasestorage.app",
    messagingSenderId: "20916234555",
    appId: "1:20916234555:web:ec2b93115f643e4a03ef1e"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

export { db, auth };