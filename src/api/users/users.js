const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { userRef, walletRef, brandRef,  brandCategoriesRef } = require("../../db/ref");
const { body, validationResult } = require("express-validator");
const momenttimezone = require("moment-timezone");


// Get Brands For Table
router.get('/get_users_datatable', (req,res) => {
  
  try {
    const params = req.query;
    let length;
    let projects = [];

    //   SORT , PAGINATION , SEARCH PARAMS
    let sort = params.sort;
    let page = parseInt(params.page) || 1;
    let per_page = parseInt(params.per_page) || 4;
    let search = params.search;

    userRef.once('value', (querySnapshot) => {

     if(querySnapshot.val()) {
      let data = [];

      querySnapshot.forEach((doc) => {
        data.push(doc.val())
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
     } else {
      let final = {
        status: true,
        total: 0,
        from: 0,
        to:0,
        per_page: 0,
        current_page: 0,
        last_page: 0,
        items: [],
      }
      console.log('final -> ', final);
      res.json(final)
     }
    
  }).catch((err)=>{
    console.log('err -> ',err);

    res.json({
      status: true,
      total: 1,
      from: 1,
      to: 1,
      per_page: 1,
      current_page: 1,
      last_page: 1,
      items: [],
    })
  })
  } catch (error) {
    console.log('error -> ',error);
    res.json({
      status: true,
      total: 0,
      from: 0,
      to: 0,
      per_page: 0,
      current_page: 0,
      last_page: 0,
      items: [],
    })
  }
})

// Get User
router.get('/get_user', (req,res,next) => {
  const {uid} = req.query;

  admin.auth().getUser(uid).then((user)=>{
    if(user) {
      res.json({
        status:true,
        data:user
      })
    } else {
       res.json({
        status:false,
        error:"User not found!"
       })
    }
  })
})


module.exports = router;
