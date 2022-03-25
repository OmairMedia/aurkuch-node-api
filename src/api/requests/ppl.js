/* eslint max-len: ["error", { "ignoreComments": true }] */

const express = require("express");
const generator = require("generate-password");
const config = require("../../config/private.json");
const moment = require("moment-timezone");
const moment2 = require("moment");
const { Storage } = require("@google-cloud/storage");
const storage = new Storage({
  keyFilename: "src/config/serviceAccount.json",
});

const _ = require('lodash');
const bucket = storage.bucket("meribilty-files");
const orderNo = require("order-no");
const { remove, update, isArray } = require("lodash");
const { Client } = require("@googlemaps/google-maps-services-js");
const twillio_client = require("twilio")(
  config.twilio.accountSid,
  config.twilio.authToken
);
const { body, validationResult } = require("express-validator");
const {
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
  pplRoutesEstimation,
  driverHistoryRef,
} = require("../../db/newRef");
const { userRef, vendorRef, walletRef } = require("../../db/ref");
const { verifyTokenFirebase } = require("../../functions/slash");
const { request } = require("express");
const { promises } = require("nodemailer/lib/xoauth2");
const googleMapsClient = new Client({});
const router = express.Router();
const JWT_SECRET =
  "sdjkfh8923yhjdksbfma@#*(&@*!^#&@bhjb2qiuhesdbhjdsfg839ujkdhfjk";
const jwt = require("jsonwebtoken");
const { error } = require("firebase-functions/logger");
const { parse } = require("dotenv");

// =============== GET REQUESTS ==================

// /ppl_data -> (Getting Data For Vehicles , Materials , Loading And Unloading Options)
router.post(
  "/ppl_data",
  // Vehicle List
  (req, res, next) => {
    pplSettingsRef.child("vehicles").once("value", (snapshot) => {
      if (snapshot.val()) {
        const vehicles = snapshot.val();
        req.body.vehicles = vehicles;
        next();
      } else {
        res.json({
          status: false,
          error: "Vehicles Not Found !",
        });
      }
    });
  },
  // Vehicle Types
  (req, res, next) => {
    pplSettingsRef.child("vehicle_types").once("value", (snapshot) => {
      if (snapshot.val()) {
        const vehicle_types = snapshot.val();
        req.body.vehicle_types = vehicle_types;
        next();
      } else {
        res.json({
          status: false,
          error: "vehicle_types Not Found !",
        });
      }
    });
  },
  // Material List
  (req, res, next) => {
    pplSettingsRef.child("material_list").once("value", (snapshot) => {
      if (snapshot.val()) {
        const materials = snapshot.val();
        req.body.materials = materials;
        next();
      } else {
        res.json({
          status: false,
          error: "materials Not Found !",
        });
      }
    });
  },
  // Loading Options
  (req, res, next) => {
    pplSettingsRef.child("loading_options").once("value", (snapshot) => {
      if (snapshot.val()) {
        const loading_options = snapshot.val();
        req.body.loading_options = loading_options;
        next();
      } else {
        res.json({
          status: false,
          error: "loading_options Not Found !",
        });
      }
    });
  },
  // Unloading Options
  (req, res, next) => {
    pplSettingsRef.child("unloading_options").once("value", (snapshot) => {
      if (snapshot.val()) {
        const unloading_options = snapshot.val();
        req.body.unloading_options = unloading_options;
        next();
      } else {
        res.json({
          status: false,
          error: "unloading_options Not Found !",
        });
      }
    });
  },
  // Give Data
  (req, res) => {
    const params = req.body;

    res.json({
      status: true,
      message:
        "Vehicles , Vehicle_types, Materials , Loading And Unloading Options ! ",
      vehicles: params.vehicles,
      vehicle_types: params.vehicle_types,
      materials: params.materials,
      loading_options: params.loading_options,
      unloading_options: params.unloading_options,
    });
  }
);



// Get User Wallet

// ============== GET REQUESTS END ==============

// ============== POST REQUESTS START HERE ==============

// Get Estimated Price
router.post(
  "/estimated_price",
  body("material").isArray().withMessage("material must be an array"),
  body("desLat").isString().withMessage("desLat must be an string"),
  body("desLng").isString().withMessage("desLng must be an string"),
  body("desText").isString().withMessage("desText must be an string"),
  body("disText").isString().withMessage("disText must be an string"),
  body("durText").isString().withMessage("durText must be an string"),
  body("orgLat").isString().withMessage("orgLat must be an string"),
  body("orgLng").isString().withMessage("orgLng must be an string"),
  body("orgText").isString().withMessage("orgText must be an string"),
  body("emptyLat").isString().withMessage("emptyLat must be an string"),
  body("emptyLng").isString().withMessage("emptyLng must be an string"),
  body("emptyText").isString().withMessage("emptyText must be an string"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  // Get Loading List
  (req, res, next) => {
    const params = req.body;

    if (params.loading.length !== 0) {
      pplSettingsRef.child("loading_options").once("value", (snapshot) => {
        if (snapshot.val()) {
          const loading_options = snapshot.val();
          const convert = Object.entries(loading_options);

          const final = [];
          convert.forEach((x) => {
            final.push(x[1]);
          });
          req.body.loading_options_pricing = final;
          next();
        } else {
          res.json({
            status: false,
            error: "Loading Option Pricing Not Found !",
          });
        }
      });
    } else {
      req.body.loading_options_pricing = [];
      next();
    }
  },
  // Unloading List
  (req, res, next) => {
    const params = req.body;

    if (params.unloading.length !== 0) {
      pplSettingsRef.child("unloading_options").once("value", (snapshot) => {
        if (snapshot.val()) {
          const unloading_option = snapshot.val();
          const convert = Object.entries(unloading_option);

          const final = [];
          convert.forEach((x) => {
            final.push(x[1]);
          });
          req.body.unloading_options_pricing = final;
          // console.log(
          //   "req.body.unloading_options_pricing -> ",
          //   req.body.unloading_options_pricing
          // );
          next();
        }
      });
    } else {
      req.body.unloading_options_pricing = [];
      next();
    }
  },
  // Get Pricing Data
  (req, res, next) => {
    const params = req.body;

    if (params.vehicle_type) {
      // Get Vehicle Type
      pplSettingsRef
        .child("vehicle_types")
        .child(params.vehicle_type)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const pricing = snapshot.val();
            req.body.pricingData = pricing;
            // console.log("Pricing added ", req.body.pricingData);

            pplCommission.once("value", (snapshot) => {
              const commission = snapshot.val();
              if (commission) {
                req.body.CommissionPercent = commission.value;
                if (
                  params.cargo_value &&
                  params.cargo_value !== "0" &&
                  params.cargo_value !== 0
                ) {
                  pplSettingsRef
                    .child("insurance")
                    .once("value", (snapshot) => {
                      if (snapshot.val()) {
                        const insurance = snapshot.val();
                        req.body.insurance = insurance;
                        next();
                      }
                    });
                } else {
                  req.body.insurance = null;
                  next();
                }
              } else {
                res.json({
                  status: false,
                  message: "Commission Data Missing From DB",
                });
              }
            });
          } else {
            res.json({
              status: false,
              error: "Vehicle Type Not Found !",
            });
          }
        });
    } else {
      req.body.pricingData = null;
    }
  },
  // Check Promo Code
  (req, res, next) => {
    const params = req.body;
    if (params.promo) {
      pplSettingsRef.child("promocodes").once("value", (snapshot) => {
        if (snapshot.val()) {
          const promocodes = snapshot.val();
          const convert = Object.entries(promocodes);

          const final = [];
          convert.forEach((x) => {
            final.push(x[1]);
          });

          const findThePromo = final.filter(
            (promo) => promo.code == params.promo
          );

          console.log("findThePromo -> ", findThePromo);

          if (findThePromo.length !== 0) {
            // res.json({
            //   status: false,
            //   error: "Promocode is valid !",
            // });
            if (findThePromo[0].active) {
              req.body.discount = findThePromo[0].discount;
              console.log("discount -> ", req.body.discount);
              next();
            } else {
              res.json({
                status: false,
                error: `The Promocode ${params.promo} is not active any more !`,
              });
            }
          } else {
            res.json({
              status: false,
              error: "Promocode is invalid !",
            });
            // console.log("findThePromo -> ", findThePromo);
          }
        } else {
          // error
          res.json({
            status: false,
            error: "Promo Data Not Found",
          });
        }
      });
    } else {
      next();
    }
  },
  // Set Pricing - Working On It
  (req, res, next) => {
    // user
    // request
    // pricingData
    // CommissionPercent
    const params = req.body;

    if (params.pricingData !== null) {
      // Get Directions
      googleMapsClient
        .directions({
          params: {
            origin: [params.start_location.lat, params.start_location.lng],
            destination: [params.end_location.lat, params.end_location.lng],
            mode: "driving",
            key: "AIzaSyDDTYs0JX_8BEC62oRGKLZTJac3Xd2nx74",
          },
        })
        .then((Google) => {
          const DriverDistance = Google.data.routes[0].legs[0];
          // console.log("Driver Distance -> ", DriverDistance);

          // Calculate Arrival Price
          // Calculate Departure Price
          // Calculate Time Price

          const { distance } = DriverDistance;
          const { duration } = DriverDistance;
          const { start_address } = DriverDistance;
          const { end_address } = DriverDistance;
          //  distance in meter
          //  duration in seconds

          // Calculation Arrival Price
          // console.log("DriverDistance -> ", DriverDistance);
          console.log("distance.value  -> ", distance.text);
          console.log("duration.value  -> ", duration.text);
          console.log("start_address -> ", start_address);
          console.log("end_address  -> ", end_address);

          let arrivalPrice = 0;

          if (distance.value <= params.pricingData.minimumEmptyDistance) {
            arrivalPrice = params.pricingData.minimumEmptyPrice;
          } else {
            const inKM = distance.value / 1000;
            arrivalPrice = Math.ceil(
              inKM * params.pricingData.minimumEmptyPrice
            );
          }

          arrivalPrice = parseInt(arrivalPrice);

          let departurePrice = 0;
          if (distance.value <= params.pricingData.minimumLoadedDistance) {
            departurePrice = params.pricingData.minimumLoadedPrice;
          } else {
            const inKM = distance.value / 1000;
            departurePrice = Math.ceil(
              inKM * params.pricingData.minimumLoadedPrice
            );
          }

          departurePrice = parseInt(departurePrice);

          const timePrice = Math.ceil(
            params.pricingData.minimumPricePerMinute * (duration.value / 60)
          );

          // =====================  Calculating Loading And Unloading Prices Start ============================
          const loadingFilter = params.loading || [];
          const unloadingFilter = params.unloading || [];

          const pricingForLoadingOption = params.loading_options_pricing;
          const pricingForUnloadingOption = params.unloading_options_pricing;
          let loading_price = 0;
          let unloading_price = 0;

          // Loop Loading Option
          if (loadingFilter.length !== 0) {
            if (loadingFilter.length > 1) {
              loadingFilter.forEach((option) => {
                const getPricingForALoadingOption =
                  pricingForLoadingOption.filter((x) => x.name == option.name);
                const price =
                  getPricingForALoadingOption[0].price * option.quantity;
                loading_price += price;
                // console.log(`Price For ${option.name} -> `, price);
              });
            } else if ((loadingFilter.length = 1)) {
              const getPricingForALoadingOption =
                pricingForLoadingOption.filter(
                  (x) => x.name == loadingFilter[0].name
                );
              const price =
                getPricingForALoadingOption[0].price *
                loadingFilter[0].quantity;
              loading_price += price;
              // console.log(`Price For ${loadingFilter[0]} -> `, price);
            }
          }

          // Loop Unloading Option
          if (unloadingFilter.length !== 0) {
            if (unloadingFilter.length > 1) {
              unloadingFilter.forEach((option) => {
                const getPricingForAUnloadingOption =
                  pricingForUnloadingOption.filter(
                    (x) => x.name == option.name
                  );
                const price =
                  getPricingForAUnloadingOption[0].price * option.quantity;
                unloading_price += price;
                // console.log(`Price For ${option.name} -> `, price);
              });
            } else if ((unloadingFilter.length = 1)) {
              const getPricingForAUnloadingOption =
                pricingForUnloadingOption.filter(
                  (x) => x.name == unloadingFilter[0].name
                );
              const price =
                getPricingForAUnloadingOption[0].price *
                unloadingFilter[0].quantity;
              unloading_price += price;
              // console.log(`Price For ${unloadingFilter[0].name} -> `, price);
            }
          }
          // =====================  Calculating Loading And Unloading Prices End ============================

          // =====================  Calculating Insurance Start ============================
          let insuranceCost = 0;
          if (params.insurance !== null) {
            const insurancePercent = parseInt(params.insurance.value);
            console.log("insurancePercent -> ", insurancePercent);
            const insuranceAmount = Math.ceil(
              (parseInt(params.cargo_value) / 100) * insurancePercent
            );
            console.log("insuranceAmount -> ", insuranceAmount);
            insuranceCost = insuranceAmount;
          }

          console.log("insuranceCost -> ", insuranceCost);

          // =====================  Calculating Insurance  End ============================

          // =====================  Calculating All Prices Start ============================

          const totalServices = Math.ceil(loading_price + unloading_price);

          let floorPrice = Math.ceil(
            params.pricingData.pricePerFloor * params.floors
          );

          floorPrice = parseInt(floorPrice);

          console.log(
            `departurePrice -> ${departurePrice} + arrivalPrice -> ${arrivalPrice}`
          );
          console.log(`= ${departurePrice + arrivalPrice}`);
          const driverPrice = Math.ceil(departurePrice + arrivalPrice);
          const othersPrice = Math.ceil(totalServices + floorPrice);
          const totalPrice = Math.ceil(othersPrice + driverPrice + timePrice);
          const commissionPrice = Math.ceil(
            totalPrice * (params.CommissionPercent / 100)
          );

          // =====================  Calculating All Prices End ============================

          // =====================  Calculating Discount Prices Start ============================

          const discountPercent = params.discount || 0;

          // =====================  Calculating Discount Prices End ============================

          if (discountPercent !== 0) {
            const discountAmount = (totalPrice / 100) * discountPercent;
            var netTotalPrice = totalPrice - discountAmount;
            netTotalPrice += commissionPrice;
          } else {
            var netTotalPrice = totalPrice;
            netTotalPrice += commissionPrice;
          }

          netTotalPrice += insuranceCost;

          const bill = {
            arrivalPrice: parseInt(arrivalPrice),
            loadingServices: loading_price,
            unloadingServices: unloading_price,
            commissionPrice,
            departurePrice: parseInt(departurePrice),
            discountPercent: parseInt(discountPercent),
            insuranceCost,
            driverPrice,
            floorPrice,
            netTotalPrice,
            timePrice,
            totalPrice,
          };

          console.log("bill -> ", bill);
          req.body.bill = bill;
          next();
        })
        .catch((error) => {
          console.log("Google Map Client Error -> ", error);
          res.json({
            status: false,
            error,
          });
        });
    }
  },
  // Response Done
  (req, res) => {
    const params = req.body;

    if (params.bill) {
      // Estimate High And Low
      const low = params.bill.netTotalPrice;
      const calculate40percent = Math.ceil((low / 1000) * 40);
      console.log("calculate10percent -> ", calculate40percent);
      const high = Math.ceil(low + calculate40percent);

      res.json({
        status: true,
        high,
        low,
      });
    } else {
      res.json({
        status: false,
        error: "Bill data missing",
      });
    }
  }
);

// ===================  Create A PPL Request Services (Start) ======================

