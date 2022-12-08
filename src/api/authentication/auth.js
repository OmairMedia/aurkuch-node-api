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
              message: 'Ok!'
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



// Register User
router.post(
  "/simple-register",
  // Check User
  (req, res, next) => {
    const params = req.body;

    try {
      admin.auth().getUserByEmail(params.email).then((userSnapshot)=>{
        res.json({
          status:false,
          error:'User already exist with this email!'
        })
      }).catch((err)=>{
        if(err.code === "auth/user-not-found") {
           next();
        } else {
          console.log(err);
          res.json({
            status:false,
            error:err
          })
        }
        
      })
    } catch (err) {
      console.log(err);
      res.json({
        status:false,
        error:err
      })
    }
  },
  // Register User
  (req, res) => {
    const params = req.body;
    
    admin.auth().createUser({
      email: params.email,
      emailVerified: false,
      phoneNumber: params.phoneNumber,
      password: params.password,
      displayName: params.displayName,
      disabled: false,
    })
    .then((userRecord) => {
      // See the UserRecord reference doc for the contents of userRecord.
      let uid = userRecord.uid;
      
      let data = {
        id: uid,
        email: params.email,
        phone: params.phoneNumber,
        emailVerified: false,
        displayName: params.displayName,
        created: momenttimezone.tz("Asia/Karachi").valueOf(),
        disabled: false,
        googleAuthenticated: false,
        channelSubscribed: false,
        phoneVerified:false,
        type: "user",
        blocked:false,
      };
      console.log('data -> ',data);

      userRef
         .child(uid)
         .set(data)
         .then(() => {
           // Create Wallet
           walletRef
             .child(uid)
             .set({
               id: uid,
               email: params.email,
               fullname: params.displayName,
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
              console.log('err -> ',err)

               res.json({
                 status: false,
                 error: err.message,
               });
             });
         })
         .catch((err) => {
          console.log('err -> ',err)
           res.json({
             status: false,
             message: err,
           });
         });

    })
    .catch((err) => {
      console.log(err);
          res.json({
            status:false,
            error:err
          })
    });
  
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


// channelSubscribed api
router.post("/channelSubscribed", (req, res) => {
  const params = req.body;
  
  userRef
    .child(params.id)
    .once('value', (snapshot) => {
      if(snapshot.val()) {
        const user = snapshot.val();
        res.json({
          status:true,
          data:user
        })
      } else {
        res.json({
          status:false,
          error:'User not found!'
        })
      }
    })
});

module.exports = router;
