const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { userRef, walletRef } = require("../../db/ref");
const bcrypt = require("bcrypt-nodejs");
const saltRounds = 10;
const { body, validationResult } = require("express-validator");
const momenttimezone = require("moment-timezone");


// Register User
router.post(
  "/register",
  // Check User
  (req, res, next) => {
    const params = req.body;

    userRef
       .orderByChild('email')
       .equalTo(params.email)
       .once('value', (snapshot) => {
        if(snapshot.val()) {
          let user = [];
          snapshot.forEach((x) => {
            user.push(x.val())
          })

          if(user && user.length > 0) {
            // req.body.user = user[0];
            // next();
            console.log('Got User')
            res.json({
              status:true,
              message: 'Ok !'
            })
          } 
        } else {
          // req.body.user = null;
          // next();
          let data = {
            id: params.uid,
            email: params.email,
            emailVerified: false,
            displayName: params.fullname,
            created: momenttimezone.tz("Asia/Karachi").valueOf(),
            disabled: false,
            googleAuthenticated: true,
            channelSubscribed: false,
            phoneVerified:false,
            type: "user",
            blocked:false,
          };
          console.log('data -> ',data);
    
         
    
          userRef
             .child(params.uid)
             .set(data)
             .then(() => {
               // Create Wallet
               walletRef
                 .child(params.uid)
                 .set({
                   id: params.uid,
                   email: params.email,
                   fullname: params.fullname,
                   amount: 0,
                   transactions: [],
                   created: momenttimezone.tz("Asia/Karachi").valueOf(),
                   blocked:false,
                   lastUpdated: null
                 })
                 .then(() => {
                   res.json({
                     status: true,
                     message: "User successfully created!",
                   });
                 })
                 .catch((err) => {
                   res.json({
                     status: false,
                     error: err.message,
                   });
                 });
             })
             .catch((error) => {
               res.json({
                 status: false,
                 message: error.message,
               });
             });
        }
       })
      .catch((err) => {
        res.json({
          status: false,
          error: err,
        });
      });
  },
  // Register User
  (req, res) => {
    const params = req.body;
    // fixed
    
    if(params.user) {
      res.json({
        status:true,
        message: 'Record Saved !'
      })

    } else {
        
      
   
    }
  }
);



// Create Admin
router.post("/create_admin", (req, res) => {
  const params = req.body;

  const salt = bcrypt.genSaltSync(saltRounds);
  const hash = bcrypt.hashSync("admin123", salt);




  admin.auth()
  .createUser({
      email: 'admin@aurkuch.com',
      emailVerified: true,
      password: 'admin123',
      displayName: 'Admin',
      disabled: false,
  })
  .then((userRecord) => {
      // See the UserRecord reference doc for the contents of userRecord.
      console.log('Successfully created new user:', userRecord.uid);
      let newUser = userRef.doc(userRecord.uid);


      newUser
      .set({
        id: userRecord.uid,
        email: "admin@aurkuch.com",
        emailVerified: true,
        password: hash,
        fullname: "Admin",
        created: momenttimezone.tz("Asia/Karachi").valueOf(),
        disabled: false,
        type: "admin",
      })
      .then(() => {
        console.log("Document successfully written!");
        res.json({
          message: "Document successfully written!",
        });
      })
      .catch((error) => {
        console.error("Error writing document: ", error);
        res.json({
          message: error,
        });
      });
  })
  .catch((error) => {
      console.log('Error creating new user:', error);
  });





  
  // w5FJL6UwYiXcg4xwvW3BeCoqzR82

  // admin.auth()
  // .getUser('TeVD0G8fvJV1ynJsMdmLVKN8vqk2')
  // .then((userRecord) => {
  //     // See the UserRecord reference doc for the contents of userRecord.
  //     console.log(`Successfully fetched user data: ${userRecord.toJSON()}`);
  //     res.json({
  //         data:userRecord
  //     })
  // })
  // .catch((error) => {
  //     console.log('Error fetching user data:', error);
  // });
});

module.exports = router;