// /create_request -> (Transit / Upcountry)
router.post(
  "/create_request",
  body("type").isString().withMessage("type must be an string"),
  body("date").isISO8601().isAfter().withMessage("date must be valid"),
  body("desLat").isString().withMessage("desLat must be an string"),
  body("desLng").isString().withMessage("desLng must be an string"),
  body("disText").isString().withMessage("disText must be an string"),
  body("durText").isString().withMessage("durText must be an string"),
  body("orgLat").isString().withMessage("orgLat must be an string"),
  body("orgLng").isString().withMessage("orgLng must be an string"),
  body("originAddress").isString().withMessage("originAddress must be an string"),
  body("destinationAddress").isString().withMessage("originAddress must be an string"),
  body("containerReturnAddress").isString().withMessage("originAddress must be an string"),
  // Validator
  (req, res, next) => {
    const params = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      if (params.type == "transit" || params.type == "upcountry") {
        next();
      } else {
        res.json({
          status: false,
          error: "Invalid Request Type ! Type must be - transit / upcountry",
        });
      }
    }
  },
  verifyTokenFirebase,
  // Check User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        userRef
          .child("users")
          .child(params.user.user_id)
          .once("value", (snapshot) => {
            if (snapshot.val()) {
              const user = snapshot.val();
              req.body.user = user;
              next();
            } else {
              userRef
                .child("pro")
                .child(params.user.user_id)
                .once("value", (snapshot) => {
                  if (snapshot.val()) {
                    const user = snapshot.val();
                    if (user.type === 'user') {
                      req.body.user = user;
                      console.log('pro user -> user ')
                      next();
                    } else {
                      res.json({
                        status: false,
                        error: "User Not Found in Database - level get pro user!",
                      })
                    }
                  } else {
                    res.json({
                      status: false,
                      error: "User Not Found in Database - level get user!",
                    });
                  }
                });

            }
          });
        break;

      case "pro":
        userRef
          .child("pro")
          .child(params.user.user_id)
          .once("value", (snapshot) => {
            if (snapshot.val()) {
              const user = snapshot.val();
              req.body.user = user;
              next();
            } else {
              res.json({
                status: false,
                error: "User Not Found in Database !",
              });
            }
          });
        break;

      case "driver":
        res.json({
          status: false,
          error: "Driver cannot create request !"
        })
        break;

      case "vendor":
        res.json({
          status: false,
          error: "Vendor cannot create request !"
        })
        break;
      default:
        res.json({
          status: false,
          error: "Unknown Type !"
        })
        break;
    }
  },
  // Check Number Of Requests
  (req, res, next) => {
    pplRequestRef.limitToLast(1).once("value", (snapshot) => {
      if (snapshot.val()) {
        req.body.totalRequests = parseInt(Object.keys(snapshot.val())[0]);
        console.log('num of req checked !');
        next();
      } else {
        req.body.totalRequests = 0;
        next();
      }
    });
  },
  // Get User Vehicle Selections
  (req, res, next) => {
    const params = req.body;
    pplUserVehicleSelections
      .child(params.user.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const rawselections = snapshot.val();
          const selections = [];
          const convert = Object.entries(rawselections);

          convert.forEach((x) => {
            selections.push(x[1]);
          });


          req.body.selections = selections;
          console.log('got vehicle selection ! -> ', selections);

          next();
        } else {
          res.json({
            status: false,
            error: "User Didn't Selected Vehicle(s) !",
          });
        }
      });
  },
  // Create PPL Request
  (req, res, next) => {
    const params = req.body;

    // Request Phases :
    // "1" => User Sent A Request | No Vendor has accepted the request
    // "2" => Request Is Given To All Vendors
    // "3" => Vendors will give their best offers
    // "4" => Lowest Price Offer Will Be Given To User
    // "5" => User Will Accept/Counter The Offer
    // "6" => Vendors Will Be Given Counter Offer
    // "7" => Vendors Will Be Accept/Counter The Counter Offer
    // "8" => User Will Be Given The Final Counter Offer From Vendor
    // "9" => User Will Accept/Reject The Final Counter Offer From Vendor

    // const newUserRequest = pplRequestRef.push();
    // const reqId = newUserRequest.key;
    const no = (params.totalRequests + 1 < 10) ? `000${params.totalRequests + 1}`
      : (params.totalRequests + 1 < 100) ? `00${params.totalRequests + 1}`
        : (params.totalRequests + 1 < 1000) ? `0${params.totalRequests + 1}`
          : (params.totalRequests + 1);
    req.body.orderNo = no;

    if (params.type === 'transit') {
      pplRequestRef
        .child(no)
        .set({
          material: null,
          orderNo: no,
          ...params,
          user: null,
          user_id: params.user.id,
          user_phone: params.user.phone,
          user_type: params.user.type,
          username: params.user.fullname,
          selections: null,
          status: "pending",
          request_type: params.type,
          token: null,
          createdAt: moment()
            .tz("Asia/Karachi")
            .format("MMMM Do YYYY, h:mm:ss a"),
        })
        .then(() => {
          // Inform All Active Drivers
          // console.log("PPL Transit Cargo Request Created !");
          console.log('request created');
          next();
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
    } else {
      // Upcountry Request
      pplRequestRef
        .child(no)
        .set({
          cargo_insurance: params.cargo_insurance,
          date: params.date,
          orderNo: no,
          orgLat: params.orgLat,
          orgLng: params.orgLng,
          desLat: params.desLat,
          desLng: params.desLng,
          disText: params.disText,
          durText: params.durText,
          originAddress: params.originAddress || null,
          destinationAddress: params.destinationAddress || null,
          containerReturnAddress: params.containerReturnAddress || null,
          security_deposit: params.security_deposit || null,
          user_id: params.user.id,
          user_phone: params.user.phone,
          user_type: params.user.type,
          username: params.user.fullname,
          request_type: params.type,
          status: "pending",
          createdAt: moment()
            .tz("Asia/Karachi")
            .format("MMMM Do YYYY, h:mm:ss a"),
        })
        .then(() => {
          // Inform All Active Drivers
          // console.log("PPL Transit Cargo Request Created !");
          console.log('request created');
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
  // Get Request Data
  (req, res, next) => {
    const params = req.body;
    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();
        req.body.request = request;
        console.log('got request data ');
        next();
      } else {
        res.json({
          status: false,
          error: "Unexpected Error! Please, Try Again",
        });
      }
    });
  },
  // Create Order Bilties For Upcountry
  (req, res, next) => {
    const params = req.body;
    const vehicles_demanded = params.selections;
    console.log('vehicles_demanded -> ', vehicles_demanded)

    switch (params.type) {
      case "transit":
        if (vehicles_demanded.length !== 0) {
          if (vehicles_demanded.length >= 1) {
            let allBilties = [];
            let numCount = 0;
            const alphabets = "aabcdefghijklmnopqrstuvwxyz".split("");

            vehicles_demanded.forEach((vehicle) => {
              numCount++
              let BiltyNo = `BT${params.request.orderNo}${alphabets[numCount]}`;
              // console.log('BiltyNo -> ',BiltyNo);
              if (vehicle.vehicle_quantity >= 1) {
                for (let i = 0; i < vehicle.vehicle_quantity; i++) {
                  // console.log("vehicle -> ", vehicle);
                  const convertion = parseInt(vehicle.price);
                  // console.log('convertion -> ',convertion)

                  let bilty = {
                    ...vehicle,
                    price: null,
                    quantity: "1",
                    status: "pending",
                    biltyNo: BiltyNo + i,
                  };

                  allBilties.push(bilty);

                  if (i == vehicle.vehicle_quantity) {
                    break;
                  }
                }
              }
            });

            // console.log("All Bilties -> ", allBilties);

            pplRequestRef
              .child(params.request.orderNo)
              .child("bilty")
              .set(allBilties)
              .catch((err) => console.log(err));

            console.log('allBilties -> ', allBilties);
            console.log('order bilty done ');
            next();
          } else {
            res.json({
              status: false,
              error: "User Didnt Have Vehicle Selection !"
            })
          }
        } else {
          res.json({
            status: false,
            error: "Vehicle Loop Issue !",
          });
        }
        break;
      case "upcountry":
        // For Upcountry
        // Suborder Creation Then Bilties Creation
        if (vehicles_demanded.length !== 0) {
          // console.log("vehicles_demanded -> ", vehicles_demanded);
          if (vehicles_demanded.length >= 1) {
            let allBilties = [];
            let allSubOrders = [];
            let numCount = 0;
            const alphabets = "aabcdefghijklmnopqrstuvwxyz".split("");

            vehicles_demanded.forEach((vehicle) => {
              numCount++;
              let SubOrderNo = `SO${params.request.orderNo}${alphabets[numCount]}`;

              let subOrder = {
                ...vehicle,
                id: null,
                // selectedVehiclesId: vehicle.id,
                status: "pending",
                subOrderNo: SubOrderNo,
                bilty: [],
              };

              if (vehicle.vehicle_quantity >= 1) {
                for (let i = 0; i < vehicle.vehicle_quantity; i++) {
                  let BiltyNo = `BT${params.request.orderNo}${alphabets[numCount]}`;
                  // console.log("vehicle -> ", vehicle);

                  let bilty = {
                    // ...vehicle,
                    price: null,
                    status: "pending",
                    biltyNo: BiltyNo + i,
                  };

                  subOrder.bilty.push(bilty);

                  // allBilties.push(bilty);

                  if (i == vehicle.vehicle_quantity) {
                    break;
                  }
                }
              }

              allSubOrders.push(subOrder);
            });

            // console.log("All allSubOrders -> ", allSubOrders);
            pplRequestRef
              .child(params.request.orderNo)
              .child("subOrders")
              .set({
                ...allSubOrders,
              })
              .catch((err) => console.log(err));
            console.log('order bilty done ');
            next();
          } else {
            console.log("else");
          }
        } else {
          res.json({
            status: false,
            error: "Vehicle Loop Issue !",
          });
        }
        break;
      default:
        res.json({
          status: false,
          error: "Unknown Type"
        })
        break;
    }
  },
  // Get Estimated Rates If Any 
  (req, res, next) => {
    const params = req.body;

    let estimateRef = pplSettingsRef.child("estimation");
    console.log('Get  Estimate  done ');
    next();

    estimateRef.orderByChild("origin").equalTo(params.originAddress).once('value', (snapshot) => {
      if (snapshot.val()) {
        const places = [];

        snapshot.forEach((snap) => {
          places.push(snap.val());
        })

        if (places) {
          if (places.length > 0) {
            res.json({
              status: true,
              message: `PPL ${params.type} Request Has Been Placed !`,
              request: params.request,
              estimate: true,
              high: places[0].high,
              low: places[0].low
            });
          } else {
            next();
          }
        }



      } else {
        next();
      }
    })

  },
  // Done
  (req, res) => {
    const params = req.body;
    console.log('All  done ');
    res.json({
      status: true,
      message: `PPL ${params.type} Request Has Been Placed !`,
      request: params.request,
      estimate: false,
    });
  }
);

// ===================  Create A PPL Request Services (Ends) ======================



// ===================  Qoute Services (Start) ======================

// /vendor_send_qoute -> Vendor Will send a qoute for a order
router.post(
  "/vendor_send_qoute",
  body("amount").isString().withMessage("amount must be string"),
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
  // Check User Type
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make bilty request !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make bilty request !`,
        });
        break;
    }
  },
  // Check Vendor
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("vendors")
      .child(params.vendor.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          console.log('vendor checked !')
          next()

          // if(vendor.registration_step === 2){

          // } else {
          //   res.json({
          //     status:false,
          //     error: "Please Complete Your Registration First !"
          //   })
          // }
        } else {
          res.json({
            status: false,
            error: "Vendor did not exists !",
          });
        }
      })
  },
  // Check Request 
  (req, res, next) => {
    const params = req.body;
    if (params.orderNo) {
      pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
        if (snapshot.val()) {
          const request = snapshot.val();
          if (request.request_type == "upcountry") {
            res.json({
              status: false,
              error: "Please, provide a valid subOrderNo for upcountry!",
            });
          } else {
            if (request.status !== "cancelled") {
              req.body.request = request;
              next();
            } else {
              res.json({
                status: false,
                error: `This Order Is Cancelled By ${request.cancel_by}`
              })
            }
          }
        } else {
          res.json({
            status: false,
            error: "Request not found !",
          });
        }
      });
    } else if (params.subOrderNo) {
      let getLength = params.subOrderNo.length;
      const getOrderNo = params.subOrderNo.slice(2, (getLength - 1));

      pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
        if (snapshot.val()) {
          const request = snapshot.val();
          if (request.status !== "cancelled") {
            req.body.request = request;
            next();
          } else {
            res.json({
              status: false,
              error: `This Order Is Cancelled By ${request.cancel_by}`
            })
          }

        } else {
          res.json({
            status: false,
            error: "Request not found !",
          });
        }
      });

    } else {
      res.json({
        status: false,
        error: "Please Give orderNo / subOrderNo"
      })
    }

  },
  // Check Qoute Bid Existance
  (req, res, next) => {
    const params = req.body;

    if (params.orderNo) {

      pplBiddingsRef
        .child(params.request.request_type)
        .child("qoutes")
        .orderByChild("orderNo")
        .equalTo(params.request.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const rawqoutes = snapshot.val();
            const qoutes = [];
            const convert = Object.entries(rawqoutes);

            convert.forEach((x) => {
              qoutes.push(x[1])
            })

            const filterByPhone = qoutes.filter((q) => {
              return q.phone === params.vendor.phone
            })

            console.log('filterByPhone -> ', filterByPhone)

            if (filterByPhone) {
              if (filterByPhone.length !== 0) {
                res.json({
                  status: false,
                  error: "Vendor Already Sent Qoute On This Order !"
                })
              } else {
                next()
              }
            }
          } else {
            next();
          }
        });
    } else if (params.subOrderNo) {

      pplBiddingsRef
        .child(params.request.request_type)
        .child("qoutes")
        .orderByChild("subOrderNo")
        .equalTo(params.subOrderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const rawqoutes = snapshot.val();
            const qoutes = [];
            const convert = Object.entries(rawqoutes);

            convert.forEach((x) => {
              qoutes.push(x[1])
            })

            const filterByPhone = qoutes.filter((q) => {
              return q.phone === params.vendor.phone
            })

            console.log('filterByPhone -> ', filterByPhone)

            if (filterByPhone) {
              if (filterByPhone.length !== 0) {
                res.json({
                  status: false,
                  error: "Vendor Already Sent Qoute On This Order !"
                })
              } else {
                next()
              }
            }
          } else {
            next();
          }
        });
    } else {
      res.json({
        status: false,
        error: "Please, provide orderNo for transit, and subOrderNo for upcountry!"
      });
    }
  },
  // Check ID
  (req, res, next) => {
    pplBiddingsRef
      .child(req.body.request.request_type)
      .child("qoutes")
      .limitToLast(1)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          req.body.id = (parseInt(Object.entries(snapshot.val())[0][1].id) + 1);
          next();
        } else {
          req.body.id = 1;
          next();
        }
      });
  },
  // Create A Qoute Bid
  (req, res, next) => {
    const params = req.body;

    const newVendorQoute = pplBiddingsRef
      .child(params.request.request_type)
      .child("qoutes")
      .push();
    const qouteKey = newVendorQoute.key;

    if (params.request.request_type == "upcountry") {
      const subOrders = params.request.subOrders;

      const getBySuborder = subOrders.filter((suborder) => {
        return suborder.subOrderNo === params.subOrderNo
      })

      if (getBySuborder) {
        if (getBySuborder.length !== 0) {
          console.log('getBySuborder -> ', getBySuborder);
          // getBySuborder[0].subOrderNo = null;

          // console.log('getBySuborder[0].quantity -> ', getBySuborder[0].quantity);

          newVendorQoute
            .set({
              nature: "Qoute",
              qouteId: qouteKey,
              phone: params.vendor.phone || null,
              vendor_name: params.vendor.company_name,
              id: params.id || null,
              orderNo: params.request.orderNo || null,
              subOrderNo: params.subOrderNo || null,
              user_phone: params.request.user_phone || null,
              qoute_amount: params.amount || null,
              qoutedAt: moment()
                .tz("Asia/Karachi")
                .format("MMMM Do YYYY, h:mm:ss a") || null,
              status: "pending" || null,
              subOrder: getBySuborder[0],
              biltyQuantity: getBySuborder[0].vehicle_quantity || null,
              date: params.request.date,
              desLat: params.request.desLat,
              desLng: params.request.desLng,
              disText: params.request.disText,
              durText: params.request.durText || null,
              orgLat: params.request.orgLat,
              orgLng: params.request.orgLng,
              originAddress: params.request.originAddress || null,
              destinationAddress: params.request.destinationAddress || null,
              containerReturnAddress: params.request.containerReturnAddress || null,
              type: "upcountry",
            })
            .then(() => {
              res.json({
                status: true,
                message: "Qoute Submitted !",
              });
            })
            .catch((error) => {
              res.json({
                status: false,
                error: error.message,
              });
            });
        }
      } else {
        res.json({
          status: false,
          error: "Unknown Error ! "
        })
      }


    } else {

      newVendorQoute
        .set({
          nature: "Qoute",
          phone: params.vendor.phone || null,
          vendor_name: params.vendor.company_name,
          user_phone: params.request.user_phone || null,
          qouteId: qouteKey || null,
          orderNo: params.request.orderNo || null,
          qoute_amount: params.amount || null,
          qoutedAt: moment()
            .tz("Asia/Karachi")
            .format("MMMM Do YYYY, h:mm:ss a") || null,
          status: "pending" || null,
          type: "transit" || null,
          biltyQuantity: params.request.bilty.length || null,
          bilties: params.request.bilty,
          date: params.request.date,
          desLat: params.request.desLat,
          desLng: params.request.desLng,
          disText: params.request.disText,
          durText: params.request.durText,
          orgLat: params.request.orgLat,
          orgLng: params.request.orgLng,
          originAddress: params.request.originAddress || null,
          destinationAddress: params.request.destinationAddress || null,
          containerReturnAddress: params.request.containerReturnAddress || null,
        })
        .then(() => {
          res.json({
            status: true,
            message: "Qoute Submitted !",
          });
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
    }
  }
);

// /get_best_vendor_qoutes -> User Will get a qoute for lowest price
router.post(
  "/get_best_vendor_qoutes",
  body("orderNo").isString().withMessage("orderNo must be string"),
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
          error: `${params.user.user_type} cannot get best qoutes !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot get best qoutes!`,
        });
        break;
    }
  },
  // Check Request
  (req, res, next) => {
    const params = req.body;
    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();
        if (request.status !== "cancelled") {
          req.body.request = request;
          next();
        } else {
          res.json({
            status: false,
            error: `This Order Is Cancelled By ${request.cancel_by}`
          })
        }
      } else {
        res.json({
          status: false,
          error: "PPL Request not found !",
        });
      }
    });
  },
  // Check Qoute Bid Existance
  (req, res, next) => {
    const params = req.body;

    if (params.request.request_type === 'transit') {
      pplBiddingsRef
        .child(params.request.request_type)
        .child("qoutes")
        .orderByChild("orderNo")
        .equalTo(params.request.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const rawqoutes = snapshot.val();
            const convert = Object.entries(rawqoutes);
            const qoutes = [];

            convert.forEach((x) => {
              qoutes.push(x[1]);
            });

            const pendingQoutes = qoutes.filter((q) => {
              return q.status === "pending";
            });

            console.log("pendingQoutes -> ", pendingQoutes);

            if (pendingQoutes.length == 0) {
              console.log("Emtpy -> ", pendingQoutes);
            } else {
              // Calculate Lowest Price
              const orderedQoutes = _.orderBy(
                pendingQoutes,
                (qoute) => qoute.qoute_amount
              );

              if (orderedQoutes) {
                if (orderedQoutes.length !== 0) {
                  res.json({
                    status: true,
                    data: orderedQoutes[0]
                  });
                } else {
                  res.json({
                    status: true,
                    data: [],
                    message: "No Vendor Qouted On This Order !"
                  });
                }
              }


            }
          } else {
            res.json({
              status: false,
              error: "No Qoutes Found On This Order !",
            });
          }
        });
    } else {
      pplBiddingsRef
        .child(params.request.request_type)
        .child("qoutes")
        .orderByChild("orderNo")
        .equalTo(params.request.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const rawqoutes = snapshot.val();
            const convert = Object.entries(rawqoutes);
            const qoutes = [];

            convert.forEach((x) => {
              qoutes.push(x[1]);
            });

            const pendingQoutes = qoutes.filter((q) => {
              return q.status === "pending";
            });

            if (pendingQoutes) {
              if (pendingQoutes.length > 0) {
                // Get All SubOrderNos
                req.body.pendingQoutes = pendingQoutes;
                next();

              } else {
                res.json({
                  status: false,
                  error: "There is no pending qoutes on this order !"
                })
              }
            } else {
              res.json({
                status: false,
                error: "problem in pending qoutes filter  !"
              })
            }


          } else {
            res.json({
              status: false,
              error: "No Qoutes Found On This Order !",
            });
          }
        });

    }
  },
  // Check SubOrders
  (req, res, next) => {
    const params = req.body;

    const suborders = params.request.subOrders;

    const getAllSubOrders = suborders.map((x) => {
      return x.subOrderNo
    })

    let best_qoutes_on_suborders = [];


    console.log('params.pendingQoutes->',)

    getAllSubOrders.forEach((suborderno) => {
      // console.log('x -> ',x)
      // params.pendingQoutes.filter((qoute) => {
      //   if(qoute.subOrderNo === suborderno) {
      //     qoute_prices.push(qoute.amount);

      //   }
      // })

      const bestprice = params.pendingQoutes.reduce(function (prev, curr) {
        return prev.amount < curr.amount ? prev : curr;
      });

      if (bestprice.subOrderNo === suborderno) {
        best_qoutes_on_suborders.push(bestprice)
      }

    })


    res.json({
      status: true,
      data: best_qoutes_on_suborders
    })




  }
);

// /request_qoute_again
router.post("/request_qoute_again",
  body("subOrderNo").isString().withMessage("subOrderNo must be string"),
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
          error: `${params.user.user_type} cannot get best qoutes !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot get best qoutes!`,
        });
        break;
    }
  }

)

// /user_accept_vendor_qoute -> (User accepts the Vendor Qoute & Its Amount)
router.post(
  "/user_accept_vendor_qoute",
  body("vendor_phone").isMobilePhone().withMessage("vendor_phone is not valid"),
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
  // Check User
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          next();
        } else {
          userRef
            .child("pro")
            .child(params.user.user_id)
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
  // Get Request Data
  (req, res, next) => {
    const params = req.body;

    if (params.orderNo) {
      pplRequestRef
        .child(params.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();
            req.body.request = request;
            if (request.status == "pending") {
              console.log("request -> ok ");
              next();
            } else {


              res.json({
                status: false,
                error: `Request has status of ${request.status}`,
              });
            }
          } else {
            res.json({
              status: false,
              error: "No Request data Found !",
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
      if (params.subOrderNo) {
        let getLength = params.subOrderNo.length;
        const getOrderNo = params.subOrderNo.slice(2, (getLength - 1));

        pplRequestRef
          .child(getOrderNo)
          .once("value", (snapshot) => {
            if (snapshot.val()) {
              const request = snapshot.val();
              req.body.request = request;

              if (request.status == "pending") {
                console.log("request -> ok ");
                next();
              } else {
                res.json({
                  status: false,
                  error: `Request has status of ${request.status}`,
                });
              }
            } else {
              res.json({
                status: false,
                error: "No Request data Found !",
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
          error: "Please Provide orderNo for transit / subOrderNo for upcountry !",
        });
      }
    }

  },
  // Check Qoute
  (req, res, next) => {
    const params = req.body;

    if (params.request.request_type === 'transit') {
      pplBiddingsRef
        .child(params.request.request_type)
        .child("qoutes")
        .orderByChild("orderNo")
        .equalTo(params.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const rawqoute = snapshot.val();
            const convert = Object.entries(rawqoute);

            const final = [];
            convert.forEach((x) => {
              final.push(x[1]);
            });

            const filterByPhone = final.filter((q) => {
              return q.phone === params.vendor_phone
            })

            console.log('filterByPhone -> ', filterByPhone)

            if (filterByPhone) {
              if (filterByPhone.length !== 0) {
                const qoute = filterByPhone[0];

                if (qoute.status === "pending") {
                  req.body.qoute = qoute;
                  next();
                } else {
                  res.json({
                    status: false,
                    error: `Your Qoute Was ${qoute.status} Already !`,
                  });
                }
              } else {
                res.json({
                  status: false,
                  error: "Qoute did not exists !",
                });
              }
            }

          } else {
            res.json({
              status: false,
              error: "Qoute did not exists !",
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
      // FOR UPCOUNTRY 

      pplBiddingsRef
        .child(params.request.request_type)
        .child("qoutes")
        .orderByChild("subOrderNo")
        .equalTo(params.subOrderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            snapshot.forEach((snap) => {
              if (snap.val().phone === params.vendor_phone) {
                const filterByPhone = snap.val();
                filterByPhone.qouteId = snap.key;

                const qoute = filterByPhone;

                if (qoute.status === "pending") {
                  req.body.qoute = qoute;
                  next();
                } else {
                  res.json({
                    status: false,
                    error: `Vendor's Qoute Was ${qoute.status} Already !`,
                  });
                }

              } else {
                res.json({
                  status: false,
                  error: "Qoute did not exists !",
                });
              }
            })

          } else {
            res.json({
              status: false,
              error: "Qoute did not exists !",
            });
          }
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
    }


  },
  // Get Vendor
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("vendors")
      .child(params.qoute.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          next();
        } else {
          res.json({
            status: false,
            error: "Vendor Not Found !"
          })
        }
      });
  },
  // Update Qoute
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
      .child(params.request.request_type)
      .child("qoutes")
      .child(params.qoute.qouteId)
      .update({
        status: "accepted",
        accepted_on: moment()
          .tz("Asia/Karachi")
          .format("MMMM Do YYYY, h:mm:ss a"),
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
  },
  // Update Request
  (req, res, next) => {
    const params = req.body;

    switch (params.request.request_type) {
      case "transit":
        pplRequestRef
          .child(params.orderNo)
          .update({
            status: "qoute_accepted",
            qoute_accepted_on: moment()
              .tz("Asia/Karachi")
              .format("MMMM Do YYYY, h:mm:ss a"),
            qoute: params.qoute,
            vendor_phone: params.qoute.phone,
            vendor_name: params.vendor.company_name
          })
          .then(() => {
            res.json({
              status: true,
              message: `User accepted the qoute for ${req.body.qoute.qoute_amount}`,
            });
          })
          .catch((error) => {
            res.json({
              status: false,
              error: error.message,
            });
          });
        break;
      case "upcountry":

        const suborders = params.request.subOrders;

        suborders.forEach((suborder) => {
          if (suborder.subOrderNo === params.subOrderNo) {
            suborder['status'] = "qoute_accepted";
            suborder['qoute_accepted_on'] = moment().tz("Asia/Karachi").format("MMMM Do YYYY, h:mm:ss a"),
              suborder['qoute'] = params.qoute,
              suborder['vendor_phone'] = params.qoute.phone
            suborder['vendor_name'] = params.vendor.company_name
          }
        })

        console.log('Updated Subsorders Object -> ', suborders);


        pplRequestRef
          .child(params.request.orderNo)
          .update({
            subOrders: suborders,
          })
          .then(() => {
            res.json({
              status: true,
              message: "User Accepted Vendor Qoute Successfully !"
            })
          })
          .catch((err) => {
            res.json({
              status: false,
              error: err.message,
            });
          });
        break;
      default:
        res.json({
          status: false,
          error: "Unknown Type !"
        })
        break;
    }
  }
);

