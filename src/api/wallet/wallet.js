const express = require('express');
const router = express.Router();
const admin = require("firebase-admin");
const { userRef, walletRef, brandRef,  brandCategoriesRef } = require("../../db/ref");



// Get Wallets For Table
router.get('/get_wallets_datatable', (req,res) => {
    const params = req.params;
  
  
    let sort = params.sort;
    let page = params.page;
    let per_page = params.per_page;
    let search = params.search;
    let from = params.from;
    let to = params.to;
    let total = params.total;   
    let lastPage = params.lastPage;    
  
  
  
    walletRef.get().then((querySnapshot) => {
  
      let data = [];
  
      querySnapshot.forEach((doc) => {
        
        data.push({
          id: doc.id,
          ...doc.data()
        })
      })
  
      res.json({
        status:true,
        data: data,
        total: 20,
        last_page: 4,
        per_page: 5,
        current_page: 1,
        next_page_url: "https://api.coloredstrategies.com/cakes/fordatatable?sort=&page=2&per_page=5",
        prev_page_url: "https://api.coloredstrategies.com/cakes/fordatatable?sort=&page=2&per_page=5",
        from: 1,
        to: 5,
      })
      
    }).catch((err)=>{
      res.json({
        status:false,
        message:err
      })
    })
})


module.exports = router;