const express = require('express');
const config = require('../config/private.json')

// Scheduled Tasks
const _ = require('lodash');

const moment = require('moment-timezone');

let SID = "ACdf3c9dd58c5c293af6a30ec1ea212d50"
let SECRET = "aba225227762b749ebf386a142c2d23c"

// Twilio Client
const twillio_client = require('twilio')(
  config.twilio.accountSid,
  config.twilio.authToken
);

const orderNo = require('order-no');
const { Client } = require('@googlemaps/google-maps-services-js');

const { body, validationResult } = require('express-validator');




const {
  scmRequestRef,
  vehicleListRef,
  scmCommission,
  scmInvoiceRef,
  scmSettingsRef,
  scmCancellationReasonRef,
  driverHistoryRef,
  pplRequestRef,
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
  pplRoutesEstimation
} = require('../db/newRef');

const {
  userRef,
  vehicleTypeRef,
  walletRef,
} = require('../db/ref');


const {
  verifyTokenFirebase,
  reqNotify,
  CHECK_distance,
  SetPriceData,
  CalculateSCMPricing,
  verifyToken,
} = require('../functions/slash');
const { get } = require('lodash');
const { verifyTokenVendorApp } = require('../functions/slash');
const TaskRouterCapability = require('twilio/lib/jwt/taskrouter/TaskRouterCapability');
const { request } = require('express');

const googleMapsClient = new Client({});

const router = express.Router();


router.post("/driver_active_order",
  body('token').isString().withMessage('token required !'),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next()
    }
  },
  verifyTokenFirebase,
  // Check User Type (User Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot add a vehicle selection  !`,
        });
        break;

      case "pro":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot add a vehicle selection  !`,
        });
        break;
      case "driver":
        req.body.driver = params.user;
        next();
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot add a vehicle selection  !`,
        });
        break;
    }
  },
  // Get Driver Profile
  (req, res, next) => {
    const params = req.body;

    userRef.child("drivers").child(params.driver.user_id).once('value', (snapshot) => {
      if (snapshot.val()) {
        const driver = snapshot.val();
        req.body.driver = driver;
        next();
      } else {
        res.json({
          status: false,
          error: "Driver Not Found !"
        })
      }
    })
  },
  // Get Active Order
  (req, res, next) => {
    const params = req.body;
    if (params.driver.status === 'free') {
      console.log("Driver Does Not Have Active Orders");
      req.body.activeorder = []
      next();
    } else {
      const biltyNo = params.driver.bilty;
      const type = params.driver.request_type;

      if (type === 'transit' || type === 'upcountry') {
        const getOrderNo = biltyNo.slice(2, (biltyNo.length - 2));

        pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();


            if (request.request_type === 'transit') {
              const bilties = request.bilty;

              if (bilties) {
                if (bilties.length !== 0) {
                  const filterOut = bilties.filter((bilty) => {
                    return bilty.biltyNo === biltyNo;
                  });

                  if (filterOut) {
                    if (filterOut.length > 0) {
                      const bilty = filterOut[0];
                      console.log("bilty -> ", bilty);
                      const activeorders = [];

                      const data = {
                        cargo_insurance: request.cargo_insurance,
                        date: request.date,
                        orderNo: request.orderNo,
                        orgLat: request.orgLat,
                        orgLng: request.orgLng,
                        desLat: request.desLat,
                        desLng: request.desLng,
                        disText: request.disText,
                        durText: request.durText,
                        originAddress: request.originAddress || null,
                        destinationAddress: request.destinationAddress || null,
                        containerReturnAddress: request.containerReturnAddress || null,
                        security_deposit: request.security_deposit || null,
                        user_id: request.user_id,
                        user_phone: request.user_phone,
                        user_type: request.user_type,
                        username: request.username,
                        request_type: request.request_type,
                        status: request.status,
                        createdAt: request.createdAt,
                        bilty: bilty
                      }
                      activeorders.push(data)
                      req.body.activeorder = activeorders;

                      next();

                    } else {
                      res.json({
                        status: false,
                        error: "Bilty Not Found !",
                      });
                    }
                  }
                }
              }
            }

            if (request.request_type === 'upcountry') {
              const suborders = request.subOrders;
              let upcountrybiltydata;

              suborders.forEach((suborder) => {
                suborder.bilty.forEach((bilty) => {
                  if (bilty.biltyNo === params.biltyNo) {
                    upcountrybiltydata = {
                      ...bilty,
                      materials: suborder.material,
                      vehicle_type: suborder.type,
                      option: suborder.option,
                      option_quantity: suborder.option_quantity,
                      subOrderNo: suborder.subOrderNo,
                      user_phone: suborder.user_phone,
                      vendor_phone: suborder.vendor_phone || null,
                      vendor_name: suborder.vendor_name || null,
                      weight: suborder.weight,
                      cargo_insurance: request.cargo_insurance,
                      date: request.date,
                      orderNo: request.orderNo,
                      orgLat: request.orgLat,
                      orgLng: request.orgLng,
                      desLat: request.desLat,
                      desLng: request.desLng,
                      disText: request.disText,
                      durText: request.durText,
                      originAddress: request.originAddress || null,
                      destinationAddress: request.destinationAddress || null,
                      containerReturnAddress: request.containerReturnAddress || null,
                      security_deposit: request.security_deposit || null,
                      user_id: request.user_id,
                      user_phone: request.user_phone,
                      user_type: request.user_type,
                      username: request.username,
                      request_type: request.request_type,
                      status: request.status,
                      createdAt: request.createdAt,
                    }
                  }
                })
              })

              if (upcountrybiltydata) {
                req.body.activeorder = [upcountrybiltydata];
                next();
              } else {
                console.log('upcountry issue')
                req.body.activeorder = [];
                next();
              }


            }


          } else {
            res.json({
              status: false,
              error: "Could Not Found request !",
            });
          }
        });
      }
    }
  },
  // Get Completed Order
  async (req, res, next) => {
    const params = req.body;

    const pplHistorySnap = await driverHistoryRef.child(params.driver.phone).once('value');
    const scmHistorySnap = await driverHistoryRef.child(params.driver.phone).child("scm").once('value');

    const rawpplHistory = await pplHistorySnap.val();
    const rawscmHistory = await scmHistorySnap.val();

    const pplHistory = [];
    const scmHistory = [];

    if (rawpplHistory !== null) {
      const convert3 = Object.entries(rawpplHistory);
      convert3.forEach((x) => {
        pplHistory.push(x[1]);
      });
    }

    if (rawscmHistory !== null) {
      const convert4 = Object.entries(rawscmHistory);
      convert4.forEach((x) => {
        scmHistory.push(x[1]);
      });
    }

    const allhistories = [...pplHistory, ...scmHistory];


    // Get Rejected 
    const rejectedOrders = allhistories.filter((history) => {
      return history.status === "rejected"
    })

    // Get Completed 
    const completedOrders = allhistories.filter((history) => {
      return history.status === "completed"
    })

    res.json({
      status: true,
      active: [...params.activeorder],
      rejected: [
        {
          "bilty": [
            {
              "biltyNo": "BT0004a0",
              "id": "-MxhuudFaSmajycjxRyv",
              "material": [
                "cement"
              ],
              "option": "Crane 0-15",
              "option_quantity": 1,
              "quantity": "1",
              "status": "pending",
              "type": "40ft Truck",
              "user_phone": "+923352640168",
              "vehicle_quantity": 1,
              "weight": "Less Than 1 Ton"
            }
          ],
          "cargo_insurance": false,
          "containerReturnAddress": "karachi",
          "createdAt": "March 11th 2022, 3:28:04 pm",
          "date": "2022-04-03 17:57:00",
          "desLat": "24.844885",
          "desLng": "66.991985",
          "desText": "Tower",
          "destinationAddress": "lahore",
          "disText": "1 m",
          "durText": "1 min",
          "emptyLat": "53.21",
          "emptyLng": "67.088",
          "emptyText": "Pata nhi",
          "orderNo": "0004",
          "orgLat": "24.910186",
          "orgLng": "67.123307",
          "orgText": "johar Chowk",
          "originAddress": "karachi",
          "request_type": "transit",
          "status": "cancelled",
          "totalRequests": 3,
          "type": "transit",
          "user_id": 4,
          "user_phone": "+923352640168",
          "user_type": "user",
          "username": "Ahmed"
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
          "status": "cancelled",
          "bilty": [
            {
              "biltyNo": "BT0004a0",
              "id": "-MxhuudFaSmajycjxRyv",
              "material": [
                "cement"
              ],
              "option": "Crane 0-15",
              "option_quantity": 1,
              "quantity": "1",
              "status": "pending",
              "type": "40ft Truck",
              "user_phone": "+923352640168",
              "vehicle_quantity": 1,
              "weight": "Less Than 1 Ton"
            }
          ],
          "user_id": 4,
          "user_phone": "+923352640168",
          "user_type": "user",
          "username": "Ahmed"
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
          "status": "cancelled",
          "bilty": [
            {
              "biltyNo": "BT0004a0",
              "id": "-MxhuudFaSmajycjxRyv",
              "material": [
                "cement"
              ],
              "option": "Crane 0-15",
              "option_quantity": 1,
              "quantity": "1",
              "status": "pending",
              "type": "40ft Truck",
              "user_phone": "+923352640168",
              "vehicle_quantity": 1,
              "weight": "Less Than 1 Ton"
            }
          ],
          "user_id": 4,
          "user_phone": "+923352640168",
          "user_type": "user",
          "username": "Ahmed"
        },
      ],
      completed: [
        {
          "bilty": [
            {
              "biltyNo": "BT0004a0",
              "id": "-MxhuudFaSmajycjxRyv",
              "material": [
                "cement"
              ],
              "option": "Crane 0-15",
              "option_quantity": 1,
              "quantity": "1",
              "status": "pending",
              "type": "40ft Truck",
              "user_phone": "+923352640168",
              "vehicle_quantity": 1,
              "weight": "Less Than 1 Ton"
            }
          ],
          "cargo_insurance": false,
          "containerReturnAddress": "karachi",
          "createdAt": "March 11th 2022, 3:28:04 pm",
          "date": "2022-04-03 17:57:00",
          "desLat": "24.844885",
          "desLng": "66.991985",
          "desText": "Tower",
          "destinationAddress": "lahore",
          "disText": "1 m",
          "durText": "1 min",
          "emptyLat": "53.21",
          "emptyLng": "67.088",
          "emptyText": "Pata nhi",
          "orderNo": "0004",
          "orgLat": "24.910186",
          "orgLng": "67.123307",
          "orgText": "johar Chowk",
          "originAddress": "karachi",
          "request_type": "transit",
          "status": "completed",
          "totalRequests": 3,
          "type": "transit",
          "user_id": 4,
          "user_phone": "+923352640168",
          "user_type": "user",
          "username": "Ahmed"
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
          "status": "completed",
          "bilty": [
            {
              "biltyNo": "BT0004a0",
              "id": "-MxhuudFaSmajycjxRyv",
              "material": [
                "cement"
              ],
              "option": "Crane 0-15",
              "option_quantity": 1,
              "quantity": "1",
              "status": "pending",
              "type": "40ft Truck",
              "user_phone": "+923352640168",
              "vehicle_quantity": 1,
              "weight": "Less Than 1 Ton"
            }
          ],
          "user_id": 4,
          "user_phone": "+923352640168",
          "user_type": "user",
          "username": "Ahmed"
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
          "status": "completed",
          "bilty": [
            {
              "biltyNo": "BT0004a0",
              "id": "-MxhuudFaSmajycjxRyv",
              "material": [
                "cement"
              ],
              "option": "Crane 0-15",
              "option_quantity": 1,
              "quantity": "1",
              "status": "pending",
              "type": "40ft Truck",
              "user_phone": "+923352640168",
              "vehicle_quantity": 1,
              "weight": "Less Than 1 Ton"
            }
          ],
          "user_id": 4,
          "user_phone": "+923352640168",
          "user_type": "user",
          "username": "Ahmed"
        },
      ]
    })
    // req.body.allhistories = allhistories;
    // next();
  },
  // Get Rejected Order
  (req, res, next) => {
    const params = req.body;
  },
  // Throw Data
  (req, res) => {
    const params = req.body;

  }
)

