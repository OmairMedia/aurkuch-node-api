// *******  LIBRARIES
const express = require("express");
const admin = require("firebase-admin");
const moment = require("moment-timezone");

const bcrypt = require("bcrypt-nodejs");

const config = require("../config/private.json");
const { body, validationResult } = require("express-validator");

const twillio_client = require("twilio")(
  config.twilio.accountSid,
  config.twilio.authToken
);
const _ = require("lodash");
const {
  userRef,
  forgetPasswordOTPRef,
  invitedOTPRef,
  walletRef,
  sessionsRef
} = require("../db/ref");

const {
  pplRequestRef,
  scmRequestRef,
  pplCommission,
  pplInvoiceRef,
  pplVehiclesRef,
  pplVehicleTypeRef,
  pplMaterialsListRef,
  pplUserCounterRef,
  pplSettingsRef,
  pplVendorVehicleRef,
  pplCancellationReasonRef,
  pplBiddingsRef,
  pplVendorToVendorRequestRef,
  pplTemporary,
  pplUserVehicleSelections,
  pplRoutesEstimation,
} = require("../db/newRef");

const saltRounds = 10;

const {
  verifyToken,
  checkUserExists,
  verifyTokenVendorApp,
  verifyTokenFirebase
} = require("../functions/slash");

const { Storage } = require("@google-cloud/storage");
const storage = new Storage({
  keyFilename: "src/config/serviceAccount.json",
});

const bucket = storage.bucket("meribilty-files");

const JWT_SECRET =
  "sdjkfh8923yhjdksbfma@#*(&@*!^#&@bhjb2qiuhesdbhjdsfg839ujkdhfjk";
const jwt = require("jsonwebtoken");

const router = express.Router();

// *********** USER AUTHENTICATION POST REQUESTS ***********

// user_login_1
router.post(
  "/user_login_1",
  body("phone").custom((value) => {
    function isValidPhonenumber(value) {
      return /^\d{7,}$/.test(value.replace(/[\s()+\-\.]|ext/gi, ""));
    }

    if (isValidPhonenumber(value)) {
      return Promise.resolve();
    } else {
      return Promise.reject("Phone Number is not international");
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
  // Check In Users
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user_type = "user";
          req.body.user = user;

          if (user.password) {

            // Create Session
            sessionsRef
              .child("users")
              .child(user.phone)
              .set({
                phone: user.phone,
                type: "user",
                lastLogin: moment()
                  .tz("Asia/Karachi")
                  .format("MMMM Do YYYY, h:mm:ss a"),
                active: true,
              }).then(() => {

                res.json({
                  status: true,
                  type: "user",
                  active: true,
                  application: false,

                });

              }).catch((err) => {
                res.json({
                  status: false,
                  error: err.message
                })
              })

          } else {
            // Send OTP SMS
            const code = Math.floor(Math.random() * 9000) + 1000;
            // const destinationPhone = user.phone;
            // const messageConfig = {
            //   messagingServiceSid: "MG5d789b427b36967a17122347859e3e7e",
            //   to: destinationPhone,
            //   from: config.twilio.phone,
            //   body: `Welcome To Meribilty, Verify Your OTP Code is ${code} And Set Your Password !`,
            // };

            // const message = await client.messages.create(messageConfig);


            twillio_client.messages
              .create(
                {
                  messagingServiceSid: "MG5d789b427b36967a17122347859e3e7e",
                  to: req.body.user.phone,
                  from: config.twilio.phone,
                  body: `Welcome To Meribilty, Verify Your OTP Code is ${code} And Set Your Password !`,
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
                    messageID: resData.sid,
                    created: moment()
                      .tz("Asia/Karachi")
                      .format("MMMM Do YYYY, h:mm:ss a"),
                    to: req.body.user.phone,
                    type: "user",
                    code,
                  };

                  const addsms = invitedOTPRef.child(code);
                  addsms
                    .set(data)
                    .then(() =>
                      res.json({
                        status: true,
                        type: "user",
                        active: false,
                        application: false,
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
                  error: err.message,
                });
              });
          }

        } else {
          req.body.user = null;
          next();
        }
      });
  },
  // Check In Pro
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("pro")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const pro = snapshot.val();

          req.body.pro = pro;
          req.body.user_type = pro.type;
          req.body.application = pro.application_status;

          if (pro.password) {
            res.json({
              status: true,
              type: req.body.user_type,
              active: true,
              application: req.body.application,
            });
          } else {
            // Send OTP SMS
            const code = Math.floor(Math.random() * 9000) + 1000;
            twillio_client.messages
              .create(
                {
                  messagingServiceSid: "MG5d789b427b36967a17122347859e3e7e",
                  to: pro.phone,
                  from: config.twilio.phone,
                  body: `Welcome To Meribilty, Verify Your OTP Code is ${code} And Set Your Password !`,
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
                    messageID: resData.sid,
                    created: moment()
                      .tz("Asia/Karachi")
                      .format("MMMM Do YYYY, h:mm:ss a"),
                    to: pro.phone,
                    type: pro.type,
                    code,
                  };

                  const addsms = invitedOTPRef.child(code);
                  addsms
                    .set(data)
                    .then(() =>
                      res.json({
                        status: true,
                        type: req.body.user_type,
                        active: false,
                        application: req.body.application,
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
                  error: err.message,
                });
              });
          }

        } else {
          req.body.pro = null;
          next();
        }
      });
  },
  (req, res) => {
    res.json({
      status: false,
      error: "User Not Found !",
    });
  }
);

// validate Invited User
router.post(
  "/validate_invited",
  body("otp").isLength({ min: 4 }).withMessage("otp must be 4 digits !"),
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
    const params = req.body;

    invitedOTPRef
      .orderByChild("code")
      .equalTo(parseInt(params.otp))
      .once("value")
      .then((userSnap) => {
        const data = userSnap.val();
        if (data == null) {
          res.json({
            status: false,
            message: "Verification Failed !",
          });
        } else {
          // console.log("User Is -> ", data);
          const userData = data[params.otp];
          console.log("This is user data -> ", userData);

          if (userData.type == "user" || userData.type == "pro") {
            if (userData) {
              invitedOTPRef
                .child(params.otp)
                .remove()
                .then(() => {
                  res.json({
                    status: true,
                    message: "success",
                    type: "user",
                  });
                })
                .catch((err) => {
                  res.json({
                    status: false,
                    error: err.message,
                  });
                });
            } else {
              res.json({
                status: false,
                error: "User Not Found !",
              });
            }
          }

          if (userData.type == "driver") {
            if (userData) {
              invitedOTPRef
                .child(params.otp)
                .remove()
                .then(() => {
                  res.json({
                    status: true,
                    message: "success",
                    type: userData.type,
                  });
                })
                .catch((err) => {
                  res.json({
                    status: false,
                    error: err.message,
                  });
                });
            } else {
              res.json({
                status: false,
                error: "User Not Found !",
              });
            }
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

// set_password_firsttime
router.post(
  "/set_user_password_firsttime",
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be 6 Characters !"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  // Check In User
  (req, res, next) => {
    const params = req.body;

    console.log('params -> ', params)

    userRef
      .child("users")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();

          console.log('user -> ', user)

          if (user.password) {
            res.json({
              status: false,
              error: "User Already Have Password"
            })
          } else {
            // TODO: CHeck
            // Create Password For Driver
            const salt = bcrypt.genSaltSync(saltRounds);
            const hash = bcrypt.hashSync(params.password, salt);

            const additionalClaims = {
              user_type: user.type,
            };

            admin.auth()
              .createCustomToken(params.phone, additionalClaims)
              .then((customToken) => {
                userRef
                  .child("users")
                  .child(user.phone)
                  .update({
                    password: hash,
                    verified: true,
                  })
                  .then(() => {
                    res.json({
                      status: true,
                      message: `Password has been added. You are now logged in!`,
                      type: user.type,
                      active: true,
                      application: false,
                      token: customToken,
                      profile: {
                        ...user,
                        password: null
                      }
                    });
                  })
                  .catch((err) => {
                    res.json({
                      status: false,
                      error: err.message,
                    });
                  });
              })
          }
        } else {
          userRef
            .child("pro")
            .child(params.phone)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const pro = snapshot.val();

                if (pro.password) {
                  res.json({
                    status: false,
                    error: "User Already Have Password"
                  })
                } else {
                  // Create Password For Driver
                  const salt = bcrypt.genSaltSync(saltRounds);
                  const hash = bcrypt.hashSync(params.password, salt);

                  const additionalClaims = {
                    user_type: pro.type,
                  };

                  admin.auth()
                    .createCustomToken(params.phone, additionalClaims)
                    .then((customToken) => {

                      userRef
                        .child("pro")
                        .child(pro.phone)
                        .update({
                          password: hash,
                        })
                        .then(() => {
                          res.json({
                            status: true,
                            message: `${params.password} has been added as your password. You are now logged in!`,
                            active: true,
                            type: pro.type,
                            application: pro.application_status,
                            token: customToken,
                            profile: {
                              ...pro,
                              password: null
                            }
                          });

                        })
                        .catch((err) => {
                          res.json({
                            status: false,
                            error: err.message,
                          });
                        });
                    })
                }
              } else {
                res.json({
                  status: false,
                  error: "User Not Found !"
                })

              }
            });
        }
      });

  }
);

// user_login_2
router.post(
  "/user_login_2",
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be 6 Characters !"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  // Check In User
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();

          if (user.password) {
            // Check Password Is Correct
            const check = bcrypt.compareSync(
              params.password,
              user.password
            );

            if (check) {


              const additionalClaims = {
                user_type: "user",
              };

              admin.auth()
                .createCustomToken(params.phone, additionalClaims)
                .then((customToken) => {
                  res.json({
                    status: true,
                    message: `Success !`,
                    type: "user",
                    application: user.application_status,
                    token: customToken,
                    profile: {
                      ...user,
                      password: null
                    }
                  });

                })

            } else {
              res.json({
                status: false,
                message: "Password Is Incorrect !",
              });
            }
          } else {
            // TODO: CHeck
            // Create Password For Driver
            const salt = bcrypt.genSaltSync(saltRounds);
            const hash = bcrypt.hashSync(params.password, salt);

            userRef
              .child("users")
              .child(user.phone)
              .update({
                password: hash,
                verified: true,
              })
              .then(() => {
                res.json({
                  status: true,
                  message: `${params.password} has been added as your password. You are now logged in!`,
                  type: "user",
                });
              })
              .catch((err) => {
                res.json({
                  status: false,
                  error: err.message,
                });
              });
          }
        } else {
          userRef
            .child("pro")
            .child(params.phone)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const pro = snapshot.val();

                if (pro.password) {
                  // Check Password Is Correct
                  const check = bcrypt.compareSync(params.password, pro.password);

                  if (check) {
                    const additionalClaims = {
                      user_type: pro.type,
                    };

                    admin.auth()
                      .createCustomToken(params.phone, additionalClaims)
                      .then((customToken) => {
                        res.json({
                          status: true,
                          message: `Success !`,
                          type: pro.type,
                          application: pro.application_status,
                          token: customToken,
                          profile: {
                            ...pro,
                            password: null
                          }
                        });
                      })
                  } else {
                    res.json({
                      status: false,
                      message: "Password Is Incorrect !",
                    });
                  }
                } else {
                  // Create Password For Driver
                  const salt = bcrypt.genSaltSync(saltRounds);
                  const hash = bcrypt.hashSync(params.password, salt);

                  userRef
                    .child("pro")
                    .child(pro.phone)
                    .update({
                      password: hash,
                    })
                    .then(() => {
                      res.json({
                        status: true,
                        message: `${params.password} has been added as your password. You are now logged in!`,
                        type: "pro",
                      });
                    })
                    .catch((err) => {
                      res.json({
                        status: false,
                        error: err.message,
                      });
                    });
                }
              } else {
                req.body.pro = null;
                next();
              }
            });
        }
      });


  }
);

// vendor_login_1
router.post(
  "/vendor_login_1",
  body("phone").custom((value) => {
    function isValidPhonenumber(value) {
      return /^\d{7,}$/.test(value.replace(/[\s()+\-\.]|ext/gi, ""));
    }

    if (isValidPhonenumber(value)) {
      return Promise.resolve();
    } else {
      return Promise.reject("Phone Number is not international");
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
  // Check In Drivers
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("drivers")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const driver = snapshot.val();
          req.body.user_type = "driver";
          req.body.driver = driver;


          const additionalClaims = {
            user_type: "driver",
          };

          admin.auth()
            .createCustomToken(req.body.driver.phone, additionalClaims)
            .then((customToken) => {

              if (driver.password) {
                sessionsRef
                  .child("drivers")
                  .child(req.body.driver.phone)
                  .set({
                    phone: req.body.driver.phone,
                    type: "driver",
                    lastLogin: moment()
                      .tz("Asia/Karachi")
                      .format("MMMM Do YYYY, h:mm:ss a"),
                    active: true,
                  }).then(() => {
                    res.json({
                      status: true,
                      type: "driver",
                      active: true,
                      // token: customToken,
                    });
                  }).catch((err) => {
                    res.json({
                      status: false,
                      error: err.message
                    })
                  })

              } else {
                const code = Math.floor(Math.random() * 9000) + 1000;
                twillio_client.messages
                  .create(
                    {
                      messagingServiceSid: "MG5d789b427b36967a17122347859e3e7e",
                      to: driver.phone,
                      from: config.twilio.phone,
                      body: `Welcome To Meribilty, Verify Your OTP Code is ${code} And Set Your Password !`,
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
                        type: "invited",
                        messageID: resData.sid,
                        created: moment()
                          .tz("Asia/Karachi")
                          .format("MMMM Do YYYY, h:mm:ss a"),
                        to: driver.phone,
                        type: "driver",
                        code,
                      };

                      const addsms = invitedOTPRef.child(code);
                      addsms
                        .set(data)
                        .then(() =>
                          res.json({
                            status: true,
                            type: "driver",
                            active: false,
                            // token: customToken,
                          })
                        )
                        .catch((err) =>
                          res.json({
                            status: false,
                            error: err,
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


        } else {
          req.body.driver = null;
          next();
        }
      });
  },
  // Check In Vendors
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("vendors")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const driver = snapshot.val();
          req.body.user_type = "vendors";
          req.body.vendor = driver;


          const additionalClaims = {
            user_type: "vendor",
          };

          admin.auth()
            .createCustomToken(req.body.vendor.phone, additionalClaims)
            .then((customToken) => {

              if (driver.registration_step == 2) {
                res.json({
                  status: true,
                  type: "vendor",
                  active: true,
                  // token: customToken,
                });
              } else {
                res.json({
                  status: true,
                  type: "vendor",
                  active: true,
                  // token: customToken,
                });
              }

            })


        } else {
          req.body.vendor = null;
          next();
        }
      });
  },
  (req, res) => {
    res.json({
      status: false,
      error: "User Not Found !",
    });
  }
);

// vendor_login_2
router.post(
  "/vendor_login_2",
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be 6 Characters !"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  // Check In Drivers
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("drivers")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const driver = snapshot.val();

          if (driver.password) {
            // Check Password Is Correct
            const check = bcrypt.compareSync(params.password, driver.password);

            if (check) {
              const additionalClaims = {
                user_type: "driver",
              };

              admin.auth()
                .createCustomToken(params.phone, additionalClaims)
                .then((customToken) => {

                  res.json({
                    status: true,
                    message: `Signin Successfull !`,
                    type: "driver",
                    token: customToken,
                    profile: {
                      ...driver,
                      password: null
                    }
                  });

                })

            } else {
              res.json({
                status: false,
                message: "Password Is Incorrect !",
              });
            }
          } else {
            // Create Password For Driver
            const salt = bcrypt.genSaltSync(saltRounds);
            const hash = bcrypt.hashSync(params.password, salt);

            userRef
              .child("drivers")
              .child(driver.phone)
              .update({
                password: hash,
                verified: true,
              })
              .then(() => {
                res.json({
                  status: true,
                  message: `${params.password} has been added as your password successfully !`,
                });
              })
              .catch((err) => {
                res.json({
                  status: false,
                  error: err.message,
                });
              });
          }
        } else {
          req.body.driver = null;
          next();
        }
      });
  },
  // Check In Vendors
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("vendors")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const driver = snapshot.val();

          if (driver.password) {
            // Check Password Is Correct
            const check = bcrypt.compareSync(params.password, driver.password);

            if (check) {
              const additionalClaims = {
                user_type: "vendor",
              };

              admin.auth()
                .createCustomToken(params.phone, additionalClaims)
                .then((customToken) => {

                  res.json({
                    status: true,
                    message: `success !`,
                    type: "vendor",
                    token: customToken,
                    profile: {
                      ...driver,
                      password: null
                    }
                  });

                })
            } else {
              res.json({
                status: false,
                message: "Password Is Incorrect !",
              });
            }
          } else {
            // Create Password For Vendor

            const salt = bcrypt.genSaltSync(saltRounds);
            const hash = bcrypt.hashSync(params.password, salt);

            userRef
              .child("vendors")
              .child(driver.phone)
              .update({
                password: hash,
                verified: true,
              })
              .then(() => {
                res.json({
                  status: true,
                  message: `${params.password} has been added as your password. You are now logged in!`,
                  type: params.user.user_type,
                });
              })
              .catch((err) => {
                res.json({
                  status: false,
                  error: err.message,
                });
              });
          }
        } else {
          req.body.vendors = null;
          next();
        }
      });
  },
  (req, res) => {
    res.json({
      status: false,
      error: "User Not Found !",
    });
  }
);

