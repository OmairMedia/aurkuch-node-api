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

// Brand
const watchRef = db.collection("videos");

// Brand Categories
const brandCategoriesRef = db.collection("brand_categories");

// Survey
const surveyRef = db.collection("surveys");

// Settings
const settingsRef = db.collection("settings");

// Promotional Slider
const sliderRef = db.collection("promotional_slider");

module.exports = {
  userRef,
  profileRef,
  walletRef,
  brandRef,
  surveyRef,
  settingsRef,
  brandCategoriesRef,
  watchRef,
  sliderRef
};