// /user_reject_vendor_qoute -> user rejects the best vendor qoute - user => 1x
router.post(
  "/user_reject_vendor_qoute",
  body("vendor_phone").isMobilePhone().withMessage("vendor_phone is not valid"),
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
        console.log('step-1')
        next();
        break;

      case "pro":
        req.body.user = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot reject qoute  !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot reject qoute !`,
        });
        break;
    }
  },
  // Retrieve User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        userRef
          .child("users")
          .child(params.user.user_id)
          .once("value", (snapshot) => {
            if (snapshot.val()) {
              req.body.user = snapshot.val();
              console.log('user type user ')
              next();
            } else {
              userRef
                .child("pro")
                .child(params.user.user_id)
                .once("value", (snapshot) => {
                  if (snapshot.val()) {
                    req.body.user = snapshot.val();
                    console.log('pro type user ')
                    next();
                  } else {
                    res.json({
                      status: false,
                      error: "User Not Found in Database !",
                    });
                  }
                })
            }
          })
        break;

      case "pro":
        userRef
          .child("pro")
          .child(params.user.user_id)
          .once("value", (snapshot) => {
            if (snapshot.val()) {
              req.body.user = snapshot.val();
              next();
            } else {
              res.json({
                status: false,
                error: "User Not Found in Database !",
              });
            }
          })
        break;

      default:
        res.json({
          status: false,
          error: `User Not Found in Database ! ${params.user.type}`,
        });
        break;
    }
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;

    if (params.orderNo) {
      console.log('params.orderNo -> ', params.orderNo)
      pplRequestRef
        .child(params.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();


            if (request.request_type == 'transit') {
              switch (request.status) {
                case "pending":

                  req.body.request = request;
                  next();

                  break;

                case "qoute_accepted":
                  res.json({
                    status: false,
                    error: "You already accepted the qoute !",
                  });
                  break;
                case "qoute_rejected":
                  res.json({
                    status: false,
                    error: "Qoute is already rejected !",
                  });
                  break;
                case "user_counter_accepted":
                  res.json({
                    status: false,
                    error:
                      "Cannot Reject Qoute , You accepted the counter to this qoute !",
                  });

                  break;

                case "user_counter_rejected":
                  res.json({
                    status: false,
                    error:
                      "Cannot Reject Qoute , You rejected the counter to this qoute !",
                  });

                  break;

                case "vendor_counter_accepted":
                  res.json({
                    status: false,
                    error:
                      "Cannot Reject Qoute , Vendor has accepted your counter offer !",
                  });

                  break;

                case "vendor_counter_rejected":
                  res.json({
                    status: false,
                    error:
                      "Cannot Reject Qoute , Vendor has rejected your counter offer !",
                  });

                  break;

                case "accepted":
                  res.json({
                    status: false,
                    error:
                      "Cannot Reject Qoute , Order Has Been Accepted And Placed !",
                  });
                  break;
                case "rejected":
                  res.json({
                    status: false,
                    error:
                      "Cannot Reject Qoute , Order Has Been Rejected Already !",
                  });
                  break;
                case "cancelled":
                  res.json({
                    status: false,
                    error: `This Order Is Cancelled By ${request.cancel_by}`
                  })
                  break;

                default:
                  res.json({
                    status: false,
                    error:
                      "Unknown Request Status !",
                  });
                  break;
              }
            } else {
              res.json({
                status: false,
                error: "Request Type is Upcountry , Please Provide subOrderNo !"
              })
            }
          } else {
            res.json({
              status: false,
              error: "Request Not Found (Transit)!",
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
      if (params.subOrderNo) {

        let getLength = params.subOrderNo.length;
        const getOrderNo = params.subOrderNo.slice(2, (getLength - 1));

        pplRequestRef
          .child(getOrderNo)
          .once("value", (snapshot) => {
            const request = snapshot.val();

            if (request.request_type == 'upcountry') {
              switch (request.status) {
                case "pending":

                  req.body.request = request;
                  next();

                  break;

                case "qoute_accepted":
                  res.json({
                    status: false,
                    error: "You already accepted the qoute !",
                  });
                  break;

                case "qoute_rejected":
                  res.json({
                    status: false,
                    error: "Qoute is already rejected !",
                  });
                  break;

                case "user_counter_accepted":
                  res.json({
                    status: false,
                    error:
                      "Cannot Reject Qoute , You accepted the counter to this qoute !",
                  });

                  break;

                case "user_counter_rejected":
                  res.json({
                    status: false,
                    error:
                      "Cannot Reject Qoute , You rejected the counter to this qoute !",
                  });

                  break;

                case "vendor_counter_accepted":
                  res.json({
                    status: false,
                    error:
                      "Cannot Reject Qoute , Vendor has accepted your counter offer !",
                  });

                  break;

                case "vendor_counter_rejected":
                  res.json({
                    status: false,
                    error:
                      "Cannot Reject Qoute , Vendor has rejected your counter offer !",
                  });

                  break;

                case "accepted":
                  res.json({
                    status: false,
                    error:
                      "Cannot Reject Qoute , Order Has Been Accepted And Placed !",
                  });
                  break;

                case "rejected":
                  res.json({
                    status: false,
                    error:
                      "Cannot Reject Qoute , Order Has Been Rejected Already !",
                  });
                  break;

                default:
                  break;
              }
            } else {
              res.json({
                status: false,
                error: "Request Type is Transit , Please Provide orderNo !"
              })
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
          error: "Please Provide orderNo / subOrderNo to proceed !"
        })
      }
    }

  },
  // Check Qoute
  (req, res, next) => {
    const params = req.body;

    if (params.request.request_type === 'transit') {
      pplBiddingsRef
        .child(params.request.request_type)
        .child("qoutes")
        .orderByChild("orderNo")
        .equalTo(params.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const rawqoute = snapshot.val();
            const convert = Object.entries(rawqoute);

            const final = [];
            convert.forEach((x) => {
              final.push(x[1]);
            });

            const filterByPhone = final.filter((q) => {
              return q.phone === params.vendor_phone
            })

            console.log('filterByPhone -> ', filterByPhone)

            if (filterByPhone) {
              if (filterByPhone.length !== 0) {
                const qoute = filterByPhone[0];

                if (qoute.status === "pending") {
                  req.body.qoute = qoute;
                  next();
                } else {
                  res.json({
                    status: false,
                    error: `Your Qoute Was ${qoute.status} Already !`,
                  });
                }
              } else {
                res.json({
                  status: false,
                  error: "Qoute did not exists !",
                });
              }
            }

          } else {
            res.json({
              status: false,
              error: "Qoute did not exists !",
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
      // FOR UPCOUNTRY 

      pplBiddingsRef
        .child(params.request.request_type)
        .child("qoutes")
        .orderByChild("subOrderNo")
        .equalTo(params.subOrderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            snapshot.forEach((snap) => {
              if (snap.val().phone === params.vendor_phone) {
                const filterByPhone = snap.val();
                filterByPhone.qouteId = snap.key;

                const qoute = filterByPhone;

                if (qoute.status === "pending") {
                  req.body.qoute = qoute;
                  next();
                } else {
                  res.json({
                    status: false,
                    error: `Vendor's Qoute Was ${qoute.status} Already !`,
                  });
                }

              } else {
                res.json({
                  status: false,
                  error: "Qoute did not exists !",
                });
              }
            })

          } else {
            res.json({
              status: false,
              error: "Qoute did not exists !",
            });
          }
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
    }


  },
  // Update Qoute
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
      .child(params.request.request_type)
      .child("qoutes")
      .child(params.qoute.qouteId)
      .update({
        status: "rejected",
        rejected_on: moment()
          .tz("Asia/Karachi")
          .format("MMMM Do YYYY, h:mm:ss a"),
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
  },
  // Update Request
  (req, res) => {
    const params = req.body;

    switch (params.request.request_type) {
      case "transit":
        pplRequestRef
          .child(params.orderNo)
          .update({
            status: "qoute_rejected",
            qoute_rejected_on: moment()
              .tz("Asia/Karachi")
              .format("MMMM Do YYYY, h:mm:ss a"),
            qoute: params.qoute,
            vendor_phone: params.qoute.phone,
            vendor_name: params.qoute.vendor_name
          })
          .then(() => {
            res.json({
              status: true,
              message: `User rejected the qoute for ${req.body.qoute.qoute_amount}`,
            });
          })
          .catch((error) => {
            res.json({
              status: false,
              error: error.message,
            });
          });
        break;

      case "upcountry":
        // let getLength = params.subOrderNo.length;
        // const getOrderNo = params.subOrderNo.slice(2,(getLength - 1));

        const suborders = params.request.subOrders;

        suborders.forEach((suborder) => {
          if (suborder.subOrderNo === params.subOrderNo) {
            suborder['status'] = "qoute_rejected";
            suborder['qoute_rejected_on'] = moment().tz("Asia/Karachi").format("MMMM Do YYYY, h:mm:ss a"),
              suborder['qoute'] = params.qoute,
              suborder['vendor_phone'] = params.qoute.phone
            suborder['vendor_name'] = params.qoute.vendor_name
          }
        })



        pplRequestRef
          .child(params.request.orderNo)
          .update({
            subOrders: suborders,
          })
          .then(() => {
            res.json({
              status: true,
              message: `User rejected the qoute for ${req.body.qoute.qoute_amount}`,
            });
          })
          .catch((err) => {
            res.json({
              status: false,
              error: err.message,
            });
          });
        break;

      default:
        res.json({
          status: false,
          error: "Unknown Type",
        });
        break;
    }
  }
);

