const moment = require("moment");
const fs = require("fs");

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "Meribilty.com",
  port: 465,
  secure: true,
  auth: {
    user: "admin@Meribilty.com",
    pass: "4Slash1234!@#$",
  },
  tls: { rejectUnauthorized: false },
});

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
} = require("../db/newRef");

const {
  userRef,
  forgetPasswordOTPRef,
  registrationOTPRef,
  walletRef,
} = require("../db/ref");


const { generatePPLinvoice } = require('../functions/slash')

let checkChildAdded = 0;

const jobs = {
 
};


// jobs.PPLGenerateInvoice();
// jobs.PPLTransitCounterOffersStatus();
// jobs.PPLUpcountryCounterOffersStatus();