const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { userRef, walletRef, brandRef,  brandCategoriesRef,watchRef ,settingsRef , tasksRef} = require("../../db/ref");
const { body, validationResult } = require("express-validator");
const momenttimezone = require("moment-timezone");



// User Watched A Video ()
// {
//   "uid": "",
//   "task_id": "" 
// }
router.post('/user_watched',
// Get User Data
  // Check User
  (req, res, next) => {
    const params = req.body;

    userRef
      .child(params.uid)
      .once('value', (doc) => {
        if (doc.val()) {
          req.body.user = doc.val();
          next();
        } else {
            res.json({
                status: false,
                error: "User Not Found",
              });
        }
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err,
        });
      });
  }, 
  // Check Brand
  (req, res, next) => {
    const params = req.body;

    tasksRef
      .child(params.task_id)
      .once('value',(doc) => {
        if (doc.exists) {
          
        } else {
              res.json({
                status: false,
                error: "Brand Not Found",
              });
        }
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err,
        });
      });
  }, 
  // Check Video
  (req, res, next) => {
    const params = req.body;

    brandRef
      .doc(params.brand_id)
      .collection('videos')
      .doc(params.video_id)
      .get()
      .then((doc) => {
        if (doc.exists) {
          req.body.video = {
              id: doc.id,
              ...doc.data()
          };

          next();
        } else {
              res.json({
                status: false,
                error: "Brand Not Found",
              });
        }
      })
      .catch((err) => {
        res.json({
          status: false,
          error: err,
        });
      });
  },
  // Get Video Reward Amount
  (req,res,next) => {
     const params = req.body;

     settingsRef.doc('video-reward-amount').get().then((doc)=>{
        req.body.rewardamount = doc.data().amount;
        console.log('req.body.amount -> ',req.body.rewardamount)
        next();
     }).catch((err)=>{
         res.json({
             status:false,
             error: err
         })
     })
  },
  // Get Currect User Wallet
  (req,res,next) => {
        const params = req.body;

        //   Get Current Wallet Amount

        walletRef.doc(params.uid).get().then((doc)=>{
        req.body.wallet = doc.data();
        next(); 
        }).catch((err)=>{
        res.json({
            status:false,
            error: err
        })
        })
  },
  // Update User Wallet
  (req,res,next) => {
    const params = req.body;

    let amount = params.wallet.amount;
    console.log('current wallet amount -> ',amount);

    let newamount = Math.floor(parseInt(amount) + parseInt(params.rewardamount))
    console.log('new amount -> ',newamount)

    walletRef.doc(params.uid).update({
        amount: newamount
      }).then(()=>{
        next();
      }).catch((err)=>{
          res.json({
              status:false,
              error:err
          })
      })
  },
// Create transaction
  (req,res,next) => {
      const params = req.body;

      let newamount = Math.floor(parseInt(params.wallet.amount) + parseInt(params.rewardamount))

      let data = {
        brand_id: params.brand.id,
        brandname: params.brand.name,
        video_id: params.video.id,
        video_thumbnail: params.video.thumbnail,
        video_url: params.video.url,
        previousWalletBalance: params.wallet.amount,
        newWalletBalance: newamount,
        amount: params.rewardamount,
        created: momenttimezone.tz("Asia/Karachi").valueOf(),
      };

      walletRef.doc(params.uid).collection('transactions').add(data).then(()=>{
         next()
      }).catch((err)=>{
         res.json({
             status:false,
             error:err
         })
      })
  },
  (req,res) => {
    const params = req.body;

    let watchdata = {
        user_id: params.user.id,
        username: params.user.fullname,
        brand_id: params.brand.id,
        brandname: params.brand.name,
        video_id: params.video.id,
        video_thumbnail: params.video.thumbnail,
        video_url: params.video.url,
        created: momenttimezone.tz("Asia/Karachi").valueOf(),
      }
  
      watchRef.add(watchdata).then(()=>{
        res.json({
          status:true,
          message: "User Watched A Video Successfully !"
        })
      }).catch((err)=>{
        res.json({
          status:false,
          message: err
        })
      })
})




// Get Watch Records
router.get('/get_user_watched', (req,res) => {
    const params = req.body;
  
    watchRef.get().then((querySnapshot) => {
  
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



  // Get Watch Records For Table
// router.get('/get_user_watched_datatable', (req,res) => {
//     const params = req.params;
  
  
//     let sort = params.sort;
//     let page = params.page;
//     let per_page = params.per_page;
//     let search = params.search;
//     let from = params.from;
//     let to = params.to;
//     let total = params.total;   
//     let lastPage = params.lastPage;    
  
  
  
//     watchRef.get().then((querySnapshot) => {
  
//       let data = [];
  
//       querySnapshot.forEach((doc) => {
        
//         data.push({
//           id: doc.id,
//           ...doc.data()
//         })
//       })
  
//       res.json({
//         status:true,
//         data: data,
//         total: 20,
//         last_page: 4,
//         per_page: 5,
//         current_page: 1,
//         next_page_url: "https://api.coloredstrategies.com/cakes/fordatatable?sort=&page=2&per_page=5",
//         prev_page_url: "https://api.coloredstrategies.com/cakes/fordatatable?sort=&page=2&per_page=5",
//         from: 1,
//         to: 5,
//       })
      
//     }).catch((err)=>{
//       res.json({
//         status:false,
//         message:err
//       })
//     })
// })



// Get Brands For Table
router.get('/get_user_watched_datatable', (req,res) => {
  
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



  watchRef.get().then((querySnapshot) => {

  let data = [];

  querySnapshot.forEach((doc) => {
    
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
  
}).catch((err)=>{
  res.json({
    status:false,
    message:err
  })
})
})



module.exports = router;