// /user_counters_vendor_qoute -> user counters the vendor qoute - user => 1x (first time)
router.post(
  "/user_counters_vendor_qoute",
  body("vendor_phone").isMobilePhone().withMessage("vendor_phone is not valid"),
  body("amount").isString().withMessage("amount must be an string"),
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
  // Retrieve User
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "user":
        userRef
          .child("users")
          .child(params.user.user_id)
          .once("value", (snapshot) => {
            if (snapshot.val()) {
              req.body.user = snapshot.val();
              next();
            } else {
              userRef
                .child("pro")
                .child(params.user.user_id)
                .once("value", (snapshot) => {
                  if (snapshot.val()) {
                    req.body.user = snapshot.val();
                    next();
                  } else {
                    res.json({
                      status: false,
                      error: "User Not Found in Database !",
                    });
                  }
                })
            }
          })
        break;

      case "pro":
        userRef
          .child("pro")
          .child(params.user.user_id)
          .once("value", (snapshot) => {
            if (snapshot.val()) {
              req.body.user = snapshot.val();
              next();
            } else {
              res.json({
                status: false,
                error: "User Not Found in Database !",
              });
            }
          })
        break;

      default:
        res.json({
          status: false,
          error: "User Not Found in Database !",
        });
        break;
    }
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;

    if (params.orderNo) {
      pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
        const request = snapshot.val();

        if (request) {
          req.body.request = request;

          if (request.request_type == 'transit') {
            if (request.status !== "cancelled") {
              req.body.request = request;
              next();
            } else {
              res.json({
                status: false,
                error: `This Order Is Cancelled By ${request.cancel_by}`
              })
            }

          } else {
            res.json({
              status: false,
              error: 'Request Type Upcountry , Requires Only subOrderNo'
            })
          }

        } else {
          res.json({
            status: false,
            error: "Request Data NOt Found !",
          });
        }
      });
    } else {
      if (params.subOrderNo) {

        let getLength = params.subOrderNo.length;
        const getOrderNo = params.subOrderNo.slice(2, (getLength - 1));
        pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
          const request = snapshot.val();

          if (request) {
            req.body.request = request;
            if (request.request_type == "upcountry") {
              if (params.subOrderNo) {
                if (request.status !== "cancelled") {

                  next();
                } else {
                  res.json({
                    status: false,
                    error: `This Order Is Cancelled By ${request.cancel_by}`
                  })
                }


              } else {
                res.json({
                  status: false,
                  error: `Request Type -> ${request.request_type} requires subOrderNo to counter !`,
                });
              }
            } else {
              next();
            }
          } else {
            res.json({
              status: false,
              error: "Request Data NOt Found !",
            });
          }
        });
      } else {
        res.json({
          status: false,
          error: "Please Provide orderNo for transit / subOrderNo for upcountry requests!",
        });
      }
    }
  },
  // Check User Has Countered The Offer Before ?
  (req, res, next) => {
    const params = req.body;

    if (params.request.request_type === 'transit') {
      pplBiddingsRef
        .child(params.request.request_type)
        .child("user_counter")
        .orderByChild("orderNo")
        .equalTo(params.request.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const rawcounter_offers = snapshot.val();
            const convert = Object.entries(rawcounter_offers);
            const counter_offers = [];

            convert.forEach((x) => {
              counter_offers.push(x[1]);
            });

            const checkUserCounterForThisOrder = counter_offers.filter(
              (offer) => {
                return (
                  offer.orderNo === params.orderNo &&
                  offer.vendor_phone === params.vendor_phone
                );
              }
            );

            if (checkUserCounterForThisOrder) {
              if (checkUserCounterForThisOrder.length !== 0) {
                res.json({
                  status: false,
                  error: "User Already Sent Counter Offer On This Qoute",
                });
              } else {
                next();
              }
            }
          } else {
            next();
          }
        });
    } else {
      pplBiddingsRef
        .child(params.request.request_type)
        .child("user_counter")
        .orderByChild("subOrderNo")
        .equalTo(params.subOrderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const rawcounter_offers = snapshot.val();
            const convert = Object.entries(rawcounter_offers);
            const counter_offers = [];

            convert.forEach((x) => {
              counter_offers.push(x[1]);
            });

            const checkUserCounterForThisOrder = counter_offers.filter(
              (offer) => {
                return (
                  offer.orderNo === params.orderNo &&
                  offer.vendor_phone === params.vendor_phone
                );
              }
            );

            if (checkUserCounterForThisOrder) {
              if (checkUserCounterForThisOrder.length !== 0) {
                res.json({
                  status: false,
                  error: "User Already Sent Counter Offer On This Qoute",
                });
              } else {
                next();
              }
            }
          } else {
            next();
          }
        });
    }
  },
  // Check Vendor Qoute
  (req, res, next) => {
    const params = req.body;

    if (params.request.request_type === 'transit') {
      pplBiddingsRef
        .child(params.request.request_type)
        .child("qoutes")
        .orderByChild("orderNo")
        .equalTo(params.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const rawqoute = snapshot.val();
            const convert = Object.entries(rawqoute);

            const final = [];
            convert.forEach((x) => {
              final.push(x[1]);
            });

            const filterByPhone = final.filter((q) => {
              return q.phone === params.vendor_phone
            })

            console.log('filterByPhone -> ', filterByPhone)

            if (filterByPhone) {
              if (filterByPhone.length !== 0) {
                const qoute = filterByPhone[0];

                if (qoute.status === "pending") {
                  req.body.qoute = qoute;
                  next();
                } else {
                  res.json({
                    status: false,
                    error: `Vendor's Qoute Was ${qoute.status} Already !`,
                  });
                }
              } else {
                res.json({
                  status: false,
                  error: "Qoute did not exists !",
                });
              }
            }

          } else {
            res.json({
              status: false,
              error: "Qoute did not exists !",
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
      // FOR UPCOUNTRY 

      pplBiddingsRef
        .child(params.request.request_type)
        .child("qoutes")
        .orderByChild("subOrderNo")
        .equalTo(params.subOrderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            snapshot.forEach((snap) => {
              if (snap.val().phone === params.vendor_phone) {
                const filterByPhone = snap.val();
                filterByPhone.qouteId = snap.key;

                // const rawqoute = snapshot.val();
                // const convert = Object.entries(rawqoute);
                // convert.map((x) => {x[1].qouteId = x[0]})

                // const final = [];
                // convert.forEach((x) => {
                //   console.log("\nQouteId => ",x[1].qouteId,"\n");
                //   final.push(x[1]);
                // });

                // const filterByPhone = final.filter((q) => {
                //   return q.phone === params.vendor_phone
                // })

                // console.log('filterByPhone -> ', filterByPhone)

                const qoute = filterByPhone;

                if (qoute.status === "pending") {

                  req.body.qoute = qoute;
                  next();


                } else {
                  res.json({
                    status: false,
                    error: `Vendor's Qoute Was ${qoute.status} Already !`,
                  });
                }

              } else {
                res.json({
                  status: false,
                  error: "Qoute did not exists !",
                });
              }
            })

          } else {
            res.json({
              status: false,
              error: "Qoute did not exists !",
            });
          }
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
    }
  },
  // Check ID
  (req, res, next) => {
    pplBiddingsRef
      .child(req.body.request.request_type)
      .child("user_counter")
      .limitToLast(1)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          req.body.id = (parseInt(Object.entries(snapshot.val())[0][1].id) + 1);
          next();
        } else {
          req.body.id = 1;
          next();
        }
      });
  },
  // Create A User Counter Offer
  (req, res, next) => {
    // amount
    // vendor_phone

    const params = req.body;
    console.log("On User Counter OFfer ");

    switch (params.request.request_type) {
      case "transit":
        const newUserCounterOffer = pplBiddingsRef
          .child(params.request.request_type)
          .child("user_counter")
          .push();

        const transitCounterOfferKey = newUserCounterOffer.key;
        req.body.counterId = transitCounterOfferKey;

        newUserCounterOffer
          .set({
            nature: "User Counter Offer",
            biltyQuantity: params.request.bilty.length || null,
            bilties: params.request.bilty,
            date: params.request.date,
            desLat: params.request.desLat,
            desLng: params.request.desLng,
            disText: params.request.disText,
            durText: params.request.durText,
            orgLat: params.request.orgLat,
            orgLng: params.request.orgLng,
            originAddress: params.request.originAddress || null,
            destinationAddress: params.request.destinationAddress || null,
            containerReturnAddress: params.request.containerReturnAddress || null,
            orderNo: params.request.orderNo,
            counterId: transitCounterOfferKey,
            qouteId: params.qoute.qouteId,
            amount: params.amount,
            counteredAt: moment()
              .tz("Asia/Karachi")
              .format("MMMM Do YYYY, h:mm:ss a"),
            user_phone: params.user.phone,
            vendor_phone: params.vendor_phone,
            vendor_name: params.qoute.vendor_name,
            status: "pending",
            request_type: params.request.request_type
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
        // Get Suborder
        // const suborders = params.qoute.subOrder;
        // req.body.suborder = suborders;

        const newUpcountryUserCounterOffer = pplBiddingsRef
          .child(params.request.request_type)
          .child("user_counter")
          .push();

        const upcountryCounterOfferKey = newUpcountryUserCounterOffer.key;
        req.body.counterId = upcountryCounterOfferKey;

        newUpcountryUserCounterOffer
          .set({
            nature: "User Counter Offer",
            orderNo: params.request.orderNo,
            subOrderNo: params.subOrderNo,
            subOrder: params.qoute.subOrder,
            id: params.id,
            qouteId: params.qoute.qouteId,
            amount: params.amount,
            counteredAt: moment()
              .tz("Asia/Karachi")
              .format("MMMM Do YYYY, h:mm:ss a"),
            user_phone: params.user.phone,
            vendor_phone: params.vendor_phone,
            vendor_name: params.qoute.vendor_name,
            request_type: "upcountry",
            status: "pending",
            date: params.request.date,
            desLat: params.request.desLat,
            desLng: params.request.desLng,
            disText: params.request.disText,
            durText: params.request.durText,
            orgLat: params.request.orgLat,
            orgLng: params.request.orgLng,
            originAddress: params.request.originAddress || null,
            destinationAddress: params.request.destinationAddress || null,
            containerReturnAddress: params.request.containerReturnAddress || null,
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
        break;

      default:
        break;
    }
  },
  // Update Vendor Qoute
  (req, res) => {
    const params = req.body;

    if (params.request.request_type == "transit") {
      pplBiddingsRef
        .child(params.request.request_type)
        .child("qoutes")
        .child(params.qoute.qouteId)
        .update({
          status: "countered",
          counterId: params.counterId,
          countered_at: moment()
            .tz("Asia/Karachi")
            .format("MMMM Do YYYY, h:mm:ss a"),
        })
        .then(() => {
          res.json({
            status: true,
            message: "User Countered the Offer Successfully",
          });
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
    } else {
      pplBiddingsRef
        .child(params.request.request_type)
        .child("qoutes")
        .child(params.qoute.qouteId)
        .update({
          status: "countered",
          counterId: params.counterId,
          countered_at: moment()
            .tz("Asia/Karachi")
            .format("MMMM Do YYYY, h:mm:ss a"),
          // subOrderNo: params.subOrderNo,
          // subOrder: params.suborder,
        })
        .then(() => {
          res.json({
            status: true,
            message: "User Countered the Offer Successfully",
          });
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
    }
  }
);

// vendor_reject_user_counter_offer -> Vendor Will reject first counter offer by user
router.post(
  "/vendor_reject_counter_offer",
  body("user_phone").isMobilePhone().withMessage("user_phone must be a valid number"),
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
  // Check User Type
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot reject counter offers !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot reject counter offers !`,
        });
        break;
    }
  },
  // Check Request Status
  (req, res, next) => {
    const params = req.body;

    if (params.orderNo) {
      pplRequestRef
        .child(params.orderNo)
        .once("value", (snapshot) => {
          const request = snapshot.val();

          if (request.status == "pending") {
            req.body.request = snapshot.val();
            next();
          } else {
            res.json({
              status: false,
              error: "Request is not pending !",
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
      if (params.subOrderNo) {
        let getLength = params.subOrderNo.length;
        const getOrderNo = params.subOrderNo.slice(2, (getLength - 1));

        pplRequestRef
          .child(getOrderNo)
          .once("value", (snapshot) => {
            if (snapshot.val()) {
              const request = snapshot.val();

              if (request.status == "pending") {
                req.body.request = snapshot.val();
                next();
              } else {
                res.json({
                  status: false,
                  error: "Request is not pending !",
                });
              }
            } else {
              res.json({
                status: false,
                error: "Request not found !",
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
          error: "Please Provide orderNo for transit / subOrderNo for upcountry requests!",
        });

      }
    }
  },
  // Check User Counter Offer
  (req, res, next) => {
    const params = req.body;

    if (params.request.request_type === 'transit') {
      pplBiddingsRef
        .child(params.request.request_type)
        .child("user_counter")
        .orderByChild("orderNo")
        .equalTo(params.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const user_counter = snapshot.val();

            const convert = Object.entries(user_counter);

            const final = [];
            convert.forEach((x) => {
              final.push(x[1]);
            });

            const filter = final.filter(
              (qoute) => qoute.vendor_phone === params.vendor.user_id
            );

            if (filter.length !== 0) {
              if (filter[0].status == "pending") {
                req.body.user_counter = filter[0];
                next();
              } else {
                res.json({
                  status: false,
                  error: `The user_counter Has A Status -> ${filter[0].status}`,
                });
              }
            } else {
              res.json({
                status: false,
                error: "Counter Offer Does Not Contain Your Phone Number",
              });
            }
          } else {
            res.json({
              status: false,
              error: "User Counter Offer did not exists !",
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
      // FOR UPCOUNTRY 

      pplBiddingsRef
        .child(params.request.request_type)
        .child("user_counter")
        .orderByChild("subOrderNo")
        .equalTo(params.subOrderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            snapshot.forEach((snap) => {
              if (snap.val().user_phone === params.user_phone) {
                const filterByPhone = snap.val();
                filterByPhone.counterId = snap.key;

                const user_counter = filterByPhone;

                if (user_counter.status === "pending") {
                  req.body.user_counter = user_counter;
                  next();
                } else {
                  res.json({
                    status: false,
                    error: `Your counter offer was ${user_counter.status} already !`,
                  });
                }

              } else {
                res.json({
                  status: false,
                  error: "Qoute did not exists !",
                });
              }
            })

          } else {
            res.json({
              status: false,
              error: "Qoute did not exists !",
            });
          }
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
    }
  },
  // Update User Counter Offer
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
      .child(params.request.request_type)
      .child("user_counter")
      .child(params.user_counter.counterId)
      .update({
        status: "rejected",
        rejected_on: moment()
          .tz("Asia/Karachi")
          .format("MMMM Do YYYY, h:mm:ss a"),
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
  },
  // Update Request
  (req, res) => {
    const params = req.body;

    if (params.request.request_type === 'transit') {
      pplRequestRef
        .child(params.request.orderNo)
        .update({
          status: "user_counter_rejected",
          user_counter_rejected_on: moment()
            .tz("Asia/Karachi")
            .format("MMMM Do YYYY, h:mm:ss a"),
          user_counter: params.user_counter,
          vendor_phone: params.vendor.user_id,
          vendor_name: params.user_counter.vendor_name
        })
        .then(() => {
          res.json({
            status: true,
            message: `Vendor rejected user counter offer for ${params.user_counter.amount}`,
          });
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
    } else {
      const suborders = params.request.subOrders;

      suborders.forEach((suborder) => {
        if (suborder.subOrderNo === params.subOrderNo) {
          suborder['status'] = "user_counter_rejected";
          suborder['user_counter_rejected_on'] = moment().tz("Asia/Karachi").format("MMMM Do YYYY, h:mm:ss a"),
            suborder['vendor_counter'] = params.user_counter,
            suborder['vendor_phone'] = params.vendor.user_id
          suborder['vendor_name'] = params.user_counter.vendor_name
        }
      })


      pplRequestRef
        .child(params.request.orderNo)
        .update({
          subOrders: suborders,
        })
        .then(() => {
          console.log('Request Updated')
          res.json({
            status: true,
            message: "User Accepted Vendor Counter Offer Successfully !"
          })
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
    }


  }
);

// /vendor_accept_counter_offer -> Vendor Accepts first User Counter Offer
router.post(
  "/vendor_accept_counter_offer",
  body("user_phone")
    .isMobilePhone()
    .withMessage("user_phone must be valid phone number"),
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
  // Check User (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot counter offer !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot counter offer !`,
        });
        break;
    }
  },
  // Get Vendor
  (req, res, next) => {
    const params = req.body;

    userRef.child("vendors").child(params.user.user_id).once('value', (snapshot) => {
      if (snapshot.val()) {
        const vendor = snapshot.val();
        req.body.vendor = vendor;
        next();
      } else {
        res.json({
          status: false,
          error: "Vendor Not Found"
        })
      }
    })
  },
  // Check Request Status
  (req, res, next) => {
    const params = req.body;

    if (params.orderNo) {
      pplRequestRef
        .child(params.orderNo)
        .once("value", (snapshot) => {
          const request = snapshot.val();

          if (request.status == "pending") {
            req.body.request = snapshot.val();
            next();
          } else {
            res.json({
              status: false,
              error: "Request is not pending !",
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
      if (params.subOrderNo) {
        let getLength = params.subOrderNo.length;
        const getOrderNo = params.subOrderNo.slice(2, (getLength - 1));

        pplRequestRef
          .child(getOrderNo)
          .once("value", (snapshot) => {
            if (snapshot.val()) {
              const request = snapshot.val();

              if (request.status == "pending") {
                req.body.request = snapshot.val();
                next();
              } else {
                res.json({
                  status: false,
                  error: "Request is not pending !",
                });
              }
            } else {
              res.json({
                status: false,
                error: "request not found"
              })
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
          error: "Please Provide orderNo for transit / subOrderNo for upcountry requests!",
        });

      }
    }
  },
  // Check User Counter Offer
  (req, res, next) => {
    const params = req.body;

    if (params.request.request_type === 'transit') {
      pplBiddingsRef
        .child(params.request.request_type)
        .child("user_counter")
        .orderByChild("orderNo")
        .equalTo(params.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const user_counter = snapshot.val();

            const convert = Object.entries(user_counter);

            const final = [];
            convert.forEach((x) => {
              final.push(x[1]);
            });

            const filter = final.filter(
              (qoute) => qoute.vendor_phone === params.vendor.phone
            );

            if (filter.length !== 0) {
              if (filter[0].status == "pending") {
                req.body.user_counter = filter[0];
                next();
              } else {
                res.json({
                  status: false,
                  error: `The user_counter Has A Status -> ${filter[0].status}`,
                });
              }
            } else {
              res.json({
                status: false,
                error: "Problem In user_counter Filter",
              });
            }
          } else {
            res.json({
              status: false,
              error: "user_counter did not exists !",
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
      // FOR UPCOUNTRY 

      pplBiddingsRef
        .child(params.request.request_type)
        .child("user_counter")
        .orderByChild("subOrderNo")
        .equalTo(params.subOrderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            snapshot.forEach((snap) => {
              if (snap.val().user_phone === params.user_phone) {
                const filterByPhone = snap.val();
                filterByPhone.counterId = snap.key;

                const user_counter = filterByPhone;

                if (user_counter.status === "pending") {
                  req.body.user_counter = user_counter;
                  next();
                } else {
                  res.json({
                    status: false,
                    error: `Your counter offer was ${user_counter.status} already !`,
                  });
                }

              } else {
                res.json({
                  status: false,
                  error: "Qoute did not exists !",
                });
              }
            })

          } else {
            res.json({
              status: false,
              error: "Qoute did not exists !",
            });
          }
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
    }
  },
  // Update User Counter Offer
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
      .child(params.request.request_type)
      .child("user_counter")
      .child(params.user_counter.counterId)
      .update({
        status: "accepted",
        accepted_on: moment()
          .tz("Asia/Karachi")
          .format("MMMM Do YYYY, h:mm:ss a"),
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
  },
  // Update Request
  (req, res, next) => {
    const params = req.body;

    if (params.request.request_type === 'transit') {
      pplRequestRef
        .child(params.request.orderNo)
        .update({
          status: "user_counter_accepted",
          user_counter: params.user_counter,
          user_counter_accepted_on: moment()
            .tz("Asia/Karachi")
            .format("MMMM Do YYYY, h:mm:ss a"),
          vendor_phone: params.vendor.phone,
          vendor_name: params.vendor.company_name
        })
        .then(() => {
          res.json({
            status: true,
            message: `Vendor accepted user counter offer of amount ${params.user_counter.amount}`,
            data: params.user_counter,
          });
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });

    } else {
      const suborders = params.request.subOrders;

      suborders.forEach((suborder) => {
        if (suborder.subOrderNo === params.subOrderNo) {
          suborder['status'] = "user_counter_accepted";
          suborder['user_counter_accepted_on'] = moment().tz("Asia/Karachi").format("MMMM Do YYYY, h:mm:ss a"),
            suborder['user_counter'] = params.user_counter,
            suborder['vendor_phone'] = params.vendor.phone
          suborder['vendor_name'] = params.vendor.company_name
        }
      })


      pplRequestRef
        .child(params.request.orderNo)
        .update({
          subOrders: suborders,
        })
        .then(() => {
          console.log('Request Updated')
          res.json({
            status: true,
            message: `Vendor accepted user counter offer of amount ${params.user_counter.amount}`,
            data: params.user_counter,
          });
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
    }


  }
);

// /vendor_counters_user_counter_offer -> Vendor Counters The User Counter Offer
router.post(
  "/vendor_counters_user_counter_offer",
  body("amount").isString().withMessage("amount must be a string"),
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
  // Check User (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot counter user counter offer !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot counter user counter offer !`,
        });
        break;
    }
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;

    if (params.orderNo) {
      pplRequestRef
        .child(params.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();
            if (request.status == "pending") {
              req.body.request = request;
              next();
            } else {
              res.json({
                status: false,
                error: `Request has status of ${request.status}`,
              });
            }
          } else {
            res.json({
              status: false,
              error: "No Request data Found !",
            });
          }
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
    } else if (params.subOrderNo) {

      let getLength = params.subOrderNo.length;
      const getOrderNo = params.subOrderNo.slice(2, (getLength - 1));

      pplRequestRef
        .child(getOrderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();
            if (request.status == "pending") {
              req.body.request = request;
              next();
            } else {
              res.json({
                status: false,
                error: `Request has status of ${request.status}`,
              });
            }
          } else {
            res.json({
              status: false,
              error: "No Request data Found !",
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
      res.json({
        status: false,
        error: "Please Provide orderNo / subOrderNo",
      });
    }
  },
  // Check Vendor Counter Offer
  (req, res, next) => {
    const params = req.body;

    if (params.request.request_type === 'transit') {
      pplBiddingsRef
        .child(params.request.request_type)
        .child("vendor_counter")
        .orderByChild("orderNo")
        .equalTo(params.request.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const vendor_counter = snapshot.val();

            const convert = Object.entries(vendor_counter);

            const final = [];
            convert.forEach((x) => {
              final.push(x[1]);
            });

            const filter = final.filter(
              (offer) =>
                offer.vendor_phone === params.user.user_id
            );

            console.log("filter -> ", filter);

            if (filter && filter.length !== 0) {
              if (filter[0].status == "pending") {
                req.body.vendor_counter = filter[0];
                next();
              } else {
                res.json({
                  status: false,
                  error: `The vendor_counter Has A Status -> ${filter[0].status}`,
                });
              }
            } else {
              res.json({
                status: false,
                error: "Problem In vendor_counter Filter",
              });
            }
          } else {
            next();
          }
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
    }


    if (params.request.request_type === 'upcountry') {
      pplBiddingsRef
        .child(params.request.request_type)
        .child("vendor_counter")
        .orderByChild("subOrderNo")
        .equalTo(params.subOrderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const vendor_counter = snapshot.val();

            const convert = Object.entries(vendor_counter);

            const final = [];
            convert.forEach((x) => {
              final.push(x[1]);
            });

            const filter = final.filter(
              (offer) =>
                offer.vendor_phone === params.vendor.user_id
            );

            console.log("filter -> ", filter);

            if (filter && filter.length !== 0) {
              if (filter[0].status == "pending") {
                req.body.vendor_counter = filter[0];
                next();
              } else {
                res.json({
                  status: false,
                  error: `The vendor_counter Has A Status -> ${filter[0].status}`,
                });
              }
            } else {
              res.json({
                status: false,
                error: "Problem In vendor_counter Filter",
              });
            }
          } else {
            next();
          }
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
    }
  },
  // Check User Counter Offer
  (req, res, next) => {
    const params = req.body;


    if (params.request.request_type === 'transit') {
      pplBiddingsRef
        .child(params.request.request_type)
        .child("user_counter")
        .orderByChild("orderNo")
        .equalTo(params.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const user_counter = snapshot.val();

            const convert = Object.entries(user_counter);

            const final = [];
            convert.forEach((x) => {
              final.push(x[1]);
            });

            const filter = final.filter(
              (offer) =>
                offer.vendor_phone === params.user.user_id &&
                offer.orderNo === params.orderNo
            );


            if (filter.length !== 0 && filter.length < 2) {
              if (filter[0].status == "pending") {
                req.body.user_counter = filter[0];
                next();
              } else {
                res.json({
                  status: false,
                  error: `The user_counter Has A Status -> ${filter[0].status}`,
                });
              }
            } else {
              res.json({
                status: false,
                error: "Problem In user_counter Filter",
              });
            }
          } else {
            res.json({
              status: false,
              error: "user_counter did not exists !",
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
      // FOR UPCOUNTRY 

      pplBiddingsRef
        .child(params.request.request_type)
        .child("user_counter")
        .orderByChild("subOrderNo")
        .equalTo(params.subOrderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            snapshot.forEach((snap) => {
              if (snap.val().user_phone === params.request.user_phone) {
                const filterByPhone = snap.val();
                filterByPhone.counterId = snap.key;

                const user_counter = filterByPhone;

                // console.log('user_counter -> ',user_counter);

                if (user_counter.status === "pending") {
                  req.body.user_counter = user_counter;
                  next();
                } else {
                  res.json({
                    status: false,
                    error: `Your counter offer was ${user_counter.status} already !`,
                  });
                }

              } else {
                res.json({
                  status: false,
                  error: "Qoute did not exists !",
                });
              }
            })

          } else {
            res.json({
              status: false,
              error: "Qoute did not exists !",
            });
          }
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
    }
  },
  // Check ID
  (req, res, next) => {
    pplBiddingsRef
      .child(req.body.request.request_type)
      .child("vendor_counter")
      .limitToLast(1)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          req.body.id = (parseInt(Object.entries(snapshot.val())[0][1].id) + 1);
          next();
        } else {
          req.body.id = 1;
          next();
        }
      });
  },
  // Create Vendor Counter Offer
  (req, res, next) => {
    const params = req.body;

    switch (params.request.request_type) {
      case "transit":
        const newVendorCounterOffer = pplBiddingsRef
          .child(params.request.request_type)
          .child("vendor_counter")
          .push();
        const offerKey = newVendorCounterOffer.key;
        req.body.vendorCounterId = offerKey;

        newVendorCounterOffer
          .set({
            nature: "Vendor Counter Offer",
            orderNo: params.orderNo,
            qouteId: params.user_counter.qouteId,
            userCounterId: params.user_counter.counterId,
            vendorCounterId: offerKey,
            vendor_phone: params.user.user_id,
            vendor_name: params.user_counter.vendor_name,
            type: "upcountry",
            user_phone: params.user_counter.user_phone,
            vendor_countered_on: moment()
              .tz("Asia/Karachi")
              .format("MMMM Do YYYY, h:mm:ss a"),
            amount: params.amount,
            status: "pending",
            biltyQuantity: params.request.bilty.length,
            bilties: params.request.bilty,
            date: params.request.date,
            desLat: params.request.desLat,
            desLng: params.request.desLng,
            disText: params.request.disText,
            durText: params.request.durText,
            orgLat: params.request.orgLat,
            orgLng: params.request.orgLng,
            originAddress: params.request.originAddress || null,
            destinationAddress: params.request.destinationAddress || null,
            containerReturnAddress: params.request.containerReturnAddress || null,
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
        break;
      case "upcountry":
        const newUpcountryVendorCounterOffer = pplBiddingsRef
          .child(params.request.request_type)
          .child("vendor_counter")
          .push();
        const upcountryOfferKey = newUpcountryVendorCounterOffer.key;
        req.body.vendorCounterId = upcountryOfferKey;

        let getLength = params.subOrderNo.length;
        const getOrderNo = params.subOrderNo.slice(2, (getLength - 1));


        newUpcountryVendorCounterOffer
          .set({
            nature: "Vendor Counter Offer",
            id: params.id,
            orderNo: getOrderNo,
            subOrderNo: params.subOrderNo,
            subOrder: params.user_counter.subOrder,
            qouteId: params.user_counter.qouteId,
            userCounterId: params.user_counter.counterId,
            vendorCounterId: upcountryOfferKey,
            vendor_phone: params.vendor.user_id,
            vendor_name: params.user_counter.vendor_name,
            type: "upcountry",
            user_phone: params.user_counter.user_phone,
            vendor_countered_on: moment()
              .tz("Asia/Karachi")
              .format("MMMM Do YYYY, h:mm:ss a"),
            amount: params.amount,
            status: "pending",
            date: params.request.date,
            desLat: params.request.desLat,
            desLng: params.request.desLng,
            disText: params.request.disText,
            durText: params.request.durText,
            orgLat: params.request.orgLat,
            orgLng: params.request.orgLng,
            originAddress: params.request.originAddress || null,
            destinationAddress: params.request.destinationAddress || null,
            containerReturnAddress: params.request.containerReturnAddress || null,

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

        break;
      default:
        break;
    }
  },
  // Update User Counter Offer Status And Request Phase
  (req, res, next) => {
    const params = req.body;
    pplBiddingsRef
      .child(params.request.request_type)
      .child("user_counter")
      .child(params.user_counter.counterId)
      .update({
        status: "countered",
        vendorCounteredAt: moment()
          .tz("Asia/Karachi")
          .format("MMMM Do YYYY, h:mm:ss a"),
      })
      .then(() => {
        res.json({
          status: true,
          message: "Vendor Countered User Counter Offer Successfully !",
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);

// /user_accept_vendor_counter_offer -> user accepts vendor counter offer
router.post(
  "/user_accept_vendor_counter_offer",
  body("vendor_phone").isMobilePhone().withMessage("vendor_phone is not valid"),
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
  // Check User
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          next();
        } else {
          userRef
            .child("pro")
            .child(params.user.user_id)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                req.body.user = user;
                next();
              } else {
                res.json({
                  status: false,
                  error: "User Not Found in Database !",
                });
              }
            });
        }
      });
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;

    if (params.orderNo) {
      pplRequestRef
        .child(params.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();
            if (request.status == "pending") {
              req.body.request = request;
              next();
            } else {
              res.json({
                status: false,
                error: `Request has status of ${request.status}`,
              });
            }
          } else {
            res.json({
              status: false,
              error: "No Request data Found !",
            });
          }
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
    } else if (params.subOrderNo) {
      const getOrderNo = params.subOrderNo.slice(2, (params.subOrderNo.length - 1));

      pplRequestRef
        .child(getOrderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();
            if (request.status == "pending") {
              req.body.request = request;
              console.log('request -> ', request)
              next();
            } else {
              res.json({
                status: false,
                error: `Request has status of ${request.status}`,
              });
            }
          } else {
            res.json({
              status: false,
              error: "No Request data Found !",
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
        error: "Please Provide orderNo / subOrderNo"
      })
    }
  },
  // Check Vendor Counter Offer
  (req, res, next) => {
    // orderNo
    // User phone
    // Vendor Phone
    const params = req.body;



    if (params.request.request_type === 'transit') {
      pplBiddingsRef
        .child(params.request.request_type)
        .child("vendor_counter")
        .orderByChild("orderNo")
        .equalTo(params.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const vendor_counter = snapshot.val();

            const convert = Object.entries(vendor_counter);

            const final = [];
            convert.forEach((x) => {
              final.push(x[1]);
            });

            const filter = final.filter(
              (counter) => counter.vendor_phone === params.vendor_phone
            );

            if (filter.length !== 0 && filter.length < 2) {

              if (
                filter[0].status === "pending"
              ) {
                req.body.vendor_counter = filter[0];
                next();
              } else {
                res.json({
                  status: false,
                  error: `The Vendor Counter Has A Status -> ${filter[0].status}`,
                });
              }
            } else {
              res.json({
                status: false,
                error: "Problem In Vendor Counter Filter",
              });
            }
          } else {
            res.json({
              status: false,
              error: "Vendor Counter did not exists !",
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

    if (params.request.request_type === 'upcountry') {

      pplBiddingsRef
        .child(params.request.request_type)
        .child("vendor_counter")
        .orderByChild("subOrderNo")
        .equalTo(params.subOrderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            snapshot.forEach((snap) => {
              if (snap.val().vendor_phone === params.vendor_phone) {
                const filterByPhone = snap.val();
                req.body.vendorCounterId = snap.key;

                const vendor_counter = filterByPhone;

                if (vendor_counter.status === "pending") {
                  req.body.vendor_counter = vendor_counter;
                  next();
                } else {
                  res.json({
                    status: false,
                    error: `Your counter offer was ${vendor_counter.status} already !`,
                  });
                }

              } else {
                res.json({
                  status: false,
                  error: "Counter Offer did not exists !",
                });
              }
            })

          } else {
            res.json({
              status: false,
              error: "Counter Offer did not exists !",
            });
          }
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });


    }
  },
  // Update Vendor Counter Offer
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
      .child(params.request.request_type)
      .child("vendor_counter")
      .child(params.vendor_counter.vendorCounterId)
      .update({
        status: "accepted",
        accepted_on: moment()
          .tz("Asia/Karachi")
          .format("MMMM Do YYYY, h:mm:ss a"),
      }).then(() => {
        console.log('Vendor Counter Updated')
        next()
      }).catch((err) => {
        res.json({
          status: false,
          error: err.message
        })
      })
  },
  // Update Request
  (req, res, next) => {
    const params = req.body;

    if (params.request.request_type === 'transit') {
      pplRequestRef
        .child(params.orderNo)
        .update({
          status: "vendor_counter_accepted",
          vendor_phone: params.vendor_counter.vendor_phone,
          vendor_name: params.vendor_counter.vendor_name,
          vendor_counter: params.vendor_counter,
          vendor_counter_accepted_on: moment()
            .tz("Asia/Karachi")
            .format("MMMM Do YYYY, h:mm:ss a"),
        })
        .then(() => {
          res.json({
            status: true,
            message: `User accepted the vendor counter offer for ${params.vendor_counter.amount}`,
          });
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
    }


    if (params.request.request_type === 'upcountry') {
      // let getLength = params.subOrderNo.length;
      // const getOrderNo = params.subOrderNo.slice(2,(getLength - 1));

      const suborders = params.request.subOrders;

      suborders.forEach((suborder) => {
        if (suborder.subOrderNo === params.subOrderNo) {
          suborder['status'] = "vendor_counter_accepted";
          suborder['vendor_counter_accepted_on'] = moment().tz("Asia/Karachi").format("MMMM Do YYYY, h:mm:ss a"),
            suborder['vendor_counter'] = params.vendor_counter,
            suborder['vendor_phone'] = params.vendor_phone
          suborder['vendor_name'] = params.vendor_counter.vendor_name
        }
      })


      pplRequestRef
        .child(params.request.orderNo)
        .update({
          subOrders: suborders,
        })
        .then(() => {
          console.log('Request Updated')
          res.json({
            status: true,
            message: "User Accepted Vendor Counter Offer Successfully !"
          })
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
    }

  }
);

// /user_reject_vendor_counter_offer -> user rejects vendor counter offer (No Penalty)
router.post(
  "/user_reject_vendor_counter_offer",
  body("vendor_phone").isMobilePhone().withMessage("vendor_phone is not valid"),
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
  // Check User
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          next();
        } else {
          userRef
            .child("pro")
            .child(params.user.user_id)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                req.body.user = user;
                next();
              } else {
                res.json({
                  status: false,
                  error: "User Not Found in Database !",
                });
              }
            });
        }
      });
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;

    if (params.orderNo) {
      pplRequestRef
        .child(params.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();
            if (request.status == "pending") {
              req.body.request = request;
              next();
            } else {
              res.json({
                status: false,
                error: `Request has status of ${request.status}`,
              });
            }
          } else {
            res.json({
              status: false,
              error: "No Request data Found !",
            });
          }
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
    } else if (params.subOrderNo) {
      let getLength = params.subOrderNo.length;
      const getOrderNo = params.subOrderNo.slice(2, (getLength - 1));

      pplRequestRef
        .child(getOrderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const request = snapshot.val();
            if (request.status == "pending") {
              req.body.request = request;
              next();
            } else {
              res.json({
                status: false,
                error: `Request has status of ${request.status}`,
              });
            }
          } else {
            res.json({
              status: false,
              error: "No Request data Found !",
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
        error: "Please Provide orderNo / subOrderNo"
      })
    }
  },
  // Check Vendor Counter Offer
  (req, res, next) => {
    // orderNo
    // User phone
    // Vendor Phone
    const params = req.body;

    if (params.request.request_type === 'transit') {
      pplBiddingsRef
        .child(params.request.request_type)
        .child("vendor_counter")
        .orderByChild("orderNo")
        .equalTo(params.orderNo)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const vendor_counter = snapshot.val();

            const convert = Object.entries(vendor_counter);

            const final = [];
            convert.forEach((x) => {
              final.push(x[1]);
            });

            const filter = final.filter(
              (counter) => counter.vendor_phone === params.vendor_phone
            );

            if (filter.length !== 0 && filter.length < 2) {
              console.log("ok !");
              if (
                filter[0].status !== "rejected" &&
                filter[0].status !== "accepted"
              ) {
                req.body.vendor_counter = filter[0];
                next();
              } else {
                res.json({
                  status: false,
                  error: `The Vendor Counter Has A Status -> ${filter[0].status}`,
                });
              }
            } else {
              res.json({
                status: false,
                error: "Problem In Vendor Counter Filter",
              });
            }
          } else {
            res.json({
              status: false,
              error: "Vendor Counter did not exists !",
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

    if (params.request.request_type === 'upcountry') {
      res.json({
        status: false,
        error: "Working ON it"
      })
    }
  },
  // Update Vendor Counter Offer
  (req, res, next) => {
    const params = req.body;

    pplBiddingsRef
      .child(params.request.request_type)
      .child("vendor_counter")
      .child(req.body.vendor_counter.vendorCounterId)
      .update({
        status: "rejected",
        rejected_on: moment()
          .tz("Asia/Karachi")
          .format("MMMM Do YYYY, h:mm:ss a"),
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
  },
  // Update Request
  (req, res, next) => {
    const params = req.body;

    if (params.request.request_type === 'transit') {
      pplRequestRef
        .child(params.orderNo)
        .update({
          status: "vendor_counter_rejected",
          vendor_phone: params.vendor_counter.vendor_phone,
          vendor_name: params.vendor_counter.vendor_name,
          vendor_counter: params.vendor_counter,
          vendor_counter_rejected_on: moment()
            .tz("Asia/Karachi")
            .format("MMMM Do YYYY, h:mm:ss a"),
          penalty: false,
        })
        .then(() => {
          res.json({
            status: true,
            message: `User Rejected Vendor Counter Offer for ${params.vendor_counter.amount}`,
          });
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
    }

    if (params.request.request_type === 'upcountry') {
      const suborders = params.request.subOrders;

      suborders.forEach((suborder) => {
        if (suborder.subOrderNo === params.subOrderNo) {
          suborder['status'] = "vendor_counter_rejected";
          suborder['vendor_counter_rejected_on'] = moment().tz("Asia/Karachi").format("MMMM Do YYYY, h:mm:ss a"),
            suborder['vendor_counter'] = params.vendor_counter,
            suborder['vendor_phone'] = params.vendor_counter.vendor_phone
          suborder['vendor_name'] = params.vendor_counter.vendor_name
        }
      })


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
    }
  }
);

// ===================  Qoute Services (Ends) ======================

// ======================  PAYMENT METHOD (start) =========================

// /user_add_payment_method -> User Will Add Payment Method And Make Payment
router.post(
  "/user_add_payment_method",
  body("orderNo").isString().withMessage("orderNo must be string"),
  body("payment_method").isString().withMessage("type must be string"),
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
  // Check Order 
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.child(params.orderNo).once('value', (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();
        if (request.status !== "cancelled") {
          req.body.request = request;
          next();
        } else {
          res.json({
            status: false,
            error: `This Order Is Cancelled By ${request.cancel_by}`
          })
        }
      } else {
        res.json({
          status: false,
          error: "No request found !"
        })
      }
    })
  },
  // If Payment Method Is Card
  (req, res, next) => {
    const params = req.body;

    if (params.payment_method === 'card') {
      pplRequestRef
        .child(params.orderNo)
        .update({
          payment_method: "card",
        })
        .then(() => {
          res.json({
            status: true,
            message: "Payment Method - Credit/Debit Card Added !",
          });
        })
        .catch((error) => {
          res.json({
            status: false,
            error: error.message,
          });
        });
    } else {
      next()
    }
  },
  // If Payment Method Is Credit
  (req, res, next) => {
    const params = req.body;

    if (params.payment_method === 'credit') {
      if (params.user.user_id) {
        userRef
          .child("users")
          .child(params.user.user_id)
          .once("value", (snapshot) => {
            if (snapshot.val()) {
              const user = snapshot.val();


            } else {
              userRef
                .child("pro")
                .child(params.user.phone)
                .once("value", (snapshot) => {
                  if (snapshot.val()) {
                    const user = snapshot.val();

                    if (user.type == 'pro') {
                      // Check User Credit 
                      // Upload Request 
                    } else {
                      res.json({
                        status: false,
                        error: "You are not been promoted to Pro Users .!"
                      })
                    }
                  } else {
                    res.json({
                      status: false,
                      error: "This Facility Is Only For Pro Users !"
                    })
                  }
                });
            }
          });
      } else {
        res.json({
          status: false,
          error: "Phone Not Given !",
        });
      }
    } else {
      next()
    }
  },
  // If Payment Method Is Bank
  (req, res, next) => {
    const params = req.body;

    if (params.payment_method === 'bank') {
      if (params.accountNo) {
        // Check Bank Slip

        if (req.files === undefined) {
          res.json({
            status: false,
            error: 'Please upload transfer slip'
          })
        } else {
          const { files } = req.files;

          if (files.transfer_slip) {
            // Upload Transfer Slip
            pplRequestRef
              .child(params.orderNo)
              .update({
                payment_method: "bank",
                accountNo: params.accountNo,
                bank_transfer_slip_upload: true,
                bank_tranfer_slip: "url",
              })
              .then(() => {
                res.json({
                  status: true,
                  message:
                    "Payment Method - bank transfer method - Updated On Request !",
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
              error: "Please Upload A Bank Transfer Slip",
            });
          }
        }



      } else {
        res.json({
          status: false,
          error: "Please Give Bank Account No !"
        })
      }
    } else {
      next()
    }
  },
  // If Payment Method Is Cash On Delivery
  (req, res) => {
    const params = req.body;

    if (params.payment_method === 'cod') {
      if (params.point_of_payment) {
        switch (params.point_of_payment) {
          case "origin":
            pplRequestRef
              .child(params.orderNo)
              .update({
                payment_method: "cod",
                point_of_payment: params.point_of_payment
              })
              .then(() => {
                res.json({
                  status: true,
                  message:
                    "Payment Method - Cash On Delivery - Updated On Request !",
                });
              })
              .catch((error) => {
                res.json({
                  status: false,
                  error: error.message,
                });
              });
            break;

          case "destination":
            pplRequestRef
              .child(params.orderNo)
              .update({
                payment_method: "cod",
                point_of_payment: params.point_of_payment
              })
              .then(() => {
                res.json({
                  status: true,
                  message:
                    "Payment Method - Cash On Delivery - Updated On Request !",
                });
              })
              .catch((error) => {
                res.json({
                  status: false,
                  error: error.message,
                });
              });
            break;

          default:
            res.json({
              status: false,
              error: "Unknown Point Of Payment",
            });
            break;
        }
      } else {
        res.json({
          status: false,
          error: 'Please give point of payment collection'
        })
      }
    } else {
      res.json({
        status: false,
        error: 'Error ! Invalid Payment Method !'
      })
    }

  }
);

// ======================  PAYMENT METHOD (end) =========================

// ======================  Contact Person Services (Start) =========================

// /user_create_contact_person -> User Will Create A Contact Person Or User Agent
router.post(
  "/user_invites_a_user",
  body("fullname").isString().withMessage("fullname must be an string"),
  body("email").isEmail().withMessage("email must be an valid email"),
  body("phone").isMobilePhone().withMessage("phone is not valid"),
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
        // req.body.user = params.user;
        next();
        break;

      case "pro":
        // req.body.user = params.user;
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
  // Check User Data
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("users")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          console.log("User -> ", req.body.user);
          next();
        } else {
          userRef
            .child("pro")
            .child(params.user.user_id)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                req.body.user = user;
                console.log("User -> ", req.body.user);
                next();
              } else {
                res.json({
                  status: false,
                  error: "No User Found !",
                });
              }
            });
        }
      });
  },
  // Check User Already Invited ?
  (req, res, next) => {
    const params = req.body;

    userRef.child("users").child(params.phone).once('value', (snapshot) => {
      if (snapshot.val()) {
        const user = snapshot.val();

        res.json({
          status: false,
          error: `${user.fullname} already exists !`
        })
      } else {
        userRef.child("pro").child(params.phone).once('value', (snapshot) => {
          if (snapshot.val()) {
            const user = snapshot.val();

            res.json({
              status: false,
              error: `${user.fullname} already exists !`
            })
          } else {
            next()
          }
        })
      }
    })
  },
  // Generate A User 
  (req, res, next) => {
    const params = req.body;
    const newUser = userRef.child("users").push();
    const userId = newUser.key;
    // req.body.agent_password = password;

    userRef
      .child("users")
      .child(params.phone)
      .set({
        referer: params.user.phone,
        id: userId,
        fullname: params.fullname,
        email: params.email,
        phone: params.phone,
        created: moment().tz("Asia/Karachi").format("MMMM Do YYYY, h:mm:ss a"),
        verified: false,
        type: "user",
      })
      .then(() => {
        walletRef
          .child("users")
          .child(params.phone)
          .set({
            amount: "-100",
            type: "cash",
          })
          .then(() => {
            next()
          }).catch((err) => {
            res.json({
              status: false,
              error: err.message,
            });
          })

      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  },
  // Send SMS To User Agent
  (req, res) => {
    const params = req.body;
    // Send SMS To User Agent


    twillio_client.messages.create(
      {
        messagingServiceSid: "MG5d789b427b36967a17122347859e3e7e",
        to: params.phone,
        from: config.twilio.phone,
        body: `You have been invited by ${params.user.fullname} To Meribilty App. Login With Your Phone Number ${params.phone}.`,
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
            message: "User Agent Added !",
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
  }
);

// user_edit_contact_person -> User Will Update A Contact Person Or User Agent
router.post(
  "/user_edit_contact_person",
  body("fullname").isString().withMessage("fullname must be an string"),
  body("email").isEmail().withMessage("email must be an valid email"),
  body("phone").isMobilePhone().withMessage("phone is not valid"),
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
        // req.body.user = params.user;
        next();
        break;

      case "pro":
        // req.body.user = params.user;
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
  // User Data
  (req, res, next) => {
    const params = req.body;
    if (params.user.user_type !== "user_agent") {
      userRef
        .child("users")
        .child(params.user.user_id)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const user = snapshot.val();

            // Check Invited User
            req.body.user = user;
            console.log("User -> ", req.body.user);
            next();
          } else {
            userRef
              .child("pro")
              .child(params.user.user_id)
              .once("value", (snapshot) => {
                if (snapshot.val()) {
                  const user = snapshot.val();
                  req.body.user = user;
                  console.log("User -> ", req.body.user);
                  next();
                } else {
                  res.json({
                    status: false,
                    error: "No User Found !",
                  });
                }
              });
          }
        });
    } else {
      res.json({
        status: false,
        error: "User Agent Cannot Add User Agent/ Clearing Agent",
      });
    }
  },
  // Update A User Agent
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.agent_phone)
      .update({
        agent_for: params.user_phone,
        name: params.fullname,
        email: params.email,
        phone: params.agent_phone,
      })
      .then(() => {
        res.json({
          status: true,
          message: "User agent updated successfully",
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);

// user_remove_contact_person -> User Will Remove A Contact Person Or User Agent
router.post(
  "/user_remove_contact_person",
  body("agent_phone").isMobilePhone().withMessage("agent_phone is not valid"),
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
        // req.body.user = params.user;
        next();
        break;

      case "pro":
        // req.body.user = params.user;
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
  // Get User Data
  (req, res, next) => {
    const params = req.body;
    if (params.user.type !== "user_agent") {
      userRef
        .child("users")
        .child(params.user.user_id)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const user = snapshot.val();
            req.body.user = user;
            console.log("User -> ", req.body.user);
            next();
          } else {
            userRef
              .child("pro")
              .child(params.user.user_id)
              .once("value", (snapshot) => {
                if (snapshot.val()) {
                  const user = snapshot.val();
                  req.body.user = user;
                  console.log("User -> ", req.body.user);
                  next();
                } else {
                  res.json({
                    status: false,
                    error: "No User Found !",
                  });
                }
              });
          }
        });
    } else {
      res.json({
        status: false,
        error: "User Agent Cannot Add User Agent/ Clearing Agent",
      });
    }
  },
  // Check if User Agent Exists ?
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("users")
      .child(params.agent_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const agent = snapshot.val();
          req.body.agent = agent;
          next();
          // console.log("agent -> ", agent);
        } else {
          res.json({
            status: false,
            error: "User Agent Not Found !",
          });
        }
      });
  },
  // Delete A User Agent
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.agent_phone)
      .remove()
      .then(() => {
        res.json({
          status: true,
          message: "User agent updated successfully",
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);

// /user_add_contact_person_to_request
router.post(
  "/user_add_contact_person_to_request",
  body("orderNo").isString().withMessage("orderNo must be an string"),
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
  // Check User 
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          console.log("User -> ", req.body.user);
          next();
        } else {
          userRef
            .child("pro")
            .child(params.user.user_id)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                req.body.user = user;
                console.log("User -> ", req.body.user);
                next();
              } else {
                res.json({
                  status: false,
                  error: "No User Found !",
                });
              }
            });
        }
      });
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();
        req.body.request = request;
        next();
      } else {
        res.json({
          status: false,
          error: "Request not found !",
        });
      }
    });
  },
  // Get Contact Person
  (req, res, next) => {
    const params = req.body;

    if (params.phone) {
      userRef
        .child("users")
        .child(params.phone)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const agent = snapshot.val();
            req.body.agent = agent;

            if (agent.referer) {
              if (agent.referer === params.user.phone) {
                next();
              } else {
                res.json({
                  status: false,
                  error: "This User was not invited by you !",
                });
              }
            }

          } else {
            userRef
              .child("pro")
              .child(params.phone)
              .once("value", (snapshot) => {
                if (snapshot.val()) {
                  const agent = snapshot.val();
                  req.body.agent = agent;

                  if (agent.referer) {
                    if (agent.referer === params.user.phone) {
                      next();
                    } else {
                      res.json({
                        status: false,
                        error: "This User was not invited by you !",
                      });
                    }
                  }

                } else {
                  res.json({
                    status: false,
                    error: "agent not found !",
                  });
                }
              });
          }
        });
    } else {
      next()
    }

  },
  // Add Contact Person To Request
  (req, res) => {
    const params = req.body;

    if (params.phone) {
      pplRequestRef
        .child(params.request.orderNo)
        .child("contact_person")
        .child(params.agent.phone)
        .set({
          name: params.agent.fullname,
          phone: params.agent.phone,
        })
        .then(() => {
          res.json({
            status: true,
            message: "Contact Person Added To Request !",
          });
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
    } else {

      pplRequestRef
        .child(params.request.orderNo)
        .child("contact_person")
        .set("self")
        .then(() => {
          res.json({
            status: true,
            message: "Contact Person Added To Request !",
          });
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });

    }
  }
);

// get all contact persons for user
router.post(
  "/get_contact_persons",
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
  // User Data
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          console.log("User -> ", req.body.user);
          next();
        } else {
          userRef
            .child("pro")
            .child(params.user.user_id)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                req.body.user = user;
                console.log("User -> ", req.body.user);
                next();
              } else {
                res.json({
                  status: false,
                  error: "No User Found !",
                });
              }
            });
        }
      });
  },
  // Check if User Agent Exists ?
  async (req, res, next) => {
    const params = req.body;

    const normalUsersSnap = await userRef.child("users").orderByChild("referer").equalTo(params.user.phone).once("value").catch((err) => res.json({ status: false, error: err.message }))
    const proUsersSnap = await userRef.child("pro").orderByChild("referer").equalTo(params.user.phone).once("value").catch((err) => res.json({ status: false, error: err.message }))

    const rawnormalUsers = await normalUsersSnap.val();
    const rawproUsers = await proUsersSnap.val()

    const normalUsers = [];
    const proUsers = [];



    const convert1 = Object.entries(rawnormalUsers)
    const convert2 = Object.entries(rawproUsers)



    convert1.forEach((x) => {
      normalUsers.push(x[1])
    })

    convert2.forEach((x) => {
      proUsers.push(x[1])
    })

    console.log('params.user.phone -> ', params.user.phone)
    console.log('normalUsers -> ', normalUsers);
    console.log('proUsers -> ', proUsers)


  }
);

