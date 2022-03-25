const {
  e_walletRef,
  subscribed_usersRef,
  pricingRef,
  userRef,
  heavyref,
  heavyvehref,
  promoRef,
  bidRef,
  sessionsRef,
  userReqRef,
  MessagesRef,
  requests_dataRef,
  commissionRef,
  userLiveRequestsRef,
  notificationKeys,
  feedsRef,
  completeReqRef,
  invoicesClientsRef,
  invoicesDriversRef,
  addaListRef,
  onlineDriversRef,
} = require("../db/ref");

// New Ref
const {
  scmRequestRef,
  scmPricing,
  vehicleListRef,
  scmCommission,
  scmInvoiceRef,
  scmSettingsRef,
  driverHistoryRef,
  pplBiddingsRef,
  pplInvoiceRef,
} = require("../db/newRef");
const bcrypt = require("bcrypt-nodejs");

const saltRounds = 10;
const moment = require("moment");
const admin = require("firebase-admin");
// Google Translation
const { Translate } = require("@google-cloud/translate").v2;
// Creates a client
const translate = new Translate({
  projectId: "meribilty", // eg my-project-0o0o0o0o'
  keyFilename: "src/config/serviceAccount.json", // eg my-project-0fwewexyz.json
});
// const DBs = require("../db/db");
const nodemailer = require("nodemailer");
const _ = require("lodash");

const { Client } = require("@googlemaps/google-maps-services-js");

const googleMapsClient = new Client({});

const JWT_SECRET =
  "sdjkfh8923yhjdksbfma@#*(&@*!^#&@bhjb2qiuhesdbhjdsfg839ujkdhfjk";
const jwt = require("jsonwebtoken");