// set_driver_password_firsttime
router.post(
  "/set_driver_password_firsttime",
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be 6 Characters !"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  // Check In User
  (req, res, next) => {
    const params = req.body;

    console.log('params -> ', params)

    userRef
      .child("drivers")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();

          console.log('user -> ', user)

          if (user.password) {
            res.json({
              status: false,
              error: "User Already Have Password"
            })
          } else {
            // TODO: CHeck
            // Create Password For Driver
            const salt = bcrypt.genSaltSync(saltRounds);
            const hash = bcrypt.hashSync(params.password, salt);

            const additionalClaims = {
              user_type: user.type,
            };

            admin.auth()
              .createCustomToken(params.phone, additionalClaims)
              .then((customToken) => {
                userRef
                  .child("drivers")
                  .child(user.phone)
                  .update({
                    password: hash,
                    verified: true,
                  })
                  .then(() => {
                    res.json({
                      status: true,
                      message: `Password has been added. You are now logged in!`,
                      type: user.type,
                      active: true,
                      token: customToken,
                      profile: {
                        ...user,
                        password: null
                      }
                    });
                  })
                  .catch((err) => {
                    res.json({
                      status: false,
                      error: err.message,
                    });
                  });
              })
          }
        } else {
          res.json({
            status: false,
            error: "Driver Not Found"
          })
        }
      });

  }
);


// Sending Forgot Password OTP \ User Data is saved with sms message record
router.post(
  "/user_app_forgot_password",
  // Check Users
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          next();
        } else {
          userRef
            .child("pro")
            .child(params.phone)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                req.body.user = user;
                next();
              } else {
                res.json({
                  status: false,
                  error: "User Not Found !",
                });
              }
            });
        }
      });
  },
  // Check User Type
  (req, res, next) => {
    const params = req.body;

    if (params.user.user_type == "user") {
      if (params.user.password) {
        const code = Math.floor(Math.random() * 9000) + 1000;

        const setData = {
          user: req.body.user.phone,
          phone: params.phone,
          token: code,
          type: "user",
          created: moment()
            .tz("Asia/Karachi")
            .format("MMMM Do YYYY, h:mm:ss a"),
        };

        forgetPasswordOTPRef.child(code).set(setData, (err) => {
          if (err) {
            return res.json({
              status: false,
              message: err.message,
            });
          }

          twillio_client.messages
            .create(
              {
                messagingServiceSid: "MG5d789b427b36967a17122347859e3e7e",
                to: params.phone,
                from: config.twilio.phone,
                body: `Forgot Password Token is: ${code}`,
              },
              (err, resData) => {
                if (err) {
                  return res.json({
                    status: false,
                    message: { err },
                  });
                }
                return res.json({
                  status: true,
                  user_type: "user",
                  otp: code,
                });
              }
            )
            .catch((err) => {
              res.json({
                status: false,
                error: { err },
              });
            });
        });
      } else {
        res.json({
          status: false,
          error:
            "You have not set password for your phone number . Please login and verify your phone first.",
        });
      }
    } else if (params.user.user_type == "pro") {
      if (params.user.password) {
        const code = Math.floor(Math.random() * 9000) + 1000;

        const setData = {
          user: req.body.user.phone,
          phone: params.phone,
          token: code,
          type: "pro",
          created: moment()
            .tz("Asia/Karachi")
            .format("MMMM Do YYYY, h:mm:ss a"),
        };

        forgetPasswordOTPRef.child(code).set(setData, (err) => {
          if (err) {
            return res.json({
              status: false,
              message: err.message,
            });
          }

          twillio_client.messages
            .create(
              {
                messagingServiceSid: "MG5d789b427b36967a17122347859e3e7e",
                to: params.phone,
                from: config.twilio.phone,
                body: `Forgot Password Token is: ${code}`,
              },
              (err, resData) => {
                if (err) {
                  return res.json({
                    status: false,
                    message: { err },
                  });
                }
                return res.json({
                  status: true,
                  user_type: "pro",
                  otp: code,
                });
              }
            )
            .catch((err) => {
              res.json({
                status: false,
                error: { err },
              });
            });
        });
      } else {
        res.json({
          status: false,
          error:
            "You have not set password for your phone number . Please login and verify your phone first.",
        });
      }
    } else {
      res.json({
        status: false,
        error: "conditional error",
      });
    }
  }
);

// Verify Forgot Password 
router.post("/verify-forgot-password",
  // Verify OTP
  (req, res) => {
    const params = req.body;
    forgetPasswordOTPRef
      .child(parseInt(params.otp))
      .once("value", (snap) => {
        const data = snap.val();

        // console.log("Data -> ", data);
        if (data !== null) {
          const phone = data.user;
          const userType = data.type;

          console.log('user -> ', data)
          // Encrypting Password

          forgetPasswordOTPRef
            .child(params.otp)
            .remove()
            .then(() => {
              res.json({
                status: true,
                message: "OTP Verified",
                phone: phone,
                type: userType
              })
            })
            .catch((err) =>
              res.json({
                status: false,
                message: err.message,
              })
            );



          // User Record Edit
        } else {
          res.json({
            status: false,
            message: "Invalid OTP Code",
          });
        }
      })
  }
)

// After Forgot Password -> Updates New Password To User Record
router.post("/user_app_new_password",
  // Check User 
  (req, res, next) => {
    const params = req.body;

    userRef.child("users").child(params.phone).once('value', (snapshot) => {
      if (snapshot.val()) {
        const user = snapshot.val();
        req.body.user = user;
        req.body.userType = "user";
        next();
      } else {
        userRef.child("pro").child(params.phone).once('value', (snapshot) => {
          if (snapshot.val()) {
            const user = snapshot.val();
            req.body.user = user;
            req.body.userType = "pro";
            next();
          } else {
            res.json({
              status: false,
              error: "Phone not registered with any user"
            })
          }
        })
      }
    })
  },
  (req, res) => {
    // const phone = req.body.phone;
    // const type = req.body.type;
    const params = req.body;

    if (params.userType === 'pro') {
      const salt = bcrypt.genSaltSync(saltRounds);
      const newHash = bcrypt.hashSync(params.password, salt);
      userRef
        .child("pro")
        .child(params.phone)
        .update({
          password: newHash,
        })
        .then(() => {
          res.json({
            status: true,
            message: "Password Updated Successfully"
          })
        })
        .catch((err) =>
          res.json({
            status: false,
            message: err.message,
          })
        );

    } else if (params.userType === 'user') {
      const salt = bcrypt.genSaltSync(saltRounds);
      const newHash = bcrypt.hashSync(params.password, salt);
      userRef
        .child("users")
        .child(params.phone)
        .update({
          password: newHash,
        })
        .then(() => {
          res.json({
            status: true,
            message: "Password Updated Successfully"
          })
        })
        .catch((err) =>
          res.json({
            status: false,
            message: err.message,
          })
        );
    } else {
      res.json({
        status: false,
        error: "Unknown User Type"
      })
    }



  });

// Sending Forgot Password OTP \ User Data is saved with sms message record
router.post(
  "/driver_app_forgot_password",
  // (req,res,next) => {
  //   const params = req.body;

  //   forgetPasswordOTPRef.once('value', (snapshot)=>{
  //     if(snapshot.val())
  //     {
  //       const rawpreregistered = snapshot.val();
  //       const preregistered = [];
  //       const convert = Object.entries(rawpreregistered);

  //       convert.forEach((x)=>{
  //         preregistered.push(x[1])
  //       })

  //       // filter by phone number

  //       const filterBYPhone = preregistered.filter((x)=>{
  //           return x.phone === params.phone
  //       })

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
  // Check Drivers
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("drivers")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const driver = snapshot.val();

          if (driver.password) {
            req.body.driver = driver;
            next();
          } else {
            res.json({
              status: false,
              error:
                "You have not set password for your phone number . Please login and verify your phone first.",
            });
          }
        } else {
          req.body.driver = null;
          next();
        }
      });
  },
  // Check Vendor
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("vendors")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          next();
        } else {
          req.body.vendor = null;
          next();
        }
      });
  },
  // Check User Type
  (req, res, next) => {
    const params = req.body;

    if (req.body.driver && req.body.vendor == null) {
      const code = Math.floor(Math.random() * 9000) + 1000;

      const setData = {
        driver: req.body.driver.phone,
        phone: params.phone,
        token: code,
        type: "driver",
        created: moment().tz("Asia/Karachi").format("MMMM Do YYYY, h:mm:ss a"),
      };
      forgetPasswordOTPRef.child(code).set(setData, (err) => {
        if (err) {
          return res.json({
            status: false,
            message: err.message,
          });
        }

        twillio_client.messages
          .create(
            {
              messagingServiceSid: "MG5d789b427b36967a17122347859e3e7e",
              to: params.phone,
              from: config.twilio.phone,
              body: `Forgot Password Token is: "${code}`,
            },
            (err, resData) => {
              if (err) {
                return res.json({
                  status: false,
                  message: err,
                });
              }
              return res.json({
                status: true,
                type: "driver",
                otp: code,
              });
            }
          )
          .catch((err) => {
            res.json({
              status: false,
              error: err,
            });
          });
      });
    }

    if (req.body.vendor && req.body.driver == null) {
      const code = Math.floor(Math.random() * 9000) + 1000;

      const setData = {
        vendor: req.body.vendor.phone,
        phone: params.phone,
        token: code,
        type: "vendor",
        created: moment().tz("Asia/Karachi").format("MMMM Do YYYY, h:mm:ss a"),
      };
      forgetPasswordOTPRef.child(code).set(setData, (err) => {
        if (err) {
          return res.json({
            status: false,
            message: err.message,
          });
        }

        twillio_client.messages
          .create(
            {
              messagingServiceSid: "MG5d789b427b36967a17122347859e3e7e",
              to: params.phone,
              from: config.twilio.phone,
              body: `Forgot Password Token is: "${code}`,
            },
            (err, resData) => {
              if (err) {
                return res.json({
                  status: false,
                  message: err,
                });
              }
              return res.json({
                status: true,
                type: "vendor",
                otp: code,
              });
            }
          )
          .catch((err) => {
            res.json({
              status: false,
              error: err,
            });
          });
      });
    }
  }
);

// After Forgot Password -> Updates New Password To User Record
router.post(
  "/driver_app_new_password",
  // Check In Driver And Vendor
  (req, res, next) => {
    // const phone = req.body.phone;
    const params = req.body;

    userRef.child('vendors').child(params.phone).once('value', (snapshot) => {
      if (snapshot.val()) {
        const user = snapshot.val();
        req.body.user = user;
        req.body.userType = user.type;

        next();
      } else {
        userRef.child('drivers').child(params.phone).once('value', (snapshot) => {
          if (snapshot.val()) {
            const user = snapshot.val();
            req.body.user = user;
            req.body.userType = user.type;
            next();
          } else {
            res.json({
              status: false,
              error: "User Not Found !"
            })
          }
        })
      }
    });


  },
  (req, res) => {
    const params = req.body;
    const salt = bcrypt.genSaltSync(saltRounds);
    const newHash = bcrypt.hashSync(params.password, salt);

    console.log('user type -> ', params.userType);

    if (params.userType === 'driver') {
      userRef
        .child("drivers")
        .child(params.phone)
        .update({
          password: newHash,
        })
        .then(() => {
          res.json({
            status: true,
            message: "Password Set Successfully !",
            phone: params.phone,
            type: params.userType
          })
        })
        .catch((err) =>
          res.json({
            status: false,
            message: err.message,
          })
        );
    } else if (params.userType === 'vendor') {
      userRef
        .child("vendors")
        .child(params.phone)
        .update({
          password: newHash,
        })
        .then(() => {
          res.json({
            status: true,
            message: "Password Set Successfully !",
            phone: params.phone,
            type: params.userType
          })
        })
        .catch((err) =>
          res.json({
            status: false,
            message: err.message,
          })
        );
    } else {
      res.json({
        status: false,
        error: "Unknown User Type"
      })
    }
  }
);

// ***********  GET REQUESTS *************

router.get("/adda_list", (req, res) => {
  DBs.Stations.Data("data").then((dataa) => {
    const data = [];

    Object.keys(dataa).map((i) =>
      data.push({
        value: i,
        text: dataa[i].place_name,
      })
    );

    res.json(data);
  });
});

router.get("/get_logs_data", (req, res) => {
  const token = req.body.token || req.params.token || req.query.token;
  if (token && token !== "") {
    admin
      .auth()
      .verifyIdToken(token)
      .then((decodeToken) => {
        req.query.uid = decodeToken.uid;

        const dataOfDays = 10;
        const lastdays = moment().subtract(dataOfDays, "days");
        let data = [];

        let totalTime = moment.duration();
        sessionsRef
          .orderByChild("userID")
          .equalTo(req.query.uid)
          .once("value", (snap) => {
            snap.forEach((log) => {
              if (
                moment(log.val().loginTime).unix() >=
                lastdays.startOf("day").unix()
              ) {
                const login_time = moment(log.val().loginTime);
                const Logout_time = moment(log.val().logoutTime);
                const duration = moment.duration(Logout_time.diff(login_time));
                totalTime = totalTime.add(duration);
                data.push({
                  date: login_time.startOf("day").format("DD MMM YYYY"),
                  time: duration,
                });
              }
            });
            data.push({
              date: "",
              time: "",
            });
            const br = [];
            data.forEach((element, index) => {
              if (index + 1 <= data.length) {
                if (data[index + 1] == undefined) {
                  element.date = element.date;
                  try {
                    element.time = secondsToHms(element.time);
                  } catch (e) { }
                } else if (element.date == data[index + 1].date) {
                  data[index + 1].time = moment
                    .duration(data[index + 1].time)
                    .add(element.time);
                } else {
                  element.date = element.date;
                  try {
                    element.time = secondsToHms(element.time);
                  } catch (e) { }
                  br.push(element);
                }
              }
            });
            data = br;
            let bidsTotal = 0;
            bidRef.once("value", (driverBidsSnap) => {
              driverBidsSnap.forEach((key) => {
                key.forEach((bd) => {
                  if (
                    bd.key == req.query.uid &&
                    moment(bd.val().first_bid_time).unix() >=
                    lastdays.startOf("day").unix()
                  ) {
                    bidsTotal++;
                  }
                });
              });
              let totalReq = 0;
              userReqRef.once("value", (userReqSnap) => {
                userReqSnap.forEach((req) => {
                  Object.values(req.val()).forEach((reqData) => {
                    if (
                      moment(reqData.createdAt).unix() >=
                      lastdays.startOf("day").unix()
                    ) {
                      totalReq++;
                    }
                  });
                });
                res.json({
                  status: "ok",
                  totalTime: secondsToHms(totalTime),
                  totalBids: bidsTotal,
                  totalRequests: totalReq,
                  logData: data.reverse(),
                });
              });
            });
          });
      })
      .catch((err) => {
        res.json({
          status: "failed",
          message: err.message,
        });
      });
  } else {
    res.json({
      status: "failed",
      message: "Token Required!",
    });
  }
});

