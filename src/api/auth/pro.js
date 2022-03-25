// *******  LIBRARIES
const express = require("express");
const admin = require("firebase-admin");

const bcrypt = require("bcrypt-nodejs");

const saltRounds = 10;
const config = require("../../config/private.json");
const nodemailer = require("nodemailer");
const moment = require("moment-timezone");

// Twilio Client
const twilioCred = require("../../config/private").twilio;
const {
  default: strictTransportSecurity,
} = require("helmet/dist/middlewares/strict-transport-security");

const twillio_client = require("twilio")(
  config.twilio.accountSid,
  config.twilio.authToken
);

const {
  userRef,
  normalUserRef,
  proUserRef,
  driverRef,
  vendorRef,
  sessionsRef,
  forgetPasswordOTPRef,
  registrationOTPRef,
  proUserApplicationRef,
  walletRef,
} = require("../../db/ref");

const { proRef } = require("../../db/newRef");

// Helper Functions
const {
  sendProUserApplicationEmail,
  checkUserExistsUserApp,
  verifyTokenFirebase,
} = require("../../functions/slash");

const JWT_SECRET =
  "sdjkfh8923yhjdksbfma@#*(&@*!^#&@bhjb2qiuhesdbhjdsfg839ujkdhfjk";
const jwt = require("jsonwebtoken");

const { body, validationResult } = require("express-validator");

const router = express.Router();

// *********** PRO USER - POST REQUESTS ***********

