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

const { generatePPLinvoice } = require("../functions/slash");

let checkChildAdded = 0;

const mail = {
  PPLGenerateInvoice() {
    pplRequestRef.on("child_changed", (addSnap) => {
      const request = addSnap.val();
      console.log("A PPL Request Is Been Modified");

      if (request.request_type == "upcountry") {
        let data = {
          qoute_accepted_on: request.qoute_accepted_on || null,
          qoute_rejected_on: request.qoute_rejected_on || null,
          user_counter_accepted_on: request.user_counter_accepted_on || null,
          user_counter_rejected_on: request.user_counter_rejected_on || null,
          vendor_counter_accepted_on:
            request.vendor_counter_accepted_on || null,
          vendor_counter_rejected_on:
            request.vendor_counter_rejected_on || null,
          order_rejected_on: request.order_rejected_on || null,
          order_accepted_on: request.order_accepted_on || null,
        };

        switch (request.status) {
          case "qoute_accepted":
            console.log("qoute accepted -> ", data);
            break;

          case "qoute_rejected":
            console.log("qoute_rejected -> ", data);
            break;

          case "user_counter_accepted":
            console.log("user_counter_accepted -> ", data);
            break;

          case "user_counter_rejected":
            console.log("user_counter_rejected -> ", data);
            break;

          case "vendor_counter_accepted":
            console.log("vendor_counter_accepted -> ", data);
            break;

          case "vendor_counter_rejected":
            console.log("vendor_counter_rejected -> ", data);
            break;

          case "accepted":
            console.log("accepted -> ", data);
            break;

          case "rejected":
            console.log("rejected -> ", data);
            break;

          case "completed":
            generatePPLinvoice(request)
              .then(() => {
                console.log("PPL Upcountry invoice generated");
              })
              .catch((err) => console.log({ err }));
            // Generate Invoice
            break;

          default:
            break;
        }
      }

      if (request.request_type == "transit") {
        let data = {
          qoute_accepted_on: request.qoute_accepted_on || null,
          qoute_rejected_on: request.qoute_rejected_on || null,
          user_counter_accepted_on: request.user_counter_accepted_on || null,
          user_counter_rejected_on: request.user_counter_rejected_on || null,
          vendor_counter_accepted_on:
            request.vendor_counter_accepted_on || null,
          vendor_counter_rejected_on:
            request.vendor_counter_rejected_on || null,
          order_rejected_on: request.order_rejected_on || null,
          order_accepted_on: request.order_accepted_on || null,
        };

        switch (request.status) {
          case "qoute_accepted":
            console.log("qoute accepted -> ", data);
            break;

          case "qoute_rejected":
            console.log("qoute_rejected -> ", data);
            break;

          case "user_counter_accepted":
            console.log("user_counter_accepted -> ", data);
            break;

          case "user_counter_rejected":
            console.log("user_counter_rejected -> ", data);
            break;

          case "vendor_counter_accepted":
            console.log("vendor_counter_accepted -> ", data);
            break;

          case "vendor_counter_rejected":
            console.log("vendor_counter_rejected -> ", data);
            break;

          case "accepted":
            console.log("accepted -> ", data);

            generatePPLinvoice(request)
              .then(() => {
                console.log("invoice generated");
              })
              .catch((err) => console.log({ err }));

            break;

          case "rejected":
            console.log("rejected -> ", data);
            break;

          case "allotment":
            console.log("allotment -> ", data);
            // Generate Invoice
            break;

          default:
            break;
        }
      }

     
    });
  },
 watchOrders () {
    pplRequestRef.on("child_changed", (addSnap) => {
       
    }) 
 }
};

// mail.GeneratePPLTransitInvoice();
// mail.PPLOrderStatus();
mail.PPLGenerateInvoice();
mail.PPLTransitCounterOffersStatus();
mail.PPLUpcountryCounterOffersStatus();
