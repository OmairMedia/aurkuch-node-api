const admin = require("firebase-admin");
const db = admin.firestore();


// Authentication
const userRef = db.collection("users");

// Profile
const profileRef = db.collection("profiles");

// Wallet
const walletRef = db.collection("wallets");

// Brand
const brandRef = db.collection("brands");

// Survey
const surveyRef = db.collection("surveys");

// Settings
const settingsRef = db.collection("settings");


module.exports = {
    userRef,
    profileRef,
    walletRef,
    brandRef,
    surveyRef,
    settingsRef
};