// ======================  Contact Person Services (End) =========================


// /order_accept -> (User Accept Order)
router.post(
  "/order_accept",
  body("orderNo").isString().withMessage("orderNo must be string"),
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
  // Check User
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("users")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          console.log('User Data Received');
          next();
        } else {
          userRef
            .child("pro")
            .child(params.user.user_id)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                const user = snapshot.val();
                req.body.user = user;
                console.log('User Data Received');
                next();
              } else {
                res.json({
                  status: false,
                  error: "No User Found !",
                });
              }
            });
        }
      });
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();


        if (request.request_type === 'transit') {
          switch (request.status) {
            case "qoute_accepted":
              req.body.request = request;
              next();
              break;

            case "qoute_rejected":
              res.json({
                status: false,
                error: `Cannot Accept The Order, The Order#${request.orderNo} has a status ${request.status}`,
              });

              break;

            case "user_counter_accepted":
              req.body.request = request;
              console.log('Request Status Checked');
              next();

              break;

            case "user_counter_rejected":
              res.json({
                status: false,
                error: `Cannot Accept The Order, The Order#${request.orderNo} has a status ${request.status}`,
              });
              break;

            case "vendor_counter_accepted":
              req.body.request = request;
              next();

              break;

            case "vendor_counter_rejected":
              res.json({
                status: false,
                error: `Cannot Accept The Order, The Order#${request.orderNo} has a status ${request.status}`,
              });
              break;

            case "accepted":
              res.json({
                status: false,
                error: `Order#${request.orderNo} has been already accepted`,
              });
              break;

            case "rejected":
              res.json({
                status: false,
                error: `Order#${request.orderNo} , cannot accept a already rejected order`,
              });
              break;
            case "cancelled":
              res.json({
                status: false,
                error: `This Order Is Cancelled By ${request.cancel_by}`
              })
              break;


            default:
              res.json({
                status: false,
                error: `Unknown Request Status -> ${request.status}`
              })
              break;
          }
        } else if (request.request_type === 'upcountry') {
          req.body.request = request;
          // Suborder And Bilty Filteration and Status Check
          let statusCheck = true;
          const suborders = request.subOrders;
          // console.log('suborders -> ', suborders)

          suborders.forEach((suborder) => {
            switch (suborder.status) {
              case "pending":
                statusCheck = false;
                break;

              case "qoute_rejected":
                statusCheck = false;
                break;


              case "user_counter_rejected":
                statusCheck = false;
                break;

              case "vendor_counter_rejected":
                statusCheck = false;
                break;

              default:

                break;
            }
          })

          if (!statusCheck) {
            res.json({
              status: false,
              error: `All Suborders must be confirmed first !`
            })
          } else {
            next();
          }
        } else {
          res.json({
            status: false,
            error: "Unknown Request Type !"
          })
        }


      } else {
        res.json({
          status: false,
          message: "Request Not Found !",
        });
      }
    });
  },
  // Check Payment Method
  (req, res, next) => {
    const params = req.body;

    if (params.request.payment_method) {
      switch (params.request.payment_method) {
        case "cod":
          walletRef.child("users").child(params.user.phone).once('value', (snapshot) => {
            if (snapshot.val()) {
              const wallet = snapshot.val();
              const amount = parseInt(wallet.amount);
              const transactions = wallet.transactions ? wallet.transactions : [];

              console.log('amount -> ', amount);
              // console.log('amount type -> ',typeof(amount));

              if (params.request.request_type === 'transit') {
                // Check Accepted Amount By User
                if (params.request.qoute) {
                  const acceptedAmount = params.request.qoute.qoute_amount;
                  console.log('acceptedAmount -> ', acceptedAmount);
                  console.log('acceptedAmount type -> ', typeof (acceptedAmount));

                  const calculate = Math.ceil(amount - acceptedAmount);

                  console.log('Final Calculated Amount -> ', calculate);

                  let transaction = {
                    orderNo: params.request.orderNo,
                    previousBalance: amount,
                    acceptedAmount: acceptedAmount,
                    deductedAmount: acceptedAmount,
                    afterDeduction: calculate,
                    time: Date()
                  }

                  transactions.push(transaction)

                  walletRef.child("users").child(params.user.phone).update({
                    amount: calculate,
                    transactions: transactions
                  }).then(() => {
                    next();
                  }).catch((err) => {
                    res.json({
                      status: false,
                      error: err.message
                    })
                  })
                } else if (params.request.user_counter) {
                  const acceptedAmount = params.request.user_counter.amount;
                  console.log('acceptedAmount -> ', acceptedAmount);
                  console.log('acceptedAmount type -> ', typeof (acceptedAmount));

                  const calculate = Math.ceil(amount - acceptedAmount);

                  console.log('Final Calculated Amount -> ', calculate);

                  let transaction = {
                    orderNo: params.request.orderNo,
                    previousBalance: amount,
                    acceptedAmount: acceptedAmount,
                    deductedAmount: acceptedAmount,
                    afterDeduction: calculate,
                    time: Date()
                  }

                  transactions.push(transaction)

                  walletRef.child("users").child(params.user.phone).update({
                    amount: calculate,
                    transactions: transactions
                  }).then(() => {
                    next();
                  }).catch((err) => {
                    res.json({
                      status: false,
                      error: err.message
                    })
                  })
                } else if (params.request.vendor_counter) {
                  const acceptedAmount = parseInt(params.request.vendor_counter.amount);
                  console.log('acceptedAmount -> ', acceptedAmount);
                  console.log('acceptedAmount type -> ', typeof (acceptedAmount));

                  const calculate = Math.ceil(amount - acceptedAmount);

                  console.log('Final Calculated Amount -> ', calculate);

                  let transaction = {
                    orderNo: params.request.orderNo,
                    previousBalance: amount,
                    acceptedAmount: acceptedAmount,
                    deductedAmount: acceptedAmount,
                    afterDeduction: calculate,
                    time: Date()
                  }

                  transactions.push(transaction)

                  walletRef.child("users").child(params.user.phone).update({
                    amount: calculate,
                    transactions: transactions
                  }).then(() => {
                    next();
                  }).catch((err) => {
                    res.json({
                      status: false,
                      error: err.message
                    })
                  })
                }
              } else if (params.request.request_type === 'upcountry') {
                //  Get All Amounts From Each Suborder
                const suborders = params.request.subOrders;

                let totalamount = 0;

                suborders.forEach((suborder) => {
                  if (suborder.qoute) {
                    const acceptedAmount = parseInt(suborder.qoute.qoute_amount);
                    console.log('acceptedAmount -> ', acceptedAmount);
                    totalamount += acceptedAmount;

                  } else if (suborder.user_counter) {
                    const acceptedAmount = parseInt(suborder.user_counter.amount);
                    console.log('acceptedAmount -> ', acceptedAmount);
                    totalamount += acceptedAmount;

                  } else if (suborder.vendor_counter) {
                    const acceptedAmount = parseInt(suborder.vendor_counter.amount);
                    console.log('acceptedAmount -> ', acceptedAmount);
                    totalamount += acceptedAmount;

                  }
                })

                console.log('Calculated Amount -> ', totalamount);

                const calculate = Math.ceil(amount - totalamount);

                console.log('New wallet amount -> ', calculate);

                let transaction = {
                  orderNo: params.request.orderNo,
                  previousBalance: amount,
                  acceptedAmount: totalamount,
                  deductedAmount: totalamount,
                  afterDeduction: calculate,
                  time: Date()
                }

                transactions.push(transaction);


                walletRef.child("users").child(params.user.phone).update({
                  amount: calculate,
                  transactions
                }).then(() => {
                  next();
                }).catch((err) => {
                  res.json({
                    status: false,
                    error: err.message
                  })
                })
              } else {
                res.json({
                  status: false,
                  error: "Unknown Request Type !"
                })
              }
            } else {
              res.json({
                status: false,
                error: "Wallet Not Found !"
              })
            }
          })
          break;
        case "bank":
          // TODO
          break;
        case "credit":
          // TODO
          walletRef.child("users").child(params.user.phone).once('value', (snapshot) => {
            if (snapshot.val()) {
              const wallet = snapshot.val();
              const amount = parseInt(wallet.amount);

              console.log('amount -> ', amount);
              // console.log('amount type -> ',typeof(amount));

              // Check Accepted Amount By User
              if (params.request.qoute) {
                const acceptedAmount = params.request.qoute.qoute_amount;
                console.log('acceptedAmount -> ', acceptedAmount);
                console.log('acceptedAmount type -> ', typeof (acceptedAmount));
              } else if (params.request.user_counter) {
                const acceptedAmount = params.request.user_counter.amount;
                console.log('acceptedAmount -> ', acceptedAmount);
                console.log('acceptedAmount type -> ', typeof (acceptedAmount));
              } else if (params.request.vendor_counter) {
                const acceptedAmount = parseInt(params.request.vendor_counter.amount);
                console.log('acceptedAmount -> ', acceptedAmount);
                //  console.log('acceptedAmount type -> ',typeof(acceptedAmount));

                const calculate = Math.ceil(amount - acceptedAmount);

                console.log('Calculated Amount -> ', calculate);

                walletRef.child("users").child(params.user.phone).update({
                  amount: calculate
                }).then(() => {
                  next();
                }).catch((err) => {
                  res.json({
                    status: false,
                    error: err.message
                  })
                })
              }
            } else {
              res.json({
                status: false,
                error: "Wallet Not Found !"
              })
            }
          })
          break;
        case "online":
          // TODO
          break;

        default:
          res.json({
            status: false,
            error: "Unknown Payment Method !"
          })
          break;
      }
    } else {
      res.json({
        status: false,
        error: "Payment Method Not Given !",
      });
    }
  },
  // Check Contact Person Attached
  (req, res, next) => {
    const params = req.body;

    if (req.body.request.contact_person) {
      const { request } = req.body;

      if (request.contact_person) {
        const convert = Object.entries(request.contact_person);

        const final = [];
        convert.forEach((x) => {
          final.push(x[1]);
        });

        if (final.length !== 0) {
          console.log("Contact Person Found !");
          next();
        } else {
          res.json({
            status: false,
            message: "Contact Person Not Selected !",
          });
        }
      }
    } else {
      res.json({
        status: false,
        message: "Contact Person Not Selected !",
      });
    }
  },
  // Check Documents Uploaded
  (req, res, next) => {
    const params = req.body;
    if (params.request.documents) {
      next();
    } else {
      next();
    }
  },
  // Generate Bilty (Invoice)
  (req, res, next) => {
    const params = req.body;

    let invoice = {
      cargo_insurance: params.request.cargo_insurance,
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
      status: params.request.status,
      createdAt: params.request.createdAt,
    }

    pplInvoiceRef.child(params.request.orderNo).set(invoice).then(() => {
      next();
    }).catch((err) => {
      res.json({
        status: false,
        error: err.message
      })
    })
  },
  // Update Vendors 
  // (req, res, next) => {
  //   const params = req.body;

  //   if (params.request.request_type === 'transit') {
  //     const vendor_phone = params.request.vendor_phone;

  //     userRef.child("vendors").child(vendor_phone).once('value', (snapshot) => {
  //       if (snapshot.val()) {
  //         const vendor = snapshot.val();

  //         if (vendor.orders) {
  //           const orders = vendor.orders;
  //           orders.push(params.request.orderNo);

  //           userRef.child("vendors").child(vendor.phone).update({
  //             orders: orders
  //           }).then(() => {
  //             next();
  //           }).catch((err) => {
  //             res.json({
  //               status: false,
  //               error: err.message
  //             })
  //           })
  //         } else {
  //           let orders2 = [];
  //           orders2.push(params.request.orderNo);
  //           userRef.child("vendors").child(vendor.phone).update({
  //             orders: orders2
  //           }).then(() => {
  //             next();
  //           }).catch((err) => {
  //             res.json({
  //               status: false,
  //               error: err.message
  //             })
  //           })
  //         }
  //       } else {
  //         res.json({
  //           status: false,
  //           error: "Vendor Not Found !"
  //         })
  //       }
  //     })


  //   }

  //   if (params.request.request_type === 'upcountry') {
  //     const suborders = params.request.subOrder;
  //     let vendor_list = [];

  //     suborders.forEach((suborder) => {
  //       vendor_list.push(suborder.vendor_phone)
  //     })

  //     console.log('vendor_list -> ', vendor_list)

  //     userRef.child("vendors").once('value', (snapshot) => {
  //       if (snapshot.val()) {
  //         const vendors = [];
  //         snapshot.forEach((snap) => {
  //           vendors.push(snap.val())
  //         })

  //         // Filter Out 
  //         const attachedVendors = [];
  //         const filterout = vendors.filter((vendor) => {
  //           if (vendor_list) {
  //             if (vendor_list > 0) {
  //               vendor_list.forEach((phone) => {
  //                 if (vendor.phone === phone) {
  //                   attachedVendors.push(vendor)
  //                 }
  //               })
  //             }
  //           }
  //         })

  //         if (attachedVendors) {
  //           if (attachedVendors.length > 0) {
  //             attachedVendors.forEach((attached) => {
  //               const orders = attached.orders;
  //               if (orders) {
  //                 orders.push(params.request.orderNo);

  //                 userRef.child("vendors").child(attached.phone).update({
  //                   orders: orders
  //                 }).catch((err) => {
  //                   res.json({
  //                     status: false,
  //                     error: err.message
  //                   })
  //                 })
  //               } else {
  //                 let orders2 = [];
  //                 orders2.push(params.request.orderNo);
  //                 userRef.child("vendors").child(attached.phone).update({
  //                   orders: orders2
  //                 }).catch((err) => {
  //                   res.json({
  //                     status: false,
  //                     error: err.message
  //                   })
  //                 })
  //               }
  //             })
  //             console.log('vendors updated upcountry -')
  //             next();
  //           } else {
  //             console.log('error-> attachedvendors')
  //             res.json({
  //               status: false,
  //               error: 'error-> attachedvendors'
  //             })
  //           }
  //         }
  //       } else {
  //         res.json({
  //           status: false,
  //           error: "Vendors Not Found !"
  //         })
  //       }
  //     })
  //   }
  // },
  // Update Request
  (req, res, next) => {
    const params = req.body;
    var orders = [];

    if (params.request.request_type == "transit") {
      userRef
        .child("vendors")
        .child(params.request.vendor_phone)
        .once('value', (snap) => {
          if (snap.val()) {
            if (snap.orders) {
              orders = snap.orders;
            }
            orders.push(params.request.orderNo)

            userRef
              .child("vendors")
              .child(params.request.vendor_phone)
              .update({
                orders: orders
              })
          } else {
            res.json({
              status: false,
              message: "Vendor Not Found !",
            });
          }
        })
    } else if (params.request.request_type == "upcountry") {
      params.request.subOrders.forEach((subOrder) => {
        userRef
          .child("vendors")
          .child(subOrder.vendor_phone)
          .once('value', (snap) => {
            if (snap.val()) {
              if (snap.orders) {
                orders = snap.orders;
              }
              if (!orders.includes(snap.orderNo)) {
                orders.push(params.request.orderNo)
              }

              userRef
                .child("vendors")
                .child(subOrder.vendor_phone)
                .update({
                  orders: orders
                })
            } else {
              res.json({
                status: false,
                message: "Vendor(s) Not Found !",
              });
            }
          })
      })
    }

    pplRequestRef
      .child(params.orderNo)
      .update({
        status: "accepted",
        order_accepted_on: moment()
          .tz("Asia/Karachi")
          .format("MMMM Do YYYY, h:mm:ss a"),
        payment_approval: false
      })
      .then(() => {
        res.json({
          status: true,
          message: `OrderNo#${req.body.request.orderNo} has been accepted !`,
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);

// /order_reject -> (User Reject Order)
router.post(
  "/order_reject",
  body("orderNo").isString().withMessage("orderNo must be string"),
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
  // Check User
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("users")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          console.log("User -> ", req.body.user);
          next();
        } else {
          res.json({
            status: false,
            error: "No User Found !",
          });
        }
      });
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;
    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();
        switch (request.status) {
          case "qoute_accepted":
            req.body.request = request;
            req.body.penalty = false;
            next();
            break;

          case "qoute_rejected":
            req.body.request = request;
            req.body.penalty = false;
            next();

            break;

          case "user_counter_accepted":
            req.body.request = request;
            req.body.penalty = true;
            next();

            break;

          case "user_counter_rejected":
            req.body.request = request;
            req.body.penalty = false;
            next();
            break;

          case "vendor_counter_accepted":
            req.body.request = request;
            req.body.penalty = false;
            next();

            break;

          case "vendor_counter_rejected":
            req.body.request = request;
            req.body.penalty = false;
            next();
            break;

          case "accepted":
            res.json({
              status: false,
              error: `Order#${request.orderNo} has been already accepted`,
            });
            break;

          case "rejected":
            res.json({
              status: false,
              error: `Order#${request.orderNo} , cannot accept a already rejected order`,
            });
            break;

          default:
            res.json({
              status: false,
              error: `Order Cannot be Rejected`,
            });
            break;
        }
      } else {
        res.json({
          status: false,
          message: "Request Not Found !",
        });
      }
    });
  },
  // Update Request
  (req, res, next) => {
    const params = req.body;
    pplRequestRef
      .child(params.orderNo)
      .update({
        status: "rejected",
        penalty: params.penalty,
        order_accepted_on: moment()
          .tz("Asia/Karachi")
          .format("MMMM Do YYYY, h:mm:ss a"),
      })
      .then(() => {
        res.json({
          status: true,
          message: `OrderNo#${req.body.request.orderNo} has been accepted !`,
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);

// /order_reject_2 -> (User Reject Order)
router.post(
  "/order_reject_2",
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
      case "admin":
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
  // Get Request Data
  (req, res) => {
    const params = req.body;

    if (params.orderNo) {
      pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
        if (snapshot.val()) {
          const request = snapshot.val();
          switch (request.status) {
            case "cancelled":
              res.json({
                status: false,
                error: `This Order Is Already Cancelled By ${request.cancel_by}`
              })
              break;

            case "accepted":

              if (request.request_type === 'transit') {
                // Check Bilties 
                const bilties = request.bilty;
                let checkBiltyPendingStatus = false;

                bilties.forEach((bilty) => {
                  if (bilty.status === 'pending') {
                    checkBiltyPendingStatus = true;
                  }
                })

                if (checkBiltyPendingStatus) {
                  // Update Bilties Statuses To Cancelled and Order Status To Cancel
                  const forupdatebilty = request.bilty;
                  forupdatebilty.forEach((bilty) => {
                    bilty['status'] = "cancelled"
                    bilty['bilty_cancelled_on'] = moment()
                      .tz("Asia/Karachi")
                      .format("MMMM Do YYYY, h:mm:ss a")
                  })

                  // console.log('forupdatebilty -> ',forupdatebilty);


                  pplRequestRef.child(request.orderNo).update({
                    bilty: forupdatebilty,
                    status: "cancelled",
                    order_cancelled_on: moment()
                      .tz("Asia/Karachi")
                      .format("MMMM Do YYYY, h:mm:ss a")
                  }).then(() => {
                    res.json({
                      status: true,
                      message: "Order has been cancelled by user !"
                    })
                  }).catch((err) => {
                    res.json({
                      status: false,
                      error: err
                    })
                  })
                } else {
                  res.json({
                    status: false,
                    error: "You Cannot Cancel Order Now , All Bilties are inprocess !"
                  })
                }
              } else {
                // Check Suborders
                res.json({
                  status: false,
                  error: "For Upcountry Request , Give biltyNo instead of orderNo."
                })
              }
              break;


            case "qoute_accepted":
              if (request.request_type === 'transit') {
                // Check Bilties 
                const bilties = request.bilty;
                let checkBiltyPendingStatus = false;

                bilties.forEach((bilty) => {
                  if (bilty.status === 'pending') {
                    checkBiltyPendingStatus = true;
                  }
                })

                if (checkBiltyPendingStatus) {
                  // Update Bilties Statuses To Cancelled and Order Status To Cancel
                  const forupdatebilty = request.bilty;
                  forupdatebilty.forEach((bilty) => {
                    bilty['status'] = "cancelled"
                    bilty['bilty_cancelled_on'] = moment()
                      .tz("Asia/Karachi")
                      .format("MMMM Do YYYY, h:mm:ss a")
                  })

                  // console.log('forupdatebilty -> ',forupdatebilty);


                  pplRequestRef.child(request.orderNo).update({
                    bilty: forupdatebilty,
                    status: "cancelled",
                    order_cancelled_on: moment()
                      .tz("Asia/Karachi")
                      .format("MMMM Do YYYY, h:mm:ss a")
                  }).then(() => {
                    res.json({
                      status: true,
                      message: "Order has been cancelled by user !"
                    })
                  }).catch((err) => {
                    res.json({
                      status: false,
                      error: err
                    })
                  })
                } else {
                  res.json({
                    status: false,
                    error: "You Cannot Cancel Order Now , All Bilties are inprocess !"
                  })
                }
              } else {
                // Check Suborders
                res.json({
                  status: false,
                  error: "For Upcountry Request , Give biltyNo instead of orderNo."
                })
              }
              break;

            case "user_counter_accepted":
              if (request.request_type === 'transit') {
                // Check Bilties 
                const bilties = request.bilty;
                let checkBiltyPendingStatus = false;

                bilties.forEach((bilty) => {
                  if (bilty.status === 'pending') {
                    checkBiltyPendingStatus = true;
                  }
                })

                if (checkBiltyPendingStatus) {
                  // Update Bilties Statuses To Cancelled and Order Status To Cancel
                  const forupdatebilty = request.bilty;
                  forupdatebilty.forEach((bilty) => {
                    bilty['status'] = "cancelled"
                    bilty['bilty_cancelled_on'] = moment()
                      .tz("Asia/Karachi")
                      .format("MMMM Do YYYY, h:mm:ss a")
                  })

                  // console.log('forupdatebilty -> ',forupdatebilty);


                  pplRequestRef.child(request.orderNo).update({
                    bilty: forupdatebilty,
                    status: "cancelled",
                    order_cancelled_on: moment()
                      .tz("Asia/Karachi")
                      .format("MMMM Do YYYY, h:mm:ss a")
                  }).then(() => {
                    res.json({
                      status: true,
                      message: "Order has been cancelled by user !"
                    })
                  }).catch((err) => {
                    res.json({
                      status: false,
                      error: err
                    })
                  })
                } else {
                  res.json({
                    status: false,
                    error: "You Cannot Cancel Order Now , All Bilties are inprocess !"
                  })
                }
              } else {
                // Check Suborders
                res.json({
                  status: false,
                  error: "For Upcountry Request , Give biltyNo instead of orderNo."
                })
              }
              break;

            case "vendor_counter_accepted":
              if (request.request_type === 'transit') {
                // Check Bilties 
                const bilties = request.bilty;
                let checkBiltyPendingStatus = false;

                bilties.forEach((bilty) => {
                  if (bilty.status === 'pending') {
                    checkBiltyPendingStatus = true;
                  }
                })

                if (checkBiltyPendingStatus) {
                  // Update Bilties Statuses To Cancelled and Order Status To Cancel
                  const forupdatebilty = request.bilty;
                  forupdatebilty.forEach((bilty) => {
                    bilty['status'] = "cancelled"
                    bilty['bilty_cancelled_on'] = moment()
                      .tz("Asia/Karachi")
                      .format("MMMM Do YYYY, h:mm:ss a")
                  })

                  // console.log('forupdatebilty -> ',forupdatebilty);


                  pplRequestRef.child(request.orderNo).update({
                    bilty: forupdatebilty,
                    status: "cancelled",
                    order_cancelled_on: moment()
                      .tz("Asia/Karachi")
                      .format("MMMM Do YYYY, h:mm:ss a")
                  }).then(() => {
                    res.json({
                      status: true,
                      message: "Order has been cancelled by user !"
                    })
                  }).catch((err) => {
                    res.json({
                      status: false,
                      error: err
                    })
                  })
                } else {
                  res.json({
                    status: false,
                    error: "You Cannot Cancel Order Now , All Bilties are inprocess !"
                  })
                }
              } else {
                // Check Suborders
                res.json({
                  status: false,
                  error: "For Upcountry Request , Give biltyNo instead of orderNo."
                })
              }
              break;

            case "rejected":
              res.json({
                status: false,
                error: `Order#${request.orderNo} , cannot accept a already rejected order`,
              });
              break;

            default:
              res.json({
                status: false,
                error: `Order Cannot be Rejected -> ${request.status}`,
              });
              break;
          }
        } else {
          res.json({
            status: false,
            message: "Request Not Found !",
          });
        }
      });
    } else if (params.biltyNo) {
      const getOrderNo = params.biltyNo.slice(2, (params.biltyNo.length - 2));

      pplRequestRef.child(getOrderNo).once('value', (snapshot) => {
        if (snapshot.val()) {
          const request = snapshot.val();

          const suborders = request.subOrders;

          suborders.forEach((suborder) => {
            console.log('suborder -> ', suborder.subOrderNo)
            suborder.bilty.forEach((bilty) => {
              if (bilty.biltyNo === params.biltyNo) {
                if (bilty.status === 'pending') {
                  bilty["status"] = 'cancelled';
                  bilty["bilty_cancelled_on"] = moment()
                    .tz("Asia/Karachi")
                    .format("MMMM Do YYYY, h:mm:ss a")

                }
              }
            })
          })

          // Check If All Bilties Of Suborder is cancelled
          let checkAllCancelled = true;

          const convertBiltyNoToSubOrderNo = `SO${params.biltyNo.slice(2, (params.biltyNo.length - 1))}`;

          suborders.forEach((suborder) => {
            if (suborder.subOrderNo === convertBiltyNoToSubOrderNo) {
              suborder.bilty.forEach((bilty) => {
                if (bilty.status !== 'cancelled') {
                  checkAllCancelled = false;
                  console.log('bilty -> ', bilty)
                }
              })
            }
          })

          console.log('checkAllCancelled -> ', checkAllCancelled);

          if (!checkAllCancelled) {
            pplRequestRef.child(request.orderNo).update({
              subOrders: suborders,
            }).then(() => {
              res.json({
                status: true,
                message: "Bilty has been cancelled by user !"
              })
            }).catch((err) => {
              res.json({
                status: false,
                error: err.message
              })
            })

          } else {
            const convertBiltyNoToSubOrderNo = `SO${params.biltyNo.slice(2, (params.biltyNo.length - 1))}`;

            suborders.forEach((suborder) => {
              if (suborder.subOrderNo === convertBiltyNoToSubOrderNo) {
                suborder['status'] = 'cancelled';
                suborder["suborder_cancelled_on"] = moment()
                  .tz("Asia/Karachi")
                  .format("MMMM Do YYYY, h:mm:ss a")
              }
            })

            pplRequestRef.child(request.orderNo).update({
              subOrders: suborders,
            }).then(() => {
              res.json({
                status: true,
                message: "Bilty and Suborder has been cancelled by user !"
              })
            }).catch((err) => {
              res.json({
                status: false,
                error: err.message
              })
            })
          }
        } else {
          res.json({
            status: false,
            error: "Request Data Not Found !"
          })
        }
      })
    } else {
      res.json({
        status: false,
        error: "OrderNo / biltyNo not given !"
      })
    }
  },
);


// ======================  Upload Documents (Start) =========================

// user_upload_upcountry_documents -> Local & upcountry Important Documents (After User Accepts Bilty)
router.post(
  "/user_upload_upcountry_documents",
  body("orderNo").isString().withMessage("orderNo must be an string"),
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
  // Check Uploaded Documents
  (req, res, next) => {
    if (req.files.detail_packing_list && req.files.clearing_form) {
      next();
    } else {
      res.json({
        status: false,
        error: "File not found !",
      });
    }
  },
  // Check User
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("users")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          req.body.user = snapshot.val();
          next();
        } else {
          userRef
            .child("pro")
            .child(params.user.user_id)
            .once("value", (snapshot) => {
              if (snapshot.val()) {
                req.body.user = snapshot.val();
                next();
              } else {
                res.json({
                  status: false,
                  error: "User Not Found !"
                })
              }

            });
        }
      });
  },
  // Check Request
  (req, res, next) => {
    const params = req.body;
    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        // TODO : ADD REQUEST STATUS CONDITIION
        req.body.request = snapshot.val();
        const request = snapshot.val();
        if (request.request_type == "transit") {
          res.json({
            status: false,
            error:
              "Could Not Upload Documents . Request Type is transit cargo!",
          });
        } else {
          next();
        }
      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });
  },
  // Upload Documents To Google Cloud Storage
  (req, res, next) => {
    const params = req.body;

    const { detail_packing_list } = req.files;
    const { clearing_form } = req.files;

    // Uploading Bill of landing
    const detail_packing_list_filename = detail_packing_list.name;
    const detail_packing_list_filetype = detail_packing_list_filename.split(".")[1];
    const detail_packing_list_name = `${req.body.request.orderNo}_${req.body.user.phone}_detail_packing_list`;

    // Uploading Invoice
    const clearing_form_filename = clearing_form.name;
    const clearing_form_filetype = clearing_form_filename.split(".")[1];
    const clearing_form_name = `${req.body.request.orderNo}_${req.body.user.phone}_clearing_form`;

    const path = "UpcountryDocuments/";

    fileUpload(
      detail_packing_list,
      detail_packing_list_name,
      path,
      detail_packing_list_filetype,
      (err) => {
        if (err) {
          console.log("err -> ", err);
        } else {
          console.log("detail_packing_list uploaded");
          // Invoice Upload
          fileUpload(clearing_form, clearing_form_name, path, clearing_form_filetype, (err) => {
            if (err) {
              console.log("err -> ", err);
            } else {
              console.log("clearing_form uploaded");
              // gd Upload
              if (err) {
                console.log("err -> ", err);
              } else if (err == null) {
                next();
              }
            }
          });
        }
      }
    );
  },
  // Get Images Links
  async (req, res, next) => {
    const params = req.body;

    let options = {
      prefix: `UpcountryDocuments/`,
    };

    const [files] = await storage.bucket("meribilty-files").getFiles(options);
    var uploadImages = [];

    files.forEach((file) => {
      const fileName = file.name;

      if (fileName.includes(params.user.phone)) {
        let image = {
          name: file.name,
          url: file.publicUrl(),
        };

        uploadImages.push(image);
      }
    });

    req.body.documentsUploaded = uploadImages;
    next();
  },
  // Update Request
  (req, res) => {
    const params = req.body;
    pplRequestRef
      .child(params.orderNo)
      .update({
        documents: params.documentsUploaded,
        documents_uploaded_on: moment()
          .tz("Asia/Karachi")
          .format("MMMM Do YYYY, h:mm:ss a"),
      })
      .then(() => {
        res.json({
          status: true,
          message: "Document Uploaded Successfully !",
          documents: params.documentsUploaded
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);

// user_upload_transit_cargo_documents -> Transit cargo Important Documents (After User Accepts Bilty)
router.post(
  "/user_upload_transit_cargo_documents",
  body("orderNo").isString().withMessage("orderNo must be an string"),
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
        // req.body.user = params.user;
        next();
        break;

      case "pro":
        // req.body.user = params.user;
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
  // Check Uploaded Documents
  (req, res, next) => {
    if (req.files.bill_of_landing && req.files.invoice && req.files.gd) {
      next();
    } else {
      res.json({
        status: false,
        error: "Files is missing !",
      });
    }
  },
  // Check User
  (req, res, next) => {
    const params = req.body;

    if (params.user.type == "user") {
      userRef
        .child("users")
        .child(params.user.user_id)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            req.body.user = snapshot.val();
            next();
          } else {
            res.json({
              status: false,
              error: "Could Not Found User !",
            });
          }
        });
    } else if (params.user.type == "pro") {
      userRef
        .child("pro")
        .child(params.user.phone)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            req.body.user = snapshot.val();
            next();
          } else {
            res.json({
              status: false,
              error: "Could Not Found User !",
            });
          }
        });
    } else {
      userRef
        .child("user_agents")
        .child(params.user.phone)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            req.body.user = snapshot.val();
            next();
          } else {
            res.json({
              status: false,
              error: "Could Not Found User !",
            });
          }
        });
    }
  },
  // Check Request
  (req, res, next) => {
    const params = req.body;
    pplRequestRef.child(params.orderNo).once("value", (snapshot) => {
      if (snapshot.val()) {
        // TODO : ADD REQUEST STATUS CONDITIION
        req.body.request = snapshot.val();
        const request = snapshot.val();
        if (request.request_type == "upcountry") {
          res.json({
            status: false,
            error: "Could Not Upload Documents . Request Type is upcountry!",
          });
        } else {
          next();
        }
      } else {
        res.json({
          status: false,
          error: "Could Not Found request !",
        });
      }
    });
  },
  // Upload Documents To Google Cloud Storage
  (req, res, next) => {
    const params = req.body;

    const { bill_of_landing } = req.files;
    const { invoice } = req.files;
    const { gd } = req.files;

    // Uploading Bill of landing
    const bill_of_landing_filename = bill_of_landing.name;
    const bill_of_landing_filetype = bill_of_landing_filename.split(".")[1];
    const bill_of_landing_name = `${req.body.request.orderNo}_${req.body.user.user_id}_bill_of_landing`;

    // Uploading Invoice
    const invoice_filename = invoice.name;
    const invoice_filetype = invoice_filename.split(".")[1];
    const invoice_name = `${req.body.request.orderNo}_${req.body.user.user_id}_invoice`;

    // Uploading gd
    const gd_filename = gd.name;
    const gd_filetype = gd_filename.split(".")[1];
    const gd_name = `${req.body.request.orderNo}_${req.body.user.user_id}_gd`;

    // console.log("filetype -> ", filetype);
    // console.log("documentName -> ", documentName);

    // const bucket = storage.bucket("meribilty-files");
    // const document = bucket.file("TransitCargoDocuments/" + documentName);
    const path = "TransitCargoDocuments/";

    // Bill of landing Upload
    fileUpload(
      bill_of_landing,
      bill_of_landing_name,
      path,
      bill_of_landing_filetype,
      (err) => {
        if (err) {
          console.log("err -> ", err);
        } else {
          console.log("bill of landing uploaded");
          // Invoice Upload
          fileUpload(invoice, invoice_name, path, invoice_filetype, (err) => {
            if (err) {
              console.log("err -> ", err);
            } else {
              console.log("Invoice uploaded");
              // gd Upload
              fileUpload(gd, gd_name, path, gd_filetype, (err) => {
                if (err) {
                  console.log("err -> ", err);
                } else if (err == null) {
                  next();
                }
              });
            }
          });
        }
      }
    );
  },
  // Get Images Links
  async (req, res, next) => {
    const params = req.body;

    let options = {
      prefix: `TransitCargoDocuments/`,
    };

    const [files] = await storage.bucket("meribilty-files").getFiles(options);
    var uploadImages = [];

    files.forEach((file) => {
      const fileName = file.name;

      if (fileName.includes(params.user.user_id)) {
        let image = {
          name: file.name,
          url: file.publicUrl(),
        };

        uploadImages.push(image);
        console.log("imae -> ", image);
      }
    });

    req.body.documentsUploaded = uploadImages;

    console.log("uploadImages -> ", uploadImages);

    next();
  },
  // Update Request
  (req, res) => {
    const params = req.body;

    pplRequestRef
      .child(params.orderNo)
      .update({
        documents: params.documentsUploaded,
        documents_uploaded_on: moment()
          .tz("Asia/Karachi")
          .format("MMMM Do YYYY, h:mm:ss a"),
      })
      .then(() => {
        res.json({
          status: true,
          message: "Document Uploaded Successfully !",
          documentsUploaded: documentsUploaded,
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);

// ======================  Upload Documents (End) =========================


// ======================  After Order Acceptance (Start) =========================

// /vendor_allot_vehicle_and_driver_to_request -> (Vendor Allots Vehicle & Driver To A Bilty)
router.post(
  "/vendor_allot_vehicle_and_driver_to_request",
  body("biltyNo").isString().withMessage("biltyNo must be string"),
  body("vehicle_number")
    .isString()
    .withMessage("vehicle_number must be string"),
  // body("vehicle_driver")
  //   .isMobilePhone()
  //   .withMessage("vehicle_driver must be phone number"),
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
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make bilty request !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.vendorOrdriver.type} cannot make bilty request !`,
        });
        break;
    }
  },
  // Check Request
  (req, res, next) => {
    const params = req.body;

    let getLength = params.biltyNo.length;
    const getOrderNo = params.biltyNo.slice(2, (getLength - 2));

    req.body.orderNo = getOrderNo;
    // console.log(getOrderNo);

    pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
      const request = snapshot.val();
      if (request) {
        if (request.status == "accepted") {
          req.body.request = request;
          // console.log("order -> ", request);
          next();
        } else {
          res.json({
            status: false,
            error: `Request has a status -> ${request.status}`,
          });
        }
      } else {
        res.json({
          status: false,
          error: "The Order Does Not Exist !",
        });
      }
    });
  },
  // Check Bilty Status
  (req, res, next) => {
    const params = req.body;

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
                // console.log("bilty -> ", bilty);
                if (bilty.status == 'pending') {
                  req.body.bilty = bilty;
                  next();
                } else {
                  res.json({
                    status: false,
                    error: `Cannot Allot Vehicle And Driver To Bilty - Bilty Status is ${bilty.status} !`,
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


                if (bilty.status == 'pending') {
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
          error: "Unknown Type !"
        })

        break;
    }
  },
  // Check Driver
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("drivers")
      .child(params.vehicle_driver)
      .once("value", (snapshot) => {
        const driver = snapshot.val();
        if (driver) {
          if (driver.status === "free") {
            req.body.driver = driver
            console.log('driver -> ', driver)
            next();
          } else {
            res.json({
              status: false,
              error: "driver is busy !",
            });
          }
        } else {
          console.log('driver not found -> ')
          res.json({
            status: false,
            error: "The Driver Does Not Exist !",
          });
        }
      });
  },
  // Check Vehicle
  (req, res, next) => {
    const params = req.body;
    pplVendorVehicleRef
      .orderByChild("vehicle_number")
      .equalTo(params.vehicle_number)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vehicles = snapshot.val();
          const convert = Object.entries(vehicles);

          const final = [];
          convert.forEach((x) => {
            final.push(x[1]);
          });

          const filter = final.filter(
            (vehicle) => vehicle.vehicle_number === params.vehicle_number
          );

          if (filter.length !== 0 && filter.length < 2) {
            const vehicle = filter[0];
            if (vehicle.available) {
              req.body.vehicle = vehicle;
              next();
            } else {
              res.json({
                status: false,
                error: "Vehicle Is Not Available Right Now !",
              });
            }
          } else {
            res.json({
              status: false,
              error: "Vehicle Not Found",
            });
          }
        } else {
          res.json({
            status: false,
            error: "No Vehicle Found In Database !",
          });
        }
      });
  },
  // Check Vehicle & Driver Allotment Status
  (req, res, next) => {
    const params = req.body;

    switch (params.request.request_type) {
      case "transit":
        const transitbilties = params.request.bilty;

        transitbilties.forEach((bilty) => {
          if (bilty["biltyNo"] == params.biltyNo) {
            (bilty["vehicle"] = params.vehicle_number),
              (bilty["driver_phone"] = params.vehicle_driver);
            bilty["status"] = "inprocess";
            bilty["driver_name"] = params.driver.fullname;
            bilty["vendor"] = params.vendor.user_id;
            bilty["type"] = "self";
            bilty["driver_alotted_on"] = moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a');

            req.body.currentBilty = bilty;
          }
        });

        pplRequestRef
          .child(params.request.orderNo)
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




                if (bilty.status !== 'container_returned') {
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
        res.json('unknown request type')
        break;
    }
  },
  //  Driver Availabilty
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("drivers")
      .child(params.vehicle_driver)
      .update({
        status: "busy",
        bilty: params.biltyNo,
        request_type: params.request.request_type
      })
      .then(() => {
        pplVendorVehicleRef
          .child(params.vehicle.id)
          .update({
            available: false,
            bilty: params.biltyNo,
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
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  },
  // Update Bilty 
  (req, res, next) => {
    const params = req.body;

    if (params.request.request_type === 'transit') {
      next()
    } else {
      const suborders = params.request.subOrders;

      suborders.forEach((suborder) => {
        suborder.bilty.forEach((bilty) => {
          if (bilty["biltyNo"] == params.biltyNo) {

            bilty["status"] = 'inprocess';
            bilty["driver_name"] = params.driver.fullname;
            bilty["driver_phone"] = params.vehicle_driver;
            bilty["vehicle_number"] = params.vehicle_number;
            bilty["driver_alotted_on"] = moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a')

            req.body.currentBilty = bilty;
          }
        })
      })


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
    }
  },
  // Update Invoice
  (req, res, next) => {
    const params = req.body;

    pplInvoiceRef.child(params.request.orderNo).once('value', (snapshot) => {
      if (snapshot.val()) {
        const invoice = snapshot.val();
        let data = {
          ...invoice,
          driver_phone: params.driver.phone,
          driver_name: params.driver.fullname,
          vehicle_number: params.vehicle.vehicle_number,
          vehicle_name: params.vehicle.vehicle_name,
          driver_alloted_on: Date()
        }

        pplInvoiceRef.child(params.request.orderNo).update(data).then(() => {
          req.body.invoice = invoice;
          next();
        }).catch((err) => {
          res.json({
            status: false,
            error: err
          })
        })
      } else {
        let data = {
          cargo_insurance: params.request.cargo_insurance,
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
          status: params.request.status,
          createdAt: params.request.createdAt,
          driver_phone: params.driver.phone,
          driver_name: params.driver.fullname,
          vehicle_number: params.vehicle.vehicle_number,
          vehicle_name: params.vehicle.vehicle_name,
          driver_alloted_on: Date()
        }

        pplInvoiceRef.child(params.request.orderNo).update(data).then(() => {
          req.body.invoice = invoice;
          next();
        }).catch((err) => {
          res.json({
            status: false,
            error: err
          })
        })
      }
    })
  },
  // Create Driver History
  (req, res, next) => {
    const params = req.body;
    const newHistory = driverHistoryRef.child(params.vehicle_driver).push();
    let data = {}
    newHistory.set({
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
      driver_name: params.driver.fullname,
      driver_phone: params.driver.phone,
      user_type: params.request.user_type,
      username: params.request.username,
      biltyNo: params.biltyNo,
      request_created_at: params.request.createdAt,
      driver_alotted_on: moment().tz('Asia/Karachi').format('MMMM Do YYYY, h:mm:ss a'),
      paymentMethod: params.request.payment_method,
      contactPerson: params.request.contact_person,
      bilty_status: params.currentBilty.status,
      status: params.request.status,
      vendor_phone: params.vendor.user_id,
      type: params.request.request_type === 'transit' || params.request.request_type === 'upcountry' ? 'ppl' : 'scm',
    }).then(() => {
      res.json({
        status: true,
        message: `Vendor Alloted Vehicle (${params.vehicle_number}) & Driver (${params.vehicle_driver}) to biltyNo#${params.biltyNo}`,
      });
    }).catch((err) => {
      res.json({
        status: false,
        error: err.message,
      });
    })


  }
  // TODO: Throw Bilty Request To Driver
);

