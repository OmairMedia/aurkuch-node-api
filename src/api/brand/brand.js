const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { userRef, walletRef, brandRef,  brandCategoriesRef,tasksRef } = require("../../db/ref");
const { body, validationResult } = require("express-validator");
const QRCode = require('qrcode')
const momenttimezone = require("moment-timezone");



// Create Categories
// {
//   "name": ""
// }
router.post("/create_category", (req, res) => {
  const params = req.body;

  // Add a new document with a generated id.
  let newCategory = brandCategoriesRef.push();

  newCategory
    .set({
      id: newCategory.key,
      name: params.name,
      created: momenttimezone.tz("Asia/Karachi").valueOf(),
    })
    .then(() => {
      res.json({
        status: true,
        message: "Category Added Successfully",
      });
    })
    .catch((err) => {
      res.json({
        status: false,
        error: err,
      });
    });
});


// Get Categories
router.get('/get_categories', (req,res) => {
  const params = req.body;

  brandCategoriesRef.once('value', (snapshot) => {
     if(snapshot.val()) {
        let data = [];
        snapshot.forEach((doc) => {
          
          data.push(doc.val())
        })
        res.json({
          status:true,
          data: data
        })
     } else {
      res.json({
        status:false,
        data: []
      })
     }
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
      created: momenttimezone.tz("Asia/Karachi").valueOf(),
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


// {
//   "id": "",
//   "name": "",
//   "url": "",
//   "thumbnail": ""
// }
router.post(
  "/add_video_to_brand",
  // Create Brand
  (req,res,next) => {
    const params = req.body;  

    let videodata = {
      name: params.name,
      url: params.url,
      thumbnail: params.thumbnail || "",
      created: momenttimezone.tz("Asia/Karachi").valueOf(),
    }

    brandRef.doc(params.id).collection('videos').add(videodata).then(()=>{
      res.json({
        status:true,
        message: "Video Added Successfully"
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
router.get('/get_single_brand_videos', (req,res) => {
  const params = req.body;

  brandRef.doc(params.id).collection('videos').get().then((querySnapshot) => {

    let data = [];

    querySnapshot.forEach((doc) => {
      data.push( {
        id: doc.id,
        ...doc.data()
      }
       )
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

// Get Brands For Table
router.get('/get_brands_datatable', (req,res) => {
  
    const params = req.query;
    let length;
    let projects = [];

    //   SORT , PAGINATION , SEARCH PARAMS
    let email = params.email;
    let sort = params.sort;
    let page = parseInt(params.page) || 1;
    let per_page = parseInt(params.per_page) || 4;
    let search = params.search;
    let filter = params.filter_by;

    tasksRef.orderByChild('type').equalTo('app').once((snapshot) => {
     if(snapshot.val()) { 
      let data = [];

      snapshot.forEach((doc) => {
        
        data.push({
          id: doc.id,
          ...doc.data()
        })
      })
  
  
      length = data.length;
  
      let from = (page - 1) * per_page + 1;
      let to = from + per_page <= length ? from + per_page - 1 : length;
      console.log("from -> ", from);
      console.log("to -> ", to);
      let current_page = page;
      let last_page =
        length % per_page == 0
          ? length / per_page
          : Math.floor(length / per_page) + 1;
      console.log("last_page -> ", last_page);
      let total = length;
      let next_page_url;
     
      console.log("length -> ", length);
  
      // Sort if sort is passed
      if (sort) {
        data.sort((a, b) =>
          a[sort] > b[sort] ? 1 : b[sort] > a[sort] ? -1 : 0
        );
      }
  
      // Search if search is passed
      if (search) {
        var lowSearch = search.toLowerCase();
        data = data.filter((obj) =>
          Object.values(obj).some((val) =>
            String(val).toLowerCase().includes(lowSearch)
          )
        );
        // projects = projects.filter((obj) => JSON.stringify(obj).toLowerCase().includes(search.toLowerCase()));
      }
  
      
      let sortedprojects = data.sort(function (a, b) {
        return b.created - a.created;
      });
  
      sortedprojects = sortedprojects.slice(from - 1, to);
  
  
      let final = {
        status: true,
        total,
        from,
        to,
        per_page,
        current_page,
        last_page,
        items: sortedprojects,
      }
  
      console.log('final -> ', final);
  
     
  
      res.json(final)
     } else {
      let final = {
        status: true,
        total: 0,
        from : 0,
        to: 0,
        per_page: 0,
        current_page :0,
        last_page: 0,
        items: [],
      }

      res.json(final)
     }
    
  }).catch((err)=>{
    res.json({
      status:false,
      message:err
    })
  })
})


router.post('/get_all_brands', (req,res) => {
  const params = req.body;
  
  tasksRef.orderByChild('type').equalTo('app').once('value',(snapshot) => {
    console.log('snapshot -> ',snapshot.val())
   
   if(snapshot.val()) {
    let data = [];

    snapshot.forEach((doc) => {
      data.push(doc.val())
    })
    res.json({
      status:true,
      data: data
    })

   } else {
    res.json({
      status:true,
      data: []
    })
   }
    
  }).catch((err)=>{
    res.json({
      status:false,
      message:err
    })
  })
})


module.exports = router;
