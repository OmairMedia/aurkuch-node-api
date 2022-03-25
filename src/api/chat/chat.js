const express = require("express");
const router = express.Router();
const { StreamChat } = require("stream-chat");
const { verifyToken, verifyTokenVendorApp, verifyTokenFirebase } = require("../../functions/slash");
const { pplRequestRef, scmRequestRef } = require("../../db/newRef");
const { userRef } = require("../../db/ref");
const { body, validationResult } = require("express-validator");

// initialize Stream Chat SDK
const streamClient = new StreamChat(
  "r4vjktd8gbcr",
  "mkpxnc6jddehcdt7cxguk8p9fxs8nadwmwua2gwtk89zs3422kfaxbmgm26n4pwf"
);

router.post("/join",
// body("user_id").isString().withMessage("user_id must be a string"),
// Validator
// (req, res, next) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ errors: errors.array() });
//   } else {
//     next();
//   }
// },
verifyTokenFirebase,
async (req, res) => {
  const orderArr = [];
  const biltyArr = [];
  var { user_id } = req.body.user;
  const { user_type } = req.body.user;

  if (user_type == 'user' || user_type == 'pro') {
    await pplRequestRef
    .orderByChild("user_phone")
    .equalTo(user_id)
    .once("value", (snapshot) => {
      if (snapshot.val()) {
        snapshot.forEach((snap) => {
          let request = snap.val();
  
          if (request.status != "completed") {
            orderArr.push(request.orderNo);
            
            if (request.request_type == "transit") {
              request.bilty.forEach((bilty) => {
                biltyArr.push(bilty.biltyNo)
              })
            } else if (request.request_type == "upcountry") {
              request.subOrders.forEach((subOrder) => {
                subOrder.bilty.forEach((bilty) => {
                  biltyArr.push(bilty.biltyNo)
                })
              })
            }
          }
        })
      }
    })    
  } else if (user_type == 'vendor') {
    await userRef
    .child("vendors")
    .child(user_id)
    .once('value', (snap) => {
      if (snap.val()) {
        const orders = snap.val().orders;
        if (orders) {
          orderArr.push(orders)
        }
      } else {
        res.json({
          status: false,
          message: "Vendor Not Found !",
        });
      }
    })
    
    orderArr.forEach(async(orderNo) => {
      await pplRequestRef
      .child(orderNo)
      .once("value", (snapshot) => {
        if (snapshot.val()) {
          snapshot.forEach((snap) => {
            let request = snap.val();
    
            if (request.status != "completed") {
              
              if (request.request_type == "transit") {
                request.bilty.forEach((bilty) => {
                  biltyArr.push(bilty.biltyNo)
                })
              } else if (request.request_type == "upcountry") {
                request.subOrders.forEach((subOrder) => {
                  if (subOrder.vendor_phone == user_id) {
                    subOrder.bilty.forEach((bilty) => {
                      biltyArr.push(bilty.biltyNo)
                    })                    
                  }
                })
              }
            } else {
              orderArr.splice(orderArr.findIndex(orderNo), 1);
            }
          })
        }
      })
    })
  } else if (user_type == 'driver') {
    await userRef
    .child("drivers")
    .child(user_id)
    .once('value', (snap) => {
      if (snap.val()) {
        const biltyNo = snap.val().biltyNo;
        if (biltyNo) {
          biltyArr.push(biltyNo);
          const length = biltyNo.length;
          const orderNo = biltyNo.slice(2,(length - 2));
          orderArr.push(orderNo);
        }
      } else {
        res.json({
          status: false,
          message: "Driver Not Found !",
        });
      }
    })
  }

  user_id = user_id.slice(1);
  
  const admin_id = 'Asher';
  const admin = await streamClient.upsertUser({id: admin_id, role: 'admin'}, {id: user_type+'_'+user_id, role: 'user'});
  console.log('Admin ===', admin.users[Object.keys(admin.users)[0]].id);
  console.log("user_phone -> ", user_id);
  console.log("user_type -> ", user_type);

  orderArr.forEach(async (orderNo) => {
    const channel = streamClient.channel('livestream', `Order${orderNo}`, {name: `Order${orderNo}`, created_by_id: admin_id});
    await channel.create();
    await channel.addMembers([user_type+'_'+user_id])
  });
  
  biltyArr.forEach(async (biltyNo) => {
    const channel = streamClient.channel('livestream', biltyNo, {name: biltyNo, created_by_id: admin_id});
    await channel.create();
    await channel.addMembers([user_type+'_'+user_id])
  });

  // generate Stream Chat token to use to authenticate user on the client
  const token = streamClient.createToken((user_type+'_'+user_id));

  res.status(200).json({ token, user_id, user_type, orderArr, biltyArr });
});

module.exports = router;