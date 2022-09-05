const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { userRef, walletRef, brandRef,  brandCategoriesRef,watchRef,settingsRef } = require("../../db/ref");
const { body, validationResult } = require("express-validator");
const momenttimezone = require("moment-timezone");



// Add Video Watch Reward Amount

router.post('/add-video-watch-amount', (req,res) => {
    const params = req.body;
    
    let data = {
        amount: params.amount,
        lastUpdated: momenttimezone.tz("Asia/Karachi").valueOf(),
    }

    settingsRef.doc('video-reward-amount').set(data).then(()=>{
        res.json({
            status:true,
            message: "Reward Amount Set"
        })
    }).catch((err)=>{
        res.json({
            status:false,
            error: err
        })
    })
})


// Add Video Watch Reward Amount

router.post('/add-survey-quiz-amount', (req,res) => {
    const params = req.body;
    
    let data = {
        amount: params.amount,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }

    settingsRef.doc('survey-reward-amount').set(data).then(()=>{
        res.json({
            status:true,
            message: "Reward Amount Set"
        })
    }).catch((err)=>{
        res.json({
            status:false,
            error: err
        })
    })
})



module.exports = router;