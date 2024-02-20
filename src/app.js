const express = require("express");
const path = require("path");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const firebase_admin = require("firebase-admin");
const fileUpload = require("express-fileupload");
const session = require("express-session");

require("dotenv").config({ path: "/config/keys.env" });

// Initializing Firebase Admin SDK
const serviceAccount = require("./config/serviceAccount.json");

const admin = firebase_admin.initializeApp({
  credential: firebase_admin.credential.cert(serviceAccount),
  databaseURL:
    "https://aurkuch-982e5-default-rtdb.asia-southeast1.firebasedatabase.app/",
});

// Initialize The App
const app = express();

// -----------   3rd Party Libraries Middlewares
app.use(morgan("dev"));
app.use(helmet());
app.use(cors());
app.use(fileUpload());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --------  Middlewares  --------
const middlewares = require("./middleware/index");

app.get("/", (req, res) => {
  res.json({
    message: "running",
  });
});

app.post("/", (req, res) => {
  res.json({
    message: "running",
  });
});

// Authentication
app.use("/auth", require("./api/authentication/auth"));

// Profile
app.use("/profile", require("./api/profile/profile"));

// Wallet
app.use("/wallet", require("./api/wallet/wallet"));

// Brand
app.use("/brand", require("./api/brand/brand"));

// Settings
app.use("/settings", require("./api/settings/settings"));

// Slider
app.use("/slider", require("./api/promotionalSlider/slider"));

// Users
app.use("/users", require("./api/users/users"));

// FCM
app.use("/fcm", require("./api/fcm/fcm"));

// Tasks
app.use("/tasks", require("./api/tasks/tasks"));

// Exports
app.use("/exports", require("./api/export/index"));

// Payments
app.use("/payments", require("./api/payments/payment"));

// Video
// app.use("/video", require("./api/videos/videos"));

// Survey
// app.use("/survey", require("./api/survey/survey"));

// Admin
// app.use("/admin", require("./api/adminpanel/admin"));

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

module.exports = app;
