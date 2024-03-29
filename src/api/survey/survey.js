const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { userRef, walletRef, brandRef,  brandCategoriesRef,watchRef,surveyRef , tasksRef } = require("../../db/ref");
const { body, validationResult } = require("express-validator");
const momenttimezone = require("moment-timezone");


// Create Survey 

// {
//   "name": "",
// }

router.post('/add-survey', (req,res) => {
    const params = req.body;

    let data = {
       ...params,
       created: momenttimezone.tz("Asia/Karachi").valueOf(),
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
       created: momenttimezone.tz("Asia/Karachi").valueOf(),
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


// Get Brands For Table
router.get('/get_survey_database', (req,res) => {
  
    const params = req.query;
    let length;
    let projects = [];
  
    //   SORT , PAGINATION , SEARCH PARAMS
    let email = params.email;
    let sort = params.sort;
    let page = parseInt(params.page) || 1;
    let per_page = parseInt(params.per_page) || 4;
    let search = params.search;
    let filter = params.filter_by;
  
  
  
    surveyRef.get().then((querySnapshot) => {
  
    let data = [];
  
    querySnapshot.forEach((doc) => {
      
      data.push({
        id: doc.id,
        ...doc.data()
      })
    })
  
  
    length = data.length;
  
    let from = (page - 1) * per_page + 1;
    let to = from + per_page <= length ? from + per_page - 1 : length;
    console.log("from -> ", from);
    console.log("to -> ", to);
    let current_page = page;
    let last_page =
      length % per_page == 0
        ? length / per_page
        : Math.floor(length / per_page) + 1;
    console.log("last_page -> ", last_page);
    let total = length;
    let next_page_url;
    
    console.log("length -> ", length);
  
    // Sort if sort is passed
    if (sort) {
      data.sort((a, b) =>
        a[sort] > b[sort] ? 1 : b[sort] > a[sort] ? -1 : 0
      );
    }
  
    // Search if search is passed
    if (search) {
      var lowSearch = search.toLowerCase();
      data = data.filter((obj) =>
        Object.values(obj).some((val) =>
          String(val).toLowerCase().includes(lowSearch)
        )
      );
      // projects = projects.filter((obj) => JSON.stringify(obj).toLowerCase().includes(search.toLowerCase()));
    }
  
    
    let sortedprojects = data.sort(function (a, b) {
      return b.created - a.created;
    });
  
    sortedprojects = sortedprojects.slice(from - 1, to);
  
  
    let final = {
      status: true,
      total,
      from,
      to,
      per_page,
      current_page,
      last_page,
      items: sortedprojects,
    }
  
    console.log('final -> ', final);
  
   
  
    res.json(final)
    
  }).catch((err)=>{
    res.json({
      status:false,
      message:err
    })
  })
})


// Get All Survey
router.post('/get_all_brands', (req,res) => {
  const params = req.body;
  
  tasksRef.orderByChild('type').equalTo('survey').once('value',(snapshot) => {
    console.log('snapshot -> ',snapshot.val())
   
   if(snapshot.val()) {
    let data = [];

    snapshot.forEach((doc) => {
      data.push(doc.val())
    })
    res.json({
      status:true,
      data: data
    })

   } else {
    res.json({
      status:true,
      data: []
    })
   }
    
  }).catch((err)=>{
    res.json({
      status:false,
      message:err
    })
  })
})

module.exports = router;