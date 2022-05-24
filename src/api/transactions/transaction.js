const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { userRef, walletRef, brandRef,  brandCategoriesRef } = require("../../db/ref");
const { body, validationResult } = require("express-validator");



// User Watched A Video (transaction created)




module.exports = router;