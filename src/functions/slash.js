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
} = require("../db/ref");


const bcrypt = require("bcrypt-nodejs");
const saltRounds = 10;
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const _ = require("lodash");


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
};