// ***********  POST REQUESTS *************

// /send_alert
router.post(
  "/send_alert",
  (req, res, next) => {
    let token;
    try {
      token = req.body.token || req.params.token || req.query.token; // || req['headers']['authorization'] ? req['headers']['authorization'].split(' ')[1] : undefined
    } catch (error) {
      console.log({ error });
    }
    const HeaderToken = req.headers.authorization;
    if (HeaderToken) token = HeaderToken.split(" ")[1];

    console.log(req.body);

    if (token && token !== "") {
      admin
        .auth()
        .verifyIdToken(token)
        .then((decodeToken) => {
          console.log(decodeToken.uid, "UserId");

          req.query.uid = decodeToken.uid;
          req.body.uid = decodeToken.uid;
          next();
        })
        .catch((err) => {
          res.json({
            status: "failed",
            message: err.message,
          });
        });
    } else {
      res.json({
        status: "failed",
        message: "Token Required!",
      });
    }
  },
  (req, res) => {
    SEND_REQUEST(req.body)
      .then((data) => res.json({ status: true, message: "alerted", data }))
      .catch((e) => res.json({ status: false, message: e.message }));
  }
);

// Get wallet
router.post("/get_wallet", verifyTokenFirebase, (req, res, next) => {
  const params = req.body;

  switch (params.user.user_type) {
    case "user":
      walletRef
        .child("users")
        .child(params.user.user_id)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const wallet = snapshot.val();
            res.json({
              status: true,
              type: "user",
              data: wallet,
              transactions: wallet.transactions || null
            });
          } else {
            res.json({
              status: false,
              error: "No Wallet Found",
            });
          }
        });
      break;

    case "pro":
      walletRef
        .child("users")
        .child(params.user.user_id)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const wallet = snapshot.val();
            res.json({
              status: true,
              type: params.user.user_type,
              data: wallet,
            });
          } else {
            res.json({
              status: false,
              error: "No Wallet Found",
            });
          }
        });
      break;

    case "driver":
      walletRef
        .child("drivers")
        .child(params.user.user_id)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const wallet = snapshot.val();
            res.json({
              status: true,
              type: params.user.user_type,
              data: wallet,
            });
          } else {
            res.json({
              status: false,
              error: "No Wallet Found",
            });
          }
        });
      break;

    case "vendor":
      walletRef
        .child("vendors")
        .child(params.user.user_id)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const wallet = snapshot.val();
            res.json({
              status: true,
              type: params.user.user_type,
              data: wallet,
            });
          } else {
            res.json({
              status: false,
              error: "No Wallet Found",
            });
          }
        });
      break;

    default:
      res.json({
        status: false,
        error: "Unknown User Type !"
      })
      break;
  }
});




// ---------------------
// Get Single Bilty 
router.post("/get_single_bilty",
  verifyTokenFirebase,
  //  Get Request Data
  (req, res, next) => {
    const params = req.body;


    const orderNo = params.biltyNo.slice(2, (params.biltyNo.length - 2));

    pplRequestRef.child(orderNo).once('value', (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();
        req.body.request = request;
        next();
      } else {
        res.json({
          status: false,
          error: "Request Not Found !"
        })
      }
    })
  },
  // Get Bilty 
  (req, res) => {
    const params = req.body;

    let final_amount;

    if (params.request.qoute) {
      final_amount = params.request.qoute.qoute_amount
    }

    if (params.request.user_counter) {
      final_amount = params.request.user_counter.amount
    }

    if (params.request.vendor_counter) {
      final_amount = params.request.vendor_counter.amount
    }

    switch (params.request.request_type) {
      case "transit":
        const transitbilties = params.request.bilty;

        if (transitbilties) {
          if (transitbilties.length !== 0) {
            const filterOut = transitbilties.filter((bilty) => {
              return bilty.biltyNo === params.biltyNo;
            });

            if (filterOut) {
              if (filterOut.length !== 0) {
                const bilty = filterOut[0];

                delete params.request.bilty;

                let data = {
                  ...params.request,
                  ...bilty,
                  final_amount
                }

                res.json({
                  status: true,
                  data: data,
                });

              } else {
                res.json({
                  status: false,
                  error: "Bilty Not Found !",
                });
              }
            }
          }
        }

        break;

      case "upcountry":
        // Suborder And Bilty Filteration and Status Check
        const suborders = params.request.subOrders;

        let currentBilty;

        suborders.forEach((suborder) => {
          suborder.bilty.forEach((bilty) => {
            if (bilty.biltyNo === params.biltyNo) {
              currentBilty = {
                ...bilty,
                final_amount,
                materials: suborder.material,
                vehicle_type: suborder.type,
                option: suborder.option,
                option_quantity: suborder.option_quantity,
                subOrderNo: suborder.subOrderNo,
                user_phone: suborder.user_phone,
                vendor_phone: suborder.vendor_phone || null,
                vendor_name: suborder.vendor_name || null,
                weight: suborder.weight,
                cargo_insurance: params.request.cargo_insurance || null,
                date: params.request.date,
                orderNo: params.request.orderNo,
                orgLat: params.request.orgLat,
                orgLng: params.request.orgLng,
                desLat: params.request.desLat,
                desLng: params.request.desLng,
                disText: params.request.disText,
                durText: params.request.durText,
                originAddress: params.request.originAddress || null,
                destinationAddress: params.request.destinationAddress || null,
                containerReturnAddress: params.request.containerReturnAddress || null,
                security_deposit: params.request.security_deposit || null,
                user_id: params.request.user_id,
                user_phone: params.request.user_phone,
                user_type: params.request.user_type,
                username: params.request.username,
                request_type: params.request.request_type,
                createdAt: params.request.createdAt,
                documents: params.request.documents
              }
            }
          })
        })

        res.json({
          status: true,
          data: currentBilty,
        });

        break;

      default:
        res.json({
          status: false,
          error: "Unknown Request Type - (Check Bilty Status For PPL)!"
        })

        break;
    }
  }
)


// /get_user_orders -> (For User App)
router.post(
  "/get_user_orders",
  verifyTokenFirebase,
  // Get All Qoutes (Upcountry)
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef.child("upcountry").child("qoutes").once('value', (snapshot) => {
      if (snapshot.val()) {
        const upcountryQoutes = [];
        snapshot.forEach((snap) => {
          upcountryQoutes.push(snap.val())
        })

        req.body.upcountryQoutes = upcountryQoutes;
        next();
      } else {
        req.body.upcountryQoutes = [];
        next();
      }
    })
  },
  // Get PPL Orders
  (req, res, next) => {
    const params = req.body;

    pplRequestRef
      .orderByChild("user_phone")
      .equalTo(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const requests = snapshot.val();
          const convert = Object.entries(requests);

          const final = [];
          convert.forEach((x) => {
            final.push(x[1]);
          });

          //  Sorting

          // Transit Orders
          const transitOrders = final.filter((order) => {
            return order.request_type === 'transit'
          })

          // Upcountry Orders
          const upcountryOrders = final.filter((order) => {
            return order.request_type === 'upcountry'
          })

          upcountryOrders.forEach((x) => {
            const suborders = x.subOrders;


            suborders.forEach((suborder) => {
              const suborderno = suborder.subOrderNo;
              console.log('suborderno -> ', suborderno)
              const qoutelookup = params.upcountryQoutes.filter((qoute) => {
                return qoute.subOrderNo === suborderno
              })

              if (qoutelookup) {
                if (qoutelookup.length > 0) {
                  suborder['qoute'] = qoutelookup[0];
                  suborder['rates_found'] = true;
                } else {
                  suborder['rates_found'] = false;
                }
              }
              console.log('qoutelookup -> ', qoutelookup);
            })
          })


          req.body.transitOrders = transitOrders;
          req.body.upcountryOrders = upcountryOrders;

          // req.body.ppl = [...transitOrders, ...upcountryOrders];
          next();
        } else {
          req.body.transitOrders = [];
          req.body.upcountryOrders = [];
          next();
        }
      });

    // if (params.user.user_type == "user" || params.user.user_type == "pro") {

    // } else {
    //   if (snapshot.val()) {
    //     const requests = snapshot.val();
    //     const convert = Object.entries(requests);

    //     const final = [];
    //     convert.forEach((x) => {
    //       final.push(x[1]);
    //     });

    //     // Find By Contact Agent

    //     const filterByAgent = final.filter((order) => {
    //       if (order.contact_person) {
    //         const contactPersons = order.contact_person;
    //         if (contactPersons.length > 1) {
    //           const filterForCP = contactPersons.filter((x) => {
    //             return x.phone === params.user.user_id;
    //           });

    //           if (filterForCP) {
    //             if (filterForCP.length !== 0) {
    //               return filterForCP;
    //             }
    //           }
    //         }

    //         if (contactPersons.length == 1) {
    //           return contactPersons[0].phone === params.user.user_id;
    //         }
    //       }
    //     });

    //     res.json({
    //       status: true,
    //       orders: filterByAgent,
    //     });
    //   } else {
    //     res.json({
    //       status: true,
    //       orders: [],
    //     });
    //   }
    // });
    // }
  },
  // Get SCM Orders
  (req, res, next) => {
    const params = req.body;
    scmRequestRef
      .orderByChild("user_phone")
      .equalTo(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const requests = snapshot.val();
          const convert = Object.entries(requests);

          const final = [];
          convert.forEach((x) => {
            final.push(x[1]);
          });

          //  Sorting
          req.body.scm = final;
          console.log("scm -> ", final);
        } else {
          req.body.scm = [];
          next();
        }
      });
  },
  // Throw data
  (req, res) => {
    const params = req.body;

    // const sortedPPL = _.orderBy(params.ppl, (a) => moment(a.createdAt), 'asc')

    // let allOrders = [...params.ppl, ...params.scm];

    res.json({
      status: true,
      // orders: allOrders,
      transit: params.transitOrders,
      upcountry: params.upcountryOrders
    });
  }
);

// /get_user_pending_orders
router.post("/get_user_pending_orders", verifyTokenFirebase,
  // Check User 
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        next();
        break;
      case "pro":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`
        })
        break;
    }
  },
  // Get Transit Qoutes
  (req, res, next) => {
    const params = req.body;

    // Get All Qoutes For Vendor
    pplBiddingsRef
      .child("transit")
      .child("qoutes")
      .orderByChild("user_phone")
      .equalTo(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const transitQoutes = [];

          snapshot.forEach((snap) => {
            transitQoutes.push(snap.val().orderNo)
          })


          req.body.transitQoutes = transitQoutes;
          next();

        } else {
          req.body.transitQoutes = [];
          next();
        }
      }).catch((err) => {
        res.json({
          status: false,
          error: err.message
        })
      })


  },
  // Get Upcountry Qoutes
  // (req, res, next) => {
  //   const params = req.body;

  //   pplBiddingsRef
  //     .child("upcountry")
  //     .child("qoutes")
  //     .orderByChild("user_phone")
  //     .equalTo(params.user.user_id)
  //     .once("value", (snapshot) => {
  //       if (snapshot.val()) {
  //         const upcountryQoutes = [];
  //         snapshot.forEach((snap) => {
  //           // if(snap.val().status === 'pending') {
  //           upcountryQoutes.push({
  //             orderNo: snap.val().orderNo,
  //             subOrderNo: snap.val().subOrderNo
  //           })
  //           // }
  //         })

  //         req.body.upcountryQoutes = upcountryQoutes;
  //         next();
  //       } else {
  //         req.body.upcountryQoutes = [];
  //         next();
  //       }
  //     }).catch(err => console.log(err))
  // },
  // Get Requests - Vendor Not Qouted On
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.orderByChild("status").equalTo("pending").once('value', (snapshot) => {
      if (snapshot.val()) {
        const requests = [];
        snapshot.forEach((snap) => {
          requests.push(snap.val())
        })

        // Get User Orders
        const userOrders = requests.filter((order) => {
          return order.user_phone === params.user.user_id
        })

        const allqoutes = [...params.transitQoutes];
        const removedDuplicates = [...new Set(allqoutes)]
        // const upcountryQoutes = params.upcountryQoutes;


        // const upcountryRequest = requests.filter((x) => {
        //   return x.request_type === 'upcountry'
        // })

        // const filterForUpcountry = [];


        // upcountryRequest.forEach((x) => {

        //   upcountryQoutes.forEach((qoute) => {
        //     if (x.orderNo === qoute.orderNo) {
        //       filterForUpcountry.push()
        //     }
        //   })
        // })

        // console.log('filter for upcountry -> ', filterForUpcountry)

        if (removedDuplicates.length > 0) {

          const filterRequests = userOrders.filter(item => !removedDuplicates.includes(item.orderNo))

          res.json({
            status: true,
            data: filterRequests
          })

        } else {
          res.json({
            status: true,
            data: [...requests]
          })
        }
      } else {
        res.json({
          status: true,
          data: []
        })
      }
    })
  },
)

// /get_user_active_orders
router.post("/get_user_active_orders", verifyTokenFirebase,
  // Check User 
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        next();
        break;
      case "pro":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`
        })
        break;
    }
  },
  // Get Active Order
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.once("value", (snapshot) => {
      if (snapshot.val()) {
        const requests = [];

        snapshot.forEach((snap) => {
          requests.push(snap.val());
        })

        //  Active Orders
        const userOrders = requests.filter((x) => {
          return x.user_phone === params.user.user_id
        })

        // Filter For Active Orders
        const activeOrders = userOrders.filter((x) => {
          if (x.status !== 'completed' && x.status === 'accepted') {
            return x
          }
        })

        // Transit Orders
        const transitOrders = activeOrders.filter((x) => {
          return x.request_type === 'transit'
        })

        // Upcountry Orders
        const upcountryOrders = activeOrders.filter((x) => {
          return x.request_type === 'upcountry'
        })

        const filterupcountryOrders = [];

        upcountryOrders.forEach((x) => {
          // const suborders = x.subOrders;
          // let check = suborders.length;

          // suborders.forEach((suborder) => {
          //   if (suborder.status == 'qoute_accepted' || suborder.status == 'user_counter_accepted' || suborder.status == 'vendor_counter_accepted') {
          //     check--;

          //   }
          // })

          // if (check === 0) {
          //   filterupcountryOrders.push(x);
          // }

          if (x.status === 'accepted') {
            filterupcountryOrders.push(x);
          }
        })

        res.json({
          status: true,
          transit: { data: transitOrders },
          upcountry: { data: filterupcountryOrders },

        })

      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });

  }
)

