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
} = require("../../db/newRef");

const {
  userRef,
  forgetPasswordOTPRef,
  registrationOTPRef,
  walletRef,
} = require("../../db/ref");

let tot_u_inv_count = 0;
let last_u_inv_count = 0;

// let tot_d_inv_count = 0;
// let last_d_inv_count = 0;

let checkChildAdded = 0;
let checkUserChildAdded = 0;
let checkProUserChildAdded = 0;
let checkUserAgentChildAdded = 0;
let checkDriverChildAdded = 0;
let checkVendorChildAdded = 0;
let checkVendorDriverChildAdded = 0;

const mail = {
  sendPPLRequestEmailToAdmin() {
    pplRequestRef.once("value", (totSnap) => {
      let totalRequests = totSnap.numChildren();
      console.log("totalRequests -> ", totalRequests);
      pplRequestRef.on("child_added", (addSnap) => {
        checkChildAdded++;
        // console.log('Total Request Count In Child Addedd -> ',checkChildAdded)

        if (totalRequests < checkChildAdded) {
          const request = addSnap.val();
          totalRequests = checkChildAdded;
          console.log("New PPL Request Found");
          const mailOption = {
            from: '"RoadioApp Pakistan" <noreply@roadioapp.com>',
            to: "omair@4slash.com",
            subject: `A New PPL Request Has Been Made`,
            html: `
              
              A New PPL Request Has Been Made
              
              OrderNo# ${request.orderNo}
              
              Request Made By User -> ${request.user_phone} 
              Request Made On -> ${request.createdAt}

              `,
          };

          transporter.sendMail(mailOption, (err, info) => {
            if (err) {
              console.log("err -> ", err);
            }
          });
        }
      });
    });
  },
  sendNewUserRegisterEmailToAdmin() {
    userRef.child("users").once("value", (totSnap) => {
      let totalUsers = totSnap.numChildren();
      console.log("totalUsers -> ", totalUsers);
      userRef.child("users").on("child_added", (addSnap) => {
        checkUserChildAdded++;

        if (totalUsers < checkUserChildAdded) {
          const user = addSnap.val();
          totalUsers = checkUserChildAdded;
          console.log("New User Has Registered !");
          const mailOption = {
            from: '"RoadioApp Pakistan" <noreply@roadioapp.com>',
            to: "omair@4slash.com",
            subject: `A New PPL Request Has Been Made`,
            html: `
              
              A New User Has Been Registered On Meribilty App
              
              User - ${user.phone}
              User's Email - ${user.email} 
            
              User Registered On -> ${user.created}
              `,
          };

          transporter.sendMail(mailOption, (err, info) => {
            if (err) {
              console.log("err -> ", err);
            }
          });
        }
      });
    });
  },
  sendNewProUserRegisterEmailToAdmin() {
    userRef.child("pro").once("value", (totSnap) => {
      let totalUsers = totSnap.numChildren();
      console.log("totalUsers -> ", totalUsers);
      userRef.child("pro").on("child_added", (addSnap) => {
        checkProUserChildAdded++;

        if (totalUsers < checkProUserChildAdded) {
          const user = addSnap.val();
          totalUsers = checkProUserChildAdded;
          console.log("New User Has Registered !");
          const mailOption = {
            from: '"RoadioApp Pakistan" <noreply@roadioapp.com>',
            to: "omair@4slash.com",
            subject: `A New PPL Request Has Been Made`,
            html: `
              
              A New Pro User Has Been Registered As A Normal User On Meribilty App
              
              User - ${user.phone}
              User's Email - ${user.email} 
            
              User Registered On -> ${user.created}

              Application Submission & Approval Pending
              `,
          };

          transporter.sendMail(mailOption, (err, info) => {
            if (err) {
              console.log("err -> ", err);
            }
          });
        }
      });
    });
  },
  sendNewUserAgentCreatedEmailToAdmin() {
    userRef.child("user_agents").once("value", (totSnap) => {
      let totalUsers = totSnap.numChildren();
      console.log("totalUsers -> ", totalUsers);
      userRef.child("user_agents").on("child_added", (addSnap) => {
        checkUserAgentChildAdded++;

        if (totalUsers < checkUserAgentChildAdded) {
          const user = addSnap.val();
          totalUsers = checkUserAgentChildAdded;
          console.log("New User Has Registered !");
          const mailOption = {
            from: '"RoadioApp Pakistan" <noreply@roadioapp.com>',
            to: "omair@4slash.com",
            subject: `A New User Agent/Contact Person Has Been Created`,
            html: `
              
              A New User Agent/Contact Person Has Been Registered On Meribilty App By User(${user.agent_for})
              
              Agent/Contact Person - ${user.phone}
              Agent/Contact Person's Email - ${user.email} 
            
              Agent/Contact Person Registered On -> ${user.agent_added_on}

              `,
          };

          transporter.sendMail(mailOption, (err, info) => {
            if (err) {
              console.log("err -> ", err);
            }
          });
        }
      });
    });
  },
  sendNewDriverRegisteredEmailToAdmin() {
    userRef.child("drivers").once("value", (totSnap) => {
      let totalUsers = totSnap.numChildren();
      console.log("totalUsers -> ", totalUsers);
      userRef.child("drivers").on("child_added", (addSnap) => {
        checkDriverChildAdded++;

        if (totalUsers < checkDriverChildAdded) {
          const user = addSnap.val();
          totalUsers = checkDriverChildAdded;
          console.log("New User Has Registered !");
          const mailOption = {
            from: '"RoadioApp Pakistan" <noreply@roadioapp.com>',
            to: "omair@4slash.com",
            subject: `A New User Agent/Contact Person Has Been Created`,
            html: `
              
              A New Driver Has Been Registered On Meribilty App
              
              Driver Name - ${user.fullname}
              Driver Email - ${user.email} 
            
              Driver Registered On -> ${user.created}

              `,
          };

          transporter.sendMail(mailOption, (err, info) => {
            if (err) {
              console.log("err -> ", err);
            }
          });
        }
      });
    });
  },
  sendNewVendorRegisteredEmailToAdmin() {
    userRef.child("vendors").once("value", (totSnap) => {
      let totalUsers = totSnap.numChildren();
      console.log("totalUsers -> ", totalUsers);
      userRef.child("vendors").on("child_added", (addSnap) => {
        checkVendorChildAdded++;

        if (totalUsers < checkVendorChildAdded) {
          const user = addSnap.val();
          totalUsers = checkVendorChildAdded;
          console.log("New Vendor Has Registered !");
          const mailOption = {
            from: '"RoadioApp Pakistan" <noreply@roadioapp.com>',
            to: "omair@4slash.com",
            subject: `A New Vendor Has Been Registered`,
            html: `
              
              A New Vendor Has Been Registered On Meribilty App
              
              Vendor Name - ${user.company_name}
              Vendor Phone - ${user.phone} 
            
              Vendor Registered On -> ${user.created}

              `,
          };

          transporter.sendMail(mailOption, (err, info) => {
            if (err) {
              console.log("err -> ", err);
            }
          });
        }
      });
    });
  },
  sendNewVendorDriverRegisteredEmailToAdmin() {
    userRef.child("vendor_drivers").once("value", (totSnap) => {
      let totalUsers = totSnap.numChildren();
      console.log("totalUsers -> ", totalUsers);
      userRef.child("vendor_drivers").on("child_added", (addSnap) => {
        checkVendorDriverChildAdded++;

        if (totalUsers < checkVendorDriverChildAdded) {
          const user = addSnap.val();
          totalUsers = checkVendorDriverChildAdded;
          console.log("New Vendor Has Registered !");
          const mailOption = {
            from: '"RoadioApp Pakistan" <noreply@roadioapp.com>',
            to: "omair@4slash.com",
            subject: `A New Vendor's Driver Has Been Created`,
            html: `
              
              A New Vendor's Driver Has Been Created On Meribilty App By Vendor(${
                user.vendor.company_name
              })
              
              Driver Name - ${user.firstname + user.lastname}
              Driver Phone - ${user.phone} 
            
              Driver Created On -> ${user.created}

              `,
          };

          transporter.sendMail(mailOption, (err, info) => {
            if (err) {
              console.log("err -> ", err);
            }
          });
        }
      });
    });
  },
};

mail.sendPPLRequestEmailToAdmin();