module.exports = {
  verifyTokenFirebase(req, res, next) {
    const params = req.body;

    try {
      const idToken = params.token;
      // Verify Token

      admin.auth()
        .verifyIdToken(idToken)
        .then((decodedToken) => {
          const uid = decodedToken.uid;

          req.body.user = decodedToken;
          // console.log('req.body.user -> ',req.body.user)
          next()

          // res.json({
          //   status:true,
          //   data: decodedToken
          // })
          // ...
        })
        .catch((err) => {
          // Handle error
          res.json({
            status: false,
            error: err.message
          })
        });
    } catch (error) {
      // throw error;
      console.log({ error });
      res.json({
        status: false,
        error: "Invalid Token !",
      });
    }
  },
  async checkUserExistsUserApp(req, res, next) {
    const params = req.body;
    // Check In User
    const checkUserSnap = await userRef
      .child("users")
      .child(params.phone)
      .once("value");
    // Check In Pro
    const checkProSnap = await userRef
      .child("pro")
      .child(params.phone)
      .once("value");


    console.log("checkUserSnap -> ", checkUserSnap.val());
    console.log("checkProSnap -> ", checkProSnap.val());

    if (
      checkUserSnap.val() == null &&
      checkProSnap.val() == null
    ) {
      next();
    } else {
      let user = {
        user: checkUserSnap.val() || null,
        pro: checkProSnap.val() || null,
      };
      console.log(user);

      const convert = Object.entries(user);
      const notemptyObj = [];

      convert.forEach((x) => {
        notemptyObj.push(x[1]);
      });

      console.log("notemptyObj -> ", notemptyObj);

      const refilter = notemptyObj.filter((x) => {
        return x !== null;
      });

      console.log("refilter -> ", refilter);
      if (refilter) {
        if (refilter.length == 0) {
          next();
        }

        if (refilter.length !== 0) {
          const foundUser = refilter[0];

          res.json({
            status: false,
            error: "Phone Number Already Exist In Database !",
            type: foundUser.type,
          });
        }
      }
    }
  },
  async checkUserExistsVendorApp(req, res, next) {
    const params = req.body;

    const checkDriverSnap = await userRef
      .child("drivers")
      .child(params.phone)
      .once("value");

    const checkVendorSnap = await userRef
      .child("vendors")
      .child(params.phone)
      .once("value");


    console.log("checkDriverSnap -> ", checkDriverSnap.val());
    console.log("checkVendorSnap -> ", checkVendorSnap.val());

    if (
      checkDriverSnap.val() == null &&
      checkVendorSnap.val() == null
    ) {
      next();
    } else {
      let user = {
        driver: checkDriverSnap.val() || null,
        vendor: checkVendorSnap.val() || null,
      };
      console.log(user);

      const convert = Object.entries(user);
      const notemptyObj = [];

      convert.forEach((x) => {
        notemptyObj.push(x[1]);
      });

      console.log("notemptyObj -> ", notemptyObj);

      const refilter = notemptyObj.filter((x) => {
        return x !== null;
      });

      console.log("refilter -> ", refilter);
      if (refilter) {
        if (refilter.length == 0) {
          next();
        }

        if (refilter.length !== 0) {
          const foundUser = refilter[0];

          res.json({
            status: false,
            error: "Phone Number Already Exist In Database !",
            type: foundUser.type,
          });
        }
      }
    }
  },
  async generatePPLinvoice(request) {
    if (request.request_type === 'transit') {
      if (request.qoute) {
        // Vendor Qoute Is Accepted
        console.log(`OrderNo${request.orderNo} Accepted For This Vendor Qoute -> `);



        let invoice = {
          orderNo: request.orderNo,
          userPhone: request.user_phone,
          requestCreatedAt: request.createdAt,
          vendorQoutedAt: request.qoute.qoutedAt,
          vendorQoutedFor: `${request.qoute.qoute_amount} PKR`,
          vendorPhone: request.qoute.phone,
          orderAcceptedAt: request.order_accepted_on,
          payment_method: request.payment_method,
          point_of_payment: request.payment_method === "cod" ? request.point_of_payment : null,
          payableAmount: `${request.qoute.qoute_amount} PKR`,
        };

        // Check Bilties 
        const bilties = request.bilty;

        bilties.forEach((bilty, index) => {
          invoice[`bilty_${index}`] = {
            biltyNo: bilty.biltyNo,
            option: bilty.option,
            material: bilty.material,
            weight: bilty.weight,
            vehicle_quantity: bilty.vehicle_quantity,
            // contact_person: bilty.type,
            option_quantity: bilty.option_quantity,
          }
        })

        pplInvoiceRef
          .child(request.orderNo)
          .set(invoice)
          .catch((err) => console.log(err));
      } else if (request.user_counter) {
        // User Counter Is Accepted

        const qouteSnap = await pplBiddingsRef
          .child(request.request_type)
          .child("qoutes")
          .child(request.user_counter.qouteId)
          .once("value");
        const qoute = qouteSnap.val();

        let invoice = {
          orderNo: request.orderNo,
          userPhone: request.user_phone,
          requestCreatedAt: request.created,
          vendorQoutedAt: qoute.qoutedAt,
          vendorQoutedFor: `${qoute.qoute_amount} PKR`,
          vendorPhone: qoute.phone,
          userCountedAt: qoute.countered_at,
          userCounteredFor: `${request.user_counter.amount} PKR`,
          orderAcceptedAt: request.order_accepted_on,
          payment_method: request.payment_method,
          point_of_payment: request.payment_method === "cod" ? request.point_of_payment : null,
          payableAmount: `${request.user_counter.amount} PKR`,
        };

        pplInvoiceRef
          .child(request.orderNo)
          .set(invoice)
          .catch((err) => console.log(err));
      } else if (request.vendor_counter) {
        // Vendor Counter Is Accepted

        const qouteSnap = await pplBiddingsRef
          .child(request.request_type)
          .child("qoutes")
          .child(request.vendor_counter.qouteId)
          .once("value")
          .catch((err) => console.log(err.message));
        const qoute = qouteSnap.val();

        const counterSnap = await pplBiddingsRef
          .child(request.request_type)
          .child("user_counter")
          .child(request.vendor_counter.userCounterId)
          .once("value")
          .catch((err) => console.log(err.message));
        const counter = counterSnap.val();

        let invoice = {
          orderNo: request.orderNo,
          orderScheduledOn: request.date,
          requestType: `PPL - ${request.request_type}`,
          userPhone: request.user_phone,
          requestCreatedAt: request.createdAt,
          vendorQoutedAt: qoute.qoutedAt,
          vendorQoutedFor: `${qoute.qoute_amount} PKR`,
          vendorPhone: qoute.phone,
          userCountedAt: qoute.countered_at,
          userCounteredFor: `${counter.amount} PKR`,
          vendorCounterAt: request.vendor_counter.vendor_countered_on,
          vendorCounteredFor: `${request.vendor_counter.amount} PKR`,
          orderAcceptedAt: request.order_accepted_on,
          payment_method: request.payment_method,
          point_of_payment: request.payment_method === "cod" ? request.point_of_payment : null,
          payableAmount: `${request.vendor_counter.amount} PKR`,
        };

        pplInvoiceRef
          .child(request.orderNo)
          .set({
            ...invoice,
          })
          .catch((err) => console.log(err.message));
      }
    } else {
      console.log(`OrderNo${request.orderNo} has been accepted , check suborders -> `);

      let invoice = {
        cargo_insurance: false,
        // contact_person: request.contact_person || null,
        createdAt: request.createdAt || null,
        date: request.date || null,
        orderNo: request.orderNo || null,
        order_accepted_on: request.order_accepted_on || null,
        payment_method: request.payment_method || null,
        point_of_payment: request.payment_method === "cod" ? request.point_of_payment : null,
        request_type: request.request_type || null,
        security_deposit: request.security_deposit || null,
        status: request.status || null,
        order_completed_on: request.order_completed_on || null,
        user_phone: request.user_phone || null,
        user_type: request.user_type || null,
        username: request.username || null
      }

      console.log('invoice -> ', invoice)

      // Check Bilties 
      const suborders = request.subOrders;

      suborders.forEach((suborder, index) => {
        if (suborder.qoute) {
          // qoute_amount
          invoice[`suborder_${index}`] = {
            subOrderNo: suborder.subOrderNo,
            vehicle_type: suborder.type,
            qoute_accepted_on: suborder.qoute_accepted_on,
            netAmount: suborder.qoute.amount
          }
        }

        if (suborder.user_counter) {
          invoice[`suborder_${index}`] = {
            subOrderNo: suborder.subOrderNo,
            vehicle_type: suborder.type,
            user_counter_accepted_on: suborder.user_counter_accepted_on,
            netAmount: suborder.user_counter.amount
          }
        }

        if (suborder.vendor_counter) {
          invoice[`suborder_${index}`] = {
            subOrderNo: suborder.subOrderNo,
            vehicle_type: suborder.type,
            vendor_counter_accepted_on: suborder.vendor_counter_accepted_on,
            netAmount: suborder.vendor_counter.amount
          }
        }

      })

      console.log('Updated PPL Invoice -> ', suborders);

      pplInvoiceRef
        .child(request.orderNo)
        .set(invoice)
        .catch((err) => console.log(err));
    }
  },
  async sendProUserApplicationEmail(subject, body) {
    const transporter = nodemailer.createTransport({
      host: "Meribilty.com",
      port: 465,
      secure: true,
      auth: {
        user: "omair@Meribilty.com",
        pass: "4slash1234!@#$",
      },
      tls: { rejectUnauthorized: false },
    });

    const info = await transporter.sendMail({
      from: '"Meribilty Admin" <admin@Meribilty.com>', // sender address
      to: "4slash1234@gmail.com", // list of receivers Sajidh4@gmail.com,arsalanshafiq917@gmail.com,mavia@4slash.com,allawalarizwan@gmail.com
      subject, // Subject line
      text: `
       fullname: ${body.fullname}
       email: ${body.email}
       phone: ${body.phone}
       bussiness_name: ${body.bussiness_name}
       bussiness_address: ${body.bussiness_address}
       NTN: ${body.NTN}
       landline: ${body.landline}
       owner: ${body.owner}
       point of contact: ${body.point_of_contact}
       cargo volume per month: ${body.cargo_volume_per_month}
       credit duration: ${body.credit_duration}
       credit requirement per month: ${body.credit_requirement_per_month}
      `,
    });

    console.log("Message sent: %s", info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

    // Preview only available when sending through an Ethereal account
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
  },
  async uploadFile(bucketName, filePath, destFileName) {
    await storage.bucket(bucketName).upload(filePath, {
      destination: destFileName,
    });

    console.log(`${filePath} uploaded to ${bucketName}`);
  },
  async veryFyUsers() {
    const users = [
      /// //////numbers here
    ];
    const usersnap = await DBs.Users.List("snap");
    // console.log(usersnap.val());
    let counter = 0;
    users.forEach((user) => {
      let isOk = null;
      usersnap.forEach((dbUserSnap) => {
        if (dbUserSnap.val().mob_no == `92${user}`) {
          counter++;
          isOk = true;
          // console.log((counter < 10 ? "0" + counter : counter) + "  " + "  " + moment(dbUserSnap.val().createdAt).format('DD MMM YYYY'));
        }
      });
      if (!isOk) {
        console.log(`${user} not `);
      }
      if (isOk) {
        console.log(`${user} OK`);
      }
    });
  },
  async SendNotification(clientId, driverId, uri, rating) {
    try {
      const Client = await DBs.Users.GetInfoById(clientId);
      const Driver = await DBs.Users.GetInfoById(driverId);
      const Payload = {};
      switch (uri) {
        case "assign_driver":
          Payload.Driver = {
            title: "New Job",
            body: `${Client.Name} ka parcel uthanay k liye phonch jain.\nMobile:${Client.mob_no}`,
          };
          break;
        case "driver_accept":
          Payload.Client = {
            title: "Request Start",
            body: `${Driver.Name
              } aapka  parcel uthanay k liye phonch raha hai.${Driver.v_number ? `vehicle:${Driver.v_number}.` : ""
              } Mobile:${Driver.mob_no}`,
          };
          break;
        case "driver_reach":
          Payload.Client = {
            title: "Reached Pickup Point",
            body: `${Driver.Name} aapka parcel uthanay k liye phonch gaya hai.`,
          };
          break;
        case "driver_load":
          Payload.Client = {
            title: "Request In Progress",
            body: `${Driver.Name} ne Ap ka Parcel Utha Liay Hai`,
          };
          break;
        case "driver_drop":
          Payload.Client = {
            title: "Request Complete",
            body: `${Driver.Name} ne aapka parcel pohcha dia hai. ${Driver.Name} ko rating dein.`,
          };
          break;
        case "request_complete":
          Payload.Driver = {
            title: "Rated Job",
            body: `${Client.Name} ne aap ko ${rating} star rating di hai.`,
          };
          break;
      }
      if (Payload.hasOwnProperty("Driver")) {
        await DBs.NotifyTokens.GetById(driverId, "drivers").then(
          async (usr) => await DBs.Notification.Send(usr, Payload.Driver)
        );
      }
      if (Payload.hasOwnProperty("Client")) {
        await DBs.NotifyTokens.GetById(clientId, "clients").then(
          async (usr) => await DBs.Notification.Send(usr, Payload.Client)
        );
      }
    } catch (e) {
      console.log("<SendNotification>  ERROR");
    }
  },
  async reqNotify(reqId) {
    await _.map(
      await DBs.NotifyTokens.GetByType("driver"),
      async (usr, key) => {
        await DBs.Notification.SendToAll(usr, key, reqId).catch(console.log);
      }
    );
  },
  // Working
  async SetPriceData(reqBody, AddaOrDriver) {
    const ForFirst = await DBs.Admin.FirstRide.Data();
    // console.log(reqBody.reqData);
    // cancelChargesPriceType:
    // clientCancelDuration:
    // clientCancelPrice:
    // clientChargesPriceType:
    // driverCancelDuration:
    // driverCancelPrice:
    // emptyKM:
    // incentiveAmount:
    // labourPrice:
    // loadedKM:
    // minimumEmptyDistance:
    // minimumEmptyPrice:
    // minimumLoadedDistance:
    // minimumLoadedPrice:
    // minimumPriceLoadtime:
    // minimumPricePerMinute:
    // pricePerFloor:

    let FreeCreated = false;

    try {
      const { distance } = AddaOrDriver.GoogleDistance;
      const { duration } = AddaOrDriver.GoogleDistance;

      const arrivalPrice = Math.ceil(
        distance.value <= reqBody.pricingData.minimumEmptyDistance
          ? reqBody.pricingData.minimumEmptyPrice
          : ((distance.value - reqBody.pricingData.minimumEmptyDistance) /
            1000) *
          reqBody.pricingData.minimumEmptyPrice +
          reqBody.pricingData.minimumEmptyPrice
      );

      // console.log("arrival price -> ", arrivalPrice);

      const departurePrice = Math.ceil(
        distance.value <= reqBody.pricingData.minimumLoadedDistance
          ? reqBody.pricingData.minimumLoadedPrice
          : ((distance.value - reqBody.pricingData.minimumLoadedDistance) /
            1000) *
          reqBody.pricingData.minimumLoadedPrice +
          reqBody.pricingData.minimumLoadedPrice
      );

      // console.log("departurePrice -> ", departurePrice);

      const timePrice = Math.ceil(
        reqBody.pricingData.minimumPricePerMinute *
        ((reqBody.pricingData.minimumPriceLoadtime +
          duration.value +
          parseInt(duration.value)) /
          60)
      );

      // console.log("timePrice -> ", timePrice);

      let laboursInLoading = 0;
      const laboading = reqBody.loading.map((x) => {
        if (x.name == "Labour") {
          laboursInLoading += x.quantity;
        }
      });

      // console.log("laboursInLoading -> ", laboursInLoading);

      let laboursInUnLoading = 0;
      const laboaunding = reqBody.unloading.map((x) => {
        if (x.name == "Labour") {
          laboursInUnLoading += x.quantity;
        }
      });

      // console.log("laboursInUnLoading -> ", laboursInUnLoading);

      const totalLabours = Math.floor(laboursInLoading + laboursInUnLoading);

      // console.log("totalLabours -> ", totalLabours);

      const labourPrice = Math.ceil(
        reqBody.pricingData.labourPrice * totalLabours
      );

      // console.log("labourPrice -> ", labourPrice);

      const floorPrice = Math.ceil(
        reqBody.pricingData.pricePerFloor * reqBody.floors * totalLabours
      );

      // console.log("floorPrice -> ", floorPrice);

      const driverPrice = Math.ceil(departurePrice + arrivalPrice);
      const labourLoadingPrice = Math.ceil(labourPrice + floorPrice);
      const totalPrice = Math.ceil(
        labourLoadingPrice + driverPrice + timePrice
      );

      // var commissionPrice = Math.ceil(
      //   totalPrice * (reqBody.CommissionPercent / 100)
      // );

      const commissionPrice = Math.ceil(
        totalPrice * (reqBody.CommissionPercent / 100)
      );

      let discountPrice = 0;

      if (reqBody.isFirst) {
        if (ForFirst.status && ForFirst.onService.bulk_delivery) {
          FreeCreated = true;
          if (totalPrice > ForFirst.min && totalPrice <= ForFirst.max) {
            discountPrice = totalPrice;
          }
          if (totalPrice > ForFirst.min && totalPrice >= ForFirst.max) {
            discountPrice = ForFirst.max;
          }
        } else if (reqBody.promoData != null) {
          discountPrice = Math.floor(
            reqBody.promoData.type == "Rupees"
              ? reqBody.promoData.value || 0
              : reqBody.promoData.type == "Percentage"
                ? Math.ceil(
                  ((reqBody.promoData.maxValue >= totalPrice
                    ? totalPrice
                    : reqBody.promoData.maxValue) *
                    reqBody.promoData.value) /
                  100
                ) || 0
                : 0
          );
        }
      } else if (reqBody.promoData != null) {
        discountPrice = Math.floor(
          reqBody.promoData.type == "Rupees"
            ? reqBody.promoData.value || 0
            : reqBody.promoData.type == "Percentage"
              ? Math.ceil(
                ((reqBody.promoData.maxValue >= totalPrice
                  ? totalPrice
                  : reqBody.promoData.maxValue) *
                  reqBody.promoData.value) /
                100
              ) || 0
              : 0
        );
      }

      const netTotalPrice = totalPrice - discountPrice;
      console.log("netTotalPrice -> ", netTotalPrice);

      const price = {
        arrivalPrice,
        commissionPrice,
        departurePrice,
        discountPrice: parseInt(discountPrice),
        driverPrice,
        floorPrice,
        labourLoadingPrice,
        labourPrice,
        netTotalPrice,
        timePrice,
        totalPrice,
      };

      console.log("price -> ", price);
      if (reqBody.CreatedByAdmin) {
        await DBs.Request.Data.Update(reqBody.reqId, {
          driverHistory: null,
          labourPrice: null,
          totalPrice: null,
          discountPrice: null,
          netTotalPrice: null,
          commissionPrice: null,
        });
      }
      const OBJ = {};
      // if (!AddaOrDriver.hasOwnProperty("phone")) {
      //   AddaOrDriver = {
      //     distance: AddaOrDriver.GoogleDistance.distance,
      //     duration: AddaOrDriver.GoogleDistance.duration,
      //     phone: AddaOrDriver.phone,
      //     lat: AddaOrDriver.current_position.lat,
      //     lng: AddaOrDriver.current_position.lng,
      //   };
      //   OBJ[AddaOrDriver.phone] = {
      //     bill: price,
      //     adda: AddaOrDriver,
      //   };
      //   await DBs.Request.Data.addaHistory.Update(reqBody.reqId, OBJ);
      // }

      if (AddaOrDriver.hasOwnProperty("phone")) {
        AddaOrDriver = {
          distance: AddaOrDriver.GoogleDistance.distance,
          duration: AddaOrDriver.GoogleDistance.duration,
          phone: AddaOrDriver.phone,
          lat: AddaOrDriver.current_position.lat,
          lng: AddaOrDriver.current_position.lng,
          vehicle: AddaOrDriver.vehicle || AddaOrDriver.vehicle_type,
        };

        OBJ[AddaOrDriver.phone] = {
          bill: price,
          driver: AddaOrDriver,
        };

        // =====================================   TODO : DRIVER HISTORY
        if (reqBody.driverData.hasOwnProperty("driverHistory")) {
          // let CD = {};
          // CD["cancelData"] = {
          //   canceledAt: moment().valueOf(),
          //   reason: reqBody.reason || null,
          // };
          // if (!reqBody.CreatedByAdmin)
          //   await DBs.Request.Data.driverHistory.UpdateChildById(
          //     reqBody.reqId,
          //     Object.keys(reqBody.driverData.driverHistory)[0],
          //     CD
          //   );
          // await DBs.Request.Data.driverHistory.Update(reqBody.reqId, OBJ);
        } else {
          const newDriverHistoryObject = driverHistoryRef.push();
          const objectkey = newDriverHistoryObject.key;

          newDriverHistoryObject
            .set({
              reqId: reqBody.reqId,
              driver: AddaOrDriver.phone,
              type: "scm",
              ...OBJ,
            })
            .then(() => {
              scmRequestRef.child(reqBody.reqId).update({
                pricingData: reqBody.pricingData,
              });
            })
            .catch((err) => console.log(err));

          // await DBs.Request.Data.driverHistory.Create(
          //   reqBody.reqId,
          //   AddaOrDriver.phone,
          //   "scm",
          //   OBJ
          // );
          // await DBs.Request.Data.pricingData.Create(
          //   reqBody.reqId,
          //   reqBody.pricingData
          // );
        }

        if (reqBody.promoData) {
          scmRequestRef.child(reqBody.reqId).update({
            promo: reqBody.promoData,
          });
        }

        // console.log(price);

        // var walletPrice = parseInt(
        //   reqBody.reqData.previousBal.replace(/[A-Za-z ]/gi, "")
        // );

        const walletPrice = 0;
        let amount = 0;
        let roadioAmount = 0;
        // if (reqBody.reqData.isCorporate) {
        //   walletPrice += reqBody.reqData.max_credit || 0;
        //   let roadioAmount = 0,
        //     amount = price.netTotalPrice;
        // }
        // || reqBody.reqData.isCorporate

        if (walletPrice < 0 || walletPrice < 0) {
          amount += roadioAmount = Math.abs(walletPrice);
        } else if (reqBody.wallet) {
          amount += roadioAmount = -walletPrice;
        }
        // promoId: FreeCreated
        //     ? "firstRideFree"
        //     : reqBody.reqData.promoId || null,

        scmRequestRef
          .child(reqBody.reqId)
          .update({
            driver_phone: reqBody.driverData.phone,
            payableAmount: amount ? `${amount >= 0 ? amount : 0}` : "0",
            biltyAmount: roadioAmount
              ? `${amount >= 0
                ? typeof roadioAmount === "number" && roadioAmount <= 0
                  ? Math.abs(roadioAmount)
                  : walletPrice <= 0
                    ? walletPrice
                    : 0
                : walletPrice + amount
              }`
              : null,
            labourPrice: `${price.labourPrice}`,
            totalPrice: `${price.totalPrice}`,
            discountPrice: `${price.discountPrice}`,
            netTotalPrice: `${price.netTotalPrice}`,
            commissionPrice: `${price.commissionPrice}`,
            CommissionData: reqBody.CommissionData || null,
          })
          .then(() => true)
          .catch((err) => console.log(err));
        // await DBs.Request.Data.Update(reqBody.reqId, {
        //   //"driverId": reqBody.driverData.id,
        //   promoId: FreeCreated
        //     ? "firstRideFree"
        //     : reqBody.reqData.promoId || null,
        //   payableAmount: amount ? `${amount >= 0 ? amount : 0}` : "0",
        //   biltyAmount: roadioAmount
        //     ? (amount >= 0
        //         ? typeof roadioAmount === "number" && roadioAmount <= 0
        //           ? Math.abs(roadioAmount)
        //           : walletPrice <= 0
        //           ? walletPrice
        //           : 0
        //         : walletPrice + amount) + ""
        //     : null,
        //   labourPrice: price.labourPrice + "",
        //   totalPrice: price.totalPrice + "",
        //   discountPrice: price.discountPrice + "",
        //   netTotalPrice: price.netTotalPrice + "",
        //   commissionPrice: price.commissionPrice + "",
        //   commissionData: reqBody.commissionData,
        // });
      }
      // return await true;
    } catch (e) {
      console.log(e);
      return await Promise.reject("erro in code");
    }
  },
  // Working
  async CalculateSCMPricing(reqBody, AddaOrDriver) {
    // let ForFirst = await DBs.Admin.FirstRide.Data();
    // console.log(reqBody.reqData);
    // cancelChargesPriceType:
    // clientCancelDuration:
    // clientCancelPrice:
    // clientChargesPriceType:
    // driverCancelDuration:
    // driverCancelPrice:
    // emptyKM:
    // incentiveAmount:
    // labourPrice:
    // loadedKM:
    // minimumEmptyDistance:
    // minimumEmptyPrice:
    // minimumLoadedDistance:
    // minimumLoadedPrice:
    // minimumPriceLoadtime:
    // minimumPricePerMinute:
    // pricePerFloor:
    // var FreeCreated = false;

    try {
      // Calculate Arrival Price
      // Calculate Departure Price
      // Calculate Time Price

      const { distance } = AddaOrDriver.GoogleDistance;
      const { duration } = AddaOrDriver.GoogleDistance;

      //  distance in meter
      //  duration in seconds

      // Calculation Arrival Price
      // distance.value
      // /reqBody.pricingData.minimumEmptyDistance
      // /reqBody.pricingData.minimumEmptyPrice
      console.log("distance.value in meters -> ", distance.value);
      console.log("duration.value in meters -> ", duration.value);

      let arrivalPrice = 0;

      if (distance.value <= reqBody.pricingData.minimumEmptyDistance) {
        arrivalPrice = reqBody.pricingData.minimumEmptyPrice;
      } else {
        const inKM = distance.value / 1000;
        // console.log("distance.value in KM -> ", inKM);
        // arrivalPrice = Math.ceil(
        //   ((distance.value - reqBody.pricingData.minimumEmptyDistance) / 1000) *
        //     reqBody.pricingData.minimumEmptyPrice +
        //     reqBody.pricingData.minimumEmptyPrice
        // );
        arrivalPrice = Math.ceil(inKM * reqBody.pricingData.minimumEmptyPrice);
        // console.log(
        //   "reqBody.pricingData.minimumEmptyPrice -> ",
        //   reqBody.pricingData.minimumEmptyPrice
        // );
      }

      arrivalPrice = parseInt(arrivalPrice);

      let departurePrice = 0;
      if (distance.value <= reqBody.pricingData.minimumLoadedDistance) {
        departurePrice = reqBody.pricingData.minimumLoadedPrice;
      } else {
        // let number_1 =
        //   (distance.value - reqBody.pricingData.minimumLoadedDistance) / 1000;
        // departurePrice = Math.floor(
        //   number_1 * reqBody.pricingData.minimumLoadedPrice +
        //     reqBody.pricingData.minimumLoadedPrice
        // );

        const inKM = distance.value / 1000;
        departurePrice = Math.ceil(
          inKM * reqBody.pricingData.minimumLoadedPrice
        );
      }

      departurePrice = parseInt(departurePrice);

      const timePrice = Math.ceil(
        reqBody.pricingData.minimumPricePerMinute * (duration.value / 60)
      );

      // =====================  Calculating Loading And Unloading Prices Start ============================
      const loadingFilter = reqBody.loading;
      const unloadingFilter = reqBody.unloading;

      const pricingForLoadingOption = reqBody.loading_options_pricing;
      const pricingForUnloadingOption = reqBody.unloading_options_pricing;
      let loading_price = 0;
      let unloading_price = 0;

      // Loop Loading Option
      if (loadingFilter.length > 1) {
        loadingFilter.forEach((option) => {
          const getPricingForALoadingOption = pricingForLoadingOption.filter(
            (x) => x.name == option.name
          );
          const price = getPricingForALoadingOption[0].price * option.quantity;
          loading_price += price;
          // console.log(`Price For ${option.name} -> `, price);
        });
      } else if ((loadingFilter.length = 1)) {
        const getPricingForALoadingOption = pricingForLoadingOption.filter(
          (x) => x.name == loadingFilter[0].name
        );
        const price =
          getPricingForALoadingOption[0].price * loadingFilter[0].quantity;
        loading_price += price;
        // console.log(`Price For ${loadingFilter[0]} -> `, price);
      }

      // Loop Unloading Option
      if (unloadingFilter.length > 1) {
        unloadingFilter.forEach((option) => {
          const getPricingForAUnloadingOption =
            pricingForUnloadingOption.filter((x) => x.name == option.name);
          const price =
            getPricingForAUnloadingOption[0].price * option.quantity;
          unloading_price += price;
          // console.log(`Price For ${option.name} -> `, price);
        });
      } else if ((unloadingFilter.length = 1)) {
        const getPricingForAUnloadingOption = pricingForUnloadingOption.filter(
          (x) => x.name == unloadingFilter[0].name
        );
        const price =
          getPricingForAUnloadingOption[0].price * unloadingFilter[0].quantity;
        unloading_price += price;
        // console.log(`Price For ${unloadingFilter[0].name} -> `, price);
      }
      // =====================  Calculating Loading And Unloading Prices End ============================

      // =====================  Calculating All Prices Start ============================

      const totalServices = Math.ceil(loading_price + unloading_price);
      const floorPrice = Math.ceil(
        reqBody.pricingData.pricePerFloor * reqBody.floors
      );

      console.log(
        `departurePrice -> ${departurePrice} + arrivalPrice -> ${arrivalPrice}`
      );
      console.log(`= ${departurePrice + arrivalPrice}`);
      const driverPrice = Math.ceil(departurePrice + arrivalPrice);
      const othersPrice = Math.ceil(totalServices + floorPrice);
      const totalPrice = Math.ceil(othersPrice + driverPrice + timePrice);
      const commissionPrice = Math.ceil(
        totalPrice * (reqBody.CommissionPercent / 100)
      );

      // =====================  Calculating All Prices End ============================

      // =====================  Calculating Discount Prices Start ============================

      const discountPrice = 0;

      // if (reqBody.isFirst) {
      //   if (ForFirst.status && ForFirst.onService.bulk_delivery) {
      //     FreeCreated = true;
      //     if (totalPrice > ForFirst.min && totalPrice <= ForFirst.max)
      //       discountPrice = totalPrice;
      //     if (totalPrice > ForFirst.min && totalPrice >= ForFirst.max)
      //       discountPrice = ForFirst.max;
      //   } else if (reqBody.promoData != null)
      //     discountPrice = Math.floor(
      //       reqBody.promoData.type == "Rupees"
      //         ? reqBody.promoData.value || 0
      //         : reqBody.promoData.type == "Percentage"
      //         ? Math.ceil(
      //             ((reqBody.promoData.maxValue >= totalPrice
      //               ? totalPrice
      //               : reqBody.promoData.maxValue) *
      //               reqBody.promoData.value) /
      //               100
      //           ) || 0
      //         : 0
      //     );
      // } else if (reqBody.promoData != null)
      //   discountPrice = Math.floor(
      //     reqBody.promoData.type == "Rupees"
      //       ? reqBody.promoData.value || 0
      //       : reqBody.promoData.type == "Percentage"
      //       ? Math.ceil(
      //           ((reqBody.promoData.maxValue >= totalPrice
      //             ? totalPrice
      //             : reqBody.promoData.maxValue) *
      //             reqBody.promoData.value) /
      //             100
      //         ) || 0
      //       : 0
      //   );

      // =====================  Calculating Discount Prices End ============================

      let netTotalPrice = totalPrice - discountPrice;
      netTotalPrice += commissionPrice;

      const bill = {
        arrivalPrice: parseInt(arrivalPrice),
        loadingServices: loading_price,
        unloadingServices: unloading_price,
        commissionPrice,
        departurePrice: parseInt(departurePrice),
        discountPrice: parseInt(discountPrice),
        driverPrice,
        floorPrice,
        netTotalPrice,
        timePrice,
        totalPrice,
      };

      console.log("bill -> ", bill);
      req.body.bill = bill;

      return true;

      // console.log("price -> ", price);

      // if (reqBody.CreatedByAdmin) {
      //   await DBs.Request.Data.Update(reqBody.reqId, {
      //     driverHistory: null,
      //     labourPrice: null,
      //     totalPrice: null,
      //     discountPrice: null,
      //     netTotalPrice: null,
      //     commissionPrice: null,
      //   });
      // }
      // var OBJ = {};

      // if (AddaOrDriver.hasOwnProperty("phone")) {
      //   AddaOrDriver = {
      //     distance: AddaOrDriver.GoogleDistance.distance,
      //     duration: AddaOrDriver.GoogleDistance.duration,
      //     phone: AddaOrDriver.phone,
      //     lat: AddaOrDriver.current_position.lat,
      //     lng: AddaOrDriver.current_position.lng,
      //     vehicle_type: AddaOrDriver.vehicle_type,
      //   };

      //   OBJ["details"] = {
      //     bill: price,
      //     driver: AddaOrDriver,
      //   };

      //   // =====================================   TODO : DRIVER HISTORY
      //   const newDriverHistoryObject = driverHistoryRef.push();
      //   const objectkey = newDriverHistoryObject.key;

      //   newDriverHistoryObject
      //     .set({
      //       reqId: reqBody.reqId,
      //       driver: AddaOrDriver.phone,
      //       type: "scm",
      //       ...OBJ,
      //     })
      //     .then(() => {
      //       scmRequestRef.child(reqBody.reqId).update({
      //         pricingData: reqBody.pricingData,
      //       });
      //     })
      //     .catch((err) => console.log(err));

      //   // =====================================   TODO : PROMO DATA

      //   if (reqBody.promoData) {
      //     scmRequestRef.child(reqBody.reqId).update({
      //       promo: reqBody.promoData,
      //     });
      //   }

      //   // ===================================== Payment Type =====================================
      //   var paymentType = "cod";

      //   if (
      //     reqBody.request.use_wallet == true ||
      //     reqBody.request.use_wallet == "true"
      //   ) {
      //     paymentType = "wallet";
      //   } else {
      //     paymentType = "cod";
      //   }

      //   if (paymentType == "wallet") {
      //     var walletAmount = parseInt(reqBody.wallet.amount);
      //     console.log("walletAmount -> ", walletAmount);

      //     var deductFromWallet = walletAmount - price.netTotalPrice;
      //     console.log("deductFromWallet -> ", deductFromWallet);

      //     //  arrivalPrice: arrivalPrice,
      //     //  loadingServices: loading_price,
      //     //  unloadingServices: unloading_price,
      //     //  commissionPrice: commissionPrice,
      //     //  departurePrice: departurePrice,
      //     //  discountPrice: parseInt(discountPrice),
      //     //  driverPrice: driverPrice,
      //     //  floorPrice: floorPrice,
      //     //  netTotalPrice: netTotalPrice,
      //     //  timePrice: timePrice,
      //     //  totalPrice: totalPrice,

      //     // Case-1: When Wallet Have Amount More Than NetTotal
      //     if (walletAmount > price.netTotalPrice) {
      //       const newSCMInvoice = scmInvoiceRef.push();
      //       const invoiceId = newSCMInvoice.key;

      //       newSCMInvoice
      //         .set({
      //           invoiceId: invoiceId,
      //           requestId: reqBody.request.id,
      //           biltyNo: reqBody.request.biltyNo,
      //           driver_name: reqBody.driverData.fullname,
      //           driver_phone: reqBody.driverData.phone,
      //           vehicle_type: reqBody.driverData.vehicle_type,
      //           paymentType: "wallet",
      //           walletPreviousBalance: walletAmount,
      //           walletDeductedAmount: price.netTotalPrice,
      //           newWalletBalance: deductFromWallet,
      //           biltyAmount: price.netTotalPrice,
      //           totalPrice: price.totalPrice + "",
      //           discountPrice: price.discountPrice + "",
      //           netTotalPrice: price.netTotalPrice + "",
      //           commissionPrice: price.commissionPrice + "",
      //           commission: reqBody.CommissionData + "%",
      //           floorPrice: price.floorPrice + "",
      //           loadingPrice: price.loading_price + "",
      //           unloadingPrice: price.unloading_price + "",
      //         })
      //         .then(() => {
      //           scmRequestRef
      //             .child(reqBody.request.id)
      //             .update({
      //               invoiceId: invoiceId,
      //               paymentType: "wallet",
      //             })
      //             .then(() => {
      //               return true;
      //             })
      //             .catch((err) => console.log(err));
      //         })
      //         .catch((err) => console.log(err));
      //     }

      //     // Case-1: When Wallet Have Amount More Than NetTotal
      //     if (walletAmount < price.netTotalPrice) {
      //       // Dont Let Them Here !
      //       console.log("walletAmount < netTotalPric");
      //     }
      //   }

      //   if ((paymentType = "cod")) {
      //     const newSCMInvoice = scmInvoiceRef.push();
      //     const invoiceId = newSCMInvoice.key;
      //     console.log("Price -> ", price);
      //     newSCMInvoice
      //       .set({
      //         invoiceId: invoiceId,
      //         requestId: reqBody.request.id,
      //         biltyNo: reqBody.request.biltyNo,
      //         driver_name: reqBody.driverData.fullname,
      //         driver_phone: reqBody.driverData.phone,
      //         vehicle_type: reqBody.driverData.vehicle_type,
      //         paymentType: "cod",
      //         biltyAmount: price.netTotalPrice + "",
      //         amountPayable: price.netTotalPrice + "PKR",
      //         totalPrice: price.totalPrice + "",
      //         discountPrice: price.discountPrice + "",
      //         netTotalPrice: price.netTotalPrice + "",
      //         commissionPrice: price.commissionPrice + "",
      //         commission: reqBody.CommissionData + "%",
      //         floorPrice: price.floorPrice + "",
      //         loadingPrice: price.loading_price + "",
      //         unloadingPrice: price.unloading_price + "",
      //       })
      //       .then(() => {
      //         scmRequestRef
      //           .child(reqBody.request.id)
      //           .update({
      //             invoiceId: invoiceId,
      //             paymentType: "cod",
      //           })
      //           .then(() => {
      //             return true;
      //           })
      //           .catch((err) => console.log(err));
      //       })
      //       .catch((err) => console.log(err));
      //   }

      //   // var walletPrice = 0;
      //   // var amount = 0;
      //   // var roadioAmount = 0;

      //   // if (walletPrice < 0 || walletPrice < 0) {
      //   //   amount += roadioAmount = Math.abs(walletPrice);
      //   // } else {
      //   //   if (reqBody.wallet) {
      //   //     amount += roadioAmount = -walletPrice;
      //   //   }
      //   // }
      // }
      // return await true;
    } catch (e) {
      console.log(e);
      return await Promise.reject("erro in code");
    }
  },
  CHECK_distance(lat1, lon1, lat2, lon2) {
    const radlat1 = (Math.PI * lat1) / 180;
    const radlat2 = (Math.PI * lat2) / 180;
    const radlon1 = (Math.PI * lon1) / 180;
    const radlon2 = (Math.PI * lon2) / 180;
    const theta = lon1 - lon2;
    const radtheta = (Math.PI * theta) / 180;
    let dist =
      Math.sin(radlat1) * Math.sin(radlat2) +
      Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist);
    dist = (dist * 180) / Math.PI;
    dist = dist * 60 * 1.1515;
    dist *= 1.609344;
    return dist;
  },
};
