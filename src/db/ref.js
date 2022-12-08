const admin = require("firebase-admin");
const db = admin.database();

// Users
const userRef = db.ref("users");

// Wallet
const walletRef = db.ref("wallets");

// Tasks
const tasksRef = db.ref("tasks");
const tasksRecordsRef = db.ref("completed_tasks");
const pendingTasksRef = db.ref("pending_tasks");
const rejectedTasksRef = db.ref("rejected_tasks");
const incompleteTasksRef = db.ref("incomplete_tasks");


// Brand
const brandRef = db.ref("brands");

// Brand
const watchRef = db.ref("videos");

// Brand Categories
const brandCategoriesRef = db.ref("brand_categories");

// Survey
const surveyRef = db.ref("surveys");

// Settings
const settingsRef = db.ref("settings");

// Promotional Slider
const sliderRef = db.ref("promotional_slider");

// FCM Tokens
const fcmRef = db.ref("fcm");

// Notifications
const notificationsRef = db.ref("notifications");

// Tracking
const trackingRef = db.ref("track");

// Otps
const otpRef = db.ref("otp");

module.exports = {
  userRef,
  walletRef,
  brandRef,
  surveyRef,
  settingsRef,
  brandCategoriesRef,
  watchRef,
  sliderRef,
  fcmRef,
  tasksRef,
  tasksRecordsRef,
  pendingTasksRef,
  incompleteTasksRef,
  notificationsRef,
  rejectedTasksRef,
  trackingRef,
  otpRef
};
