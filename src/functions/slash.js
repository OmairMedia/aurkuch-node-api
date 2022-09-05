// New Ref
const {

} = require("../db/ref");


const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const _ = require("lodash");
const momenttimezone = require("moment-timezone");

module.exports = {
  getCurrentDate() {
    let currentDate = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Karachi', hour12: true })
    return currentDate;
  },
  getCurrentTimestamp() {
    let timestamp = momenttimezone.tz("Asia/Karachi").valueOf();
    return timestamp;
  },
};
