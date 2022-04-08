const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { userRef, walletRef } = require("../../db/ref");
const bcrypt = require("bcrypt-nodejs");
const saltRounds = 10;
const { body, validationResult } = require("express-validator");

// Register User
router.post(
  "/register",
  body("fullname").isString().withMessage("fullname is invalid !"),
  body("email").isEmail().withMessage("email is invalid !"),
  body("phone").isMobilePhone().withMessage("phone is invalid !"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("password must be greater than 6 characters !"),
  body("confirmpassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Password confirmation does not match password");
    } else {
      // Indicates the success of this synchronous custom validator
      return true;
    }
  }),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  // Check User
  (req, res, next) => {
    const params = req.body;

    userRef
      .doc(params.email)
      .get()
      .then((doc) => {
        if (doc.exists) {
          res.json({
            status: false,
            error: "User Already Exists With This Email !",
          });
        } else {
          next();
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

    admin
      .auth()
      .createUser({
        email: params.email,
        emailVerified: false,
        password: params.password,
        displayName: params.fullname,
        disabled: false,
      })
      .then((userRecord) => {
        // See the UserRecord reference doc for the contents of userRecord.
        console.log("Successfully created new user:", userRecord.uid);

        userRef
          .doc(params.email)
          .set({
            id: userRecord.uid,
            email: params.email,
            emailVerified: false,
            password: params.password,
            fullname: params.fullname,
            created: admin.firestore.FieldValue.serverTimestamp(),
            disabled: false,
            googleAuthenticated: false,
            channelSubscribed: false,
            type: "user",
          })
          .then(() => {
            // Create Wallet
            walletRef
              .doc(params.email)
              .set({
                id: userRecord.uid,
                email: params.email,
                fullname: params.fullname,
                amount: 0,
                transactions: [],
                created: admin.firestore.FieldValue.serverTimestamp(),
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
                  error: err,
                });
              });
          })
          .catch((error) => {
            res.json({
              status: false,
              message: error,
            });
          });
      })
      .catch((error) => {
        res.json({
          status: false,
          message: error,
        });
      });
  }
);

// Create Admin
router.post("/create_admin", (req, res) => {
  const params = req.body;

  const salt = bcrypt.genSaltSync(saltRounds);
  const hash = bcrypt.hashSync("admin123", salt);

  userRef
    .doc("admin@aurkuch.com")
    .set({
      email: "admin@aurkuch.com",
      emailVerified: true,
      password: hash,
      fullname: "Admin",
      created: admin.firestore.FieldValue.serverTimestamp(),
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

  // admin.auth()
  // .createUser({
  //     email: 'admin@aurkuch.com',
  //     emailVerified: true,
  //     password: 'admin123',
  //     displayName: 'Admin',
  //     disabled: false,
  // })
  // .then((userRecord) => {
  //     // See the UserRecord reference doc for the contents of userRecord.
  //     console.log('Successfully created new user:', userRecord.uid);
  // })
  // .catch((error) => {
  //     console.log('Error creating new user:', error);
  // });
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
