const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { userRef, walletRef, brandRef,  brandCategoriesRef } = require("../../db/ref");
const { body, validationResult } = require("express-validator");
const momenttimezone = require("moment-timezone");
const axios = require('axios')
const credentials = require('../../config/private.json');
const { encryptRSAKey,encryptRSAKey2 } = require("../../functions/helper");

const EncryptRsa = require('encrypt-rsa').default;
// create instance
const encryptRsa = new EncryptRsa();


const sandbox_url = "https://api.eu-de.apiconnect.appdomain.cloud/easypaisaapigw-telenorbankpk-tmbdev/dev-catalog";

// Easypaisa Inquiry 
router.post('/check-user-wallet', 
(req,res) => {
   const body = req.body;

   try {
    let url = `${sandbox_url}/MaToMA/Inquiry`;

    let config = {
     headers: {
         'X-IBM-Client-Id': '5f5c551f-8cd5-497a-b598-8875e7b1fc44',
         'X-IBM-Client-Secret': 'B8kU1dI4tF2mH1gB3wJ4xE2kB5rD6xQ2fG5qL2uB6mI1rP7lX3',
         'X-Hash-Value': 'REPLACE_THIS_VALUE',
         'X-Channel': 'Aur Kuch Test',
         'content-type': 'application/json',
         accept: 'application/json'
    }
   };
 
   let requestBody = {
     Amount: '500',
     MSISDN: 'utcofil',
     ReceiverMSISDN: '96318'
   }
 
   axios.post(url,body,config).then((response)=>{
     let data = response.data;
     console.log('res -> ',res);
 
     res.json({
         status:true,
         res:res,
         data: data
     })
   }).catch((err)=>{
     console.log('err -> ',err.message);
     res.json({
         status:false,
         error:err.message
     })
   })
   } catch (err) {
    console.log('err -> ',err.message);
    res.json({
      status:false,
      error:err
  })
   }
})

// Check Date 
router.post('/check-date', (req,res) => {
  
  const formatDate = momenttimezone().tz("Asia/Karachi").format("YYYY-MM-DD");
 
  res.json({
    status:true,
    date
  })
})


async function authenticateEasypaisa () {
  try {
  let phone = '923243280234';
  let timestamp = momenttimezone().tz("Asia/Karachi").format("YYYY-MM-DD HH:mm:ss.x");
  let total = `${phone}~${timestamp}`;
  console.log('total -> ',total);

  let url = `${sandbox_url}/LoginAPI/token`;
  let username = '923243280234';
  
  let key = await encryptRSAKey(username)
  
  // const encryptedText = encryptRsa.encryptStringWithRsaPublicKey({ 
  //   text: username,   
  //   publicKey: key,
  // });

  // console.log(encryptedText);

  let config = {
    headers: {
        'X-IBM-Client-Id': '5f5c551f-8cd5-497a-b598-8875e7b1fc44',
        'X-IBM-Client-Secret': 'B8kU1dI4tF2mH1gB3wJ4xE2kB5rD6xQ2fG5qL2uB6mI1rP7lX3',
        'X-Msisdn': encryptedText,
        'X-Channel': 'Aur Kuch Test',
        'content-type': 'application/json',
        accept: 'application/json'
   }
  };

  axios.post(url,config).then((response)=>{
    let data = response.data;
    console.log('response -> ',response);
    console.log('data -> ',data);

    // res.json({
    //     status:true,
    //     res:response,
    //     data: data
    // })
  }).catch((err)=>{
    console.log('err -> ',err);
    // res.json({
    //     status:false,
    //     error:err.message
    // })
  })
  } catch (err) {
    console.log('err -> ',err);
    // res.json({
    //     status:false,
    //     error:err.message
    // })
  }

}

// authenticateEasypaisa()

module.exports = router;