// Driver Accepted SCM Request Successfully
// "3" => Request Is Been Approved By A Driver
// /request_accept_by_driver

// {
//    "token": "",
//    "biltyNo": "",
//    "type" : "" (scm,transit,upcountry)  
// }

router.post(
  '/bilty_accept',
  body('token').isString().withMessage('token required !'),
  body('biltyNo').isString().withMessage('Invalid Phone Number !'),
  body('type').isString().withMessage('type must be scm / transit / upcountry '),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next()
    }
  },
  verifyTokenFirebase,
  // Check User Type
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        res.json({
          status: false,
          error: 'Vendors can not accept bilty ! only driver or vendor driver can !'
        })
        break;
      case "driver":
        req.body.driver = params.user;
        next()
        break;
      case "vendor_driver":
        req.body.driver = params.user;
        next()
        break;
      default:
        break;
    }
  },
  // Check Driver
  (req, res, next) => {
    const params = req.body;
    userRef
      .child(params.driver.user_type + 's')
      .child(params.driver.user_id)
      .once('value', (snapshot) => {
        if (snapshot.val()) {
          const driver = snapshot.val();
          req.body.driver = driver;
          next();
          // res.json({
          //     status:true,
          //     driver:driver
          // })
        } else {
          res.json({
            status: false,
            error: 'Driver Not Found !',
          });
        }
      });
  },
  // Get Request Data
  (req, res, next) => {
    // Driver Phone Required
    // Request Id Required
    const params = req.body;

    if (params.type == 'scm') {
      scmRequestRef
        .child(params.biltyNo)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();

            if (request.status == 'pending') {
              req.body.request = request;
              next()
            } else {
              res.json({
                status: false,
                error: `Request has a status -> ${request.status}`,
              });
            }
          } else {
            res.json({
              status: false,
              error: 'Request Not Found !',
            });
          }
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
    } else {
      res.json({
        status: false,
        error: "PPL Requests Cannot Be Accepted/Rejected By Driver"
      })
    }
  },
  // Get Driver Route
  (req, res, next) => {
    const params = req.body;

    if (params.type == 'scm') {
      googleMapsClient
        .directions({
          params: {
            origin: [
              params.driver.current_position.lat,
              params.driver.current_position.lng,
            ],
            destination: [params.request.desLat, params.request.desLng],
            mode: 'driving',
            key: 'AIzaSyDDTYs0JX_8BEC62oRGKLZTJac3Xd2nx74',
          },
        })
        .then((Google) => {
          req.body.route = Google.data;
          next();
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      res.json({
        status: false,
        error: "PPL Requests Cannot Be Accepted/Rejected By Driver"
      })
    }
  },
  // Deduct From User Wallet If Payment Method => Wallet
  (req, res, next) => {
    const params = req.body;

    if (params.type == 'scm') {
      if (params.request.payment_method == 'wallet') {
        walletRef
          .child('users')
          .child(params.request.user.phone)
          .once('value', (snapshot) => {
            if (snapshot.val()) {
              const wallet = snapshot.val();

              const WalletAmount = parseInt(wallet.amount);
              console.log('WalletAmount -> ', WalletAmount);

              // if value is in negetive
              if (WalletAmount < 0) {
                res.json({
                  status: false,
                  error: 'User Wallet Amount In Negetive',
                });
              }

              // if value is in positive
              if (WalletAmount > 0) {
                const get_user_request_price = parseInt(
                  params.request.bill.netTotalPrice
                );

                // let discountPercent = parseInt(params.request.bill.discountPercent);

                console.log('Request Price -> ', get_user_request_price);

                if (WalletAmount >= get_user_request_price) {
                  const deduction = WalletAmount - get_user_request_price;
                  req.body.user_paid = deduction;

                  walletRef
                    .child('users')
                    .child(params.request.user_phone)
                    .update({
                      amount: deduction,
                    })
                    .then(() => {
                      console.log('Wallet Updated');
                      req.body.user_paid = get_user_request_price;
                      next();
                    })
                    .catch((error) => {
                      res.json({
                        status: false,
                        error: error.message,
                      });
                    });
                } else {
                  res.json({
                    status: false,
                    error: 'User does not have that much money in wallet',
                  });
                }
              }
            } else {
              res.json({
                status: false,
                error: 'Wallet Not Found in Database !',
              });
            }
          });
      } else {
        // console.log("Payment Type Not Wallet !");
        next();
      }
    } else {
      res.json({
        status: false,
        error: "PPL Requests Cannot Be Accepted/Rejected By Driver"
      })
    }
  },
  // Update Driver Status
  (req, res, next) => {
    const params = req.body;

    if (params.type == 'scm') {
      userRef
        .child('drivers')
        .child(params.driver.phone)
        .update({
          status: 'busy',
          on_request: req.body.request.biltyNo,
          type: "scm",
          route: req.body.route,
        })
        .then(() => {
          next();
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
    } else {
      res.json({
        status: false,
        error: "PPL Requests Cannot Be Accepted/Rejected By Driver"
      })
    }
  },
  // Update Request Status
  (req, res) => {
    const params = req.body;

    if (params.type == 'scm') {
      const driverStatus = {
        status: 'driver_accepted',
        driver_accepted_on: moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a'),
        driver_delivered_on: null,
        driver_reached_on: null,
        driver_pickup: null,
      };

      req.body.driverStatus = driverStatus;

      scmRequestRef
        .child(params.biltyNo)
        .update({
          status: 'driver_accepted',
          driver_phone: params.driver.phone,
          driver_accepted_on: moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a'),
          driver_current_location: req.body.driver.current_position,
          user_paid: req.body.request.user_paid,
        })
        .then(() => {
          res.json({
            status: true,
            message: `Driver Accepted The Request(${params.request.biltyNo}) Successfully `,
            route: req.body.route,
            data: {
              driverStatus: req.body.driverStatus,
              driverData: params.request.driverData,
              googleData: params.request.googleDistance,
            },
          });
        })
        .catch((error) => {
          console.log('err -> ', error);
          res.json({
            status: false,
            error: error.message,
          });
        });
    } else {
      res.json({
        status: false,
        error: 'Service Ends - Request Type Not SCM'
      })
    }
  }
);


// "4" => Request Is Been Rejected By A Driver
// /bilty_reject
// {
//    "token": "",
//    "biltyNo": "",
//    "type" : "" (scm,ppl)  
// }
router.post(
  '/bilty_reject',
  body('token').isString().withMessage('token required !'),
  body('biltyNo').isString().withMessage('Invalid Phone Number !'),
  body('type').isString().withMessage('type must be scm / transit / upcountry '),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next()
    }
  },
  verifyTokenFirebase,
  // Check User Type
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        res.json({
          status: false,
          error: 'Vendors can not accept bilty ! only driver or vendor driver can !'
        })
        break;
      case "driver":
        req.body.driver = params.user;
        next()
        break;
      case "vendor_driver":
        req.body.driver = params.user;
        next()
        break;
      default:
        break;
    }
  },
  // Check Driver / Get Driver Data
  (req, res, next) => {
    const params = req.body;

    if (params.type == 'scm') {
      userRef
        .child('drivers')
        .child(params.driver.user_id)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const driver = snapshot.val();
            req.body.driver = driver;
            console.log('Driver Data Added');
            next();
          } else {
            res.json({
              status: false,
              error: 'Driver Not Found !',
            });
          }
        });
    } else {
      res.json({
        status: false,
        error: "PPL Requests Cannot Be Accepted/Rejected By Driver"
      })
    }
  },
  // Get Request Data
  (req, res, next) => {
    // Driver Phone Required
    // Request Id Required
    const params = req.body;

    if (params.type == 'scm') {
      scmRequestRef
        .child(params.biltyNo)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();

            if (request.status == 'pending') {
              req.body.request = request;
              console.log('Request Data Added');
              next();
            } else {
              req.body.request = request;
              next()
              // res.json({
              //   status: false,
              //   error: `Request has a status -> ${request.status}`,
              // });
            }
          } else {
            res.json({
              status: false,
              error: 'Request Not Found !',
            });
          }

        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
    } else {
      res.json({
        status: false,
        error: "PPL Requests Cannot Be Accepted/Rejected By Driver"
      })

    }
  },
  // Get Pricing
  (req, res, next) => {
    const params = req.body;

    if (params.type == 'scm') {
      if (params.request.vehicle_type) {
        // Get Vehicle Type
        scmSettingsRef
          .child('vehicle_types')
          .child(params.request.vehicle_type)
          .once('value', (snapshot) => {
            console.log('snapshot ', snapshot.val());
            if (snapshot.val()) {
              const pricing = snapshot.val();
              req.body.pricingData = pricing;
              console.log('Pricing added ', req.body.pricingData);

              scmCommission.once('value', (snapshot) => {
                const commission = snapshot.val();

                if (commission) {
                  req.body.CommissionPercent = commission.value;

                  if (
                    params.cargo_value
                    && params.cargo_value !== '0'
                    && params.cargo_value !== 0
                  ) {
                    scmSettingsRef
                      .child('insurance')
                      .once('value', (snapshot) => {
                        if (snapshot.val()) {
                          const insurance = snapshot.val();
                          req.body.insurance = insurance;
                        } else {
                          req.body.insurance = null;
                          next();
                        }
                      });
                  } else {
                    next();
                  }
                } else {
                  res.json({
                    status: false,
                    message: 'Commission Data Missing From DB',
                  });
                }
              });
            } else {
              res.json({
                status: false,
                error: 'Vehicle Type Not Found !',
              });
            }
          })
          .catch((error) => {
            res.json({
              status: false,
              error,
              msg: 'Vehicle Type !',
            });
          });
      } else {
        res.json({
          status: false,
          error: 'Vehicle Type Not Given !',
        });
      }
    } else {
      res.json({
        status: false,
        error: "PPL Requests Cannot Be Accepted/Rejected By Driver"
      })
    }
  },
  // Get Loading List
  (req, res, next) => {
    const params = req.body;
    if (params.type == 'scm') {
      if (params.request.loading && params.request.loading.length !== 0) {
        scmSettingsRef.child('loading_options').once('value', (snapshot) => {
          if (snapshot.val()) {
            const loading_options = snapshot.val();
            const convert = Object.entries(loading_options);

            const final = [];
            convert.forEach((x) => {
              final.push(x[1]);
            });
            req.body.loading_options_pricing = final;
            console.log('Got Loading List');
            next();
          } else {
            res.json({
              status: false,
              error: 'Loading Option Pricing Not Found !',
            });
          }
        });
      } else {
        req.body.loading_options_pricing = [];
        next();
      }
    } else {
      res.json({
        status: false,
        error: "PPL Requests Cannot Be Accepted/Rejected By Driver"
      })
    }
  },
  // Unloading List
  (req, res, next) => {
    const params = req.body;

    if (params.type == 'scm') {
      if (params.request.unloading && params.request.unloading.length !== 0) {
        scmSettingsRef.child('unloading_options').once('value', (snapshot) => {
          if (snapshot.val()) {
            const unloading_option = snapshot.val();
            const convert = Object.entries(unloading_option);

            const final = [];
            convert.forEach((x) => {
              final.push(x[1]);
            });
            req.body.unloading_options_pricing = final;
            next();
          } else {
            res.json({
              status: false,
              error: 'Unloading List Not Found',
            });
          }
        });
      } else {
        req.body.unloading_options_pricing = [];
        next();
      }
    } else {
      res.json({
        status: false,
        error: "PPL Requests Cannot Be Accepted/Rejected By Driver"
      })
    }
  },
  // Update Driver Status
  (req, res, next) => {
    const params = req.body;

    if (params.type == 'scm') {
      userRef
        .child('drivers')
        .child(params.driver.phone)
        .update({
          status: 'free',
          on_request: null,
          route: null,
        })
        .then(() => {
          console.log('Driver Updated');
          next();
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
    } else {
      res.json({
        status: false,
        error: "PPL Requests Cannot Be Accepted/Rejected By Driver"
      })
    }
  },
  // Restart Driver Finding Process
  // Find Nearest Online Driver
  (req, res, next) => {
    const params = req.body;

    if (params.type == 'scm') {
      //  Find Online Driver
      userRef
        .child('drivers')
        .orderByChild('online')
        .equalTo(true)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            snapshot.forEach((childSnapshot) => {
              const driver = childSnapshot.val();

              if (driver.scm == true || driver.scm == 'true') {
                if (driver.status == 'free') {
                  let driversDistance = [];
                  if (driver.current_position) {
                    driversDistance.push({
                      vector: CHECK_distance(
                        driver.current_position.lat,
                        driver.current_position.lng,
                        params.request.orgLat,
                        params.request.orgLng
                      ),
                      driver_phone: driver.phone,
                    });
                  } else {
                    res.json({
                      status: false,
                      error: 'current position not found !',
                    });
                  }

                  driversDistance = _.orderBy(
                    driversDistance,
                    (item) => item.vector
                  );
                  console.log('driverDistance -> ', driversDistance);
                  if (driversDistance[0].vector < 100) {
                    req.body.driverData = {
                      ...driver,
                    };
                    // console.log("driver -> ", driver);
                    next();
                  } else {
                    console.log('Driver Is Far Away');
                    res.json({
                      status: false,
                      message: 'No Driver Found Online',
                    });
                  }
                } else {
                  res.json({
                    status: false,
                    erorr: 'No Driver Found Online !',
                  });
                }
              } else {
                res.json({
                  status: false,
                  erorr: 'No Driver Found Online !',
                });
              }
            });
          } else {
            res.json({
              status: false,
              error: 'No Driver Found Online !',
            });
          }
        });
    } else {
      res.json({
        status: false,
        error: "PPL Requests Cannot Be Accepted/Rejected By Driver"
      })
    }
  },
  // Update Request Status
  (req, res, next) => {
    const params = req.body;

    if (params.type == 'scm') {
      scmRequestRef
        .child(params.biltyNo)
        .update({
          status: 'pending',
          driverData: params.driverData,
        })
        .then(() => {
          next();
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
    } else {
      res.json({
        status: false,
        error: "PPL Requests Cannot Be Accepted/Rejected By Driver"
      })
    }
  },
  // Done
  (req, res, next) => {
    // if (req.body.bill) {

    // } else {
    //   res.json({
    //     status: false,
    //     error: 'Bill Data Is NOt Found !',
    //   });
    // }
    res.json({
      status: true,
      message: 'Driver Cancelled The Request Successfully',
    });
  }
);

// "5" => Driver Reached To The Origin Location
// /driver_reached_origin
// {
//    "token": "",
//    "biltyNo": "",
//    "type" : "" (scm,ppl)  
// }
router.post(
  '/reached_origin',
  body('token').isString().withMessage('token required !'),
  body('biltyNo').isString().withMessage('biltyNo must be BT0004 Format For SCM !'),
  body('type').isString().withMessage('type must be scm / transit / upcountry '),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next()
    }
  },
  verifyTokenFirebase,
  // Check User Type
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        res.json({
          status: false,
          error: 'users can not accept bilty ! only drivers can !'
        })
        break;
      case "pro":
        res.json({
          status: false,
          error: 'users can not accept bilty ! only drivers can !'
        })
        break;
      case "vendor":
        res.json({
          status: false,
          error: 'Vendors can not accept bilty ! only drivers can !'
        })
        break;
      case "driver":
        req.body.driver = params.user;
        next()
        break;

      default:
        res.json({
          status: false,
          error: "Unknown Type"
        })
        break;
    }
  },
  // Check Driver / Get Driver Data
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("drivers")
      .child(params.driver.user_id)
      .once('value', (snapshot) => {
        if (snapshot.val()) {
          const driver = snapshot.val();
          req.body.driver = driver;
          console.log('Driver Data Added');
          next();
        } else {
          res.json({
            status: false,
            error: 'Driver Not Found !',
          });
        }
      });
  },
  // Get Request Data
  (req, res, next) => {
    // Driver Phone Required
    // Request Id Required
    const params = req.body;


    if (params.type == 'scm') {
      scmRequestRef
        .child(params.biltyNo)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();

            req.body.request = request;
            console.log('Request Data Added');
            next();
          } else {
            res.json({
              status: false,
              error: 'Request Not Found !',
            });
          }
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
    } else {
      let getLength = params.biltyNo.length;
      const getOrderNo = params.biltyNo.slice(2, (getLength - 2));


      pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
        if (snapshot.val()) {
          // TODO : ADD REQUEST STATUS CONDITIION
          const request = snapshot.val();
          req.body.request = request;
          console.log('-Request Data Received');
          next();

        } else {
          res.json({
            status: false,
            error: "Could Not Found request !",
          });
        }
      });
    }
  },
  // Check Bilty Status For PPL
  (req, res, next) => {
    const params = req.body;
    if (params.type == 'scm') {
      next()
    } else {
      //  FOR PPL REQUESTS
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
                  console.log("bilty -> ", bilty);

                  if (bilty.status == 'inprocess') {
                    req.body.bilty = bilty;
                    next();
                  } else {
                    res.json({
                      status: false,
                      error: `Cannot Update Bilty - Bilty Status is ${bilty.status} !`,
                    });
                  }


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
          const makeSubOrderNo = `SO${params.biltyNo.slice(2, (params.biltyNo.length - 1))}`;
          console.log('makeSubOrderNo -> ', makeSubOrderNo)

          const suborders = params.request.subOrders;

          if (suborders) {
            if (suborders.length !== 0) {
              const filterOut = suborders.filter((suborder) => {
                return suborder.subOrderNo === makeSubOrderNo
              });

              // console.log('Found Bilty -> ',filterOut)

              if (filterOut) {
                if (filterOut.length !== 0) {
                  const suborder = filterOut[0];

                  const filterBilties = suborder.bilty.filter((bilty, index) => {
                    req.body.biltyIndex = index;
                    return bilty.biltyNo === params.biltyNo
                  })

                  const bilty = filterBilties[0];

                  console.log('Desired Bilty -> ', bilty)
                  console.log('Bilty Index -> ', req.body.biltyIndex);


                  if (bilty.status == 'inprocess') {
                    req.body.bilty = bilty;
                    next();
                  } else {
                    res.json({
                      status: false,
                      error: `Cannot Update Bilty - Bilty Status is ${bilty.status} !`,
                    });
                  }


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

        default:
          res.json({
            status: false,
            error: "Unknown Request Type - (Check Bilty Status For PPL)"
          })

          break;
      }
    }
  },
  // Update Bilty For PPL
  (req, res, next) => {
    const params = req.body;

    if (params.type === 'scm') {
      next()
    } else {
      const getOrderNo = params.biltyNo.slice(2, (params.biltyNo.length - 2));
      switch (params.request.request_type) {
        case "transit":
          const transitbilties = params.request.bilty;

          transitbilties.forEach((bilty) => {
            if (bilty["biltyNo"] == params.biltyNo) {
              console.log('params.driver.phone -> ', params.driver.phone)

              if (bilty.driver_phone && bilty.driver_phone === params.driver.phone) {
                bilty["status"] = "driver_reached";
                bilty["driver_reached_on"] = moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a')

              } else {
                res.json({
                  status: false,
                  error: "Driver Allotted On Bilty Does Not Match With You !"
                })
              }
            }
          });



          pplRequestRef
            .child(getOrderNo)
            .update({
              bilty: transitbilties,
            })
            .then(() => {
              next();
            })
            .catch((err) => {
              res.json({
                status: false,
                error: err.message,
              });
            });
          break;

        case "upcountry":
          // We have bilty
          // We have bilty Index
          // We have suborder no
          const makeSubOrderNo = `SO${params.biltyNo.slice(2, (params.biltyNo.length - 1))}`;
          const suborders = params.request.subOrders;
          let matchFound = false;

          suborders.forEach((suborder) => {
            suborder.bilty.forEach((bilty) => {
              if (bilty["biltyNo"] == params.biltyNo) {

                if (bilty.driver_phone && bilty.driver_phone === params.driver.phone) {
                  bilty["status"] = "driver_reached";
                  bilty["driver_reached_on"] = moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a')
                  matchFound = true;
                }
              }
            })
          });

          if (matchFound) {
            pplRequestRef
              .child(getOrderNo)
              .update({
                subOrders: suborders,
              })
              .then(() => {
                next();
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
              error: "Driver Allotted On Bilty Does Not Match With You !"
            })
          }

          break;

        default:
          res.json({
            status: false,
            error: "Unknown Request Type - (Update Bilty For PPL)"
          })
          break;
      }
    }
  },
  // Update Request Status
  (req, res, next) => {
    const params = req.body;

    if (params.type == 'scm') {
      switch (params.request.status) {
        case 'pending':
          res.json({
            status: false,
            error: 'Request is not accepted by anyone driver !',
          });
          break;

        case 'driver_accepted':

          const driverStatus = {
            status: 'driver_reached',
            driver_accepted_on: params.request.driver_accepted_on,
            driver_delivered_on: null,
            driver_reached_on: moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a'),
            driver_pickup: null,
          };

          req.body.driverStatus = driverStatus;

          scmRequestRef
            .child(params.request.biltyNo)
            .update({
              status: 'driver_reached',
              driver_reached_on: moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a'),
              driver_current_location: params.driver.current_position,
            })
            .then(() => {
              console.log('Request Updated After To driver_accepted');
              next();
            })
            .catch((error) => {
              res.json({
                status: false,
                level: 'Request Update',
                error: error.message,
              });
            });
          break;

        case 'driver_reached':
          res.json({
            status: false,
            error: 'Driver Already Reached Origin !',
          });

          break;

        case 'driver_pickup':
          res.json({
            status: false,
            error: 'Driver Has Picked Up The Load !',
          });

          break;

        case 'user_cancelled':
          res.json({
            status: false,
            error: 'User Already Cancelled The Request !',
          });
          break;

        default:
          res.json({
            status: false,
            error: 'No Case Found !',
          });
          break;
      }
    } else {
      next()
    }
  },
  // Done
  (req, res, next) => {
    const params = req.body;

    if (params.type == 'scm') {
      res.json({
        status: true,
        message: `Driver Reached The Origin On ${moment().format(
          'MMMM Do YYYY, h:mm:ss a'
        )}`,
        data: {
          driverStatus: params.driverStatus,
          estimatedTime: params.request.googleDistance.duration.text,
          estimatedDistance: params.request.googleDistance.distance.text,
          start_location: params.request.googleDistance.start_address,
          end_location: params.request.googleDistance.end_address,
        },
      });
    } else {
      res.json({
        status: true,
        error: 'Driver reached successfully!'
      })
    }
  }
);

// "6" => Driver Picked Up The Load
// /driver_picked_up_load
// {
//    "token": "",
//    "biltyNo": "",
//    "type" : "" (scm,ppl)  
// }
router.post(
  '/picked_up_load',
  body('token').isString().withMessage('token required !'),
  body('biltyNo').isString().withMessage('Invalid Phone Number !'),
  body('type').isString().withMessage('type must be scm / ppl '),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next()
    }
  },
  verifyTokenFirebase,
  // Check User Type
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        res.json({
          status: false,
          error: 'Vendors can not accept bilty ! only driver or vendor driver can !'
        })
        break;
      case "driver":
        req.body.driver = params.user;
        next()
        break;

      default:
        res.json({
          status: false,
          error: "Unknown User Type !"
        })
        break;
    }
  },
  // Check Driver / Get Driver Data
  (req, res, next) => {
    const params = req.body;
    if (params.type == 'scm') {
      userRef
        .child("drivers")
        .child(params.driver.user_id)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const driver = snapshot.val();
            req.body.driver = driver;
            console.log('Driver Data Added');
            next();
          } else {
            res.json({
              status: false,
              error: 'Driver Not Found !',
            });
          }
        });
    } else {
      next()
    }
  },
  // Get Request Data
  (req, res, next) => {
    // Driver Phone Required
    // Request Id Required
    const params = req.body;

    if (params.type == 'scm') {
      scmRequestRef
        .child(params.biltyNo)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();

            req.body.request = request;
            console.log('Request Data Added');
            next();
          } else {
            res.json({
              status: false,
              error: 'Request Not Found !',
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
      let getLength = params.biltyNo.length;
      const getOrderNo = params.biltyNo.slice(2, (getLength - 2));


      pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
        if (snapshot.val()) {
          // TODO : ADD REQUEST STATUS CONDITIION
          const request = snapshot.val();
          req.body.request = request;
          next();

        } else {
          res.json({
            status: false,
            error: "Could Not Found request !",
          });
        }
      });
    }
  },
  // Check Bilty Status For PPL
  (req, res, next) => {
    const params = req.body;
    if (params.type == 'scm') {
      next()
    } else {
      //  FOR PPL REQUESTS
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
                  console.log("bilty -> ", bilty);

                  if (bilty.status == 'driver_reached') {
                    req.body.bilty = bilty;
                    next();
                  } else {
                    res.json({
                      status: false,
                      error: `Cannot Update Bilty - Bilty Status is ${bilty.status} !`,
                    });
                  }


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
          const makeSubOrderNo = `SO${params.biltyNo.slice(2, (params.biltyNo.length - 1))}`;
          console.log('makeSubOrderNo -> ', makeSubOrderNo)

          const suborders = params.request.subOrders;

          if (suborders) {
            if (suborders.length !== 0) {
              const filterOut = suborders.filter((suborder) => {
                return suborder.subOrderNo === makeSubOrderNo
              });

              // console.log('Found Bilty -> ',filterOut)

              if (filterOut) {
                if (filterOut.length !== 0) {
                  const suborder = filterOut[0];

                  const filterBilties = suborder.bilty.filter((bilty, index) => {
                    req.body.biltyIndex = index;
                    return bilty.biltyNo === params.biltyNo
                  })

                  const bilty = filterBilties[0];

                  console.log('Desired Bilty -> ', bilty)
                  console.log('Bilty Index -> ', req.body.biltyIndex);


                  if (bilty.status == 'driver_reached') {
                    req.body.bilty = bilty;
                    next();
                  } else {
                    res.json({
                      status: false,
                      error: `Cannot Update Bilty - Bilty Status is ${bilty.status} !`,
                    });
                  }


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

        default:
          res.json({
            status: false,
            error: "Unknown Request Type !"
          })

          break;
      }
    }
  },
  // Update Bilty For PPL
  (req, res, next) => {
    const params = req.body;

    if (params.type === 'scm') {
      next()
    } else {

      const getOrderNo = params.biltyNo.slice(2, (params.biltyNo.length - 2));

      switch (params.request.request_type) {
        case "transit":
          const transitbilties = params.request.bilty;

          transitbilties.forEach((bilty) => {
            if (bilty["biltyNo"] == params.biltyNo) {


              if (bilty.driver_phone && bilty.driver_phone === params.driver.user_id) {
                bilty["status"] = "driver_pickup";
                bilty["driver_pickup_on"] = moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a')

              } else {
                res.json({
                  status: false,
                  error: "Driver Allotted On Bilty Does Not Match With You !"
                })
              }
            }
          });



          pplRequestRef
            .child(getOrderNo)
            .update({
              bilty: transitbilties,
            })
            .then(() => {
              next();
            })
            .catch((err) => {
              res.json({
                status: false,
                error: err.message,
              });
            });
          break;

        case "upcountry":
          const suborders = params.request.subOrders;
          let matchFound = false;

          suborders.forEach((suborder) => {
            suborder.bilty.forEach((bilty) => {
              if (bilty["biltyNo"] == params.biltyNo) {

                if (bilty.driver_phone && bilty.driver_phone === params.driver.user_id) {
                  bilty["status"] = "driver_pickup";
                  bilty["driver_pickup_on"] = moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a')
                  matchFound = true;
                }
              }
            })
          });

          if (matchFound) {
            pplRequestRef
              .child(getOrderNo)
              .update({
                subOrders: suborders,
              })
              .then(() => {
                next();
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
              error: "Driver Allotted On Bilty Does Not Match With You !"
            })
          }

          break;

        default:
          res.json({
            status: false,
            error: "Unknown Request Type"
          })
          break;

      }
    }
  },
  // Update Request Status
  (req, res, next) => {
    const params = req.body;
    // console.log("req.body.driverData -> ", req.body.driverData);

    if (params.type == 'scm') {
      switch (params.request.status) {
        case 'pending':
          res.json({
            status: false,
            error: 'Request is not accepted by anyone driver !',
          });
          break;

        case 'driver_accepted':
          res.json({
            status: false,
            error: 'Driver Already Accepted Request !',
          });
          break;

        case 'driver_reached':


          const driverStatus = {
            status: 'driver_reached',
            driver_accepted_on: params.request.driver_accepted_on,
            driver_delivered_on: null,
            driver_reached_on: params.request.driver_reached_on,
            driver_pickup: moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a'),
          };
          scmRequestRef
            .child(params.request.biltyNo)
            .update({
              status: 'driver_pickup',
              driver_pickup_on: moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a'),
              driver_current_location: params.driver.current_position,
            })
            .then(() => {
              console.log('Request Updated After To driver_pickup');
              next();
            })
            .catch((error) => {
              res.json({
                status: false,
                level: 'Request Update',
                error: error.message,
              });
            });

          break;

        case 'driver_pickup':
          res.json({
            status: false,
            error: 'Driver Already PickedUp The Load !',
          });

          break;

        case 'user_cancelled':
          res.json({
            status: false,
            error: 'User Already Cancelled The Request !',
          });
          break;

        default:
          res.json({
            status: false,
            error: 'No Case Found !',
          });
          break;
      }
    } else {
      next()
    }
  },
  // Done
  (req, res, next) => {
    const params = req.body;
    if (params.type == 'scm') {
      res.json({
        status: true,
        message: `Driver Picked Up The Load On ${moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a')}`,
        data: {
          driverStatus: params.driverStatus,
          estimatedTime: params.request.googleDistance.duration.text,
          estimatedDistance: params.request.googleDistance.distance.text,
          start_location: params.request.googleDistance.start_address,
          end_location: params.request.googleDistance.end_address,
        },
      });
    } else {
      res.json({
        status: true,
        error: "PPL : Driver Picked Up The Load Successfully !"
      })
    }
  }
);

// "7" => Driver Delivered (Request Is Now Completed)
// /driver_delivered
// {
//    "token": "",
//    "biltyNo": "",
//    "type" : "" (scm,ppl)  
// }
router.post(
  '/driver_delivered',
  body('token').isString().withMessage('token required !'),
  body('biltyNo').isString().withMessage('Invalid Phone Number !'),
  body('type').isString().withMessage('type must be scm / transit / upcountry '),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next()
    }
  },
  verifyTokenFirebase,
  // Check User Type
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        res.json({
          status: false,
          error: 'Vendors set driver delivered ! only driver can !'
        })
        break;
      case "driver":
        req.body.driver = params.user;
        next()
        break;

      default:
        res.json({
          status: false,
          error: "Unknown User Type"
        })
        break;
    }
  },
  // Check Driver / Get Driver Data
  (req, res, next) => {
    const params = req.body;
    if (params.type == 'scm') {
      userRef
        .child("drivers")
        .child(params.driver.user_id)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const driver = snapshot.val();
            req.body.driver = driver;
            console.log('Driver Data Added');
            next();
          } else {
            res.json({
              status: false,
              error: 'Driver Not Found !',
            });
          }
        });
    } else {
      next()
    }
  },
  // Get Request Data
  (req, res, next) => {
    // Driver Phone Required
    // Request Id Required
    const params = req.body;

    if (params.type == 'scm') {
      scmRequestRef
        .child(params.biltyNo)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();

            req.body.request = request;
            console.log('Request Data Added');
            next();
          } else {
            res.json({
              status: false,
              error: 'Request Not Found !',
            });
          }
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
    } else {
      const getOrderNo = params.biltyNo.slice(2, (params.biltyNo.length - 2));


      pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
        if (snapshot.val()) {
          // TODO : ADD REQUEST STATUS CONDITIION
          const request = snapshot.val();
          req.body.request = request;
          next();

        } else {
          res.json({
            status: false,
            error: "Could Not Found request !",
          });
        }
      });
    }
  },
  // Get User Data
  (req, res, next) => {
    const params = req.body;

    if (params.type == 'scm') {
      userRef
        .child('users')
        .child(params.request.user.phone)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const user = snapshot.val();
            req.body.user = user;
            console.log('user Data Added');
            next();
          } else {
            res.json({
              status: false,
              error: 'user Not Found !',
            });
          }
        });
    } else {
      userRef
        .child('users')
        .child(params.request.user_phone)
        .once('value', (snapshot) => {
          if (snapshot.val()) {
            const user = snapshot.val();
            req.body.user = user;
            console.log('User Data Added !');
            next();
          } else {
            userRef
              .child('pro')
              .child(params.request.user_phone)
              .once('value', (snapshot) => {
                if (snapshot.val()) {
                  const user = snapshot.val();
                  req.body.user = user;
                  console.log('User Data Added !');
                  next();
                } else {
                  res.json({
                    status: false,
                    error: 'User Not Found !',
                  });
                }
              });

          }
        });
    }
  },
  // Check Bilty Status For PPL
  (req, res, next) => {
    const params = req.body;
    if (params.type == 'scm') {
      next()
    } else {
      //  FOR PPL REQUESTS
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
                  console.log("bilty -> ", bilty);

                  if (bilty.status == 'driver_pickup') {
                    req.body.bilty = bilty;
                    next();
                  } else {
                    res.json({
                      status: false,
                      error: `Cannot Update Bilty - Bilty Status is ${bilty.status} !`,
                    });
                  }

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
          const makeSubOrderNo = `SO${params.biltyNo.slice(2, (params.biltyNo.length - 1))}`;
          console.log('makeSubOrderNo -> ', makeSubOrderNo)

          const suborders = params.request.subOrders;

          if (suborders) {
            if (suborders.length !== 0) {
              const filterOut = suborders.filter((suborder) => {
                return suborder.subOrderNo === makeSubOrderNo
              });

              // console.log('Found Bilty -> ',filterOut)

              if (filterOut) {
                if (filterOut.length !== 0) {
                  const suborder = filterOut[0];

                  const filterBilties = suborder.bilty.filter((bilty, index) => {
                    req.body.biltyIndex = index;
                    return bilty.biltyNo === params.biltyNo
                  })

                  const bilty = filterBilties[0];

                  console.log('Desired Bilty -> ', bilty)
                  console.log('Bilty Index -> ', req.body.biltyIndex);


                  if (bilty.status == 'driver_pickup') {
                    req.body.bilty = bilty;
                    next();
                  } else {
                    res.json({
                      status: false,
                      error: `Cannot Update Bilty - Bilty Status is ${bilty.status} !`,
                    });
                  }


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

        default:
          res.json({
            status: false,
            error: "Unknown Request Type - (Check Bilty Status For PPL)"
          })
          break;
      }
    }
  },
  // Update Bilty For PPL
  (req, res, next) => {
    const params = req.body;

    if (params.type === 'scm') {
      next()
    } else {
      switch (params.request.request_type) {
        case "transit":
          const transitbilties = params.request.bilty;

          transitbilties.forEach((bilty) => {
            if (bilty["biltyNo"] == params.biltyNo) {

              if (bilty.driver_phone && bilty.driver_phone === params.driver.user_id) {
                bilty["status"] = "driver_delivered";
                bilty["driver_delivered_on"] = moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a')

              } else {
                res.json({
                  status: false,
                  error: "Driver Allotted On Bilty Does Not Match With You !"
                })
              }
            }
          });

          let getLength = params.biltyNo.length;
          const getOrderNo = params.biltyNo.slice(2, (getLength - 2));

          pplRequestRef
            .child(getOrderNo)
            .update({
              bilty: transitbilties,
            })
            .then(() => {
              next();
            })
            .catch((err) => {
              res.json({
                status: false,
                error: err.message,
              });
            });
          break;

        case "upcountry":

          const suborders = params.request.subOrders;
          let matchFound = false;

          suborders.forEach((suborder) => {
            suborder.bilty.forEach((bilty) => {
              if (bilty["biltyNo"] == params.biltyNo) {

                if (bilty.driver_phone && bilty.driver_phone === params.driver.user_id) {
                  bilty["status"] = "driver_delivered";
                  bilty["driver_delivered_on"] = moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a')
                  matchFound = true;
                }
              }
            })
          });

          if (matchFound) {
            pplRequestRef
              .child(params.request.orderNo)
              .update({
                subOrders: suborders,
              })
              .then(() => {
                next();
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
              error: "Driver Allotted On Bilty Does Not Match With You !"
            })
          }

          break;

        default:
          res.json({
            status: false,
            error: "Unknown Request Type - (Update Bilty For PPL)"
          })
          break;
      }
    }
  },
  // Generate Invoice
  async (req, res, next) => {
    const params = req.body;

    if (params.type == 'scm') {
      googleMapsClient
        .directions({
          params: {
            origin: [params.request.orgLat, params.request.orgLng],
            destination: [params.request.desLat, params.request.desLng],
            mode: 'driving',
            key: 'AIzaSyDDTYs0JX_8BEC62oRGKLZTJac3Xd2nx74',
          },
        })
        .then((Google) => {
          const DriverDistance = Google.data.routes[0].legs[0];

          // Get Loading Options From Request
          const loadingoptions = params.request.loading;
          const loadingOptionsCombine = [];
          if (loadingoptions && loadingoptions.length !== 0) {
            if (loadingoptions.length > 1) {
              loadingoptions.forEach((option) => {
                loadingOptionsCombine.push(`${option.name} x${option.quantity}`);
              });
            } else {
              loadingOptionsCombine.push(
                `${loadingoptions[0].name} x${loadingoptions[0].quantity}`
              );
            }
          }

          // Get Loading Options From Request
          const unloadingoptions = params.request.unloading;
          const unloadingOptionsCombine = [];
          if (unloadingoptions && unloadingoptions.length !== 0) {
            if (unloadingoptions.length > 1) {
              unloadingoptions.forEach((option) => {
                unloadingOptionsCombine.push(
                  `${option.name} x${option.quantity}`
                );
              });
            } else {
              unloadingOptionsCombine.push(
                `${unloadingoptions[0].name} x${unloadingoptions[0].quantity}`
              );
            }
          }

          const newInvoiceKey = scmInvoiceRef.child(params.request.id).push().key;
          // User Invoice
          const Userinvoice = {
            invoiceId: newInvoiceKey,
            invoiceCreatedOn: moment().format('MMMM Do YYYY, h:mm:ss a'),
            username: params.user.fullname,
            user_phone: params.user.phone,
            driver_name: params.driver.fullname,
            driver_phone: params.driver.phone,
            biltyNo: params.request.biltyNo,
            request_id: params.request.id,
            cargo_insurance: params.request.cargo_insurance
              ? params.request.cargo_insurance
              : null,
            request_given_at: moment(params.request.createdAt).format(
              'MMMM Do YYYY, h:mm:ss a'
            ),
            origin_location: params.request.orgText,
            destination_location: params.request.desText,
            total_distance: DriverDistance.distance.text,
            estimated_time: DriverDistance.duration.text,
            driver_accepted_on: moment(params.request.driver_accepted_on).format(
              'MMMM Do YYYY, h:mm:ss a'
            ),
            driver_reached_on: moment(params.request.driver_reached_on).format(
              'MMMM Do YYYY, h:mm:ss a'
            ),
            driver_pickup_on: moment(params.request.driver_pickup_on).format(
              'MMMM Do YYYY, h:mm:ss a'
            ),
            driver_delivered_on: moment().format('MMMM Do YYYY, h:mm:ss a'),
            request_duration: moment(params.request.createdAt).fromNow(),
            vehicle_type: params.request.vehicle_type,
            // TODO: Add Loading And Unloading Options
            loading_options: loadingOptionsCombine,
            unloading_options: unloadingOptionsCombine,
            floors_cost: params.request.bill.floorPrice,
            loading_cost: params.request.bill.loadingServices,
            unloading_cost: params.request.bill.unloadingServices,
            insurance_cost: params.request.bill.insurance || 0,
            discount: params.request.bill.discountPercent,
            time_cost: params.request.bill.timePrice,
            driver_cost: params.request.bill.driverPrice,
            commission_amount: params.request.bill.commissionPrice,
            total_payable_amount: params.request.bill.netTotalPrice,
          };

          scmInvoiceRef
            .child(params.request.id)
            .child('user')
            .set(Userinvoice)
            .then(() => {
              // Driver Invoice

              const Driverinvoice = {
                invoiceId: newInvoiceKey,
                invoiceCreatedOn: moment().format('MMMM Do YYYY, h:mm:ss a'),
                username: params.user.fullname,
                user_phone: params.user.phone,
                driver_name: params.driver.fullname,
                driver_phone: params.driver.phone,
                biltyNo: params.request.biltyNo,
                request_id: params.request.id,
                cargo_insurance: params.request.cargo_insurance
                  ? params.request.cargo_insurance
                  : null,
                request_given_at: moment(params.request.createdAt).format(
                  'MMMM Do YYYY, h:mm:ss a'
                ),
                origin_location: params.request.orgText,
                destination_location: params.request.desText,
                total_distance: DriverDistance.distance.text,
                estimated_time: DriverDistance.duration.text,
                driver_accepted_on: moment(
                  params.request.driver_accepted_on
                ).format('MMMM Do YYYY, h:mm:ss a'),
                driver_reached_on: moment(
                  params.request.driver_reached_on
                ).format('MMMM Do YYYY, h:mm:ss a'),
                driver_pickup_on: moment(params.request.driver_pickup_on).format(
                  'MMMM Do YYYY, h:mm:ss a'
                ),
                driver_delivered_on: moment().format('MMMM Do YYYY, h:mm:ss a'),
                request_duration: moment(params.request.createdAt).fromNow(),
                vehicle_type: params.request.vehicle_type,
                // TODO: Add Loading And Unloading Options
                loading_options: loadingOptionsCombine,
                unloading_options: unloadingOptionsCombine,
                floors_cost: params.request.bill.floorPrice,
                loading_cost: params.request.bill.loadingServices,
                unloading_cost: params.request.bill.unloadingServices,
                discount: params.request.bill.discountPercent,
                time_cost: params.request.bill.timePrice,
                arrival_cost: params.request.bill.arrivalPrice,
                departure_cost: params.request.bill.departurePrice,
                driver_earning: params.request.bill.driverPrice,
                commission_amount: params.request.bill.commissionPrice,
                total_payable_amount: params.request.bill.netTotalPrice,
              };

              scmInvoiceRef
                .child(params.request.id)
                .child('driver')
                .set(Driverinvoice)
                .then(() => {
                  next();
                  // res.json({
                  //   status: true,
                  //   invoice: Driverinvoice,
                  // });
                })
                .catch((error) => {
                  res.json({
                    status: false,
                    message: 'driver invoice generation',
                    error,
                  });
                });
            })
            .catch((error) => {
              res.json({
                status: false,
                message: 'user invoice generation',
                error,
              });
            });
        })
        .catch((err) => {
          console.log(err);
        });
    } else {

      next()

    }
  },
  // Create Driver History
  (req, res, next) => {
    const params = req.body;
    if (params.type == 'scm') {
      if (params.user_paid) {
        driverHistoryRef
          .child(params.driver.phone)
          .child(params.type)
          .child(params.request.biltyNo)
          .set({
            username: params.user.fullname,
            user_phone: params.user.phone,
            biltyNo: params.request.biltyNo,
            narration: 'Driver Will Receive Payment From Meribilty',
            user_paid: params.user_paid,
            paymentMethod: 'wallet',
            request_status: params.request.status,
            driver_accepted_on: params.request.driver_accepted_on,
            driver_reached_on: params.request.driver_reached_on,
            driver_pickup_on: params.request.driver_pickup_on,
            driver_delivered_on: params.request.driver_delivered_on,
            status: 'completed',
            type: 'scm',
          })
          .then(() => {
            next();
          })
          .catch((err) => {
            res.json({
              status: false,
              error: err.message,
            });
          });
      } else {
        driverHistoryRef
          .child(params.driver.phone)
          .child(params.type)
          .child(params.request.biltyNo)
          .set({
            username: params.user.fullname,
            user_phone: params.user.phone,
            biltyNo: params.request.biltyNo,
            narration: 'Driver Will Receive Payment From User (Cash On Delivery)',
            paymentMethod: 'cod',
            request_status: params.request.status,
            driver_accepted_on: params.request.driver_accepted_on,
            driver_reached_on: params.request.driver_reached_on,
            driver_pickup_on: params.request.driver_pickup_on,
            driver_delivered_on: params.request.driver_delivered_on,
            status: 'completed',
            type: 'scm',
          })
          .then(() => {
            next();
          })
          .catch((err) => {
            res.json({
              status: false,
              error: err.message,
            });
          });
      }
    } else {
      // FOR PPL REQUEST

      const getOrderNo = params.biltyNo.slice(2, (params.biltyNo.length - 2));

      driverHistoryRef
        .child(params.driver.user_id)
        .child(params.type)
        .child(params.biltyNo)
        .set({
          username: params.request.username,
          user_phone: params.request.user_phone,
          orderNo: getOrderNo,
          biltyNo: params.biltyNo,
          paymentMethod: params.request.payment_method,
          driver_alotted_on: params.bilty.driver_alotted_on,
          driver_reached_on: params.bilty.driver_reached_on,
          driver_pickup_on: params.bilty.driver_pickup_on,
          driver_delivered_on: params.bilty.driver_delivered_on,
          status: 'delivered',
          type: `${params.request.request_type}`,
        })
        .then(() => {
          next();
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
    }
  },
  // Update Request Status
  (req, res, next) => {
    const params = req.body;
    // console.log("req.body.driverData -> ", req.body.driverData);

    if (params.type == 'scm') {
      const driverStatus = {
        status: 'driver_delivered',
        driver_delivered_on: moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a'),
        driver_reached_on: params.request.driver_reached_on,
        driver_pickup: params.driver_pickup_on
      };

      req.body.driverStatus = driverStatus;

      scmRequestRef
        .child(params.request.biltyNo)
        .update({
          status: 'driver_delivered',
          driver_delivered_on: moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a'),
          driver_current_location: params.driver.current_position,
        })
        .then(() => {
          console.log('Request Updated After To driver_delivered');
          next();
        })
        .catch((err) => {
          res.json({
            status: false,
            level: 'Request Update',
            error: err.message,
          });
        });
    } else {
      next()
    }
  },
  // Done
  (req, res, next) => {
    const params = req.body;
    if (params.type == 'scm') {
      res.json({
        status: true,
        message: `Driver Delivered The Load On ${moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a')}`,
        data: {
          driverStatus: params.driverStatus,
          estimatedTime: params.request.googleDistance.duration.text,
          estimatedDistance: params.request.googleDistance.distance.text,
          start_location: params.request.googleDistance.start_address,
          end_location: params.request.googleDistance.end_address,
        },
      });
    } else {
      res.json({
        status: true,
        error: "PPL : Driver Delivered The Load Successfully !"
      })
    }
  }
);

// "8" => Driver Returning Container
// /driver_returning_container
// {
//    "token": "",
//    "biltyNo": "",
//    "type" : "" (scm,ppl)  
// }
router.post(
  '/driver_returning_container',
  body('token').isString().withMessage('token required !'),
  body('biltyNo').isString().withMessage('Invalid Bilty NO !'),
  body('type').isString().withMessage('type must be scm / ppl '),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next()
    }
  },
  verifyTokenFirebase,
  // Check User Type
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        res.json({
          status: false,
          error: 'Vendors can not accept bilty ! only driver can !'
        })
        break;
      case "driver":
        req.body.driver = params.user;
        next()
        break;

      default:
        res.json({
          status: false,
          error: "Unknown Type !"
        })
        break;
    }
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;

    const getOrderNo = params.biltyNo.slice(2, (params.biltyNo.length - 2));


    pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        // TODO : ADD REQUEST STATUS CONDITIION
        const request = snapshot.val();
        req.body.request = request;
        next();

      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });
  },
  // Check Bilty Status For PPL
  (req, res, next) => {
    const params = req.body;

    //  FOR PPL REQUESTS
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
                console.log("bilty -> ", bilty);

                if (bilty.status == 'driver_delivered') {
                  req.body.bilty = bilty;
                  next();
                } else {
                  res.json({
                    status: false,
                    error: `Cannot Update Bilty - Bilty Status is ${bilty.status} !`,
                  });
                }


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
        const makeSubOrderNo = `SO${params.biltyNo.slice(2, (params.biltyNo.length - 1))}`;
        console.log('makeSubOrderNo -> ', makeSubOrderNo)

        const suborders = params.request.subOrders;

        if (suborders) {
          if (suborders.length !== 0) {
            const filterOut = suborders.filter((suborder) => {
              return suborder.subOrderNo === makeSubOrderNo
            });

            // console.log('Found Bilty -> ',filterOut)

            if (filterOut) {
              if (filterOut.length !== 0) {
                const suborder = filterOut[0];

                const filterBilties = suborder.bilty.filter((bilty, index) => {
                  req.body.biltyIndex = index;
                  return bilty.biltyNo === params.biltyNo
                })

                const bilty = filterBilties[0];

                console.log('Desired Bilty -> ', bilty)
                console.log('Bilty Index -> ', req.body.biltyIndex);


                if (bilty.status == 'driver_delivered') {
                  req.body.bilty = bilty;
                  next();
                } else {
                  res.json({
                    status: false,
                    error: `Cannot Update Bilty - Bilty Status is ${bilty.status} !`,
                  });
                }


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

      default:
        res.json({
          status: false,
          error: "Unknown Request Type - (Check Bilty Status For PPL)!"
        })

        break;
    }
  },
  // Update Bilty For PPL
  (req, res, next) => {
    const params = req.body;

    switch (params.request.request_type) {
      case "transit":
        const transitbilties = params.request.bilty;

        transitbilties.forEach((bilty) => {
          if (bilty["biltyNo"] == params.biltyNo) {

            if (bilty.driver_phone && bilty.driver_phone === params.driver.user_id) {
              bilty["status"] = "container_returned";
              bilty["container_returned_on"] = moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a')
              req.body.vehicle_number = bilty["vehicle"] || bilty["vehicle_number"]
            } else {
              res.json({
                status: false,
                error: "Driver Allotted On Bilty Does Not Match With You !"
              })
            }
          }
        });

        let getLength = params.biltyNo.length;
        const getOrderNo = params.biltyNo.slice(2, (getLength - 2));

        pplRequestRef
          .child(getOrderNo)
          .update({
            bilty: transitbilties,
          })
          .then(() => {
            next();
          })
          .catch((err) => {
            res.json({
              status: false,
              error: err.message,
            });
          });
        break;

      case "upcountry":

        const suborders = params.request.subOrders;
        let matchFound = false;

        suborders.forEach((suborder) => {
          suborder.bilty.forEach((bilty) => {
            if (bilty["biltyNo"] == params.biltyNo) {

              if (bilty.driver_phone && bilty.driver_phone === params.driver.user_id) {
                bilty["status"] = "container_returned";
                bilty["container_returned_on"] = moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a')
                req.body.vehicle_number = bilty["vehicle"] || bilty["vehicle_number"]
                matchFound = true;
              }
            }
          })
        });

        if (matchFound) {
          pplRequestRef
            .child(params.request.orderNo)
            .update({
              subOrders: suborders,
            })
            .then(() => {
              next();
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
            error: "Driver Allotted On Bilty Does Not Match With You !"
          })
        }

        break;

      default:
        res.json({
          status: false,
          error: "Unknown Request Type - (Update Bilty For PPL)!"
        })
        break;
    }
  },
  // Create Driver History
  (req, res, next) => {
    const params = req.body;

    switch (params.request.request_type) {
      case "transit":
        driverHistoryRef
          .child(params.driver.user_id)
          .child("ppl")
          .child(params.biltyNo)
          .set({
            username: params.request.username,
            user_phone: params.request.user_phone,
            orderNo: params.request.orderNo,
            biltyNo: params.biltyNo,
            paymentMethod: params.request.payment_method,
            ...params.bilty,
            status: 'delivered',
            type: `${params.request.request_type}`,
          })
          .then(() => {
            next();
          })
          .catch((err) => {
            res.json({
              status: false,
              error: err.message,
            });
          });
        break;
      case "upcountry":
        driverHistoryRef
          .child(params.driver.user_id)
          .child("ppl")
          .child(params.biltyNo)
          .set({
            username: params.request.username,
            user_phone: params.request.user_phone,
            orderNo: params.request.orderNo,
            biltyNo: params.biltyNo,
            paymentMethod: params.request.payment_method,
            ...params.bilty,
            status: 'delivered',
            type: `${params.request.request_type}`,
          })
          .then(() => {
            next();
          })
          .catch((err) => {
            res.json({
              status: false,
              error: err.message,
            });
          });
        break;

      default:
        break;
    }



  },
  // Check If All Bilties Are Completed 
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.child(params.request.orderNo).once('value', (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();

        switch (request.request_type) {
          case "transit":
            const transitbilties = request.bilty;
            let biltyCompletionChecker = true;

            if (transitbilties) {
              if (transitbilties.length !== 0) {
                transitbilties.forEach((bilty) => {
                  if (bilty.status !== 'container_returned') {
                    biltyCompletionChecker = false;
                  }
                })
              }
            }

            if (biltyCompletionChecker) {
              // Order Completed
              pplRequestRef.child(request.orderNo).update({
                status: "completed",
                order_completed_on: moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a')
              }).then(() => {

                next();
              }).catch((err) => {
                res.json({
                  status: false,
                  error: err.message
                })
              })
            } else {
              next();
            }

            break;

          case "upcountry":
            // Suborder And Bilty Filteration and Status Check


            const suborders = request.subOrders;
            let upcountryBiltyCompletionChecker = true;

            if (suborders) {
              if (suborders.length !== 0) {
                suborders.forEach((suborder) => {
                  suborder.bilty.forEach((bilty) => {
                    if (bilty["status"] !== "container_returned") {
                      upcountryBiltyCompletionChecker = false;
                    }
                  })
                });
              }
            }

            if (upcountryBiltyCompletionChecker) {
              // Order Completed
              pplRequestRef.child(request.orderNo).update({
                status: "completed",
                order_completed_on: moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a')
              }).then(() => {
                // Update Vendor Orders Array 
                // TODO
                // orderArr.splice(orderArr.findIndex(orderNo), 1);
                next();
              }).catch((err) => {
                res.json({
                  status: false,
                  error: err.message
                })
              })
            } else {
              next()
            }

            break;

          default:
            res.json({
              status: false,
              error: "Unknown Request Type - (Check Bilty Status For PPL)!"
            })

            break;
        }
      } else {
        res.json({
          status: false,
          error: "Bilties Check Error !"
        })
      }
    })
  },
  // Update Driver
  (req, res, next) => {
    const params = req.body;

    userRef.child("drivers").child(params.driver.user_id).update({
      bilty: null,
      request_type: null,
      status: "free"
    }).then(() => {
      next();
    }).catch((err) => {
      res.json({
        status: false,
        error: ""
      })
    })
  },
  // Update Vehicle
  (req, res, next) => {
    const params = req.body;

    pplVendorVehicleRef.child(params.vehicle_number).update({
      available: true
    }).then(() => {
      next();
    }).catch((err) => {
      res.json({
        status: false,
        error: err
      })
    })

  },
  // Done
  (req, res, next) => {
    const params = req.body;
    res.json({
      status: false,
      error: "PPL : Empty Container Returned Successfully !"
    })
  }
);