//   {
//     "fullname":"fahad",
//     "email": "fahad@4slash.com",
//     "phone": "+923243288887",
//     "password": "fahad123"
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
  // (req,res,next) => {
  //   const params = req.body;



  //   registrationOTPRef.once('value', (snapshot)=>{
  //     if(snapshot.val())
  //     {
  //       const rawpreregistered = snapshot.val();
  //       const preregistered = [];
  //       const convert = Object.entries(rawpreregistered);

  //       convert.forEach((x)=>{
  //         preregistered.push(x[1])
  //       })

  //       console.log('preregistered -> ',preregistered)

  //       // filter by phone number

  //       const filterBYPhone = preregistered.filter((x)=>{
  //         return x.user.phone === params.phone
  //       })


  //       console.log('filterBYPhone -> ',filterBYPhone)

  //       if(filterBYPhone)
  //       {
  //         if(filterBYPhone.length !== 0)
  //         {
  //            res.json({
  //              status:false,
  //              error: 'OTP code already been sent to this phone number'
  //            })
  //         }

  //         if(filterBYPhone.length == 0) {
  //           req.body.driver = null;
  //           next()
  //         }
  //       }

  //     } else {
  //       next()
  //     }
  //   }) 
  // },
  (req, res) => {
    const params = req.body;
    twillio_client.lookups.v1
      .phoneNumbers(params.phone)
      .fetch()
      .then((phone_num) => {
        //  Check If User Exists
        userRef
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
                        verified: false,
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
                        // console.log(
                        //   `messageSid :${resData.sid || "???"} sent code`
                        // );
                        // console.log(code + " to " + `+${params["mob_no"]}`);
                        res.json({
                          status: true,
                          otp: code,
                        })
                      )
                      .catch((err) => console.log(err));
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
          .catch((err) => {
            res.json({
              status: false,
              error: err.message,
            });
          });
      })
      .catch((err) => {
        res.json({
          status: false,
          message: err.message,
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
  (req, res) => {
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
          let uid = 1;

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
            })
            .then(() => {
              walletRef
                .child(userData.phone)
                .set({
                  amount: "0",
                  type: "cash",
                })
                .then(() => {
                  const token = jwt.sign(
                    {
                      phone: userData.phone,
                      type: "pro",
                    },
                    JWT_SECRET
                  );
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
                            active: false,
                            token: token,
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
      })
      .catch((err) => {
        console.log("errror -> ", err.message);
      });
  }
);

// Send Pro User Application
router.post(
  "/send_application",
  // body("fullname")
  //   .isLength({ max: 20 })
  //   .withMessage("Fullname must be less than 20 characters"),
  // body("email").isEmail().withMessage("Invalid Email !"),
  // body("bussiness_name")
  //   .isLength({ max: 25 })
  //   .withMessage("bussiness_name must be less than 25 characters"),
  // body("bussiness_address")
  //   .isLength({ max: 25 })
  //   .withMessage("bussiness_address must be less than 25 characters"),
  // body("NTN")
  //   .isNumeric()
  //   .isLength({ min: 13, max: 13 })
  //   .withMessage("NTN is not valid"),
  // body("landline")
  //   .isMobilePhone()
  //   .withMessage("landline is not a valid phone number !"),
  // body("owner").isString().withMessage("owner is not valid !"),
  // body("point_of_contact")
  //   .isMobilePhone()
  //   .withMessage("point_of_contact is not valid !"),
  // body("cargo_volumne_per_month")
  //   .isNumeric()
  //   .withMessage("cargo_volumne_per_month is not valid !"),
  // body("credit_duration")
  //   .isNumeric()
  //   .withMessage("credit_duration is not valid !"),
  // body("credit_requirement_per_month")
  //   .isNumeric()
  //   .withMessage("credit_requirement_per_month is not valid !"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  verifyTokenFirebase,
  // Check User Type (User Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        req.body.user = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot sent a pro user application  !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot sent a pro user application !`,
        });
        break;
    }
  },
  (req, res) => {
    //   {
    //  "token": "",
    //   "fullname": "fahad",
    //   "email": "fahad@4slash.com",
    //   "bussiness_name": "fahad and co",
    //   "bussiness_address": "lalu khait",
    //   "NTN": "3243288887",
    //   "landline": "3243288887",
    //   "owner": "owner",
    //   "point_of_contact": "3243288887",
    //   "cargo_volumne_per_month": "3243288887",
    //   "credit_duration": "3243288887",
    //   "credit_requirement_per_month": "3243288887"
    // }

    const params = req.body;

    // SMTP Settings
    const subject = "New Pro User Application";
    const mail = sendProUserApplicationEmail(subject, params);

    proUserApplicationRef.once("value", (snapshot) => {
      if (snapshot.exists()) {
        const applications = snapshot.val();
        if (applications[params.user.user_id]) {
          const application = applications[params.user.user_id];
          const date = application.submittedOn;
          res.json({
            status: false,
            message: `Application Already Submitted By User On ${date}!`,
          });
        } else {
          mail
            .then(() => {
              proUserApplicationRef
                .child(params.user.user_id)
                .set({
                  ...params,
                  token: null,
                  user: null,
                  submittedOn: moment()
                    .tz("Asia/Karachi")
                    .format("MMMM Do YYYY, h:mm:ss a"),
                  status: "pending",
                })
                .then(() => {
                  // Sending User SMS Regarding The Application Receive
                  twillio_client.messages
                    .create(
                      {
                        messagingServiceSid:
                          "MG5d789b427b36967a17122347859e3e7e",
                        to: params.user.user_id,
                        from: config.twilio.phone,
                        body: "Thanks For Submitting Pro User Application. We have received it and reviewing it. We will notify you the status soon.",
                      },
                      (err, resData) => {
                        if (err) {
                          return res.json({
                            status: false,
                            message: err,
                          });
                        }
                      }
                    )
                    .catch((err) => {
                      res.json({
                        status: false,
                        error: err,
                      });
                    });
                  res.json({
                    status: true,
                    message:
                      "Application has been sent. it will be reviewed for 2-4 Bussiness Days.",
                  });
                })
                .catch((err) => {
                  res.json({
                    status: false,
                    message: err.message,
                  });
                });
            })
            .catch((error) => {
              res.json({
                status: false,
                level: "Error while sending email",
                error: error,
              });
            });
        }
      } else {
        proUserApplicationRef
          .child(params.user.user_id)
          .set({
            ...params,
            submittedOn: moment()
              .tz("Asia/Karachi")
              .format("MMMM Do YYYY, h:mm:ss a"),
            status: "pending",
          })
          .then(() => {
            // Sending User SMS Regarding The Application Receive
            twillio_client.messages
              .create(
                {
                  messagingServiceSid: "MG5d789b427b36967a17122347859e3e7e",
                  to: params.user.user_id,
                  from: config.twilio.phone,
                  body: "Thanks For Submitting Pro User Application. We have received it and reviewing it. We will notify you the status soon.",
                },
                (err, resData) => {
                  if (err) {
                    return res.json({
                      status: false,
                      message: err,
                    });
                  }
                }
              )
              .catch((err) => {
                res.json({
                  status: false,
                  error: err,
                });
              });
            res.json({
              status: true,
              message:
                "Application has been sent. it will be reviewed for 2-4 Bussiness Days.",
            });
          })
          .catch((err) => {
            res.json({
              status: false,
              message: err.message,
            });
          });
      }
    });
  }
);

module.exports = router;
