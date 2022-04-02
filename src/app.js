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





app.get('/', (req,res) => { 
   res.json({
     message: "running"
   })
})

app.post('/', (req,res) => { 
  res.json({
    message: "running"
  })
})


// Authentication 
app.use("/auth", require("./api/authentication/auth"));

// Profile
app.use("/profile", require("./api/profile/profile"));

// Wallet
app.use("/wallet", require("./api/wallet/wallet"));

// Brand
app.use("/brand", require("./api/brand/brand"));

// Survey
app.use("/survey", require("./api/survey/survey"));

// Admin 
app.use("/admin", require("./api/adminpanel/admin"));



app.use(middlewares.notFound);
app.use(middlewares.errorHandler);



module.exports = app;
