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
    "https://meribilty-331311-default-rtdb.asia-southeast1.firebasedatabase.app/",
  storageBucket: "meribilty-331311.appspot.com",
});

// Initialize The App
const app = express();

// -----------   3rd Party Libraries Middlewares
app.use(morgan("dev"));
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// --------  Middlewares  --------
const middlewares = require("./middleware/index");

// Admin
app.use("/admin", require("./api/admin"));

// Routes
app.use("/api", require("./api/api"));

// Auth
// Authentication Apis
// middlewares.checkApiKey
app.use("/auth/user", require("./api/auth/user"));
app.use("/auth/pro", require("./api/auth/pro"));
app.use("/auth/driver", require("./api/auth/driver"));
app.use("/auth/vendor", require("./api/auth/vendor"));

// SAME CITY MOVEMENT
app.use("/scm", require("./api/requests/scm"));
app.use("/ppl", require("./api/requests/ppl"));

// Driver App
app.use("/driver", require("./api/driver"));

// Chat
app.use("/chat", require("./api/chat/chat"));

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

// Tasks
require("./tasks/pplRequests");
// require("./tasks/invoice");
// require("./functions/cronjobs/email_jobs");

module.exports = app;