// /get_user_completed_orders
router.post("/get_user_completed_orders", verifyTokenFirebase,
  // Check User 
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        next();
        break;
      case "pro":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`
        })
        break;
    }
  },
  // Get Completed Order
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.once("value", (snapshot) => {
      if (snapshot.val()) {
        const requests = [];

        snapshot.forEach((snap) => {
          requests.push(snap.val());
        })

        //  user Orders
        const userOrders = requests.filter((x) => {
          return x.user_phone === params.user.user_id
        })

        // Filter For Active Orders
        const completedOrders = userOrders.filter((x) => {
          if (x.status === 'completed') {
            return x
          }
        })

        // Transit Orders
        const transitOrders = completedOrders.filter((x) => {
          return x.request_type === 'transit'
        })

        // Upcountry Orders
        const upcountryOrders = completedOrders.filter((x) => {
          return x.request_type === 'upcountry'
        })


        res.json({
          status: true,
          transit: {
            data: transitOrders
          },
          upcountry: {
            data: upcountryOrders
          }
        })

      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });

  }
)

// /user_get_vendor_qoutes 
router.post(
  "/user_get_vendor_qoutes",
  verifyTokenFirebase,
  // Check User 
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        next();
        break;
      case "pro":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`
        })
        break;
    }
  },
  // Get Qoutes,User Counter Offers,Vendor Counter Offers
  async (req, res, next) => {
    const params = req.body;

    // Get All Qoutes For Vendor
    const transitQoutesSnap = await pplBiddingsRef
      .child("transit")
      .child("qoutes")
      .orderByChild("user_phone")
      .equalTo(params.user.user_id)
      .once("value");

    const upcountryQoutesSnap = await pplBiddingsRef
      .child("upcountry")
      .child("qoutes")
      .orderByChild("user_phone")
      .equalTo(params.user.user_id)
      .once("value");

    // Qoutes 
    const rawtransitQoutes = await transitQoutesSnap.val();
    const rawupcountryQoutes = await upcountryQoutesSnap.val();

    const transitQoutes = [];
    const upcountryQoutes = [];


    if (rawtransitQoutes !== null) {
      const convert1 = Object.entries(rawtransitQoutes);
      convert1.forEach((x) => {
        transitQoutes.push(x[1]);
      });
    }

    if (rawupcountryQoutes !== null) {
      const convert2 = Object.entries(rawupcountryQoutes);
      convert2.forEach((x) => {
        upcountryQoutes.push(x[1]);
      });
    }

    // Filter For Pending Qoutes
    const pendingQoutes1 = transitQoutes.filter((qoute) => {
      return qoute.status === 'pending'
    })

    // Filter For Accepted Qoutes
    const acceptedQoutes1 = transitQoutes.filter((qoute) => {
      return qoute.status === 'accepted'
    })

    // Filter For Rejected Qoutes
    const rejectedQoutes1 = transitQoutes.filter((qoute) => {
      return qoute.status == 'rejected'
    })

    // UPCOUNTRY
    // Filter For Pending Qoutes
    const pendingQoutes2 = upcountryQoutes.filter((qoute) => {
      return qoute.status == 'pending'
    })

    // Filter For Accepted Qoutes
    const acceptedQoutes2 = upcountryQoutes.filter((qoute) => {
      return qoute.status == 'accepted'
    })

    // Filter For Rejected Qoutes
    const rejectedQoutes2 = upcountryQoutes.filter((qoute) => {
      return qoute.status == 'rejected'
    })


    res.json({
      status: true,
      pending: [...pendingQoutes1],
      accepted: [...acceptedQoutes1],
      rejected: [...rejectedQoutes1]

    })
  },
);

// /get_upcountry_qoutes
router.post("/get_upcountry_qoutes", verifyTokenFirebase,
  // Check User 
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        next();
        break;
      case "pro":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`
        })
        break;
    }
  },
  // Get All Qoutes (Upcountry)
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef.child("upcountry").child("qoutes").once('value', (snapshot) => {
      if (snapshot.val()) {
        const upcountryQoutes = [];
        snapshot.forEach((snap) => {
          upcountryQoutes.push(snap.val())
        })

        req.body.upcountryQoutes = upcountryQoutes;
        next();
      } else {
        req.body.upcountryQoutes = [];
        next();
      }
    })
  },
  // Get Order
  async(req, res, next) => {
    const params = req.body;
    const requests = [];
    const filterupcountryOrders = [];

    await pplRequestRef.once("value", (snapshot) => {
      if (snapshot.val()) {

        snapshot.forEach((snap) => {
          requests.push(snap.val());
        })

        //  user Orders
        const userOrders = requests.filter((x) => {
          return x.user_phone === params.user.user_id
        })

        // Upcountry Orders
        const upcountryOrders = userOrders.filter((x) => {
          return x.request_type === 'upcountry'
        })


        upcountryOrders.forEach((x) => {
          if (x.status === 'pending') {
            filterupcountryOrders.push(x);
          }
        })

        // Rates Found Logic
        filterupcountryOrders.forEach((order) => {
          const suborders = order.subOrders;


          suborders.forEach((suborder) => {
            const suborderno = suborder.subOrderNo;
            console.log('suborderno -> ', suborderno)
            const qoutelookup = params.upcountryQoutes.filter((qoute) => {
              return qoute.subOrderNo === suborderno
            })

            if (qoutelookup) {
              if (qoutelookup.length > 0) {
                let qoute = qoutelookup[0];
                if (qoute.status == 'countered') {
                  pplBiddingsRef.child("upcountry").child("user_counter").once('value', (snapshot) => {
                    if (snapshot.val()) {
                      snapshot.forEach((snap) => {
                        if (snap.val().subOrderNo == suborderno) {
                          console.log('Counter found for subOrderNo#', snap.val().subOrderNo);
                          qoute = snap.val()
                        }
                      })
                    }
                  })
                }
                if (qoute.status == 'countered') {
                  pplBiddingsRef.child("upcountry").child("vendor_counter").once('value', (snapshot) => {
                    if (snapshot.val()) {
                      snapshot.forEach((snap) => {
                        if (snap.val().subOrderNo == suborderno) {
                          console.log('Vendor counter found for subOrderNo#', snap.val().subOrderNo);
                          qoute = snap.val();
                        }
                      })
                    }
                  })
                }
                suborder['qoute'] = qoute;
                suborder['rates_found'] = true;
              } else {
                suborder['rates_found'] = false;
              }
            }
            // console.log('qoutelookup -> ', qoutelookup);
          })
        })

        
      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });
    
    res.json({
      status: true,
      data: filterupcountryOrders
    })
  }
)

// /get_user_counter_offers
router.post("/user_get_counter_offers", verifyTokenFirebase,
  // Check User 
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        next();
        break;

      case "pro":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`
        })
        break;
    }
  },
  async (req, res) => {
    const params = req.body;

    // Get All User Counter Offers For Vendor
    const transitUserCounterSnap = await pplBiddingsRef
      .child("transit")
      .child("user_counter")
      .orderByChild("user_phone")
      .equalTo(params.user.user_id)
      .once("value");
    const upcountryUserCounterSnap = await pplBiddingsRef
      .child("upcountry")
      .child("user_counter")
      .orderByChild("user_phone")
      .equalTo(params.user.user_id)
      .once("value")

    // User Counter Offer
    const rawtransitUserCounterOffers = await transitUserCounterSnap.val();
    const rawupcountryUserCounterOffers = await upcountryUserCounterSnap.val();

    const transitUserCounterOffers = [];
    const upcountryUserCounterOffers = [];

    if (rawtransitUserCounterOffers !== null) {
      const convert3 = Object.entries(rawtransitUserCounterOffers);
      convert3.forEach((x) => {
        transitUserCounterOffers.push(x[1]);
      });
    }

    if (rawupcountryUserCounterOffers !== null) {
      const convert4 = Object.entries(rawupcountryUserCounterOffers);
      convert4.forEach((x) => {
        upcountryUserCounterOffers.push(x[1]);
      });
    }

    // Transit
    // Filter For Pending Qoutes 
    const pendingOffers1 = transitUserCounterOffers.filter((qoute) => {
      return qoute.status === 'pending'
    })

    // Filter For Accepted Qoutes
    const acceptedOffers1 = transitUserCounterOffers.filter((qoute) => {
      return qoute.status === 'accepted'
    })

    // Filter For Rejected Qoutes
    const rejectedOffers1 = transitUserCounterOffers.filter((qoute) => {
      return qoute.status === 'rejected'
    })

    // UPCOUNTRY
    // Filter For Pending Qoutes
    const pendingOffers2 = upcountryUserCounterOffers.filter((qoute) => {
      return qoute.status === 'pending'
    })

    // Filter For Accepted Qoutes
    const acceptedOffers2 = upcountryUserCounterOffers.filter((qoute) => {
      return qoute.status === 'accepted'
    })

    // Filter For Rejected Qoutes
    const rejectedOffers2 = upcountryUserCounterOffers.filter((qoute) => {
      return qoute.status === 'rejected'
    })


    res.json({
      status: true,
      // data: [...pendingOffers1],
      data: [...pendingOffers1],
      accepted: [...acceptedOffers1],
      rejected: [...rejectedOffers1]


    })

  })