// /vendor_removes_driver_from_bilty
router.post("/vendor_removes_driver_from_bilty", verifyTokenFirebase,
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make bilty request !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.vendorOrdriver.type} cannot make bilty request !`,
        });
        break;
    }
  },
  // Check Bilty Status
  (req, res, next) => {
    const params = req.body;

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
                // console.log("bilty -> ", bilty);
                if (bilty.status == 'pending') {
                  req.body.bilty = bilty;
                  next();
                } else {
                  res.json({
                    status: false,
                    error: `Cannot Allot Vehicle And Driver To Bilty - Bilty Status is ${bilty.status} !`,
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


                if (bilty.status == 'pending') {
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
          error: "Unknown Type !"
        })

        break;
    }
  },
)

// =================   VENDOR REQUEST TO ANOTHER VENDOR  (START) ==================

// /vendor_send_bilty_request -> (Vendor Will Send Its Bilty Requirement Request To Another Vendor) (PAUSED)
router.post(
  "/vendor_bilty_request_to_vendor",
  body("biltyNo").isString().withMessage("biltyNo must be an string"),
  body("requested_from")
    .isMobilePhone()
    .withMessage("requested_from must be a phone"),
  body("amount").isString().withMessage("amount must be an string"),
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
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make bilty request !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make bilty request !`,
        });
        break;
    }
  },
  // Check Vendor
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("vendors")
      .child(params.vendor.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          next();
        } else {
          res.json({
            status: false,
            error: "Cannot Find Vendor !",
          });
        }
      });
  },
  // Check Requested From
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("vendors")
      .child(params.requested_from)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const requested_from = snapshot.val();
          req.body.requested_from = requested_from;
          next();
        } else {
          res.json({
            status: false,
            error: "Cannot Find requested_from vendor !",
          });
        }
      });
  },
  // Check Request
  (req, res, next) => {
    const params = req.body;

    let getLength = params.biltyNo.length;
    const getOrderNo = params.biltyNo.slice(2, (getLength - 2));

    pplRequestRef.child(getOrderNo).once("value", (snapshot) => {
      const request = snapshot.val();
      if (request) {
        if (request.status === "accepted") {
          req.body.request = request;
          next();
        } else {
          res.json({
            status: false,
            error: `Request has a status -> ${request.status}`,
          });
        }
      } else {
        res.json({
          status: false,
          error: "The Order Does Not Exist !",
        });
      }
    });
  },
  // Check Bilty Status
  (req, res, next) => {
    const params = req.body;

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
                // console.log("bilty -> ", bilty);
                if (bilty.status == 'pending') {
                  req.body.bilty = bilty;
                  next();
                } else {
                  res.json({
                    status: false,
                    error: `Cannot Send Bilty Request For This Bilty ! - Bilty Status is ${bilty.status} !`,
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
        res.json({
          status: false,
          error: "Working on upcountry"
        })

        break;

      default:
        res.json({
          status: false,
          error: "Unknown Type !"
        })

        break;
    }
  },
  // Check Vendor To Vendor Request
  (req, res, next) => {
    const params = req.body;

    pplVendorToVendorRequestRef
      .child(params.biltyNo)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          res.json({
            status: false,
            error: "Request Already Exists !",
            request: snapshot.val(),
          });
        } else {
          next();
        }
      });
  },
  // Google Distance Duration
  (req, res, next) => {
    const params = req.body;
    googleMapsClient
      .directions({
        params: {
          origin: [params.request.orgLat, params.request.orgLng],
          destination: [params.request.desLat, params.request.desLng],
          mode: "driving",
          key: "AIzaSyDDTYs0JX_8BEC62oRGKLZTJac3Xd2nx74",
        },
      })
      .then((Google) => {
        const GoogleObject = Google.data.routes[0].legs[0];
        req.body.GoogleObject = GoogleObject;
        next();
      })
      .catch((error) => {
        console.log(error);
        next()
      });
  },
  // Create A Request
  (req, res, next) => {
    const params = req.body;
    const newVendorToVendorRequest = pplVendorToVendorRequestRef.push();
    const requestId = newVendorToVendorRequest.key;
    // req.body.vendor_to_vendor_request_id = requestId;

    const data = {
      vendor_name: params.vendor.company_name,
      vendor_phone: params.vendor.phone,
      requested_from: params.requested_from,
      biltyNo: params.bilty.biltyNo,
      vehicle_type: params.bilty.type,
      option: params.bilty.option,
      weight: params.bilty.weight,
      quantity: params.bilty.quantity,
      user_phone: params.bilty.user_phone,
      amount: params.amount,
      orderNo: params.request.orderNo,
      desLat: params.request.desLat,
      desLng: params.request.desLng,
      orgLat: params.request.orgLat,
      orgLng: params.request.orgLng,
      material: params.request.material,
      google: params.GoogleObject,
      created: moment().tz("Asia/Karachi").format("MMMM Do YYYY, h:mm:ss a"),
      status: "pending",
    };

    req.body.data = data;

    pplVendorToVendorRequestRef
      .child(params.biltyNo)
      .set(data)
      .then(() => {
        next();
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err.message,
        });
      });
  },
  // Complete
  (req, res) => {
    const params = req.body;
    res.json({
      status: true,
      message: "Bilty Request Sent To Vendor Successfully !",
      requestData: {
        ...params.data,
      },
    });
  }
);

