const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { getStorage } = require('firebase-admin/storage');
const { sliderRef , trackingRef, userRef} = require("../../db/ref");
const { body, validationResult } = require("express-validator");
const momenttimezone = require("moment-timezone");



const { Storage } = require("@google-cloud/storage");

const storage = new Storage({
  keyFilename: "src/config/serviceAccount.json",
});

const bucket = storage.bucket('aurkuch-982e5.appspot.com');


// Get Image
router.get("/get_images", (req, res) => {
  const params = req.body;

  sliderRef
    .once('value',(snapshot) => {
      if (snapshot.val()) {
        let data = [];
        snapshot.forEach((x) => {
          data.push(x.val());
        });

        res.json({
          status:true,
          data:data
        })
      } else {
        res.json({
          status: true,
          data: [],
        });
      }
    })
    .catch((err) => {
      res.json({
        status: false,
        error: err.message,
      });
    });
});

// Edit Image
router.post("/add_image", 
// Check Image 
(req,res,next) => {
  console.log('files -> ',req.files);
  console.log('Body -> ',req.body);

},
// Check Image
async (req,res,next) => {
    const params = req.body;

    let options = {
      prefix: `Slider/`,
    };

    const [files] = await bucket.getFiles(options);
    
    let length  = files.length;

    req.body.count = length;

    next();

},
// Upload Image
(req,res,next) => {
    const params = req.body;

    const path = "Slider/";

    const { image } = req.files;

    // Uploading Profile Image
    const image_filename = image.name;
    const image_filetype = image_filename.split(".")[1];
    const image_name = `${params.count}_image`;

    fileUpload(
        image,
        image_name,
        path,
        image_filetype,
        (err) => {
          if (err) {
            console.log("err -> ", err);
          } else if (err == null) {
            console.log("image uploaded");
            next();
          }
        }
      );

},
 // Get Images Links
 async (req, res, next) => {
    const params = req.body;

    let options = {
      prefix: `Slider/`,
    };

    const [files] = await bucket.getFiles(options);
    var uploadImages = [];

    files.forEach((file) => {
      const fileName = file.name;

      if (fileName.includes(params.count)) {
        let image = {
          name: file.name,
          url: file.publicUrl(),
        };

        uploadImages.push(image);
      }
    });

    req.body.imageurl = uploadImages;

    console.log('imageurl -> ',req.body.imageurl)
    next();
  },
// Save In Database
(req, res) => {
  const params = req.body;


  let newImage = sliderRef.doc();
  let key = newImage.id;

  // Add a new document with a generated id.
  newImage
    .set({
      id: key,
      index: params.count,
      url: params.imageurl[0].url,
      added: momenttimezone.tz("Asia/Karachi").valueOf()
    })
    .then((docRef) => {
      console.log("Document written with ID: ", docRef.id);
      res.json({
        status: true,
        message: "Image Added Successfully",
      });
    })
    .catch((err) => {
      res.json({
        status: false,
        error: err.message,
      });
    });

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
});

// Remove Image
router.post("/remove_image", 
// Get Images
async (req, res, next) => {
    const params = req.body;

    let options = {
      prefix: `Slider/`,
    };

    const [files] = await bucket.getFiles(options);
    var uploadImages = [];

    files.forEach((file) => {
      const fileName = file.name;

      if (fileName.includes(params.index)) {
        let image = {
          name: file.name,
          url: file.publicUrl(),
        };

        uploadImages.push(image);
      }
    });

    req.body.imageurl = uploadImages;

    console.log('imageurl -> ',req.body.imageurl)
    next();
},
// Delete Record
(req,res,next) => {
    const params = req.body;

    sliderRef.doc(params.id).delete().then(() => {
        next();
    }).catch((err)=>{
        res.json({
            status:false,
            error:err.message
        })
    })
},
// Remove Image From Storage
async (req, res, next) => {
    const params = req.body;

    let options = {
      prefix: `Slider/`,
    };

    try {
       await bucket.file(`${params.imageurl[0].name}`).delete();

       res.json({
        status:true,
        message: "Image deleted successfully !"
       })
    } catch (error) {
        console.log(error)
    }

});

// Track Users
router.post('/track_user', 
// Get Image Data
(req,res,next) => {
   const body = req.body;

   sliderRef.child(body.image_id).once('value', (snapshot) => {
    if(snapshot.val()) {
       let image = snapshot.val();
       req.body.image = image;
       next();
    } else {
       res.json({
        status:false,
        error: 'Image Not Found!'
       })
    }
   })
},
// Get User Data 
(req,res,next) => {
  const body = req.body;

  admin.auth().getUser(body.uid).then((userSnapshot)=>{
    if(userSnapshot) {
       let user = {
        displayName: userSnapshot.displayName,
        email: userSnapshot.email,
        phone: userSnapshot.phoneNumber || ""
       }

       req.body.user= user;
       next();
    } else {
      res.json({
        status:false,
        error:'User found error !'
      })
    }
  }).catch((err)=>{
    res.json({
      status:false,
      error:err
    })
  })
},
(req,res) => {
  const body = req.body;

  let newTrackRef = trackingRef.push();

  trackingRef.child(`${body.uid}-${body.image_id}`).set({
    ...body.image,
    ...body.user,
    id: newTrackRef.key,
    uid: body.uid,
    image_id: body.image_id,
    viewed_on: momenttimezone.tz("Asia/Karachi").valueOf()
  }).then(()=>{
      res.json({
        status:true,
        message: 'tracked !'
      })
  }).catch((err)=>{
      res.json({
        status:false,
        error:err
      })
  })
})



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
