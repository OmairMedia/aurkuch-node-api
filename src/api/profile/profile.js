const express = require('express');
const router = express.Router();
const admin = require("firebase-admin");
const { userRef, profileRef, otpRef } = require("../../db/ref");
const { body, validationResult } = require("express-validator");
const momenttimezone = require("moment-timezone");
// Storage For File Uploads
const { Storage } = require("@google-cloud/storage");

const storage = new Storage({
  keyFilename: "src/config/serviceAccount.json",
});

const bucket = storage.bucket("aurkuch-982e5.appspot.com");
const validatePhoneNumber = require('validate-phone-number-node-js');
const {phone} = require('phone');
const axios = require('axios');
const credentials = require("../../config/private.json");

// Get Profile
router.get('/get_profile', (req,res) => {
    const params = req.body;

 try {
  admin.auth().getUser(params.id).then((user)=>{
    res.json({
      status:true,
      data: user
    })
  }).catch((err)=>{
    res.json({
      status:false,
      error:err.message
    })
  })

 } catch (err) {
   console.log(err);
   res.json({
    status:false,
    error:err
   })
 }
   
})

// Get Profile 2
router.post('/get_profile_2', (req,res) => {
  const params = req.body;

try {
admin.auth().getUser(params.id).then((user)=>{
  res.json({
    status:true,
    data: user
  })
}).catch((err)=>{
  res.json({
    status:false,
    error:err.message
  })
})

} catch (err) {
 console.log(err);
 res.json({
  status:false,
  error:err
 })
}
 
})

// Edit Profile
router.post('/edit_profile', (req,res) => {
    const params = req.body;


    admin.auth().updateUser(params.id, {
      displayName: params.displayName
    }).then(()=>{
      res.json({
        status:true,
        message: 'Profile Name Updated !'
      })
    }).catch((err) => {
      res.json({
        status:false,
        error:err.message
      })
    })

   
  
    // userRef.doc(params.id).update({
    //     ...params
    // }).then(() => {
    //     res.json({
    //         status:true,
    //         error: "Profile Updated Successfully !"
    //       })
      
    // }).catch((err)=>{
    //   res.json({
    //     status:false,
    //     error:err.message
    //   })
    // })
})


router.post('/edit_profile_image', 
// Upload Image
(req,res,next) => {
  const body = req.body;

  const { profile_image } = req.files;

  const path = "Profiles/";

   // Uploading Invoice
   const ntn_scan_image_filename = profile_image.name;
   const ntn_scan_image_filetype = ntn_scan_image_filename.split(".")[1];
   const ntn_scan_image_name = `${body.id}_profile_image`;

  fileUpload(profile_image, ntn_scan_image_name, path, ntn_scan_image_filetype, (err) => {
    if (err) {
      console.log("err -> ", err);
    } else {
      next();
    }
  });
},
 // Get Images Links
 async (req, res, next) => {
  const params = req.body;

  let options = {
    prefix: `Profiles/`,
  };

  const [files] = await storage.bucket("aurkuch-982e5.appspot.com").getFiles(options);
  var profileImage;

  files.forEach((file) => {
    const fileName = file.name;

    if (fileName.includes(params.id)) {
      let image = file.publicUrl();
      profileImage = image;
      console.log("image -> ", image);
    }
  });

  req.body.profileImages = profileImage;
  console.log("uploadImages -> ", profileImage);
  next()
},
// Update User Image
 async (req,res) => {
    const params = req.body;

    console.log('profileImages -> ',params.profileImages)

    await admin.auth().updateUser(params.id, {
      photoURL: params.profileImages
    }).catch((err) => {
      res.json({
        status:false,
        error:err.message
      })
    })

    res.json({
      status:true,
      message: 'User Profile Image Updated !'
    })
  
}
)  


const FormData = require('form-data');



// Send Otp For Add/Edit Phone Number
router.post("/send_add_phone_otp", 
// Generate OTP Code 
async (req,res,next) => {
  try {
    const body = req.body;

  const code = Math.floor(Math.random() * 9000) + 1000; 

  const result = phone(body.phone, {country: 'PAK'}); 

  console.log('result -> ',result);

  let params = {
    key: credentials.brandedsms.apiKey,
    email: "danihayat47@yahoo.com",
    mask: "H3 TEST SMS",
    to: result.phoneNumber,
    message:`Welcome to aurkuch, Here is your otp for phone verification ${code}. Please do not share this code with anyone.`
  };

  let encodedParams = Object.keys(params)
  .map((key) => `${key}=${encodeURIComponent(params[key])}`)
  .join('&');

  let config = {
    method: 'POST',
    url: "https://secure.h3techs.com/sms/api/send",
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: encodedParams
  };

  const addotp = otpRef.child(code);
  addotp
    .set({
      uid: body.uid,
      phone: result.phoneNumber,
      code: code,
    })
    .then(async () => {
      let response = await axios(config);
      console.log('response -> ',response.data);
      if(response.data.sms.code === '000') {
        res.json({
          status:true,
          otp: code,
          message: 'Otp has been sent!'
        })
      } else {
        res.json({
          status:false,
          error: response.data.sms.response
        })
      }
     
     })
    .catch((err)=>{
      res.json({
        status:false,
        error:err
      })
    });

 


  } catch (err) {
    console.log('err -> ',err);
    res.json({
      status:false,
      error: err
    });
  }
  
  
})


router.post('/verify_and_add_phone',
// Check Otp
(req,res,next) => {
  const body  = req.body;

  try {
    otpRef.child(body.otp).once('value', (snapshot) => {
      if(snapshot.val()) {
        let otp = snapshot.val();
        let phone = otp.phone;
        let uid = otp.uid;
  
        userRef.child(uid).update({
          phone: phone,
          phoneVerified: true
        }).then(()=>{
          admin.auth().updateUser(uid, { 
            phoneNumber: phone,
            phoneVerified: true
          }).then(()=>{
            otpRef.child(body.otp).remove().then(()=>{
                res.json({
                  status:true,
                  message: 'Your phone number has been updated!'
                })
            }).catch(err => console.log(err));
          }).catch(err => console.log(err));
        }).catch(err => console.log(err));
      } else {
        res.json({
          status:false,
          error: 'Invalid Otp!'
        })
      }
    })
  } catch (err) {
    console.log('err -> ',err);
    res.json({
      status:false,
      error:err
    })
  }
  
})








function filesCheck(obj, errors) {
    const filesKeys = Object.keys(obj);
    const filesLength = filesKeys.length;
    for (let i = 0; i < filesLength; i++) {
      let err = {};
      if (typeof obj[filesKeys[i]].file === "undefined") {
        err = {
          param: filesKeys[i],
          msg: `${obj[filesKeys[i]].title} is required!`,
        };
        errors.push(err);
      }
    }
}
  
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
  



module.exports = router;