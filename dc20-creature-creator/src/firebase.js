// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCgdyE834tp64B2flcR9VUzbIvXwPdwQ-k",
    authDomain: "dc20-creature-creator.firebaseapp.com",
    projectId: "dc20-creature-creator",
    storageBucket: "dc20-creature-creator.firebasestorage.app",
    messagingSenderId: "638039342508",
    appId: "1:638039342508:web:a80d7ddaecdab47b1b8e09",
    measurementId: "G-2BEL1FHFPP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth }; // Export the Firestore instance