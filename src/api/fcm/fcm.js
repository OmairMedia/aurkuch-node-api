const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { userRef, walletRef, brandRef,  brandCategoriesRef , fcmRef} = require("../../db/ref");
const { body, validationResult } = require("express-validator");
const QRCode = require('qrcode')
const momenttimezone = require("moment-timezone");


// Save FCM Token
// {
// "email": "",
// "token": "",
// }

router.post(
  "/save_token",
  // Save Token IN Database
  (req,res,next) => {
    const params = req.body;  

    let branddata = {
      email: params.uid,
      token: params.token,
      created: momenttimezone.tz("Asia/Karachi").valueOf(),
    }

    fcmRef.child(params.uid).set(branddata).then(()=>{
      res.json({
        status:true,
        message: "Token Saved Successfully"
      })
    }).catch((err)=>{
      res.json({
        status:false,
        message: err
      })
    })
  }
);


module.exports = router;