// /get_vendor_partner_counter_offers
router.post("/user_get_partner_counter_offers", verifyTokenFirebase,
  // Check User 
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        next();
        break;
      case "pro":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`
        })
        break;
    }
  },
  async (req, res) => {
    const params = req.body;


    // Get All Vendor Counter Offers For Vendor
    const transitVendorCounterSnap = await pplBiddingsRef
      .child("transit")
      .child("vendor_counter")
      .orderByChild("user_phone")
      .equalTo(params.user.user_id)
      .once("value");

    const upcountryVendorCounterSnap = await pplBiddingsRef
      .child("upcountry")
      .child("vendor_counter")
      .orderByChild("user_phone")
      .equalTo(params.user.user_id)
      .once("value");


    // Vendor Counter Offer
    const rawtransitVendorCounterOffers = await transitVendorCounterSnap.val();
    const rawupcountryVendorCounterOffers = await upcountryVendorCounterSnap.val();


    const transitVendorCounterOffers = [];
    const upcountryVendorCounterOffers = [];


    if (rawtransitVendorCounterOffers !== null) {
      const convert5 = Object.entries(rawtransitVendorCounterOffers);
      convert5.forEach((x) => {
        transitVendorCounterOffers.push(x[1]);
      });
    }
    if (rawupcountryVendorCounterOffers !== null) {
      const convert6 = Object.entries(rawupcountryVendorCounterOffers);
      convert6.forEach((x) => {
        upcountryVendorCounterOffers.push(x[1]);
      });
    }


    // Transit
    // Filter For Pending Qoutes 
    const pendingOffers1 = transitVendorCounterOffers.filter((qoute) => {
      return qoute.status === 'pending'
    })

    // Filter For Accepted Qoutes
    const acceptedOffers1 = transitVendorCounterOffers.filter((qoute) => {
      return qoute.status === 'accepted'
    })

    // Filter For Rejected Qoutes
    const rejectedOffers1 = transitVendorCounterOffers.filter((qoute) => {
      return qoute.status === 'rejected'
    })

    // UPCOUNTRY
    // Filter For Pending Qoutes
    const pendingOffers2 = upcountryVendorCounterOffers.filter((qoute) => {
      return qoute.status === 'pending'
    })

    // Filter For Accepted Qoutes
    const acceptedOffers2 = upcountryVendorCounterOffers.filter((qoute) => {
      return qoute.status === 'accepted'
    })

    // Filter For Rejected Qoutes
    const rejectedOffers2 = upcountryVendorCounterOffers.filter((qoute) => {
      return qoute.status === 'rejected'
    })


    res.json({
      status: true,
      pending: [...pendingOffers1],
      accepted: [...acceptedOffers1],
      rejected: [...rejectedOffers1]
    })


  })
// ---------------------






// ---------------------

// /get_vendor_orders -> (For driver App)
router.post(
  "/get_vendor_orders",
  verifyTokenFirebase,
  // Get PPL Orders
  async (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "driver":
        pplRequestRef.once("value", (snapshot) => {
          if (snapshot.val()) {
            const requests = snapshot.val();
            const convert = Object.entries(requests);

            const final = [];
            convert.forEach((x) => {
              final.push(x[1]);
              console.log("orders statuses -> ", x[1].status);
            });

            //  Filter By Driver
            const getByDriver = final.filter((order) => {
              if (order.bilty) {
                //  For PPL
                const allbilties = order.bilty;
                const searchForDriver = allbilties.filter((bilty) => {
                  return bilty.driver === params.user.user_id;
                });

                return searchForDriver;

                console.log("searchForDriver -> ", searchForDriver);
              }
            });

            console.log("getByDriver -> ", getByDriver);

            req.body.ppl = getByDriver;
            next();
          } else {
            req.body.ppl = [];
            next();
          }
        });
        break;

      case "vendor":
        next();
        break;

      default:
        res.json({
          status: false,
          error: "Unknown User Type",
        });
        break;
    }
  },
  // Get Qoutes,User Counter Offers,Vendor Counter Offers
  async (req, res, next) => {
    const params = req.body;

    if (params.user.user_type === 'vendor') {
      // Get All Qoutes For Vendor
      const transitQoutesSnap = await pplBiddingsRef
        .child("transit")
        .child("qoutes")
        .orderByChild("phone")
        .equalTo(params.user.user_id)
        .once("value");
      const upcountryQoutesSnap = await pplBiddingsRef
        .child("upcountry")
        .child("qoutes")
        .orderByChild("phone")
        .equalTo(params.user.user_id)
        .once("value");
      // Get All User Counter Offers For Vendor
      const transitUserCounterSnap = await pplBiddingsRef
        .child("transit")
        .child("user_counter")
        .orderByChild("vendor_phone")
        .equalTo(params.user.user_id)
        .once("value");
      const upcountryUserCounterSnap = await pplBiddingsRef
        .child("upcountry")
        .child("user_counter")
        .orderByChild("vendor_phone")
        .equalTo(params.user.user_id)
        .once("value")
      // Get All Vendor Counter Offers For Vendor
      const transitVendorCounterSnap = await pplBiddingsRef
        .child("transit")
        .child("vendor_counter")
        .orderByChild("vendor_phone")
        .equalTo(params.user.user_id)
        .once("value");
      const upcountryVendorCounterSnap = await pplBiddingsRef
        .child("upcountry")
        .child("vendor_counter")
        .orderByChild("vendor_phone")
        .equalTo(params.user.user_id)
        .once("value");

      // Qoutes 
      const rawtransitQoutes = await transitQoutesSnap.val();
      const rawupcountryQoutes = await upcountryQoutesSnap.val();
      // User Counter Offer
      const rawtransitUserCounterOffers = await transitUserCounterSnap.val();
      const rawupcountryUserCounterOffers = await upcountryUserCounterSnap.val();
      // Vendor Counter Offer
      const rawtransitVendorCounterOffers = await transitVendorCounterSnap.val();
      const rawupcountryVendorCounterOffers = await upcountryVendorCounterSnap.val();

      const transitQoutes = [];
      const upcountryQoutes = [];
      const transitUserCounterOffers = [];
      const upcountryUserCounterOffers = [];
      const transitVendorCounterOffers = [];
      const upcountryVendorCounterOffers = [];

      if (rawtransitQoutes !== null) {
        const convert1 = Object.entries(rawtransitQoutes);
        convert1.forEach((x) => {
          transitQoutes.push(x[1]);
        });
      }

      if (rawupcountryQoutes !== null) {
        const convert2 = Object.entries(rawupcountryQoutes);
        convert2.forEach((x) => {
          upcountryQoutes.push(x[1]);
        });
      }

      if (rawtransitUserCounterOffers !== null) {
        const convert3 = Object.entries(rawtransitUserCounterOffers);
        convert3.forEach((x) => {
          transitUserCounterOffers.push(x[1]);
        });
      }

      if (rawupcountryUserCounterOffers !== null) {
        const convert4 = Object.entries(rawupcountryUserCounterOffers);
        convert4.forEach((x) => {
          upcountryUserCounterOffers.push(x[1]);
        });
      }
      if (rawtransitVendorCounterOffers !== null) {
        const convert5 = Object.entries(rawtransitVendorCounterOffers);
        convert5.forEach((x) => {
          transitVendorCounterOffers.push(x[1]);
        });
      }
      if (rawupcountryVendorCounterOffers !== null) {
        const convert6 = Object.entries(rawupcountryVendorCounterOffers);
        convert6.forEach((x) => {
          upcountryVendorCounterOffers.push(x[1]);
        });
      }



      const data = [...transitQoutes, ...upcountryQoutes, ...transitUserCounterOffers, ...upcountryUserCounterOffers, ...transitVendorCounterOffers, ...upcountryVendorCounterOffers];

      console.log('data -> ', data);

      const allOrders = data.map((x) => {
        return x.orderNo;
      });

      // TODO: Get Orders From all order numbers
      req.body.allQoutesAndCounters = data;
      next();

    } else {
      next();
    }
  },
  // Get SCM Orders
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "driver":
        scmRequestRef.once("value", (snapshot) => {
          if (snapshot.val()) {
            const requests = snapshot.val();
            const convert = Object.entries(requests);

            const final = [];
            convert.forEach((x) => {
              final.push(x[1]);
            });

            //  Get By Driver
            const getByDriver = final.filter((order) => {
              return order.driverData === params.user.user_id;
            });

            req.body.scm = final;
            console.log("scm -> ", final);
            next();
          } else {
            req.body.scm = [];
            next();
          }
        });
        break;

      case "vendor":
        next()
        break;

      default:
        next()
        break;
    }
  },
  // Throw data
  (req, res, next) => {
    const params = req.body;

    // const sortedPPL = _.orderBy(params.ppl, (a) => moment(a.createdAt), 'asc')

    switch (params.user.user_type) {
      case "driver":
        let allOrders = [...params.ppl, ...params.scm];

        res.json({
          status: true,
          orders: allOrders,
        });
        break;
      case "vendor":
        next();
        break;

      default:
        res.json({
          status: false,
          error: "Unknown User Type",
        });
        break;
    }


  },
  // Get Active Orders (transit) For Vendor
  (req, res, next) => {
    const params = req.body;

    // Transit
    pplRequestRef.orderByChild("request_type").equalTo("transit").once('value', (snapshot) => {
      if (snapshot.val()) {
        const requests = [];
        snapshot.forEach((snap) => {
          requests.push(snap.val())
        })

        //  console.log('active requests -> ',requests)

        // Filter Rate Confirmed Requests 
        const forthisvendor = requests.filter((req) => {
          return req.vendor_phone === params.user.user_id
        })
        const rateConfirmed = forthisvendor.filter((req) => {
          return req.status !== 'pending' && req.status !== 'cancelled' && req.status !== 'rejected'
        })

        req.body.transitActiveOrders = rateConfirmed;
        next()


      } else {
        res.json({
          status: false,
          error: "No Transit Requests Found !"
        })
      }
    })
  },
  // Get Active Orders (upcountry) For Vendor
  (req, res, next) => {
    const params = req.body;

    // Upcountry
    pplRequestRef.orderByChild("request_type").equalTo("upcountry").once('value', (snapshot) => {
      if (snapshot.val()) {
        const requests = [];
        snapshot.forEach((snap) => {
          const req = snap.val();
          let checkVendorInSuborders = false;

          req.subOrders.forEach((suborder) => {
            if (suborder.vendor_phone === params.user.user_id) {
              checkVendorInSuborders = true;
            }
          })

          if (checkVendorInSuborders) {
            requests.push(snap.val())
          }

        })

        //  console.log('upcountry requests -> ',requests)

        // Filter Rate Confirmed Requests 
        //  const rateConfirmed = requests.filter((req) => {
        //      return req.status !== 'pending' && req.status !== 'cancelled' && req.status !== 'rejected'
        //  })  

        //  req.body.transitActiveOrders = rateConfirmed;
        //  next()

        res.json({
          status: true,
          data: [...requests, ...params.transitActiveOrders, ...params.allQoutesAndCounters],
        })

        //  console.log('rateConfirmed -> ',rateConfirmed);
      } else {
        res.json({
          status: false,
          error: "No Requests Found !"
        })
      }
    })
  }
);

// /get_vendor_active_orders
router.post("/get_vendor_active_orders", verifyTokenFirebase,
  // Check User 
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`
        })
        break;
    }
  },
  // Get Vendor Profile
  (req, res, next) => {
    const params = req.body;

    userRef.child("vendors").child(params.user.user_id).once('value', (snapshot) => {
      if (snapshot.val()) {
        const vendor = snapshot.val();

        if (vendor.orders) {
          if (vendor.orders.length > 0) {
            const orders = vendor.orders;
            req.body.orders = orders;
            console.log('orders -> ', orders)
            next();
          } else {
            res.json({
              status: false,
              error: "Vendor Does Not Have Active Orders"
            })
          }
        } else {
          res.json({
            status: false,
            error: "Vendor Does Not Have Active Orders"
          })
        }
      } else {
        res.json({
          status: false,
          error: "Vendor Not Found !"
        })
      }
    })
  },
  // Get Active Order
  (req, res, next) => {
    const params = req.body;

    const orders = params.orders;

    pplRequestRef.once("value", (snapshot) => {
      if (snapshot.val()) {
        const requests = [];

        snapshot.forEach((snap) => {
          requests.push(snap.val());
        })


        // Transit Active Orders
        const activeOrders = [];
        requests.filter((x) => {
          orders.forEach((order) => {
            // console.log('order -> ', order);
            if (x.orderNo === order) {
              activeOrders.push(x)
            }
          })
        })

        res.json({
          status: true,
          data: [...activeOrders,
            // {
            //   "bilty": [
            //     {
            //       "biltyNo": "BT0004a0",
            //       "id": "-MxhuudFaSmajycjxRyv",
            //       "material": [
            //         "cement"
            //       ],
            //       "option": "Crane 0-15",
            //       "option_quantity": 1,
            //       "quantity": "1",
            //       "status": "pending",
            //       "type": "40ft Truck",
            //       "user_phone": "+923352640168",
            //       "vehicle_quantity": 1,
            //       "weight": "Less Than 1 Ton"
            //     },
            //     {
            //       "biltyNo": "BT0004b0",
            //       "id": "-MxnHpC3aV75mw3u_adV",
            //       "material": [
            //         "cement"
            //       ],
            //       "option": "Labour",
            //       "option_quantity": 1,
            //       "quantity": "1",
            //       "status": "pending",
            //       "type": "20ft Truck",
            //       "user_phone": "+923352640168",
            //       "vehicle_quantity": 1,
            //       "weight": "Less Than 1 Ton"
            //     },
            //     {
            //       "biltyNo": "BT0004c0",
            //       "id": "-MxnPkBrhBTkzaGVW85i",
            //       "material": [
            //         "cement"
            //       ],
            //       "option": "Labour",
            //       "option_quantity": 1,
            //       "quantity": "1",
            //       "status": "pending",
            //       "type": "20ft Truck",
            //       "user_phone": "+923352640168",
            //       "vehicle_quantity": 1,
            //       "weight": "Less Than 1 Ton"
            //     }
            //   ],
            //   "cargo_insurance": false,
            //   "containerReturnAddress": "karachi",
            //   "createdAt": "March 11th 2022, 3:28:04 pm",
            //   "date": "2022-04-03 17:57:00",
            //   "desLat": "24.844885",
            //   "desLng": "66.991985",
            //   "desText": "Tower",
            //   "destinationAddress": "lahore",
            //   "disText": "1 m",
            //   "durText": "1 min",
            //   "emptyLat": "53.21",
            //   "emptyLng": "67.088",
            //   "emptyText": "Pata nhi",
            //   "orderNo": "0004",
            //   "orgLat": "24.910186",
            //   "orgLng": "67.123307",
            //   "orgText": "johar Chowk",
            //   "originAddress": "karachi",
            //   "request_type": "transit",
            //   "status": "accepted",
            //   "totalRequests": 3,
            //   "type": "transit",
            //   "user_id": 4,
            //   "user_phone": "+923352640168",
            //   "user_type": "user",
            //   "username": "Ahmed"
            // },
            // {
            //   "cargo_insurance": false,
            //   "createdAt": "March 11th 2022, 3:28:38 pm",
            //   "date": "2022-04-03 17:57:00",
            //   "desLat": "24.844885",
            //   "desLng": "66.991985",
            //   "desText": "Tower",
            //   "disText": "1 m",
            //   "durText": "1 min",
            //   "orderNo": "0005",
            //   "orgLat": "24.910186",
            //   "orgLng": "67.123307",
            //   "orgText": "johar Chowk",
            //   "request_type": "upcountry",
            //   "status": "accepted",
            //   "subOrders": [
            //     {
            //       "bilty": [
            //         {
            //           "biltyNo": "BT0005a0",
            //           "status": "pending"
            //         }
            //       ],
            //       "material": [
            //         "cement"
            //       ],
            //       "option": "Crane 0-15",
            //       "option_quantity": 1,
            //       "status": "pending",
            //       "subOrderNo": "SO0005a",
            //       "type": "40ft Truck",
            //       "user_phone": "+923352640168",
            //       "vehicle_quantity": 1,
            //       "weight": "Less Than 1 Ton"
            //     },
            //     {
            //       "bilty": [
            //         {
            //           "biltyNo": "BT0005b0",
            //           "status": "pending"
            //         }
            //       ],
            //       "material": [
            //         "cement"
            //       ],
            //       "option": "Labour",
            //       "option_quantity": 1,
            //       "status": "pending",
            //       "subOrderNo": "SO0005b",
            //       "type": "20ft Truck",
            //       "user_phone": "+923352640168",
            //       "vehicle_quantity": 1,
            //       "weight": "Less Than 1 Ton"
            //     },
            //     {
            //       "bilty": [
            //         {
            //           "biltyNo": "BT0005c0",
            //           "status": "pending"
            //         }
            //       ],
            //       "material": [
            //         "cement"
            //       ],
            //       "option": "Labour",
            //       "option_quantity": 1,
            //       "status": "pending",
            //       "subOrderNo": "SO0005c",
            //       "type": "20ft Truck",
            //       "user_phone": "+923352640168",
            //       "vehicle_quantity": 1,
            //       "weight": "Less Than 1 Ton"
            //     }
            //   ],
            //   "user_id": 4,
            //   "user_phone": "+923352640168",
            //   "user_type": "user",
            //   "username": "Ahmed"
            // },
            // {
            //   "cargo_insurance": false,
            //   "createdAt": "March 11th 2022, 3:28:38 pm",
            //   "date": "2022-04-03 17:57:00",
            //   "desLat": "24.844885",
            //   "desLng": "66.991985",
            //   "desText": "Tower",
            //   "disText": "1 m",
            //   "durText": "1 min",
            //   "orderNo": "0005",
            //   "orgLat": "24.910186",
            //   "orgLng": "67.123307",
            //   "orgText": "johar Chowk",
            //   "request_type": "upcountry",
            //   "status": "completed",
            //   "subOrders": [
            //     {
            //       "bilty": [
            //         {
            //           "biltyNo": "BT0005a0",
            //           "status": "pending"
            //         }
            //       ],
            //       "material": [
            //         "cement"
            //       ],
            //       "option": "Crane 0-15",
            //       "option_quantity": 1,
            //       "status": "container_returned",
            //       "subOrderNo": "SO0005a",
            //       "type": "40ft Truck",
            //       "user_phone": "+923352640168",
            //       "vehicle_quantity": 1,
            //       "weight": "Less Than 1 Ton"
            //     },
            //     {
            //       "bilty": [
            //         {
            //           "biltyNo": "BT0005b0",
            //           "status": "pending"
            //         }
            //       ],
            //       "material": [
            //         "cement"
            //       ],
            //       "option": "Labour",
            //       "option_quantity": 1,
            //       "status": "container_returned",
            //       "subOrderNo": "SO0005b",
            //       "type": "20ft Truck",
            //       "user_phone": "+923352640168",
            //       "vehicle_quantity": 1,
            //       "weight": "Less Than 1 Ton"
            //     },
            //     {
            //       "bilty": [
            //         {
            //           "biltyNo": "BT0005c0",
            //           "status": "pending"
            //         }
            //       ],
            //       "material": [
            //         "cement"
            //       ],
            //       "option": "Labour",
            //       "option_quantity": 1,
            //       "status": "container_returned",
            //       "subOrderNo": "SO0005c",
            //       "type": "20ft Truck",
            //       "user_phone": "+923352640168",
            //       "vehicle_quantity": 1,
            //       "weight": "Less Than 1 Ton"
            //     }
            //   ],
            //   "user_id": 4,
            //   "user_phone": "+923352640168",
            //   "user_type": "user",
            //   "username": "Ahmed"
            // },
          ]
        })




      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });

  }
)

