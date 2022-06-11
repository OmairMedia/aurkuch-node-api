const express = require('express');
const router = express.Router();
const admin = require("firebase-admin");
const { userRef, profileRef } = require("../../db/ref");
const { body, validationResult } = require("express-validator");

// TODO - Update Profile Image


// Get Profile
router.get('/get_profile', (req,res) => {
    const params = req.body;
  
    userRef.doc(params.id).get().then((doc) => {
        if(doc.exists) {
            res.json({
                status:true,
                data: {
                    ...doc.data(),
                    password: null
                }
              })

        } else {
            res.json({
                status:false,
                error: "User Not Found !"
              })
        }
      
    }).catch((err)=>{
      res.json({
        status:false,
        error:err.message
      })
    })
  })






  // Edit Profile
router.post('/edit_profile', (req,res) => {
    const params = req.body;
  
    userRef.doc(params.id).update({
        ...params
    }).then(() => {
        res.json({
            status:true,
            error: "Profile Updated Successfully !"
          })
      
    }).catch((err)=>{
      res.json({
        status:false,
        error:err.message
      })
    })
  })



module.exports = router;