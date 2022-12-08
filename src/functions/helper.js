
const _ = require("lodash");
const momenttimezone = require("moment-timezone");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
// const keyForEncryption = require("../config/rsa-key.pem");
const NodeRSA = require('node-rsa');


module.exports = {
  getCurrentDate() {
    let currentDate = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Karachi', hour12: true })
    return currentDate;
  },
  getCurrentTimestamp() {
    let timestamp = momenttimezone.tz("Asia/Karachi").valueOf();
    return timestamp;
  },
  async encryptRSAKey(encryptedData) {
    let publicKey = Buffer.from(
      fs.readFileSync(path.join(__dirname,"../config/rsa-key.pem"), { encoding: "utf-8" })
    );

    console.log('publicKey -> ',publicKey);

    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      // We convert the data string to a buffer using `Buffer.from`
      Buffer.from(encryptedData)
    );

    return encrypted
  },
  async encryptRSAKey2(encryptedData) {
    // const key = new NodeRSA(
    // '-----BEGIN RSA PRIVATE KEY-----\n'+
    // '631f96900cf28b9421398857\n'+
    // '-----END RSA PRIVATE KEY-----', 
    // format,
    // option);

    const key = new NodeRSA('adiohsoaidhasodhoiahdoiasdh');
    const encrypted = key.encrypt(key, 'base64');

    console.log('encrypted -> ',encrypted);
  }
};