// /vendor_accept_bilty_request -> (Vendor Will Accept Request And Fill Bilty Requirements) (PAUSED)
router.post(
  "/vendor_accept_bilty_request",
  body("biltyNo").isString().withMessage("biltyNo must be an string"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },

  // Check User Type
  (req, res, next) => {
    const params = req.body;

    switch (params.vendorOrdriver.type) {
      case "vendor":
        req.body.vendor = params.vendorOrdriver;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.vendorOrdriver.type} cannot accept bilty request !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.vendorOrdriver.type} cannot accept bilty request !`,
        });
        break;
    }
  },
  // Check bilty Request
  (req, res, next) => {
    const params = req.body;

    pplVendorToVendorRequestRef
      .child(params.biltyNo)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendorRequest = snapshot.val();
          if (vendorRequest.requested_from.phone === params.vendor.phone) {
            req.body.vendorRequest = vendorRequest;
            next();
          } else {
            res.json({
              status: false,
              error: "Request Has Not Been Sent To You",
            });
          }
        } else {
          res.json({
            status: false,
            error: "Request Not Found !",
          });
        }
      });
  },
  // Check Order
  (req, res, next) => {
    const params = req.body;

    pplRequestRef
      .child(params.vendorRequest.orderNo)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const request = snapshot.val();
          req.body.request = request;
          next();
        } else {
          res.json({
            status: false,
            error: "request not found",
          });
        }
      });
  },
  // Check Bilty Status
  (req, res, next) => {
    const params = req.body;

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
                // console.log("bilty -> ", bilty);
                if (bilty.status == 'pending') {
                  req.body.bilty = bilty;
                  next();
                } else {
                  res.json({
                    status: false,
                    error: `Cannot Send Bilty Request For This Bilty ! - Bilty Status is ${bilty.status} !`,
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
        res.json({
          status: false,
          error: "Working on upcountry"
        })

        break;

      default:
        res.json({
          status: false,
          error: "Unknown Type !"
        })

        break;
    }
  },
  // Create A Update Bilty Request
  (req, res, next) => {
    const params = req.body;
    pplVendorToVendorRequestRef
      .child(params.biltyNo)
      .update({
        status: "accepted",
        accepted_on: moment()
          .tz("Asia/Karachi")
          .format("MMMM Do YYYY, h:mm:ss a"),
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
  },
  // Update Request
  (req, res, next) => {
    const params = req.body;

    switch (params.request.request_type) {
      case "transit":
        const transitbilties = params.request.bilty;

        transitbilties.forEach((bilty) => {
          if (bilty["biltyNo"] == params.biltyNo) {
            bilty["vendor"] = params.vendor.phone;
            bilty["amount"] = params.vendorRequest.amount;
            bilty["type"] = "requested";
            bilty["request_status"] = "accepted";
          }
        });

        pplRequestRef
          .child(params.vendorRequest.orderNo)
          .update({
            bilty: transitbilties,
          })
          .then(() => {
            res.json({
              status: true,
              message: `${params.vendorRequest.requested_from.company_name} accepted the bilty request !`,
            });
          })
          .catch((err) => {
            res.json({
              status: false,
              error: err.message,
            });
          });
        break;

      case "upcountry":
        break;

      default:
        break;
    }
  }
);

// /vendor_reject_bilty_request -> (Vendor Rejects Bilty Requirement Request From Another Vendor) (PAUSED)
router.post(
  "/vendor_reject_bilty_request",
  body("phone").isMobilePhone().withMessage("phone is not valid"),
  body("biltyNo").isString().withMessage("biltyNo must be an string"),
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
          res.json({
            status: false,
            error: "Cannot Find Vendor !",
          });
        }
      });
  },
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.vendorOrdriver.type) {
      case "vendor":
        req.body.vendor = params.vendorOrdriver;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.vendorOrdriver.type} cannot reject bilty request !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.vendorOrdriver.type} cannot reject bilty request !`,
        });
        break;
    }
  },
  // Check bilty Request
  (req, res, next) => {
    const params = req.body;

    pplVendorToVendorRequestRef
      .child(params.biltyNo)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendorRequest = snapshot.val();
          if (vendorRequest.requested_from.phone === params.vendor.phone) {
            req.body.vendorRequest = vendorRequest;
            next();
          } else {
            res.json({
              status: false,
              error: "Request Has Not Been Sent To You",
            });
          }
        } else {
          res.json({
            status: false,
            error: "Request Not Found !",
          });
        }
      });
  },
  // Check Order
  (req, res, next) => {
    const params = req.body;

    pplRequestRef
      .child(params.vendorRequest.orderNo)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const request = snapshot.val();
          req.body.request = request;
          next();
        } else {
          res.json({
            status: false,
            error: "request not found",
          });
        }
      });
  },
  // Create A Request
  (req, res, next) => {
    const params = req.body;
    pplVendorToVendorRequestRef
      .child(params.biltyNo)
      .update({
        status: "rejected",
        rejected_on: moment()
          .tz("Asia/Karachi")
          .format("MMMM Do YYYY, h:mm:ss a"),
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
  },
  // Update Request
  (req, res, next) => {
    const params = req.body;

    switch (params.request.request_type) {
      case "transit":
        const transitbilties = params.request.bilty;

        transitbilties.forEach((bilty) => {
          if (bilty["biltyNo"] == params.biltyNo) {
            bilty["vendor"] = params.phone;
            bilty["amount"] = params.vendorRequest.amount;
            bilty["type"] = "requested";
            bilty["request_status"] = "rejected";
          }
        });

        pplRequestRef
          .child(params.vendorRequest.orderNo)
          .update({
            bilty: transitbilties,
          })
          .then(() => {
            res.json({
              status: true,
              message: `${params.vendorRequest.requested_from.company_name} accepted the bilty request !`,
            });
          })
          .catch((err) => {
            res.json({
              status: false,
              error: err.message,
            });
          });
        break;

      case "upcountry":
        break;

      default:
        break;
    }
  }
);


// =================   VENDOR REQUEST TO ANOTHER VENDOR  (ENDS) ==================

// ======================  After Order Acceptance (End) =========================


// ======================  Vendor Routes =========================


// /vendor_complete_bilty -> (The Order Is now Completed)
router.post(
  "/vendor_complete_bilty",
  body("reqId").isString().withMessage("reqId must be string"),
  body("vendor_phone")
    .isMobilePhone()
    .withMessage("vendor_phone must be valid phone number"),
  body("amount").isString().withMessage("amount must be a string"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  // Get Request Data
  (req, res, next) => {
    const params = req.body;
    pplRequestRef.child(params.reqId).once("value", (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();
        req.body.request = request;
        next();
      } else {
        res.json({
          status: false,
          message: "Request Not Found !",
        });
      }
    });
  },
  // Get User Data
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("users")
      .child(params.request.user_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const user = snapshot.val();
          req.body.user = user;
          next();
        } else {
          res.json({
            status: false,
            message: "User Not Found !",
          });
        }
      });
  },
  // Generate Invoice
  (req, res, next) => {
    const params = req.body;

    if (req.body.request) {
      const { request } = req.body;
      const { user } = req.body;

      if (request.phase == 5) {
        const newPPLInvoice = pplInvoiceRef.push();
        const invoiceId = newPPLInvoice.key;

        // TODO: Get Vehicles & Drivers Alloted
        // TODO: Total Amount Payable By Customer

        newPPLInvoice
          .set({
            invoiceId,
            biltyNo: request.orderNo,
            reqId: request.id,
            username: user.fullname,
            user_phone: user.phone,
            vendor_phone: request.vendor_phone,
            requestType: request.request_type,
            priceGivenByUser: `${request.user_price} PKR`,
            request_created_at: moment(request.createdAt).format(
              "MMMM Do YYYY, h:mm:ss a"
            ),
            bilty_placed_on: moment(request.bilty_placed_on).format(
              "MMMM Do YYYY, h:mm:ss a"
            ),
            user_accepted_qoute_amount: `${request.accepted_qoute_amount} PKR`,
            user_accepted_qoute_on: moment(request.qoute_accepted_on).format(
              "MMMM Do YYYY, h:mm:ss a"
            ),
            floors: request.floors,
            material: request.material,
            material_weight: `${request.material_weight} tons`,
            vehicles_demanded: request.vehicles,
            loading: request.loading,
            unloading: request.unloading,
            cargo_value: request.cargo_value || null,
            insurance_amount: request.insurance || null,
            pickup_location: request.originText,
            destination: request.destinationText,
            empty_container_location: request.empty_container_text,
          })
          .then(() => {
            res.json({
              status: true,
              message: `Bilty No -> ${req.body.request.orderNo} has been placed`,
            });
          })
          .catch((err) => {
            res.json({
              status: false,
              error: err.message,
            });
          });
      } else if (request.phase == 10) {
      }
    } else {
      res.json({
        status: false,
        error: "Request Id Not Found",
      });
    }
  },
  // Check Order Bilty Status
  (req, res, next) => {
    const params = req.body;
    const { request } = req.body;

    if (request.status == "In_progress") {
      // Check Vehicle Quantites
      // const quantity = request.vehicle_quantity;
      // if (quantity > 1) {
      // } else {
      // }

      next();
    } else {
      res.json({
        status: false,
        error: "Can not place bilty , request status is not In_progress !",
      });
    }
  },
  // Update Bilty
  (req, res, next) => {
    const params = req.body;
    pplRequestRef
      .child(params.reqId)
      .update({
        status: "In_progress",
        bilty_completed_on: moment().valueOf(),
      })
      .then(() => {
        res.json({
          status: true,
          message: `Bilty No -> ${req.body.request.orderNo} has been placed`,
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error,
        });
      });
  }
  // TODO: Notification
);

// ================= VENDOR DRIVERS  (Start) =================