// /get_vendor_completed_orders
router.post("/get_vendor_completed_orders", verifyTokenFirebase,
  // Check User 
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`
        })
        break;
    }
  },
  // Get Completed Order
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.once("value", (snapshot) => {
      if (snapshot.val()) {
        const requests = [];

        snapshot.forEach((snap) => {
          requests.push(snap.val());
        })

        //  Active Orders
        const transitRequests = requests.filter((x) => {
          return x.request_type === 'transit'
        })

        const upcountryRequests = requests.filter((x) => {
          return x.request_type === 'upcountry'
        })



        // Filter For Transit Active Orders
        const transitCompletedOrders = transitRequests.filter((x) => {
          if (x.status === 'completed') {
            return x
          }
        })

        // Filter For Upcountry Active Orders
        const upcountryCompleteOrders = [];
        const upcountryCompletedOrders = upcountryRequests.filter((x) => {
          const suborders = x.subOrders
          suborders.forEach((suborder) => {
            if (suborder.vendor_phone) {
              if (suborder.vendor_phone == params.user.user_id) {
                if (suborder.status === 'completed') {
                  upcountryCompleteOrders.push(x)
                }
              }
            }
          })

        })



        res.json({
          status: true,
          data: [...transitCompletedOrders, ...upcountryCompleteOrders,
          {
            "bilty": [{
              "biltyNo": "BT0019a0",
              "driver": "+923243280234",
              "driver_alotted_on": "March 15th 2022, 4:53:36 pm",
              "id": "-My7uJxyFjyHAV7w_bx_",
              "material": ["electronics"],
              "option": "labour",
              "option_quantity": "1",
              "quantity": "1",
              "status": "container_returned",
              "type": "20ft Truck",
              "user_phone": "+923188894220",
              "vehicle": "YND-888",
              "vehicle_quantity": "1",
              "vendor": "+923323025261",
              "weight": "5-7"
            }],
            "cargo_insurance": false,
            "contact_person": "self",
            "containerReturnAddress": "karachi",
            "createdAt": "March 15th 2022, 4:13:09 pm",
            "date": "2022-03-26 17:57:00",
            "desLat": "24.844885",
            "desLng": "66.991985",
            "desText": "Tower",
            "destinationAddress": "lahore",
            "disText": "1 m",
            "durText": "1 min",
            "emptyLat": "53.21",
            "emptyLng": "67.088",
            "emptyText": "Pata nhi",
            "orderNo": "0019",
            "order_accepted_on": "March 15th 2022, 4:36:37 pm",
            "orgLat": "24.910186",
            "orgLng": "67.123307",
            "orgText": "Perfume Chowk",
            "originAddress": "karachi",
            "payment_approval": false,
            "payment_method": "cod",
            "point_of_payment": "origin",
            "qoute": {
              "cargo_insurance": false,
              "containerReturnAddress": "karachi",
              "createdAt": "March 15th 2022, 4:13:09 pm",
              "date": "2022-03-26 17:57:00",
              "desLat": "24.844885",
              "desLng": "66.991985",
              "destinationAddress": "lahore",
              "disText": "1 m",
              "durText": "1 min",
              "orderNo": "0019",
              "orgLat": "24.910186",
              "orgLng": "67.123307",
              "originAddress": "karachi",
              "phone": "+923323025261",
              "qouteId": "-MyCH9DKjf_b6sISSuM5",
              "qoute_amount": "500000",
              "qoutedAt": "March 15th 2022, 4:13:39 pm",
              "request_type": "transit",
              "status": "pending",
              "type": "transit",
              "user_id": "2",
              "user_phone": "+923188894220",
              "user_type": "pro",
              "username": "Asher Ajaz"
            },
            "qoute_accepted_on": "March 15th 2022, 4:29:44 pm",
            "request_type": "transit",
            "status": "completed",
            "totalRequests": 18,
            "type": "transit",
            "user_id": "2",
            "user_phone": "+923188894220",
            "user_type": "pro",
            "username": "Asher Ajaz",
            "vendor_phone": "+923323025261"
          },
          {
            "cargo_insurance": false,
            "createdAt": "March 11th 2022, 3:28:38 pm",
            "date": "2022-04-03 17:57:00",
            "desLat": "24.844885",
            "desLng": "66.991985",
            "desText": "Tower",
            "disText": "1 m",
            "durText": "1 min",
            "orderNo": "0005",
            "orgLat": "24.910186",
            "orgLng": "67.123307",
            "orgText": "johar Chowk",
            "request_type": "upcountry",
            "status": "pending",
            "subOrders": [{
              "bilty": [{
                "biltyNo": "BT0005a0",
                "status": "container_returned"
              }],
              "material": ["cement"],
              "option": "Crane 0-15",
              "option_quantity": 1,
              "status": "completed",
              "subOrderNo": "SO0005a",
              "type": "40ft Truck",
              "user_phone": "+923352640168",
              "vehicle_quantity": 1,
              "weight": "Less Than 1 Ton"
            }, {
              "bilty": [{
                "biltyNo": "BT0005b0",
                "status": "pending"
              }],
              "material": ["cement"],
              "option": "Labour",
              "option_quantity": 1,
              "status": "completed",
              "subOrderNo": "SO0005b",
              "type": "20ft Truck",
              "user_phone": "+923352640168",
              "vehicle_quantity": 1,
              "weight": "Less Than 1 Ton"
            }, {
              "bilty": [{
                "biltyNo": "BT0005c0",
                "status": "pending"
              }],
              "material": ["cement"],
              "option": "Labour",
              "option_quantity": 1,
              "status": "pending",
              "subOrderNo": "SO0005c",
              "type": "20ft Truck",
              "user_phone": "+923352640168",
              "vehicle_quantity": 1,
              "weight": "Less Than 1 Ton"
            }],
            "user_id": 4,
            "user_phone": "+923352640168",
            "user_type": "user",
            "username": "Ahmed"
          }
          ]
        })

      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });

  }
)

// /get_vendor_qoutes 
router.post(
  "/get_vendor_qoutes",
  verifyTokenFirebase,
  // Check User 
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`
        })
        break;
    }
  },
  // Get Qoutes,User Counter Offers,Vendor Counter Offers
  async (req, res, next) => {
    const params = req.body;

    // Get All Qoutes For Vendor
    const transitQoutesSnap = await pplBiddingsRef
      .child("transit")
      .child("qoutes")
      .orderByChild("phone")
      .equalTo(params.user.user_id)
      .once("value");

    const upcountryQoutesSnap = await pplBiddingsRef
      .child("upcountry")
      .child("qoutes")
      .orderByChild("phone")
      .equalTo(params.user.user_id)
      .once("value");

    // Qoutes 
    const rawtransitQoutes = await transitQoutesSnap.val();
    const rawupcountryQoutes = await upcountryQoutesSnap.val();

    const transitQoutes = [];
    const upcountryQoutes = [];


    if (rawtransitQoutes !== null) {
      const convert1 = Object.entries(rawtransitQoutes);
      convert1.forEach((x) => {
        transitQoutes.push(x[1]);
      });
    }

    if (rawupcountryQoutes !== null) {
      const convert2 = Object.entries(rawupcountryQoutes);
      convert2.forEach((x) => {
        upcountryQoutes.push(x[1]);
      });
    }

    // Filter For Pending Qoutes
    const pendingQoutes1 = transitQoutes.filter((qoute) => {
      return qoute.status === 'pending'
    })

    // Filter For Accepted Qoutes
    const acceptedQoutes1 = transitQoutes.filter((qoute) => {
      return qoute.status === 'accepted'
    })

    // Filter For Rejected Qoutes
    const rejectedQoutes1 = transitQoutes.filter((qoute) => {
      return qoute.status == 'rejected'
    })

    // UPCOUNTRY
    // Filter For Pending Qoutes
    const pendingQoutes2 = upcountryQoutes.filter((qoute) => {
      return qoute.status == 'pending'
    })

    // Filter For Accepted Qoutes
    const acceptedQoutes2 = upcountryQoutes.filter((qoute) => {
      return qoute.status == 'accepted'
    })

    // Filter For Rejected Qoutes
    const rejectedQoutes2 = upcountryQoutes.filter((qoute) => {
      return qoute.status == 'rejected'
    })


    res.json({
      status: true,
      pending: [...pendingQoutes1, ...pendingQoutes2],
      accepted: [...acceptedQoutes1, ...acceptedQoutes2],
      rejected: [...rejectedQoutes1, ...rejectedQoutes2]
    })
  },
);

