// *******  LIBRARIES
const express = require("express");
const admin = require("firebase-admin");
const bcrypt = require("bcrypt-nodejs");
const moment = require("moment-timezone");
const {
  userRef,
  normalUserRef,
  proUserRef,
  driverRef,
  vendorRef,
  sessionsRef,
  forgetPasswordOTPRef,
  registrationOTPRef,
  walletRef,
} = require("../../db/ref");
const {
  proRef,
  usersRef,
} = require("../../db/newRef");
// const DBs = require("../../db/db");

const saltRounds = 10;
const config = require("../../config/private.json");
// Twilio Client
const twilioCred = require("../../config/private").twilio;
const { body, validationResult } = require("express-validator");

const twillio_client = require("twilio")(
  config.twilio.accountSid,
  config.twilio.authToken
);

const JWT_SECRET =
  "sdjkfh8923yhjdksbfma@#*(&@*!^#&@bhjb2qiuhesdbhjdsfg839ujkdhfjk";
const jwt = require("jsonwebtoken");

// Helper Functions
const { checkUserExistsUserApp } = require("../../functions/slash");

const router = express.Router();

// *********** USER AUTHENTICATION GET REQUESTS ***********

router.get("/", (req, res) => {
  res.json(["😀", "😳", "🙄"]);
});

// *********** USER AUTHENTICATION POST REQUESTS ***********

// Sending OTP Code / User Data Stored In  -> sms/register

