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
  PPLOrderStatus() {
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

          case "allotment":
            console.log("allotment -> ", data);
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
            break;

          case "rejected":
            console.log("rejected -> ", data);
            break;
          case "cancelled":
            console.log("cancelled -> ", data);
              // Generate Invoice
            break;

          case "allotment":
            console.log("allotment -> ", data);
            // Generate Invoice
            break;

          default:
            break;
        }


        // Check Bilty Statuses 
          pplRequestRef.child(request.orderNo).child("bilty").on("child_changed", (biltySnap) => { 
            const bilty = biltySnap.val();
            
            console.log("Bilty Status Changed !");
          
        })
      }


      

      
    });
  },
  PPLTransitCounterOffersStatus() {
    let qouteCheck = 0;
    let userCounterCheck = 0;
    let vendorCounterCheck = 0;

    // Checking If Child Is Added
    pplBiddingsRef
      .child("transit")
      .child("qoutes")
      .once("value", (totSnap) => {
        let totalQoutes = totSnap.numChildren();

        pplBiddingsRef
          .child("transit")
          .child("qoutes")
          .on("child_added", (addSnap) => {
            qouteCheck++;
            // console.log('Total Request Count In Child Addedd -> ',checkChildAdded)

            if (totalQoutes < qouteCheck) {
              const qoute = addSnap.val();
              totalQoutes = qouteCheck;
              console.log(
                `Vendor(${qoute.phone}) Has Qouted On OrderNo#${qoute.orderNo} for amount = ${qoute.qoute_amount}`
              );
            }
          });
      });

    // Checking If Child Is Added
    pplBiddingsRef
      .child("transit")
      .child("user_counter")
      .once("value", (totSnap) => {
        let totalUserCounters = totSnap.numChildren();

        pplBiddingsRef
          .child("transit")
          .child("user_counter")
          .on("child_added", (addSnap) => {
            userCounterCheck++;
            // console.log('Total Request Count In Child Addedd -> ',checkChildAdded)

            if (totalUserCounters < userCounterCheck) {
              const userCounter = addSnap.val();
              totalUserCounters = userCounterCheck;
              console.log(
                `User(${userCounter.user_phone}) Has Countered The Qoute from vendor(${userCounter.vendor_phone}) On OrderNo#${userCounter.orderNo} for amount = ${userCounter.amount}`
              );
            }
          });
      });

    // Checking If Child Is Added
    pplBiddingsRef
      .child("transit")
      .child("vendor_counter")
      .once("value", (totSnap) => {
        let totalVendorCounters = totSnap.numChildren();

        pplBiddingsRef
          .child("transit")
          .child("vendor_counter")
          .on("child_added", (addSnap) => {
            vendorCounterCheck++;
            // console.log('Total Request Count In Child Addedd -> ',checkChildAdded)

            if (totalVendorCounters < vendorCounterCheck) {
              const vendorCounter = addSnap.val();
              totalVendorCounters = vendorCounterCheck;
              console.log(
                `Vendor(${vendorCounter.user_phone}) Has Countered The User Counter Offer On OrderNo#${vendorCounter.orderNo} for amount = ${vendorCounter.amount}`
              );
            }
          });
      });

    pplBiddingsRef
      .child("transit")
      .child("qoutes")
      .on("child_changed", (addSnap) => {
        const qoute = addSnap.val();

        console.log(
          `Vendor Qoute For OrderNo#${qoute.orderNo} Has been ${qoute.status}`
        );
      });

    pplBiddingsRef
      .child("transit")
      .child("user_counter")
      .on("child_changed", (addSnap) => {
        const userCounter = addSnap.val();

        console.log(
          `User Counter Offer For OrderNo#${userCounter.orderNo} has been ${userCounter.status}`
        );
      });

    pplBiddingsRef
      .child("transit")
      .child("vendor_counter")
      .on("child_changed", (addSnap) => {
        const vendorCounter = addSnap.val();

        console.log(
          `Vendor Counter Offer For OrderNo#${vendorCounter.orderNo} has been ${vendorCounter.status}`
        );
      });
  },
  PPLUpcountryCounterOffersStatus() {
    let qouteCheck = 0;
    let userCounterCheck = 0;
    let vendorCounterCheck = 0;

    // Checking If Child Is Added
    pplBiddingsRef
      .child("upcountry")
      .child("qoutes")
      .once("value", (totSnap) => {
        let totalQoutes = totSnap.numChildren();

        pplBiddingsRef
          .child("upcountry")
          .child("qoutes")
          .on("child_added", (addSnap) => {
            qouteCheck++;
            // console.log('Total Request Count In Child Addedd -> ',checkChildAdded)

            if (totalQoutes < qouteCheck) {
              const qoute = addSnap.val();
              totalQoutes = qouteCheck;
              console.log(
                `Vendor(${qoute.phone}) Has Qouted On OrderNo#${qoute.orderNo} for amount = ${qoute.qoute_amount}`
              );
            }
          });
      });

    // Checking If Child Is Added
    pplBiddingsRef
      .child("upcountry")
      .child("user_counter")
      .once("value", (totSnap) => {
        let totalUserCounters = totSnap.numChildren();

        pplBiddingsRef
          .child("upcountry")
          .child("user_counter")
          .on("child_added", (addSnap) => {
            userCounterCheck++;
            // console.log('Total Request Count In Child Addedd -> ',checkChildAdded)

            if (totalUserCounters < userCounterCheck) {
              const userCounter = addSnap.val();
              totalUserCounters = userCounterCheck;
              console.log(
                `User(${userCounter.user_phone}) Has Countered The Qoute from vendor(${userCounter.vendor_phone}) On OrderNo#${userCounter.orderNo} for amount = ${userCounter.amount}`
              );
            }
          });
      });

    // Checking If Child Is Added
    pplBiddingsRef
      .child("upcountry")
      .child("vendor_counter")
      .once("value", (totSnap) => {
        let totalVendorCounters = totSnap.numChildren();

        pplBiddingsRef
          .child("upcountry")
          .child("vendor_counter")
          .on("child_added", (addSnap) => {
            vendorCounterCheck++;
            // console.log('Total Request Count In Child Addedd -> ',checkChildAdded)

            if (totalVendorCounters < vendorCounterCheck) {
              const vendorCounter = addSnap.val();
              totalVendorCounters = vendorCounterCheck;
              console.log(
                `Vendor(${vendorCounter.user_phone}) Has Countered The User Counter Offer On OrderNo#${vendorCounter.orderNo} for amount = ${vendorCounter.amount}`
              );
            }
          });
      });

    pplBiddingsRef
      .child("upcountry")
      .child("qoutes")
      .on("child_changed", (addSnap) => {
        const qoute = addSnap.val();

        console.log(
          `Vendor Qoute For OrderNo#${qoute.orderNo} Has been ${qoute.status}`
        );
      });

    pplBiddingsRef
      .child("upcountry")
      .child("user_counter")
      .on("child_changed", (addSnap) => {
        const userCounter = addSnap.val();

        console.log(
          `User Counter Offer For OrderNo#${userCounter.orderNo} has been ${userCounter.status}`
        );
      });

    pplBiddingsRef
      .child("upcountry")
      .child("vendor_counter")
      .on("child_changed", (addSnap) => {
        const vendorCounter = addSnap.val();

        console.log(
          `Vendor Counter Offer For OrderNo#${vendorCounter.orderNo} has been ${vendorCounter.status}`
        );
      });
  },
  PPLVendorDriverStatus() {
    userRef.child("vendor_drivers").on("child_changed", (addSnap) => {
      const driver = addSnap.val();

      switch (driver.availability) {
        case false:
          console.log(
            `Driver For Vendor(${driver.vendor_phone}) is now available`
          );
          break;

        case true:
          console.log(
            `Driver For Vendor(${driver.vendor_phone}) is busy on Bilty#${driver.on_bilty}`
          );
          break;

        default:
          break;
      }
    });
  },
};

// mail.GeneratePPLTransitInvoice();
// mail.PPLOrderStatus();
mail.PPLGenerateInvoice();
mail.PPLTransitCounterOffersStatus();
mail.PPLUpcountryCounterOffersStatus();