// /get_user_counter_offers
router.post("/get_user_counter_offers", verifyTokenFirebase,
  // Check User 
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`
        })
        break;
    }
  },
  async (req, res) => {
    const params = req.body;

    // Get All User Counter Offers For Vendor
    const transitUserCounterSnap = await pplBiddingsRef
      .child("transit")
      .child("user_counter")
      .orderByChild("vendor_phone")
      .equalTo(params.user.user_id)
      .once("value");
    const upcountryUserCounterSnap = await pplBiddingsRef
      .child("upcountry")
      .child("user_counter")
      .orderByChild("vendor_phone")
      .equalTo(params.user.user_id)
      .once("value")

    // User Counter Offer
    const rawtransitUserCounterOffers = await transitUserCounterSnap.val();
    const rawupcountryUserCounterOffers = await upcountryUserCounterSnap.val();

    const transitUserCounterOffers = [];
    const upcountryUserCounterOffers = [];

    if (rawtransitUserCounterOffers !== null) {
      const convert3 = Object.entries(rawtransitUserCounterOffers);
      convert3.forEach((x) => {
        transitUserCounterOffers.push(x[1]);
      });
    }

    if (rawupcountryUserCounterOffers !== null) {
      const convert4 = Object.entries(rawupcountryUserCounterOffers);
      convert4.forEach((x) => {
        upcountryUserCounterOffers.push(x[1]);
      });
    }

    // Transit
    // Filter For Pending Qoutes 
    const pendingOffers1 = transitUserCounterOffers.filter((qoute) => {
      return qoute.status === 'pending'
    })

    // Filter For Accepted Qoutes
    // const acceptedOffers1 = transitUserCounterOffers.filter((qoute) => {
    //   return qoute.status === 'accepted'
    // })

    // Filter For Rejected Qoutes
    // const rejectedOffers1 = transitUserCounterOffers.filter((qoute) => {
    //   return qoute.status === 'rejected'
    // })

    // UPCOUNTRY
    // Filter For Pending Qoutes
    const pendingOffers2 = upcountryUserCounterOffers.filter((qoute) => {
      return qoute.status === 'pending'
    })

    // Filter For Accepted Qoutes
    // const acceptedOffers2 = upcountryUserCounterOffers.filter((qoute) => {
    //   return qoute.status === 'accepted'
    // })

    // Filter For Rejected Qoutes
    // const rejectedOffers2 = upcountryUserCounterOffers.filter((qoute) => {
    //   return qoute.status === 'rejected'
    // })


    res.json({
      status: true,
      data: [...pendingOffers1, ...pendingOffers2],
      accepted: [],
      rejected: []
    })

  })


// /get_vendor_partner_counter_offers
router.post("/get_vendor_partner_counter_offers", verifyTokenFirebase,
  // Check User 
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        next();
        break;

      default:
        res.json({
          status: false,
          error: `User Type Is ${params.user.user_type}`
        })
        break;
    }
  },
  async (req, res) => {
    const params = req.body;


    // Get All Vendor Counter Offers For Vendor
    const transitVendorCounterSnap = await pplBiddingsRef
      .child("transit")
      .child("vendor_counter")
      .orderByChild("vendor_phone")
      .equalTo(params.user.user_id)
      .once("value");

    const upcountryVendorCounterSnap = await pplBiddingsRef
      .child("upcountry")
      .child("vendor_counter")
      .orderByChild("vendor_phone")
      .equalTo(params.user.user_id)
      .once("value");


    // Vendor Counter Offer
    const rawtransitVendorCounterOffers = await transitVendorCounterSnap.val();
    const rawupcountryVendorCounterOffers = await upcountryVendorCounterSnap.val();


    const transitVendorCounterOffers = [];
    const upcountryVendorCounterOffers = [];


    if (rawtransitVendorCounterOffers !== null) {
      const convert5 = Object.entries(rawtransitVendorCounterOffers);
      convert5.forEach((x) => {
        transitVendorCounterOffers.push(x[1]);
      });
    }
    if (rawupcountryVendorCounterOffers !== null) {
      const convert6 = Object.entries(rawupcountryVendorCounterOffers);
      convert6.forEach((x) => {
        upcountryVendorCounterOffers.push(x[1]);
      });
    }


    // Transit
    // Filter For Pending Qoutes 
    const pendingOffers1 = transitVendorCounterOffers.filter((qoute) => {
      return qoute.status === 'pending'
    })

    // Filter For Accepted Qoutes
    const acceptedOffers1 = transitVendorCounterOffers.filter((qoute) => {
      return qoute.status === 'accepted'
    })

    // Filter For Rejected Qoutes
    const rejectedOffers1 = transitVendorCounterOffers.filter((qoute) => {
      return qoute.status === 'rejected'
    })

    // UPCOUNTRY
    // Filter For Pending Qoutes
    const pendingOffers2 = upcountryVendorCounterOffers.filter((qoute) => {
      return qoute.status === 'pending'
    })

    // Filter For Accepted Qoutes
    const acceptedOffers2 = upcountryVendorCounterOffers.filter((qoute) => {
      return qoute.status === 'accepted'
    })

    // Filter For Rejected Qoutes
    const rejectedOffers2 = upcountryVendorCounterOffers.filter((qoute) => {
      return qoute.status === 'rejected'
    })


    res.json({
      status: true,
      pending: [...pendingOffers1, ...pendingOffers2],
      // accepted: [...acceptedOffers1, ...acceptedOffers2],
      // rejected: [...rejectedOffers1, ...rejectedOffers2]
    })


  })

// /get_new_jobs -> (For driver/vendor App)
router.post(
  "/get_new_jobs",
  verifyTokenFirebase,
  // Get PPL Orders
  async (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "driver":
        pplRequestRef.once("value", (snapshot) => {
          if (snapshot.val()) {
            const requests = snapshot.val();
            const convert = Object.entries(requests);

            const final = [];
            convert.forEach((x) => {
              final.push(x[1]);
              console.log("orders statuses -> ", x[1].status);
            });

            //  Filter By Driver
            const getByDriver = final.filter((order) => {
              if (order.bilty) {
                //  For PPL
                const allbilties = order.bilty;
                const searchForDriver = allbilties.filter((bilty) => {
                  return bilty.driver === params.user.user_id;
                });

                return searchForDriver;

                console.log("searchForDriver -> ", searchForDriver);
              }
            });

            console.log("getByDriver -> ", getByDriver);

            req.body.ppl = getByDriver;
            next();
          } else {
            req.body.ppl = [];
            next();
          }
        });
        break;

      case "vendor":
        next();
        break;

      default:
        res.json({
          status: false,
          error: "Unknown User Type",
        });
        break;
    }
  },
  // Get Transit Qoutes
  (req, res, next) => {
    const params = req.body;

    // Get All Qoutes For Vendor
    pplBiddingsRef
      .child("transit")
      .child("qoutes")
      .orderByChild("phone")
      .equalTo(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const transitQoutes = [];

          snapshot.forEach((snap) => {
            transitQoutes.push(snap.val())
          })


          req.body.transitQoutes = transitQoutes;
          next();

        } else {
          req.body.transitQoutes = [];
          next();
        }
      }).catch((err) => {
        res.json({
          status: false,
          error: err.message
        })
      })


  },
  // Get Upcountry Qoutes
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
      .child("upcountry")
      .child("qoutes")
      .orderByChild("phone")
      .equalTo(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const upcountryQoutes = [];
          snapshot.forEach((snap) => {
            upcountryQoutes.push(snap.val())
          })

          req.body.upcountryQoutes = upcountryQoutes;
          next();
        } else {
          req.body.upcountryQoutes = [];
          next();
        }
      }).catch(err => console.log(err))
  },
  // Get Requests - Vendor Not Qouted On
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.orderByChild("status").equalTo("pending").once('value', (snapshot) => {
      if (snapshot.val()) {
        const requests = [];
        snapshot.forEach((snap) => {
          requests.push(snap.val())
        })

        const allqoutes = [...params.transitQoutes];
        // console.log('allqoutes -> ', allqoutes)
        const removedDuplicates = [...new Set(allqoutes)]

        // const upcountryQoutes = params.upcountryQoutes;
        // console.log('upcountryQoutes -> ', upcountryQoutes)

        const upcountryRequest = requests.filter((x) => {
          return x.request_type === 'upcountry'
        })

        const transitRequest = requests.filter((x) => {
          return x.request_type === 'transit'
        })




        upcountryRequest.forEach((x) => {
          const suborders = x.subOrders;


          suborders.forEach((suborder) => {
            const suborderno = suborder.subOrderNo;
            console.log('suborderno -> ', suborderno)
            const qoutelookup = params.upcountryQoutes.filter((qoute) => {
              return qoute.subOrderNo === suborderno
            })


            if (qoutelookup) {
              if (qoutelookup.length == 1) {
                // suborder['qoute'] = qoutelookup[0];
                suborder['rates_found'] = true;
              } else if (qoutelookup.length > 1) {
                // suborder['qoute'] = qoutelookup[0];
                suborder['rates_found'] = true;
              }
              else {
                suborder['rates_found'] = false;
              }
            }
            console.log('qoutelookup -> ', qoutelookup);
          })
        })

        console.log('upcountryRequest -> ', upcountryRequest)




        if (removedDuplicates.length > 0) {

          const filterRequests = transitRequest.filter(item => !removedDuplicates.includes(item.orderNo))

          filterRequests.forEach((x) => {
            const bilties = x.bilty;


            bilties.forEach((bilty) => {
              const biltyNo = bilty.biltyNo;
              const getOrderNo = biltyNo.slice(2, (biltyNo.length - 2));
              // console.log('suborderno -> ', suborderno)
              const qoutelookup = params.transitQoutes.filter((qoute) => {
                return qoute.orderNo === getOrderNo
              })


              if (qoutelookup) {
                if (qoutelookup.length == 1) {
                  // suborder['qoute'] = qoutelookup[0];
                  bilty['rates_found'] = true;
                } else if (qoutelookup.length > 1) {
                  // suborder['qoute'] = qoutelookup[0];
                  bilty['rates_found'] = true;
                }
                else {
                  bilty['rates_found'] = false;
                }
              }
              console.log('transit qoutelookup -> ', qoutelookup);
            })
          })

          res.json({
            status: true,
            data: [...filterRequests, ...upcountryRequest]
          })

        } else {
          res.json({
            status: true,
            data: [...requests, ...upcountryRequest]
          })
        }


      } else {
        res.json({
          status: true,
          data: []
        })
      }
    })
  },
  // Throw data
  (req, res) => {
    const params = req.body;

    // const sortedPPL = _.orderBy(params.ppl, (a) => moment(a.createdAt), 'asc')

    // let allOrders = [...params.ppl, ...params.scm];

    // res.json({
    //   status: true,
    //   orders: [],
    // });
  }
);

// Get Single Bilty
router.post("/get_vendor_single_bilty", verifyTokenFirebase,
  // Get Order And Bilty
  (req, res, next) => {
    const params = req.body;
    const getOrderNo = params.biltyNo.slice(2, (params.biltyNo.length - 2));

    pplRequestRef.child(getOrderNo).once('value', (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();
        req.body.request = request;
        next();

      } else {
        res.json({
          status: false,
          error: "Request not Found !"
        })
      }
    })
  },
  // Bilty
  (req, res) => {
    const params = req.body;

    let final_amount;

    if (params.request.qoute) {
      final_amount = params.request.qoute.qoute_amount
    }

    if (params.request.user_counter) {
      final_amount = params.request.user_counter.amount
    }

    if (params.request.vendor_counter) {
      final_amount = params.request.vendor_counter.amount
    }

    if (params.request.request_type === 'transit') {
      const bilties = params.request.bilty;

      const currentBilty = bilties.filter((bilty) => {
        return bilty.biltyNo === params.biltyNo
      })

      let currentBilty2;

      if (currentBilty) {
        if (currentBilty.length > 0) {
          currentBilty2 = currentBilty[0]
        }
      }


      let data = {
        ...params.request,
        ...currentBilty2,
        final_amount
      }

      res.json({
        status: true,
        data: data
      })
    } else if (params.request.request_type === 'upcountry') {



      const suborders = params.request.subOrders;

      let currentBilty;

      suborders.forEach((suborder) => {
        suborder.bilty.forEach((bilty) => {
          if (bilty.biltyNo === params.biltyNo) {
            currentBilty = {
              ...bilty,
              final_amount,
              materials: suborder.material,
              vehicle_type: suborder.type,
              option: suborder.option,
              option_quantity: suborder.option_quantity,
              subOrderNo: suborder.subOrderNo,
              user_phone: suborder.user_phone,
              vendor_phone: suborder.vendor_phone || null,
              vendor_name: suborder.vendor_name || null,
              weight: suborder.weight,
              cargo_insurance: params.request.cargo_insurance || null,
              date: params.request.date,
              orderNo: params.request.orderNo,
              orgLat: params.request.orgLat,
              orgLng: params.request.orgLng,
              desLat: params.request.desLat,
              desLng: params.request.desLng,
              disText: params.request.disText,
              durText: params.request.durText,
              originAddress: params.request.originAddress || null,
              destinationAddress: params.request.destinationAddress || null,
              containerReturnAddress: params.request.containerReturnAddress || null,
              security_deposit: params.request.security_deposit || null,
              user_id: params.request.user_id,
              user_phone: params.request.user_phone,
              user_type: params.request.user_type,
              username: params.request.username,
              request_type: params.request.request_type,
              createdAt: params.request.createdAt,
              documents: params.request.documents
            }
          }
        })
      })


      res.json({
        status: true,
        data: currentBilty
      })
    }
  }
)


// ---------------------

// router.get("get_driver_history");

// Get User Profile
// {
//   "token": ""
// }
router.post(
  "/get_user_profile",
  verifyTokenFirebase,
  // Get Profile
  (req, res, next) => {
    const params = req.body;
    let userType;
    if (params.user.user_type == 'user') {
      userType = 'users'
    } else if (params.user.user_type == 'driver') {
      userType = 'drivers'
    } else if (params.user.user_type == 'vendor') {
      userType = 'vendors'
    } else {
      userType = params.user.user_type
    }

    userRef
      .child(userType)
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();

          res.json({
            status: true,
            data: {
              ...user,
              password: null,
            },
          });
        } else {
          userRef
            .child("pro")
            .child(params.user.user_id)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();

                res.json({
                  status: true,
                  data: {
                    ...user,
                    password: null,
                  },
                });
              } else {
                res.json({
                  status: false,
                  error: "No User Profile Found !",
                });
              }
            });

        }
      });
  }
);

// Update User Profile - TODO
// {
//   "fullname": "",
//   "email": ""
// }

router.post(
  "/update_user_profile",
  verifyTokenFirebase,
  // Check And Upload Profile Image
  // (req, res, next) => {
  //   const files = req.files;

  //   if (req.files) {
  //     const { profileImage } = req.files;

  //     // Uploading Bill of landing
  //     const profileImage_filename = profileImage.name;
  //     const profileImage_filetype = profileImage_filename.split(".")[1];
  //     const profileImage_name = `${req.body.user.user_id}_profile_image`;

  //     const path = "ProfileImages/";

  //     fileUpload(
  //       profileImage,
  //       profileImage_name,
  //       path,
  //       profileImage_filetype,
  //       (err) => {
  //         if (err) {
  //           console.log("err -> ", err);
  //           next();
  //         } else if (err == null) {
  //           next();
  //         }
  //       }
  //     );
  //   } else {
  //     next();
  //   }
  // },
  // Get Image Links
  // async (req, res, next) => {
  //   const params = req.body;
  //   const files = req.files;

  //   if(req.files)
  //   {
  //     let options = {
  //       prefix: `ProfileImages/`,
  //     };

  //     const [files] = await storage.bucket("meribilty-files").getFiles(options);
  //     var uploadImages = [];

  //     files.forEach((file) => {
  //       const fileName = file.name;

  //       if (fileName.includes(params.user.user_id)) {
  //         let image = {
  //           name: file.name,
  //           url: file.publicUrl(),
  //         };

  //         uploadImages.push(image);
  //       }
  //     });

  //     if(uploadImages.length > 0)
  //     {
  //       req.body.ProfileImage = uploadImages;
  //     }

  //     console.log('uploadImages -> ',uploadImages) 
  //     next();
  //   } else {
  //     console.log('No Profile Image Uploaded')
  //     next();
  //   }


  // },
  // Update Profile
  (req, res) => {
    const params = req.body;
    let userType;
    if (params.user.user_type == 'user') {
      userType = 'users'
    } else {
      userType = params.user.user_type
    }

    userRef
      .child(userType)
      .child(params.user.user_id)
      .update({
        ...params,
        token: null,
        user: null,
      })
      .then(() => {
        res.json({
          status: true,
          message: "User Profile Updated !",
        });
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  }
);

// Get vendor_or_driver Profile
router.post(
  "/get_vendor_or_driver_profile",
  verifyTokenFirebase,
  // Get Profile
  (req, res) => {
    const params = req.body;

    if (params.user.user_type == 'vendor') {
      userType = 'vendors'
    } else if (params.user.user_type == 'driver') {
      userType = 'drivers'
    } else {
      res.json({
        status: false,
        error: "User Cannot Get Vendor/Driver Profile !"
      })
    }

    userRef
      .child(params.user.user_type+'s')
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();

          res.json({
            status: true,
            data: {
              ...user,
              password: null,
            },
          });
        } else {
          res.json({
            status: false,
            error: "No User Profile Found !",
          });
        }
      });
  }
);

// Update vendor_or_driver Profile
router.post(
  "/update_vendor_or_driver_profile",
  verifyTokenFirebase,
  // Check And Upload Profile Image
  (req, res, next) => {
    if (req.files) {
      const { profileImage } = req.files;

      // Uploading Bill of landing
      const profileImage_filename = profileImage.name;
      const profileImage_filetype = profileImage_filename.split(".")[1];
      const profileImage_name = `${req.body.user.user_id}_profile_image`;

      const path = "ProfileImages/";

      fileUpload(
        profileImage,
        profileImage_name,
        path,
        profileImage_filetype,
        (err) => {
          if (err) {
            console.log("err -> ", err);
            next();
          } else if (err == null) {
            next();
          }
        }
      );
    } else {
      next();
    }
  },
  (req, res) => {
    const params = req.body;

    let userType;
    if (params.user.user_type == 'vendor') {
      userType = 'vendors'
    } else if (params.user.user_type == 'driver') {
      userType = 'drivers'
    } else {
      res.json({
        status: false,
        error: "User Cannot Get Vendor/Driver Profile"
      })
    }

    userRef
      .child(userType)
      .child(params.user.user_id)
      .update(params)
      .then(() => {
        res.json({
          status: true,
          message: `${params.user.user_type} Profile Updated !`,
        });
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  }
);

// Get Data For Vehicle Selection (Materials,Weights,Options,Vehicle Type)
router.post("/get_vehicle_types_and_options",
  // Get Materials
  (req, res, next) => {
    const params = req.body;

    pplSettingsRef.child("material_list").once('value', (snapshot) => {
      if (snapshot.val()) {
        const materials = [];
        snapshot.forEach((snap) => {
          materials.push(snap.val().name)
        })

        req.body.materials = materials;
        next();
      } else {
        res.json({
          status: false,
          error: "Materials Not Found !"
        })
      }
    })
  },
  // Get Weights
  (req, res, next) => {
    const params = req.body;

    pplSettingsRef.child("weights").once('value', (snapshot) => {
      if (snapshot.val()) {
        req.body.weights = snapshot.val();
        next();
      } else {
        next();
      }
    })
  },
  (req, res) => {
    pplSettingsRef.child("vehicle_types").once("value", (snapshot) => {
      if (snapshot.val()) {
        const rawtypes = snapshot.val();
        const types = [];
        const convert = Object.entries(rawtypes);

        convert.forEach((x) => {
          types.push(x[1]);
        });

        const final = [];

        types.forEach((type) => {
          let loadingOptions = [];
          if (type.lifters) {
            const lifters = type.lifters;
            lifters.forEach((lifter) => {
              loadingOptions.push(`lifter ${lifter.weights}`)
            })
          }
          if (type.cranes) {
            const cranes = type.cranes;
            cranes.forEach((crane) => {
              loadingOptions.push(`crane ${crane.weights}`)
            })
          }
          if (type.labour) {
            loadingOptions.push(`labour`)
          }

          final.push(type.vehicleType)
        })

        res.json({
          status: true,
          vehicle_types: final,
          materials: req.body.materials,
        });
      } else {
        res.json({
          status: false,
          error: "No Vehicle type Found !",
        });
      }
    });
  }
);

// Get All User Vehicle Selections 
router.post("/get_vehicle_selections", verifyTokenFirebase, (req, res, next) => {
  const params = req.body;

  pplUserVehicleSelections
    .child(params.user.user_id)
    .once("value", (snapshot) => {
      if (snapshot.val()) {
        const selections = snapshot.val();
        const options = [];
        const convert = Object.entries(selections);
        convert.forEach((x) => {
          options.push(x[1]);
        });
        res.json({
          status: true,
          data: options,
        });
      } else {
        res.json({
          status: false,
          error: "No Selection Found !",
        });
      }
    });
});

// {
//   "token": "",
//   "type": "",
//   "option": ""
//   "vehicle_quantity": "",
//   "option_quantity": ""
//   "weight": "",
//   "material": ""
// }
router.post("/add_vehicle_selection",
  body("type").isString().withMessage("name must be an string"),
  body("vehicle_quantity").isNumeric().withMessage("vehicle_quantity must be an number"),
  body("weight").isString().withMessage("weight must be a string"),
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

      case "pro":
        req.body.user = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot add a vehicle selection  !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot add a vehicle selection  !`,
        });
        break;
    }
  },
  // Validation
  (req, res, next) => {
    const params = req.body;
    if (params.vehicle_quantity == "0" || params.vehicle_quantity == 0 || params.vehicle_quantity == "") {
      res.json({
        status: false,
        error: "Quanitiy Not Provided"
      })
    } else if (params.weight == "") {
      res.json({
        status: false,
        error: "Weight Not Provided"
      })
    } else {
      next();
    }



  },
  // Checking Vehicle Types in Database
  async (req, res, next) => {
    const params = req.body;
    let exists = true;

    if (Array.isArray(params.material)) {

      for (const material of params.material) {
        await pplSettingsRef
          .child("material_list")
          .child(material)
          .once("value", (snap) => {
            if (!snap.val()) {
              exists = false;
            }
          })
        if (!exists) { break }
      }
    } else {

      await pplSettingsRef
        .child("material_list")
        .child(params.material)
        .once("value", (snap) => {
          if (!snap.val()) {
            exists = false;
          }
        })
    }

    if (!exists) {
      return res.json({
        status: false,
        error: "Material Not Found In Database",
      });
    }

    pplSettingsRef
      .child("vehicle_types")
      .child(params.type)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vehicletype = snapshot.val();
          req.body.vehicletype = vehicletype;
          let userDemandedOption = params.option;
          // console.log('option -> ', params.option.toLowerCase());
          if (userDemandedOption) {
            if (userDemandedOption.includes("lifter") || userDemandedOption.includes("Lifter")) {
              console.log("Lifter -userDemandedOption -> ", userDemandedOption);
              let weightRange = userDemandedOption.split(" ")[1];
              console.log("weightRange ->", weightRange);
  
              const Alllifters = vehicletype.lifters;
  
              const checkOptionOnWeights = Alllifters.filter((x) => {
                return x.weights === weightRange;
              });
  
              if (checkOptionOnWeights) {
                if (checkOptionOnWeights.length !== 0) {
                  const price =
                    parseInt(checkOptionOnWeights[0].ratePerHour) *
                    parseInt(params.quantity);
                  req.body.price = price;
                  console.log('price -> ', price);
                  console.log('Price Generated');
                  next();
                } else {
                  res.json({
                    status: false,
                    error: "Option Not Found In This Vehicle type",
                  });
                }
              }
            } else if (userDemandedOption.includes("crane") || userDemandedOption.includes("Crane")) {
              console.log("crane -userDemandedOption -> ", userDemandedOption);
              let weightRange = userDemandedOption.split(" ")[1];
              console.log("weightRange ->", weightRange);
  
              const Alllifters = vehicletype.cranes ? vehicletype.cranes : [];
  
              const checkOptionOnWeights = Alllifters.filter((x) => {
                return x.weights === weightRange;
              });
  
              if (checkOptionOnWeights) {
                if (checkOptionOnWeights.length !== 0) {
                  const price =
                    parseInt(checkOptionOnWeights[0].ratePerHour) *
                    parseInt(params.quantity);
                  req.body.price = price;
                  next();
                } else {
                  res.json({
                    status: false,
                    error: "Option Not Found In This Vehicle type",
                  });
                }
              }
            } else if (userDemandedOption.includes("labour") || userDemandedOption.includes("Labour")) {
              console.log("labour -userDemandedOption -> ", userDemandedOption);
              const labourprice = vehicletype.labour;
  
              const price =
                parseInt(labourprice) *
                parseInt(params.quantity);
              req.body.price = price;
              next();
            } else {
              res.json({
                status: false,
                error: "Vehicle type Does not contain loading option, Loading Option is not valid !"
              })
            }
          } else {
            next();
          }
        } else {
          res.json({
            status: false,
            error: "Vehicle Type Not Found In Database",
          });
        }
      })
      .catch((err) => {
        res.json({
          status: false,
          message: err.message,
        });
      });
  },
  // Save Data in Database
  async (req, res) => {
    const params = req.body;

    const newVehicle = pplUserVehicleSelections.child(params.user.user_id).push();
    const newVehicleId = newVehicle.key;

    if (params.user.user_type == 'user' || params.user.user_type == 'pro') {
      newVehicle
        .set({
          id: newVehicleId,
          user_phone: params.user.user_id,
          type: params.type,
          weight: params.weight,
          vehicle_quantity: params.vehicle_quantity,
          option_quantity: (params.option_quantity || null),
          option: (params.option || null),
          material: params.material
        })
        .then(() => {
          res.json({
            status: true,
            message: "Vehicle Selection Added",
          });
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
    } else {
      res.json({
        status: false,
        error: `User Type ${params.user.type} cannot add vehicle !`
      })
    }

    // }
  }
);

// {
//   "token": "",
//   "id": "", 
//   "type": "",
//   "option": ""
//   "vehicle_quantity": "",
//   "option_quantity": ""
//   "weight": ""
// }
// TODO
router.post("/edit_vehicle_selection",
  body("id").isString().withMessage("id must be an string"),
  body("type").isString().withMessage("name must be an string"),
  body("vehicle_quantity").isNumeric().withMessage("vehicle_quantity must be an number"),
  body("option_quantity").isNumeric().withMessage("option_quantity must be an number"),
  body("option").isString().withMessage("option must be an string"),
  body("weight").isString().withMessage("weight must be a string"),
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

      case "pro":
        req.body.user = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot add a vehicle selection  !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot add a vehicle selection  !`,
        });
        break;
    }
  },
  // Check Vehicle Selection Exists
  (req, res, next) => {
    const params = req.body;

    pplUserVehicleSelections
      .child(params.user.user_id)
      .child(params.id)
      .once('value', (snapshot) => {
        if (snapshot.val()) {
          next()
        } else {
          res.json({
            status: false,
            error: 'No Vehicle Found With This ID'
          })
        }
      })
  },
  // Checking Vehicle Types in Database
  // (req, res, next) => {
  //   const params = req.body;

  //   pplSettingsRef
  //     .child("vehicle_types")
  //     .child(params.type)
  //     .once("value", (snapshot) => {
  //       if (snapshot.val()) {
  //         const vehicletype = snapshot.val();
  //         req.body.vehicletype = vehicletype;

  //         console.log(vehicletype);
  //         next(); 
  //         // let userDemandedOption = params.option;

  //         // if (userDemandedOption.includes("lifter")) {
  //         //   console.log("Lifter -userDemandedOption -> ", userDemandedOption);
  //         //   let weightRange = userDemandedOption.split(" ")[1];
  //         //   console.log("weightRange ->", weightRange);

  //         //   const Alllifters = vehicletype.lifters;

  //         //   const checkOptionOnWeights = Alllifters.filter((x) => {
  //         //     return x.weights === weightRange;
  //         //   });

  //         //   if (checkOptionOnWeights) {
  //         //     if (checkOptionOnWeights.length !== 0) {
  //         //       const price =
  //         //         parseInt(checkOptionOnWeights[0].ratePerHour) *
  //         //         parseInt(params.quantity);
  //         //       req.body.price = price;
  //         //       next();
  //         //     } else {
  //         //       res.json({
  //         //         status: false,
  //         //         error: "Option Not Found In This Vehicle type",
  //         //       });
  //         //     }
  //         //   }
  //         // }

  //         // if (userDemandedOption.includes("crane")) {
  //         //   console.log("crane -userDemandedOption -> ", userDemandedOption);
  //         //   let weightRange = userDemandedOption.split(" ")[1];
  //         //   console.log("weightRange ->", weightRange);

  //         //   const Alllifters = vehicletype.cranes ? vehicletype.cranes : [];

  //         //   const checkOptionOnWeights = Alllifters.filter((x) => {
  //         //     return x.weights === weightRange;
  //         //   });

  //         //   if (checkOptionOnWeights) {
  //         //     if (checkOptionOnWeights.length !== 0) {
  //         //       const price =
  //         //         parseInt(checkOptionOnWeights[0].ratePerHour) *
  //         //         parseInt(params.quantity);
  //         //       req.body.price = price;
  //         //       next();
  //         //     } else {
  //         //       res.json({
  //         //         status: false,
  //         //         error: "Option Not Found In This Vehicle type",
  //         //       });
  //         //     }
  //         //   }
  //         // }

  //         // if (userDemandedOption.includes("labour")) {
  //         //   console.log("labour -userDemandedOption -> ", userDemandedOption);
  //         //   const price =
  //         //     parseInt(checkOptionOnWeights[0].labour) *
  //         //     parseInt(params.quantity);
  //         //   req.body.price = price;
  //         //   next();
  //         // }
  //       } else {
  //         res.json({
  //           status: false,
  //           error: "Vehicle Type Not Found In Database",
  //         });
  //       }
  //     })
  //     .catch((err) => {
  //       res.json({
  //         status: false,
  //         message: err.message,
  //       });
  //     });
  // },
  // Edit Vehicle Selection
  (req, res) => {
    const params = req.body;

    pplUserVehicleSelections
      .child(params.user.user_id)
      .child(params.id)
      .update({
        type: params.type,
        quantity: params.quantity,
        vehicle_option: params.vehicle_option,
        sample_option: params.sample_option,
        weight: params.weight,
        material: params.material
      })
      .then(() => {
        res.json({
          status: true,
          message: "Vehicle edited successfully !"
        })
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message
        })
      })
  }
);

// {
//   "token": "",
//   "id": ""
// }

// Remove A vehicle_selection From vehicle_selection List
router.post("/remove_vehicle_selection",
  body("id").isString().withMessage("id must be an string"),
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

      case "pro":
        req.body.user = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot add a vehicle selection  !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot add a vehicle selection  !`,
        });
        break;
    }
  },
  // Check Vehicle Selection Exists
  (req, res, next) => {
    const params = req.body;

    pplUserVehicleSelections
      .child(params.user.user_id)
      .child(params.id)
      .once('value', (snapshot) => {
        if (snapshot.val()) {
          next()
        } else {
          res.json({
            status: false,
            error: 'No Vehicle Found With This ID'
          })
        }
      })
  },
  // Remove Option
  (req, res) => {
    const params = req.body;

    console.log('Phone -> ', params.user.user_id)

    pplUserVehicleSelections
      .child(params.user.user_id).child(params.id).remove().then(() => {
        res.json({
          status: true,
          message: "Selection Has Been Removed"
        })
      }).catch((err) => {
        res.json({
          status: false,
          error: err.message
        })
      })
  }
);