// /vendor_invite_driver  -> (Vendor Creates A Driver)
router.post(
  "/vendor_invite_driver",
  body("fullname").isString().withMessage("fullname must be string"),
  body("phone").isMobilePhone().withMessage("phone must be valid phone number"),
  // body("cnic")
  //   .isNumeric()
  //   .isLength({ min: 13, max: 13 })
  //   .withMessage("cnic must be valid phone number"),
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
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":

        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot invite driver !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot invite driver !`,
        });
        break;
    }
  },
  // Check Vendor
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("vendors")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          // console.log("vendor -> ", req.body.vendor);
          next();
        } else {
          res.json({
            status: false,
            error: "vendor not found !",
          });
        }
      });
  },
  // Check Driver Exists ?
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("drivers")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          res.json({
            status: false,
            error: "Driver Already Exists !",
          });
        } else {
          next();
        }
      });
  },
  // Generate A Driver (Incomplete)
  (req, res, next) => {
    const params = req.body;
    const newdriver = userRef.child("drivers").push();
    const driverId = newdriver.key;

    userRef
      .child("drivers")
      .child(params.phone)
      .set({
        id: driverId,
        ...params,
        user: null,
        token: null,
        vendor: null,
        referer: params.vendor.phone,
        vendorOrdriver: null,
        created: moment().tz("Asia/Karachi").format("MMMM Do YYYY, h:mm:ss a"),
        status: "free",
        online: false,
        active: false,
        verified: false,
        type: "driver",
      })
      .then(() => {
        walletRef
          .child("drivers")
          .child(params.phone)
          .set({
            amount: "-100",
            type: "cash",
          }).then(() => {
            next();
          }).catch((err) => {
            res.json({
              status: false,
              error: err.message,
            });
          })

      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  },
  // Send Invite SMS
  (req, res) => {
    const params = req.body;


    twillio_client.messages
      .create(
        {
          to: params.phone,
          from: config.twilio.phone,
          body: `You have been invited by ${params.vendor.company_name} To Meribilty App as a driver. Login With Your Phone Number ${params.phone}.`,
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
              message: "Driver Has Been Invited !",
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
  }
);

// /vendor_edit_driver -> (Vendor Edits A Driver)
router.post(
  "/vendor_edit_driver",
  body("firstname").isString().withMessage("firstname must be string"),
  body("lastname").isString().withMessage("firstname must be string"),
  body("phone").isMobilePhone().withMessage("phone must be valid phone number"),
  body("cnic")
    .isNumeric()
    .isLength({ min: 13, max: 13 })
    .withMessage("cnic must be valid phone number"),
  body("vendor_phone")
    .isMobilePhone()
    .withMessage("vendor_phone must be valid phone number"),
  // Validator
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.vendorOrdriver.type) {
      case "vendor":
        req.body.vendor = params.vendorOrdriver;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.vendorOrdriver.type} cannot edit invited driver !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.vendorOrdriver.type} cannot edit invited driver !`,
        });
        break;
    }
  },
  // Check Vendor
  (req, res, next) => {
    // enc="Multipart form-data"
    //   {
    //     "firstname": "+923243280234",
    //     "lastname": "+923243254545",
    //     "phone": "Ayaz Bhatti",
    //     "cnic" : "MAZDA CONTAINER 20 FT LOCAL",
    //     "vendor_phone" : "+923243280234"
    //     "profile_image": ,
    //     "cnic_image": ,
    //     "driving_license_image":
    // }

    const params = req.body;
    userRef
      .child("vendors")
      .child(params.vendor_phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          // console.log("vendor -> ", req.body.vendor);
          next();
        } else {
          res.json({
            status: false,
            error: "vendor not found !",
          });
        }
      });
  },
  // Check if Vendor driver Exists ?
  (req, res, next) => {
    //   {
    //     "vendor_phone": "+923243280234",
    //     "driver_phone": "+923243254545",
    //     "fullname": "Ayaz Bhatti",
    //     "vehicle_name" : "MAZDA CONTAINER 20 FT LOCAL",
    //     "vehicle_make": "GHK",
    //     "vehicle_model": "1996",
    //     "vehicle_number": "5201 KNG"
    // }
    const params = req.body;

    userRef
      .child("vendor_drivers")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          next();
        } else {
          res.json({
            status: false,
            error: "Vendor Driver Not Found !",
          });
        }
      });
  },
  // Generate A Vendor Driver
  (req, res, next) => {
    const params = req.body;
    const password = generator.generate({
      length: 10,
      numbers: true,
    });
    const newVendordriver = userRef.child("vendor_drivers").push();
    const driverId = newVendordriver.key;
    req.body.vendor_driver_password = password;

    userRef
      .child("vendor_drivers")
      .child(params.phone)
      .update({
        ...params,
      })
      .then(() => {
        next();
      })
      .catch((error) => {
        res.json({
          status: false,
          error,
        });
      });
  },
  // Upload Images
  (req, res, next) => {
    const params = req.body;

    const { profile_image } = req.files;
    const { cnic_image } = req.files;
    const { driving_license_image } = req.files;

    // Uploading Bill of landing
    const profile_image_filename = profile_image.name;
    const profile_image_filetype = profile_image_filename.split(".")[1];
    const profile_image_name = `${params.phone}_profile_image`;

    // Uploading Invoice
    const cnic_image_filename = cnic_image.name;
    const cnic_image_filetype = cnic_image_filename.split(".")[1];
    const cnic_image_name = `${params.phone}_cnic_image`;

    // Uploading gd
    const driving_license_image_filename = driving_license_image.name;
    const driving_license_image_filetype =
      driving_license_image_filename.split(".")[1];
    const driving_license_image_name = `${params.phone}_driving_license_image`;

    // console.log("filetype -> ", filetype);
    // console.log("documentName -> ", documentName);

    // const bucket = storage.bucket("meribilty-files");
    // const document = bucket.file("TransitCargoDocuments/" + documentName);
    const path = "VendorDrivers/";

    // profile_image Upload
    fileUpload(
      profile_image,
      profile_image_name,
      path,
      profile_image_filetype,
      (err) => {
        if (err) {
          console.log("err -> ", err);
        } else {
          console.log("profile_image uploaded");
          // cnic_image Upload
          fileUpload(
            cnic_image,
            cnic_image_name,
            path,
            cnic_image_filetype,
            (err) => {
              if (err) {
                console.log("err -> ", err);
              } else {
                console.log("cnic_image uploaded");
                // driving_license_image Upload
                fileUpload(
                  driving_license_image,
                  driving_license_image_name,
                  path,
                  driving_license_image_filetype,
                  (err) => {
                    if (err) {
                      console.log("err -> ", err);
                    } else if (err == null) {
                      // next();
                      res.json({
                        status: true,
                        message: "Vendor Driver Created Successfully",
                      });
                    }
                  }
                );
              }
            }
          );
        }
      }
    );
  },
  // Get Images Links
  async (req, res, next) => {
    const params = req.body;

    let options = {
      prefix: `VendorDrivers/`,
    };

    const [files] = await storage.bucket("meribilty-files").getFiles(options);
    var uploadImages = [];

    files.forEach((file) => {
      const fileName = file.name;

      if (fileName.includes(params.phone)) {
        let image = {
          name: file.name,
          url: file.publicUrl(),
        };

        uploadImages.push(image);
      }
    });

    req.body.documentsUploaded = uploadImages;
    next();
  },
  // Update Vendor Driver
  (req, res) => {
    const params = req.body;

    userRef
      .child("vendor_drivers")
      .child()
      .update({
        documents: documentsUploaded,
      })
      .then(() => {
        res.json({
          status: true,
          message: "Vendor Driver Created Successfully !",
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

// /vendor_remove_driver -> (Vendor Removes A driver)
router.post(
  "/vendor_remove_driver",
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;
    switch (params.vendorOrdriver.type) {
      case "vendor":
        req.body.vendor = params.vendorOrdriver;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.vendorOrdriver.type} cannot remove invited driver !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.vendorOrdriver.type} cannot remove invited driver !`,
        });
        break;
    }
  },
  // Check Vendor
  (req, res, next) => {
    //   {
    //     "token": "",
    //     "phone": "",
    //  }

    const params = req.body;
    userRef
      .child("vendors")
      .child(params.vendor.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          console.log("vendor -> ", req.body.vendor);
          next();
        } else {
          res.json({
            status: false,
            error: "vendor not found !",
          });
        }
      });
  },
  // Check if Vendor driver Exists ?
  (req, res, next) => {
    //   {
    //     "driver_phone": "+923243254545",
    //     "fullname": "Ayaz Bhatti",
    //     "vehicle_name" : "MAZDA CONTAINER 20 FT LOCAL",
    //     "vehicle_make": "GHK",
    //     "vehicle_model": "1996",
    //     "vehicle_number": "5201 KNG"
    // }
    const params = req.body;

    userRef
      .child("vendor_drivers")
      .child(params.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          res.json({
            status: false,
            error: "Vendor Driver Already Exists !",
          });
        } else {
          next();
        }
      });
  },
  // Remove A Vendor Driver
  (req, res, next) => {
    const params = req.body;
    const newVendordriver = userRef.child("vendor_drivers").push();

    userRef.child("vendor_drivers").child(params.phone);
    remove()
      .then(() => {
        next();
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  },
  // Send SMS To User Agent
  (req, res) => {
    const params = req.body;
    // Send SMS To User Agent
    twillio_client.messages
      .create(
        {
          to: params.phone,
          from: twilioCred.phone,
          body: "You have been removed as a vendor driver. To Meribilty Driver App.",
        },
        (err, resData) => {
          if (err) {
            return res.json({
              status: false,
              message: err,
            });
          }
          res.json({
            status: true,
            message: "Vendor Driver Added !",
          });
        }
      )
      .catch((err) => {
        res.json({
          status: false,
          error: err,
        });
      });
  }
);

// /vendor_make_driver_offline -> (Vendor Makes His Vehicle Offline if not busy)
router.post(
  "/vendor_make_driver_offline",
  body("phone").isString().withMessage("vehicle_number must be string"),
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
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;
    switch (params.user.user_type) {
      case "vendor":
        req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make driver offline !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make driver offline !`,
        });
        break;
    }
  },
  // Check Vendor
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("vendors")
      .child(params.vendor.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          console.log("vendor -> ", req.body.vendor);
          next();
        } else {
          res.json({
            status: false,
            error: "vendor not found !",
          });
        }
      });
  },
  // check vendor vehicle
  (req, res, next) => {
    const params = req.body;

    pplVendorVehicleRef
      .orderByChild("vehicle_number")
      .equalTo(params.vehicle_number)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          snapshot.forEach((childSnapshot) => {
            const { key } = childSnapshot;
            req.body.vehicleId = key;
            console.log("key -> ", key);
            next();
          });
        } else {
          res.json({
            status: false,
            error: "Vehicle Not Found !",
          });
        }
      });
  },
  // Update Vendor Vehicle
  (req, res) => {
    pplVendorVehicleRef
      .child(req.body.vehicleId)
      .update({
        available: false,
      })
      .then(() => {
        res.json({
          status: true,
          message: "Vendor Vehicle Is Offline !",
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);

// /vendor_make_driver_online -> (Vendor Makes His Vehicle Online if not online)
router.post(
  "/vendor_make_driver_online",
  body("phone")
    .isMobilePhone()
    .withMessage("Vendor Driver Phone Number Must Be Valid"),
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
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;
    switch (params.user.user_type) {
      case "vendor":
        req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make driver online !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make driver online !`,
        });
        break;
    }
  },
  // Check Vendor
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("vendors")
      .child(params.vendor.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          console.log("vendor -> ", req.body.vendor);
          next();
        } else {
          res.json({
            status: false,
            error: "vendor not found !",
          });
        }
      });
  },
  // check vendor driver
  (req, res, next) => {
    const params = req.body;

    userRef
      .child("vendor_drivers")
      .orderByChild("vendor_phone")
      .equalTo(params.vendor.phone)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const rawdrivers = snapshot.val();
          const drivers = [];
          const convert = Object.entries(rawdrivers);
          convert.forEach((x) => {
            drivers.push(x[1]);
          });

          const filterOut = drivers.filter((driver) => {
            return driver.phone === params.phone;
          });

          if (filterOut) {
            if (filterOut.length !== 0) {
              req.body.driver = filterOut[0];
              next();
            }
          }
        } else {
          res.json({
            status: false,
            error: "Driver Not Found !",
          });
        }
      });
  },
  // Update Vendor Vehicle
  (req, res) => {
    const params = req.body;
    userRef
      .child("vendor_drivers")
      .child(params.driver.phone)
      .update({
        available: true,
      })
      .then(() => {
        res.json({
          status: true,
          message: "Vendor Vehicle Is online !",
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);

// ================= VENDOR DRIVERS  (Ends) =================

// ================= VENDOR VEHICLE (Start) =================

// /vendor_add_vehicle -> (Vendor Creates His Vehicle With The Given Vehicle Type)
router.post(
  "/vendor_add_vehicle",
  body("vehicle_name").isString().withMessage("vehicle_name must be string"),
  body("vehicle_make").isString().withMessage("vehicle_make must be string"),
  body("vehicle_model").isString().withMessage("vehicle_model must be string"),
  body("vehicle_number")
    .isString()
    .withMessage("vehicle_number must be string"),
  body("vehicle_type").isString().withMessage("vehicle_type must be string"),
  body("available").isBoolean().withMessage("available must be boolean"),

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
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        // req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot add vehicle !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot add vehicle !`,
        });
        break;
    }
  },
  // Check Vendor
  (req, res, next) => {
    // {
    //   "token": "",
    //   "vehicle_name" : "BOWSER 20 FT",
    //   "vehicle_make": "FORD",
    //   "vehicle_model": "2000",
    //   "vehicle_number": "ASD-213",
    //   "vehicle_type": "Container",
    //   "available" : true
    // }

    const params = req.body;
    userRef
      .child("vendors")
      .child(params.user.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vendor = snapshot.val();
          req.body.vendor = vendor;
          next();
        } else {
          res.json({
            status: false,
            error: "vendor not found !",
          });
        }
      });
  },
  // Get Vehicle Types
  (req, res, next) => {
    const params = req.body;

    pplSettingsRef
      .child("vehicle_types")
      .child(params.vehicle_type)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          next();
        } else {
          res.json({
            status: false,
            message: "Vehicle Type Not Found In Database !",
          });
        }
      });
  },
  // Add Vendor Vehicle
  (req, res) => {
    const params = req.body;

    const newVendorVehicle = pplVendorVehicleRef.push();
    const vehicleId = newVendorVehicle.key;

    newVendorVehicle
      .set({
        id: vehicleId,
        vehicle_make: params.vehicle_make,
        vehicle_model: params.vehicle_model,
        vehicle_name: params.vehicle_name,
        vehicle_number: params.vehicle_number,
        vendor_phone: params.vendor.phone,
        vehicle_type: params.vehicle_type,
        available: true,
        added_on: moment().tz("Asia/Karachi").format("MMMM Do YYYY, h:mm:ss a"),
      })
      .then(() => {
        res.json({
          status: true,
          message: "Vendor Vehicle Added Successfully",
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

// /vendor_edit_vehicle -> (Vendor Edits His Vehicle)
router.post(
  "/vendor_edit_vehicle",
  body("id").isString().withMessage("id must be string"),
  body("vehicle_name").isString().withMessage("vehicle_name must be string"),
  body("vehicle_make").isString().withMessage("vehicle_make must be string"),
  body("vehicle_model").isString().withMessage("vehicle_model must be string"),
  body("vehicle_number")
    .isString()
    .withMessage("vehicle_number must be string"),
  body("vehicle_type").isString().withMessage("vehicle_type must be string"),
  body("available").isBoolean().withMessage("available must be boolean"),
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
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":

        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot edit vehicle !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot edit vehicle !`,
        });
        break;
    }
  },
  // check vendor vehicle
  (req, res, next) => {
    const params = req.body;
    pplVendorVehicleRef.child(params.id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          next();
        } else {
          res.json({
            status: false,
            error: "Vehicle Not Found !",
          });
        }
      });
  },
  // Edit Vendor Vehicle
  (req, res, next) => {
    const params = req.body;


    pplVendorVehicleRef
      .child(params.id)
      .update({
        vehicle_make: params.vehicle_make,
        vehicle_model: params.vehicle_model,
        vehicle_name: params.vehicle_name,
        vehicle_number: params.vehicle_number,
        vendor_phone: params.user.user_id,
        vehicle_type: params.vehicle_type,
        available: true,
      })
      .then(() => {
        res.json({
          status: true,
          message: "Vendor Vehicle Updated Successfully",
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

// /vendor_remove_vehicle -> (Vendor Removes His Vehicle)
router.post(
  "/vendor_remove_vehicle",
  body("id").isString().withMessage("id must be string"),

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
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot remove vehicle !`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot remove vehicle !`,
        });
        break;
    }
  },
  // check vendor vehicle
  (req, res, next) => {
    const params = req.body;

    pplVendorVehicleRef.child(params.id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          next();
        } else {
          res.json({
            status: false,
            error: "Vehicle Not Found !",
          });
        }
      });
  },
  // Remove Vendor Vehicle
  (req, res) => {
    pplVendorVehicleRef
      .child(req.body.id)
      .remove()
      .then(() => {
        res.json({
          status: true,
          message: "Vendor Vehicle Is Removed Successfully !",
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);

// /vendor_make_vehicle_offline -> (Vendor Makes His Vehicle Offline if not busy)
router.post(
  "/vendor_make_vehicle_offline",
  body("vehicle_number")
    .isString()
    .withMessage("vehicle_number must be string"),
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
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make vehicle offline!`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make vehicle offline!`,
        });
        break;
    }
  },
  // check vendor vehicle
  (req, res, next) => {
    const params = req.body;

    pplVendorVehicleRef
      .orderByChild("vehicle_number")
      .equalTo(params.vehicle_number)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          snapshot.forEach((childSnapshot) => {
            const { key } = childSnapshot;
            req.body.vehicleId = key;
            console.log("key -> ", key);
            next();
          });
        } else {
          res.json({
            status: false,
            error: "Vehicle Not Found !",
          });
        }
      });
  },
  // Update Vendor Vehicle
  (req, res) => {
    pplVendorVehicleRef
      .child(req.body.vehicleId)
      .update({
        available: false,
      })
      .then(() => {
        res.json({
          status: true,
          message: "Vendor Vehicle Is Offline !",
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error: error.message,
        });
      });
  }
);

// /vendor_make_vehicle_online -> (Vendor Makes His Vehicle Online if not online)
router.post(
  "/vendor_make_vehicle_online",
  body("vehicle_number")
    .isString()
    .withMessage("vehicle_number must be string"),
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
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make vehicle online!`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot make vehicle online!`,
        });
        break;
    }
  },
  // check vendor vehicle
  (req, res, next) => {
    const params = req.body;

    pplVendorVehicleRef
      .orderByChild("vehicle_number")
      .equalTo(params.vehicle_number)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          snapshot.forEach((childSnapshot) => {
            const { key } = childSnapshot;
            req.body.vehicleId = key;
            console.log("key -> ", key);
            next();
          });
        } else {
          res.json({
            status: false,
            error: "Vehicle Not Found !",
          });
        }
      });
  },
  // Update Vendor Vehicle
  (req, res) => {
    pplVendorVehicleRef
      .child(req.body.vehicleId)
      .update({
        available: true,
      })
      .then(() => {
        res.json({
          status: true,
          message: "Vendor Vehicle Is online !",
        });
      })
      .catch((error) => {
        res.json({
          status: false,
          error,
        });
      });
  }
);

// ================= VENDOR VEHICLE (Ends) =================



// ============ DATA SERVICES FOR VENDOR (START) ==============

// Get Vendor Vehicles
// {
//   "token" : "",
// }
router.post(
  "/get_vendor_vehicles",
  verifyTokenFirebase,
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot get vehicles!`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot get vehicles!`,
        });
        break;
    }
  },
  // Get Vendor drivers
  (req, res, next) => {
    const params = req.body;

    pplVendorVehicleRef
      .orderByChild("vendor_phone")
      .equalTo(params.vendor.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const vehicles = snapshot.val();

          const converted = Object.entries(vehicles);
          const final = [];
          converted.forEach((x) => {
            final.push(x[1]);
          });

          res.json({
            status: true,
            vehicles: final,
          });
        } else {
          res.json({
            status: false,
            error: "No Vehicle Found !",
          });
        }
      });
  }
);

// Get Vendor Drivers
// {
//   "token" : "",
// }
router.post(
  "/get_vendor_drivers",
  verifyTokenFirebase,
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        req.body.vendor = params.user;
        next();
        break;
      case "driver":
        res.json({
          status: false,
          error: `${params.user.user_type} cannot get vehicles!`,
        });
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot get vehicles!`,
        });
        break;
    }
  },
  // Get Vendor Drivers
  (req, res, next) => {
    const params = req.body;
    userRef
      .child("drivers")
      .orderByChild("referer")
      .equalTo(params.vendor.user_id)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          const drivers = snapshot.val();

          const converted = Object.entries(drivers);
          const final = [];
          converted.forEach((x) => {
            final.push(x[1]);
          });

          res.json({
            status: true,
            drivers: final,
          });
        } else {
          res.json({
            status: false,
            error: "No drivers Found !",
          });
        }
      });
  }
);

// Get Single Bilty 
router.post("/get_single_order",
  verifyTokenFirebase,
  //  Get Request Data
  (req, res, next) => {
    const params = req.body;


    // const orderNo = params.biltyNo.slice(2, (params.biltyNo.length - 2));

    pplRequestRef.child(params.orderNo).once('value', (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();

        res.json({
          status: true,
          data: request
        })
      } else {
        res.json({
          status: false,
          error: "Request Not Found !"
        })
      }
    })
  },
)


// Vendor/Driver/Admin Approve Payment 
// {
//   "token": "",
//   "orderNo": ""
// }
router.post("/approve_payment",
  verifyTokenFirebase,
  // Check User Type (Vendor Side)
  (req, res, next) => {
    const params = req.body;

    switch (params.user.user_type) {
      case "vendor":
        next();
        break;
      case "driver":
        next();
        break;
      case "admin":
        next();
        break;
      default:
        res.json({
          status: false,
          error: `${params.user.user_type} cannot approve payment !`,
        });
        break;
    }
  },
  // Check Request
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.child(params.orderNo).once('value', (snapshot) => {
      if (snapshot.val()) {
        const request = snapshot.val();

        if (request.payment_approved) {
          res.json({
            status: false,
            error: "Payment Already Approved"
          })
        } else {
          next();
        }
      } else {
        res.json({
          status: false,
          error: "Request Not Found !"
        })
      }
    })
  },
  // Update Request
  (req, res, next) => {
    const params = req.body;

    pplRequestRef.child(params.orderNo).update({
      payment_approval: true
    }).then(() => {
      res.json({
        status: true,
        message: `Payment Approved For Order#${params.orderNo}`
      })
    }).catch((err) => {
      res.json({
        status: false,
        error: err.message
      })
    })
  },
)

// /user_orders -> (Get All Orders User Made)

// ============ DATA SERVICES FOR VENDOR (ENDS) ==============

// Calculate Insurance
router.post("/calculate_insurance",
  body("cargo_value").isNumeric().withMessage("cargo_value must be a number"),
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

    pplSettingsRef.child("insurance").once("value", (snapshot) => {
      if (snapshot.val()) {
        const insurance = snapshot.val();
        const load_value = parseInt(params.cargo_value);
        const percent = parseInt(insurance.value);
        console.log('insurance -> ', insurance)

        const total = Math.ceil(load_value / 100 * percent);

        res.json({
          status: true,
          insurance: total
        })


      } else {
        res.json({
          status: false,
          error: "Insurance Percent Not Found In Database !"
        })
      }
    })
  }
)

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
