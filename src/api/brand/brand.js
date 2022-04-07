const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { userRef, walletRef, brandRef,  brandCategoriesRef } = require("../../db/ref");
const { body, validationResult } = require("express-validator");
const QRCode = require('qrcode')

// Create Categories
// {
//   "name": ""
// }
router.post("/create_category", (req, res) => {
  const params = req.body;

  // Add a new document with a generated id.
  brandCategoriesRef
    .add({
      name: params.name,
      created: admin.firestore.FieldValue.serverTimestamp(),
    })
    .then((docRef) => {
      res.json({
        status: true,
        message: "Category Added Successfully",
      });
    })
    .catch((error) => {
      res.json({
        status: false,
        message: error,
      });
    });
});


// Get Categories
router.get('/get_categories', (req,res) => {
  const params = req.body;

  brandCategoriesRef.get().then((querySnapshot) => {

    let data = [];

    querySnapshot.forEach((doc) => {
      
      data.push({
        id: doc.id,
        ...doc.data()
      })
    })

    res.json({
      status:true,
      data: data
    })
    
  }).catch((err)=>{
    res.json({
      status:false,
      message:err
    })
  })
})


// Create Brand
// {
// "name": "",
// "description": "",
// "website": "",
// "thumbnail": "",
// "generate_qrcode": false ,
// "category": "",
// "discount": "",
// "discountFrom": "",
// "discountTill": "" 
// }

router.post(
  "/create_brand",
  // Check The Category
  (req, res, next) => {
    const params = req.body;

    brandCategoriesRef
      .where("name", "==", params.category)
      .get()
      .then((querySnapshot) => {
        if (querySnapshot.docs) {
          next();
        } else {
          res.json({
            status: false,
            message: "The given category did not exists !",
          });
        }
      })
      .catch((error) => {
        console.log("Error getting documents: ", error);
      });
  },
  // Check And Generate QR Code
  async (req,res,next) => {
    const params = req.body;

    if(params.generate_qrcode)
    {
      const opts = {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.95,
        margin: 1,
        color: {
         dark: '#208698',
         light: '#FFF',
        },
       }

      //  const qrImage = await QRCode.toString(params.brand, opts)

       QRCode.toDataURL(String(params.brand).toLowerCase(), opts, function (err, url) {
        if (err) {
          res.json({
            status:false,
            message: err
          })
          throw err
        } else {
          req.body.qrcode_url = url;
          next()
        }
          
        })
      
    } else {
      req.body.qrcode_url = null;
      next();
    }
  },
  // Create Brand
  (req,res,next) => {
    const params = req.body;  

    let branddata = {
      name: params.name,
      description: params.description || "",
      website: params.website,
      thumbnail: params.thumbnail,
      qrcode: params.qrcode_url ? params.qrcode_url : false ,
      category: params.category,
      created: admin.firestore.FieldValue.serverTimestamp(),
      discount: params.discount || false,
      discountFrom: params.discountFrom || true,
      discountTill: params.discountTill || false 
    }

    brandRef.add(branddata).then(()=>{
      res.json({
        status:true,
        message: "Brand Created Successfully"
      })
    }).catch((err)=>{
      res.json({
        status:false,
        message: err
      })
    })
  }
);


// Get Brands
router.get('/get_brands', (req,res) => {
  const params = req.body;

  brandRef.get().then((querySnapshot) => {

    let data = [];

    querySnapshot.forEach((doc) => {
      
      data.push({
        id: doc.id,
        ...doc.data()
      })
    })

    res.json({
      status:true,
      data: data
    })
    
  }).catch((err)=>{
    res.json({
      status:false,
      message:err
    })
  })
})



module.exports = router;