// Get Vendor Stats
router.post("/get_vendor_stats", verifyTokenFirebase,
  // Check User Type
  (req, res, next) => {

    const params = req.body;
    console.log('phone -> ', params.user.user_id)
    switch (params.user.user_type) {
      case "vendor":
        next();
        break;

      default:
        req.json({
          status: false,
          error: `${params.user.user_type} cannot get vendor stats`
        })
        break;
    }
  },
  // Get Active Orders (transit) For Vendor
  (req, res, next) => {
    const params = req.body;

    // Transit
    pplRequestRef.orderByChild("vendor_phone").equalTo(params.user.user_id).once('value', (snapshot) => {
      if (snapshot.val()) {
        const requests = [];
        snapshot.forEach((snap) => {
          requests.push(snap.val())
        })

        //  console.log('active requests -> ',requests)

        // Filter Rate Confirmed Requests 
        const rateConfirmed = requests.filter((req) => {
          return req.status !== 'pending' && req.status !== 'cancelled' && req.status !== 'rejected'
        })

        req.body.transitActiveOrders = rateConfirmed.length;
        console.log('rateConfirmed.length -> ', rateConfirmed.length)
        next()

        //  console.log('rateConfirmed -> ',rateConfirmed);
      } else {
        req.body.transitActiveOrders = 0;
        next()
      }
    })
  },
  // Get Active Orders (upcountry) For Vendor
  (req, res, next) => {
    const params = req.body;

    // Upcountry
    pplRequestRef.orderByChild("request_type").equalTo("upcountry").once('value', (snapshot) => {
      if (snapshot.val()) {
        const requests = [];
        snapshot.forEach((snap) => {
          const req = snap.val();
          let checkVendorInSuborders = false;

          req.subOrders.forEach((suborder) => {
            if (suborder.vendor_phone === params.user.user_id) {
              checkVendorInSuborders = true;
            }
          })

          if (checkVendorInSuborders) {
            requests.push(snap.val())
          }

        })

        //  console.log('upcountry requests -> ',requests)

        // Filter Rate Confirmed Requests 
        //  const rateConfirmed = requests.filter((req) => {
        //      return req.status !== 'pending' && req.status !== 'cancelled' && req.status !== 'rejected'
        //  })  

        req.body.UpcountryActiveOrders = requests.length;
        console.log('requests.length -> ', requests.length)
        next()

        // res.json({
        //   status:true,
        //   data: [...requests,...params.transitActiveOrders,...params.allQoutesAndCounters]
        // })

        //  console.log('rateConfirmed -> ',rateConfirmed);
      } else {
        req.body.UpcountryActiveOrders = 0;
        next()
      }
    })
  },
  // Get Qoutes,User Counter Offers,Vendor Counter Offers
  async (req, res, next) => {
    const params = req.body;

    // Get All Qoutes For Vendor
    const transitQoutesSnap = await pplBiddingsRef
      .child("transit")
      .child("qoutes")
      .orderByChild("phone")
      .equalTo(params.user.user_id)
      .once("value");
    const upcountryQoutesSnap = await pplBiddingsRef
      .child("upcountry")
      .child("qoutes")
      .orderByChild("phone")
      .equalTo(params.user.user_id)
      .once("value");
    // Get All User Counter Offers For Vendor
    // const transitUserCounterSnap = await pplBiddingsRef
    //   .child("transit")
    //   .child("user_counter")
    //   .orderByChild("vendor_phone")
    //   .equalTo(params.user.user_id)
    //   .once("value");
    // const upcountryUserCounterSnap = await pplBiddingsRef
    //   .child("upcountry")
    //   .child("user_counter")
    //   .orderByChild("vendor_phone")
    //   .equalTo(params.user.user_id)
    //   .once("value")
    // Get All Vendor Counter Offers For Vendor
    // const transitVendorCounterSnap = await pplBiddingsRef
    //   .child("transit")
    //   .child("vendor_counter")
    //   .orderByChild("vendor_phone")
    //   .equalTo(params.user.user_id)
    //   .once("value");
    // const upcountryVendorCounterSnap = await pplBiddingsRef
    //   .child("upcountry")
    //   .child("vendor_counter")
    //   .orderByChild("vendor_phone")
    //   .equalTo(params.user.user_id)
    //   .once("value");

    // Qoutes 
    const rawtransitQoutes = await transitQoutesSnap.val();
    const rawupcountryQoutes = await upcountryQoutesSnap.val();
    // User Counter Offer
    // const rawtransitUserCounterOffers = await transitUserCounterSnap.val();
    // const rawupcountryUserCounterOffers = await upcountryUserCounterSnap.val();
    // Vendor Counter Offer
    // const rawtransitVendorCounterOffers = await transitVendorCounterSnap.val();
    // const rawupcountryVendorCounterOffers = await upcountryVendorCounterSnap.val();

    const transitQoutes = [];
    const upcountryQoutes = [];
    // const transitUserCounterOffers = [];
    // const upcountryUserCounterOffers = [];
    // const transitVendorCounterOffers = [];
    // const upcountryVendorCounterOffers = [];

    if (rawtransitQoutes !== null) {
      const convert1 = Object.entries(rawtransitQoutes);
      convert1.forEach((x) => {
        transitQoutes.push(x[1]);
      });
    }

    if (rawupcountryQoutes !== null) {
      const convert2 = Object.entries(rawupcountryQoutes);
      convert2.forEach((x) => {
        upcountryQoutes.push(x[1]);
      });
    }

    // if(rawtransitUserCounterOffers !== null){
    //   const convert3 = Object.entries(rawtransitUserCounterOffers);
    //   convert3.forEach((x) => {
    //     transitUserCounterOffers.push(x[1]);
    //   });
    // }

    // if(rawupcountryUserCounterOffers !== null){
    //   const convert4 = Object.entries(rawupcountryUserCounterOffers);
    //   convert4.forEach((x) => {
    //     upcountryUserCounterOffers.push(x[1]);
    //   });
    // }
    // if(rawtransitVendorCounterOffers !== null){
    //   const convert5 = Object.entries(rawtransitVendorCounterOffers);
    //   convert5.forEach((x) => {
    //     transitVendorCounterOffers.push(x[1]);
    //   });
    // }
    // if(rawupcountryVendorCounterOffers !== null){
    //   const convert6 = Object.entries(rawupcountryVendorCounterOffers);
    //   convert6.forEach((x) => {
    //     upcountryVendorCounterOffers.push(x[1]);
    //   });
    // }

    const data = [...transitQoutes, ...upcountryQoutes];

    // const allOrders = data.map((x) => {
    //   return x.orderNo;
    // });

    // TODO: Get Orders From all order numbers
    req.body.allQoutesAndCounters = data.length;
    next();
  },
  // Get Vendor Vehicles 
  (req, res, next) => {
    const params = req.body;

    pplVendorVehicleRef.orderByChild("vendor_phone").equalTo(params.user.user_id).once('value', (snapshot) => {
      if (snapshot.val()) {
        const vehicles = snapshot.numChildren();
        req.body.vehicles = vehicles;
        next();
      } else {
        req.body.vehicles = 0;
        next()
      }
    })
  },
  // Get Vendor Invited Drivers 
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("drivers")
      .orderByChild("referer")
      .equalTo(params.user.user_id)
      .once('value', (snapshot) => {
        if (snapshot.val()) {
          const drivers = snapshot.numChildren();
          req.body.drivers = drivers;
          next();
        } else {
          req.body.drivers = 0;
          next();
        }
      })
  },
  // Throw Data 
  (req, res, next) => {
    const params = req.body;


    res.json({
      status: true,
      requests: params.transitActiveOrders + params.UpcountryActiveOrders,
      qoutes: params.allQoutesAndCounters,
      vehicles: params.vehicles,
      drivers: params.drivers
    })

  }
)

router.post("/invite_friends",
  verifyTokenFirebase,
  (req, res) => {
    const params = req.body;

    twillio_client.messages
      .create(
        {
          messagingServiceSid: "MG5d789b427b36967a17122347859e3e7e",
          to: params.phone,
          from: config.twilio.phone,
          body: `You have been invited to meribilty app by ${params.user.user_id}. Download the app now !`,
        },
        (err, resData) => {
          if (err) {
            return res.json({
              status: false,
              message: err,
            });
          } else {
            res.json({
              status: true,
              message: "User has been invited !"
            })
          }


        }
      )
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  })



router.post('/verify_firebase', verifyTokenFirebase)
module.exports = router;



function fileUpload(file, name, dir, filetype, callback) {
  if (typeof file !== "undefined") {
    const img_file = bucket.file(`${dir + name}.${filetype}`);
    const stream = img_file.createWriteStream({
      gzip: true,
      resumable: false,
    });

    stream.on("error", (err) => {
      callback(err);
    });

    stream.on("finish", () => {
      callback(null);
    });

    stream.end(file.data);
  } else {
    callback("Invalid File!");
  }
}