//   {
//     "fullname":"fahad",
//     "email": "fahad@4slash.com",
//     "phone": "+923243288887",
//     "password": "fahad123",
//     "pro": false
// }
router.post(
  "/send_register_otp",
  body("fullname")
    .isLength({ max: 20 })
    .withMessage("Fullname must be less than 20 characters"),
  body("email").isEmail().withMessage("Invalid Email !"),
  body("phone").custom((value) => {
    function isValidPhonenumber(value) {
      return (/^\d{7,}$/).test(value.replace(/[\s()+\-\.]|ext/gi, ''));
    }

    if (isValidPhonenumber(value)) {
      return Promise.resolve();

    } else {
      return Promise.reject('Phone Number is not international');
    }
  }),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password Must Be 6 Characters at least!"),
  body("pro")
    .isBoolean()
    .withMessage("Pro Should be boolean!"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  checkUserExistsUserApp,
  (req, res, next) => {
    const params = req.body;

    console.log(params)

    twillio_client.lookups.v1
      .phoneNumbers(params.phone)
      .fetch()
      .then((phone_num) => {
        //  Check If User Exists !

        if (params.pro) {
          userRef
            .child("pro")
            .child(params.phone)
            .get()
            .then((snapshot) => {
              if (snapshot.exists()) {
                res.json({
                  status: false,
                  message: "User already Exists With The Given Phone Number",
                });
              } else {
                // Send OTP SMS
                const code = Math.floor(Math.random() * 9000) + 1000;
                twillio_client.messages
                  .create(
                    {
                      messagingServiceSid: "MG5d789b427b36967a17122347859e3e7e",
                      to: params.phone,
                      from: config.twilio.phone,
                      body: `Welcome To Meribilty, Your User Registration OTP Code is ${code}`,
                    },
                    (err, resData) => {
                      if (err) {
                        return res.json({
                          status: false,
                          message: err,
                        });
                      }
                      // Bcrypt The Password Here ....
                      const salt = bcrypt.genSaltSync(saltRounds);
                      const hash = bcrypt.hashSync(params.password, salt);

                      const data = {
                        user: {
                          email: params.email,
                          password: hash,
                          fullname: params.fullname,
                          phone: params.phone,
                          type: "user",
                          user_type: "user",
                          form: params.pro ? "pro" : "user",
                          verified: false,
                          application_status: false
                        },
                        messageID: resData.sid,
                        created: moment()
                          .tz("Asia/Karachi")
                          .format("MMMM Do YYYY, h:mm:ss a"),
                        to: params.phone,
                        code,
                        status: "queued",
                        retry: 0,
                      };

                      const addsms = registrationOTPRef.child(code);
                      addsms
                        .set(data)
                        .then(() =>

                          res.json({
                            status: true,
                            otp: code,
                          })
                        )
                        .catch((err) => console.log(err.message));
                    }
                  )
                  .catch((err) => {
                    res.json({
                      status: false,
                      error: err.message,
                    });
                  });
              }
            })
            .catch((err) => {
              res.json({
                status: false,
                error: err.message,
              });
            });
        } else {
          userRef
            .child("users")
            .child(params.phone)
            .get()
            .then((snapshot) => {
              if (snapshot.exists()) {
                res.json({
                  status: false,
                  message: "User Already Exists On This Phone Number !",
                });
              } else {
                // Send OTP SMS
                const code = Math.floor(Math.random() * 9000) + 1000;
                twillio_client.messages
                  .create(
                    {
                      messagingServiceSid: "MG5d789b427b36967a17122347859e3e7e",
                      to: params.phone,
                      from: config.twilio.phone,
                      body: `Welcome To Meribilty, Your Register OTP Code is ${code}`,
                    },
                    (err, resData) => {
                      if (err) {
                        return res.json({
                          status: false,
                          message: err,
                        });
                      }
                      // Bcrypt The Password Here ....

                      const data = {
                        user: {
                          ...params,
                          user_type: "user",
                          type: "user",
                          verified: false,
                          form: params.pro ? "pro" : "user",
                        },
                        messageID: resData.sid,
                        created: moment()
                          .tz("Asia/Karachi")
                          .format("MMMM Do YYYY, h:mm:ss a"),
                        to: params.phone,
                        code,
                        status: "queued",
                        retry: 0,
                      };

                      const addsms = registrationOTPRef.child(code);
                      addsms
                        .set(data)
                        .then(() =>
                          res.json({
                            status: true,
                            otp: code,
                          })
                        )
                        .catch((err) =>
                          res.json({
                            status: false,
                            error: err.message,
                          })
                        );
                    }
                  )
                  .catch((err) => {
                    res.json({
                      status: false,
                      error: err,
                    });
                  });
              }
            })
            .catch((error) => {
              res.json({
                status: false,
                error: error.message,
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
  }
);

// OTP Verification / OTP Record Remove / User Creation
router.post(
  "/register_after_otp",
  body("otp").isNumeric().withMessage("Please enter a valid otp"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  (req, res, next) => {
    //  @Data in Request Body
    //   {
    //     "otp":"77754",
    //   }

    const { otp } = req.body;

    registrationOTPRef
      .orderByChild("code")
      .equalTo(parseInt(otp))
      .once("value")
      .then(async (userSnap) => {
        const data = userSnap.val();
        if (data == null) {
          res.json({
            status: false,
            message: "Verification Failed !",
          });
        } else {
          // console.log("User Is -> ", data);
          const userData = data[otp].user;
          // console.log("This is user data -> ", userData);

          // See the UserRecord reference doc for the contents of userRecord.

          let uid = 1;

          const salt = bcrypt.genSaltSync(saltRounds);
          const hash = bcrypt.hashSync(userData.password, salt);

          if (userData.form === 'user') {
            await usersRef
              .limitToLast(1)
              .once("value", (snapshot) => {
                if (snapshot.val()) {
                  uid = ((parseInt(Object.entries(snapshot.val())[0][1].id)) + 1);
                }
              })

            userRef
              .child("users")
              .child(userData.phone)
              .set({
                ...userData,
                password: hash,
                id: uid,
                created: moment()
                  .tz("Asia/Karachi")
                  .format("MMMM Do YYYY, h:mm:ss a"),
                verified: true,
                blocked: false
              })
              .then(() => {
                walletRef
                  .child("users")
                  .child(userData.phone)
                  .set({
                    amount: "-100",
                    type: "cash",
                    transactions: []
                  })
                  .then(() => {


                    const additionalClaims = {
                      user_type: "user",
                    };

                    admin.auth()
                      .createCustomToken(userData.phone, additionalClaims)
                      .then((customToken) => {

                        sessionsRef
                          .child("users")
                          .child(userData.phone)
                          .set({
                            phone: userData.phone,
                            type: "user",
                            lastLogin: moment()
                              .tz("Asia/Karachi")
                              .format("MMMM Do YYYY, h:mm:ss a"),
                            active: true,
                          })
                          .then(() => {
                            registrationOTPRef
                              .child(parseInt(otp))
                              .remove()
                              .then(() => {
                                res.json({
                                  status: true,
                                  message: "User Created Successfully ! ",
                                  active: true,
                                  application: false,
                                  token: customToken,
                                });
                              });
                          })
                          .catch((err) => {
                            res.json({
                              status: false,
                              error: err.message,
                            });
                          });

                      })
                  })
                  .catch((error) => {
                    res.json({
                      status: false,
                      error: error.message,
                    });
                  });
              })
              .catch((err) => {
                res.json({
                  status: false,
                  message: "Data could not be saved. ",
                  error: err.message,
                });
              });
          } else if (userData.form === 'pro') {

            await proRef
              .limitToLast(1)
              .once("value", (snapshot) => {
                if (snapshot.val()) {
                  uid = ((parseInt(Object.entries(snapshot.val())[0][1].id)) + 1);
                }
              })

            userRef
              .child("pro")
              .child(userData.phone)
              .set({
                ...userData,
                id: uid,
                created: moment()
                  .tz("Asia/Karachi")
                  .format("MMMM Do YYYY, h:mm:ss a"),
                verified: true,
                application_status: false,
                blocked: false
              })
              .then(() => {
                walletRef
                  .child("users")
                  .child(userData.phone)
                  .set({
                    amount: "0",
                    type: "cash",
                    transactions: []
                  })
                  .then(() => {
                    // const token = jwt.sign(
                    //   {
                    //     phone: userData.phone,
                    //     type: "pro",
                    //   },
                    //   JWT_SECRET
                    // );
                    const additionalClaims = {
                      user_type: "user",
                    };

                    admin.auth()
                      .createCustomToken(userData.phone, additionalClaims)
                      .then((customToken) => {

                        sessionsRef
                          .child("pro")
                          .child(userData.phone)
                          .set({
                            phone: userData.phone,
                            type: "pro",
                            lastLogin: moment()
                              .tz("Asia/Karachi")
                              .format("MMMM Do YYYY, h:mm:ss a"),
                            active: true,
                          })
                          .then(() => {
                            registrationOTPRef
                              .child(parseInt(otp))
                              .remove()
                              .then(() => {
                                res.json({
                                  status: true,
                                  message: "Pro User Created Successfully ! ",
                                  application: userData.application_status,
                                  active: userData.password ? true : false,
                                  token: customToken,
                                });
                              });
                          })
                          .catch((err) => {
                            res.json({
                              status: false,
                              error: err.message,
                            });
                          });

                      }
                      )


                  })
                  .catch((error) => {
                    res.json({
                      status: false,
                      error: error.message,
                    });
                  });
              })
              .catch((err) => {
                res.json({
                  status: false,
                  message: "Error creating user ",
                  error: err.message,
                });
              });
          }
        }
      })
      .catch((err) => {
        res.json({
          status: false,
          message: err.message,
        });
      });
  }
);

module.exports = router;
