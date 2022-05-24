const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { userRef, walletRef, brandRef,  brandCategoriesRef,watchRef,surveyRef } = require("../../db/ref");
const { body, validationResult } = require("express-validator");


// Create Survey 

// {
//   "name": "",
// }

router.post('/add-survey', (req,res) => {
    const params = req.body;

    let data = {
       ...params,
       created: admin.firestore.FieldValue.serverTimestamp(),
    }

    surveyRef.add(data).then(()=>{
         res.json({
             status:true,
             message: "Successfully Created Survey"
         })
    }).catch((err)=>{
        res.json({
            status:false,
            error: err
        })
    })

})



// Add Questions To Survey

// {
    // "question": "what is the name of the national sport of pakistan ?",
    // "options": ["cricket","hockey","football","tennis"],
    // "correctAnswer": "cricket",
    // "survey_id": "FkDps5Tmnmhj0GfAXOE1"
// }

router.post('/add-question-to-survey', (req,res) => {
    const params = req.body;

    let data = {
       question: params.question,
       options: params.options,
       correctAnswer: params.correctAnswer,
       created: admin.firestore.FieldValue.serverTimestamp(),
    }
    
    surveyRef.doc(params.survey_id).collection('questions').add(data).then(()=>{
         res.json({
             status:true,
             message: "Successfully Add Question To Survey"
         })
    }).catch((err)=>{
        res.json({
            status:false,
            error: err
        })
    })

})




// TODO - User Fill Survey

module.exports = router;