const express = require('express');
const router = express.Router();
const admin = require("firebase-admin");
const { userRef, profileRef } = require("../../db/ref");
const { body, validationResult } = require("express-validator");
const momenttimezone = require("moment-timezone");
// Storage For File Uploads
const { Storage } = require("@google-cloud/storage");

const storage = new Storage({
  keyFilename: "src/config/serviceAccount.json",
});

const bucket = storage.bucket("aurkuch-982e5.appspot.com");


// Get Profile
router.get('/get_profile', (req,res) => {
    const params = req.body;

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