router.post("/update_driver_position",
  (req, res) => {
    const params = req.body;

    userRef
      .child("drivers")
      .child(params.phone)
      .update({
        current_position: {
          lat: params.lat,
          lng: params.lng,
        },
      })
      .then(() => {
        res.json({
          status: true,
          message: "Position Updated",
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  });


// Get Single Bilty
router.post("/get_single_bilty", verifyTokenFirebase,
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

    if (params.request.request_type === 'transit') {
      const bilties = params.request.bilty;


      const currentBilty = bilties.filter((bilty) => {
        return bilty.biltyNo === params.biltyNo
      })

      let biltydata;

      if (currentBilty) {
        biltydata = {
          ...currentBilty[0],
          orderNo: params.request.subOrderNo,
          user_phone: params.request.user_phone,
          vendor_phone: params.request.vendor_phone || null,
          vendor_name: params.request.vendor_name || null,
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
          documents: params.request.documents,
          // driver_alloted_on: Date(),
          // driver_reached_on: Date(),
          // driver_pickup_on: Date(),
          // driver_delivered_on: Date(),
          // container_returned_on: Date()
        }
      }
      // console.log('biltydata -> ', biltydata)

      res.json({
        status: true,
        data: biltydata
      })
    } else if (params.request.request_type === 'upcountry') {
      const suborders = params.request.subOrders;

      let currentBilty;

      suborders.forEach((suborder) => {
        suborder.bilty.forEach((bilty) => {
          if (bilty.biltyNo === params.biltyNo) {
            currentBilty = {
              ...bilty,
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
              documents: params.request.documents,
              // driver_alloted_on: Date(),
              // driver_reached_on: Date(),
              // driver_pickup_on: Date(),
              // driver_delivered_on: Date(),
              // container_returned_on: Date()
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


// Get Completed Bilty 
router.post("/get_completed_bilty", verifyTokenFirebase,
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

    if (params.request.request_type === 'transit') {
      const bilties = params.request.bilty;


      const currentBilty = bilties.filter((bilty) => {
        return bilty.biltyNo === params.biltyNo
      })

      let biltydata = {
        ...currentBilty,
        orderNo: params.request.subOrderNo,
        user_phone: params.request.user_phone,
        vendor_phone: params.request.vendor_phone || null,
        vendor_name: params.request.vendor_name || null,
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
        documents: params.request.documents,
        driver_alloted_on: Date(),
        driver_reached_on: Date(),
        driver_pickup_on: Date(),
        driver_delivered_on: Date(),
        container_returned_on: Date()
      }

      res.json({
        status: true,
        data: biltydata
      })
    } else if (params.request.request_type === 'upcountry') {
      const suborders = params.request.subOrders;

      let currentBilty;

      suborders.forEach((suborder) => {
        suborder.bilty.forEach((bilty) => {
          if (bilty.biltyNo === params.biltyNo) {
            currentBilty = {
              ...bilty,
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
              documents: params.request.documents,
              driver_alloted_on: Date(),
              driver_reached_on: Date(),
              driver_pickup_on: Date(),
              driver_delivered_on: Date(),
              container_returned_on: Date()
            }
          }
        })
      })


      res.json({
        status: true,
        data: currentBilty
      })
    }
  })


module.exports = router;