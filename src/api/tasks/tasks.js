const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { userRef, walletRef, tasksRef, pendingTasksRef,tasksRecordsRef,notificationsRef, rejectedTasksRef, trackingRef } = require("../../db/ref");
const { body, validationResult } = require("express-validator");
const {getCurrentDate,getCurrentTimestamp} = require('../../functions/slash');
const {send_notification_to_single_user} = require('../../functions/notifications')

const QRCode = require('qrcode')
const axios = require('axios');
const momenttimezone = require("moment-timezone");
// Storage For File Uploads
const { Storage } = require("@google-cloud/storage");

const storage = new Storage({
  keyFilename: "src/config/serviceAccount.json",
});

const bucket = storage.bucket("aurkuch-982e5.appspot.com");

router.post("/add_task", 
(req,res,next) => {
   const params = req.body;

   let newTasks = tasksRef.push();


   switch (params.type) {
    case "app":
        newTasks.set({
            id: newTasks.key,
            ...params,
            added_on: getCurrentDate(),
            added_on_timestamp: getCurrentTimestamp()
           }).then(()=>{
              res.json({
                status:true,
                message: "Task Added Successfully !"
              })
           }).catch((err)=>{
                res.json({
                  status:false,
                  error: err
                })
           })
        break;

    case "video":
        let videolink = params.url;

        // let split = videolink.split('/')[3];
        // console.log('split -> ',split);
        // let embedlink = `https://www.youtube.com/embed/${split}`
        newTasks.set({
            id: newTasks.key,
            ...params,
            added_on: getCurrentDate(),
            added_on_timestamp: getCurrentTimestamp()
           }).then(()=>{
              res.json({
                status:true,
                message: "Task Added Successfully !"
              })
           }).catch((err)=>{
                res.json({
                  status:false,
                  error: err
                })
           })
        break;

    case "survey":
        newTasks.set({
            id: newTasks.key,
            ...params,
            added_on: getCurrentDate(),
            added_on_timestamp: getCurrentTimestamp()
           }).then(()=>{
              res.json({
                status:true,
                message: "Task Added Successfully !"
              })
           }).catch((err)=>{
                res.json({
                  status:false,
                  error: err
                })
           })
        break;

    case "qrcode":
        next();
        break;

    case "webchannel":
        
        newTasks.set({
            id: newTasks.key,
            ...params,
            added_on: getCurrentDate(),
            added_on_timestamp: getCurrentTimestamp()
           }).then(()=>{
              res.json({
                status:true,
                message: "Task Added Successfully !"
              })
           }).catch((err)=>{
                res.json({
                  status:false,
                  error: err
                })
           })
        break;
   
    default:
        res.json({
            status:false,
            error: "Unknown Task Type !"
        })
        break;
   }

},
 // Check And Generate QR Code
 async (req,res,next) => {
  const params = req.body;

  if(params.type === 'qrcode')
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

     let qrcodeId = userRef.push();
     let newTasks = tasksRef.push();

    //  const qrImage = await QRCode.toString(params.brand, opts)

     QRCode.toDataURL(String(`${newTasks.key}`).toLowerCase(), opts, function (err, url) {
      if (err) {
        res.json({
          status:false,
          message: err
        })
        throw err
      } else {
        req.body.qrcode_url = url;

        newTasks.set({
          id: newTasks.key,
          qrcode_id: qrcodeId.key,
          qrcode: url,
          ...params,
          added_on: getCurrentDate(),
          added_on_timestamp: getCurrentTimestamp()
         }).then(()=>{
            res.json({
              status:true,
              message: "Task Added Successfully !"
            })
         }).catch((err)=>{
              res.json({
                status:false,
                error: err
              })
         })
        
      }
        
      })
    
  } else {
    res.json({
      status:false,
      error: "Qrcode Generation Error"
    })
  }
},
)

router.post("/get_tasks", 
(req,res,next) => {
   const params = req.body;

   switch (params.type) {
    case "app":
      tasksRef.orderByChild('type').equalTo(params.type).once('value',(snapshot)=>{
             if(snapshot.val()) {
               let allapptasks = [];

               snapshot.forEach((x)=>{
                  allapptasks.push(x.val())
               })

               const sortedallapptasks = allapptasks.sort(function (a, b) {
                return b.added_on_timestamp - a.added_on_timestamp;
              });

               res.json({
                status:true,
                data: sortedallapptasks
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
                  error: err
                })
           })
        break;

    case "video":
      tasksRef.orderByChild('type').equalTo(params.type).once('value',(snapshot)=>{
        if(snapshot.val()) {
          let allvideotasks = [];
           
          
          snapshot.forEach((x)=>{
            
            if(x.val().category === params.category) {
              allvideotasks.push(x.val())
            }
           
          })

          const sortedallvideotasks = allvideotasks.sort(function (a, b) {
            return b.added_on_timestamp - a.added_on_timestamp;
          });

          res.json({
           status:true,
           data: sortedallvideotasks
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
             error: err
           })
      })
        break;

    case "survey":
      tasksRef.orderByChild('type').equalTo(params.type).once('value',(snapshot)=>{
        if(snapshot.val()) {
          let allsurveytasks = [];

          snapshot.forEach((x)=>{
          
            allsurveytasks.push(x.val())
            
          })

          const sortedallsurveytasks = allsurveytasks.sort(function (a, b) {
            return b.added_on_timestamp - a.added_on_timestamp;
          });

          res.json({
           status:true,
           data: sortedallsurveytasks
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
             error: err
           })
      })
        break;

    case "qrcode":
      tasksRef.orderByChild('type').equalTo(params.type).once('value',(snapshot)=>{
        if(snapshot.val()) {
          let allqrcodetasks = [];

          snapshot.forEach((x)=>{
          
            allqrcodetasks.push(x.val())
            
          })

          const sortedallqrcodetasks = allqrcodetasks.sort(function (a, b) {
            return b.added_on_timestamp - a.added_on_timestamp;
          });


          res.json({
           status:true,
           data: sortedallqrcodetasks
          })
        } else {
          res.json({
           status:true,
           data: []
          })
        }
      })
        break;

    case "webchannel":
        
      tasksRef.orderByChild('type').equalTo(params.type).once('value',(snapshot)=>{
        if(snapshot.val()) {
          let allchanneltasks = [];

          snapshot.forEach((x)=>{
            allchanneltasks.push(x.val())
          })

          const sortedallchanneltasks = allchanneltasks.sort(function (a, b) {
            return b.added_on_timestamp - a.added_on_timestamp;
          });

          res.json({
           status:true,
           data: sortedallchanneltasks
          })
        } else {
          res.json({
           status:true,
           data: []
          })
        }
      })
        break;
   
    default:
        res.json({
            status:false,
            error: "Unknown Task Type !"
        })
        break;
   }

}
)

// Get Single App
router.post("/get_single_task", 
(req,res,next) => {
   const params = req.body;

   tasksRef.child(params.id).once('value',(snapshot)=>{
    if(snapshot.val()) {
     
      res.json({
       status:true,
       data: snapshot.val()
      })
    } else {
      res.json({
       status:false,
       error: "No Task Found With This ID"
      })
    }
  }).catch((err)=>{
       res.json({
         status:false,
         error: err
       })
  })

}
)
// get_all_tasks_datatable
// Get Brands For Table
router.get('/get_all_tasks_datatable', (req,res) => {
  
  const params = req.query;

  // console.log('params -> ',params);
  
  let length;
  let projects = [];

  //   SORT , PAGINATION , SEARCH PARAMS
  let email = params.email;
  let sort = params.sort;
  let page = parseInt(params.page) || 1;
  let per_page = parseInt(params.per_page) || 4;
  let search = params.search;
  let filter = params.filter_by;

  tasksRef.once('value',(snapshot) => {
   if(snapshot.val()) { 
    let data = [];

    snapshot.forEach((x) => {
      if(sort === 'All') {
        data.push(x.val())
      } else {
        if(x.val().type === sort) {
          data.push(x.val())
        }
      }
    })

    console.log('data -> ',data);

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
      return b.added_on_timestamp - a.added_on_timestamp;
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

    // console.log('final -> ', final);

   

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

// Get Completed Tasks For Table
router.get('/get_all_completed_datatable', (req,res) => {
  
  const params = req.query;

  // console.log('params -> ',params);
  
  let length;
  let projects = [];

  //   SORT , PAGINATION , SEARCH PARAMS
  let email = params.email;
  let sort = params.sort;
  let page = parseInt(params.page) || 1;
  let per_page = parseInt(params.per_page) || 4;
  let search = params.search;
  let filter = params.filter_by;

  tasksRecordsRef.once('value',(snapshot) => {
   if(snapshot.val()) { 
    let data = [];

    snapshot.forEach((x) => {
      data.push(x.val())
    })

    console.log('data -> ',data);

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
      return b.added_on_timestamp - a.added_on_timestamp;
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

    // console.log('final -> ', final);

   

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

// Get Pending App Tasks For Table
router.get('/get_all_pending_app_tasks_datatable', (req,res) => {
  
  const params = req.query;

  // console.log('params -> ',params);
  
  let length;
  let projects = [];

  //   SORT , PAGINATION , SEARCH PARAMS
  let email = params.email;
  let sort = params.sort;
  let page = parseInt(params.page) || 1;
  let per_page = parseInt(params.per_page) || 4;
  let search = params.search;
  let filter = params.filter_by;
  
  if(sort === 'pending') {
    pendingTasksRef.once('value',(snapshot) => {
      if(snapshot.val()) { 
       let data = [];
   
       snapshot.forEach((x) => {
         data.push(x.val())
         // if(sort === 'All') {
          
         // } else {
         //   if(x.val().type === sort) {
         //     data.push(x.val())
         //   }
         // }
       })
   
       console.log('data -> ',data);
   
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
         return b.added_on_timestamp - a.added_on_timestamp;
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
   
       // console.log('final -> ', final);
   
      
   
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
  }

  if(sort === 'rejected') {
    rejectedTasksRef.once('value',(snapshot) => {
      if(snapshot.val()) { 
       let data = [];
   
       snapshot.forEach((x) => {
         data.push(x.val())
         // if(sort === 'All') {
          
         // } else {
         //   if(x.val().type === sort) {
         //     data.push(x.val())
         //   }
         // }
       })
   
       console.log('data -> ',data);
   
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
         return b.added_on_timestamp - a.added_on_timestamp;
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
   
       // console.log('final -> ', final);
   
      
   
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
  }

  if(sort === 'completed') {
    tasksRecordsRef.once('value',(snapshot) => {
      if(snapshot.val()) { 
       let data = [];
   
       snapshot.forEach((x) => {
         data.push(x.val())
         // if(sort === 'All') {
          
         // } else {
         //   if(x.val().type === sort) {
         //     data.push(x.val())
         //   }
         // }
       })
   
       console.log('data -> ',data);
   
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
         return b.added_on_timestamp - a.added_on_timestamp;
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
   
       // console.log('final -> ', final);
   
      
   
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
  }
  

  
})


router.post('/create_appdownload_link', (req,res) => {
  const params = req.body;

  // let config = {
  //   params: {
  //     "link": `${params.dynamicLinkInfo.link}/user=${params.uid}`,
  //     "dynamicLinkInfo": {
  //       "domainUriPrefix": params.dynamicLinkInfo.domainUriPrefix,
        
  //       "androidInfo": {
  //         "androidPackageName": params.dynamicLinkInfo.androidInfo.androidPackageName
  //       },
  //       "iosInfo": {
  //         "iosBundleId": params.dynamicLinkInfo.iosInfo.iosBundleId
  //       }
  //     }
  //   }
  // }

  // let body = 
  // {
  //   "dynamicLinkInfo": {
  //     "domainUriPrefix": params.dynamicLinkInfo.domainUriPrefix,
  //     "link": `${params.dynamicLinkInfo.link}/user=${params.uid}`,
  //     "androidInfo": {
  //       "androidPackageName": params.dynamicLinkInfo.androidInfo.androidPackageName
  //     },
  //     "iosInfo": {
  //       "iosBundleId": params.dynamicLinkInfo.iosInfo.iosBundleId
  //     }
  //   }
  // };

  // axios.post(`https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=AIzaSyCTsFA5oZD6hIzpdmyJa4eKscM3g0WB5A0`,config).then((response)=>{
  //   console.log('response -> ',response);

  //   res.json({
  //     status:true,
  //     data:response.data
  //   })
  // }).catch((err)=>{
  //   res.json({
  //     status:false,
  //     error:err.message
  //   })
  // })

  let deeplink = "https://aurkuch.page.link";
  let androidapp = "com.islam360.app";
  let iosapp = "com.example.ios";
  let playstore = "https://play.google.com/store/search?q=islam%20360&c=apps"; 

  res.json({
    status:true,
    link: `${deeplink}/?link=${playstore}&apn=${androidapp}&user=${params.uid}`
  })
isi

})

// Complete Tasks 
router.post('/complete_task',
//  Check User 
(req,res,next) => {
  const body = req.body;
  userRef.child(body.uid).once('value', (snapshot) => {
    if(snapshot.val()) {
      const user = snapshot.val();
      req.body.user = user;
      next();
    } else {
      res.json({
        status:false,
        error:"User Not Found !"
      })
    }
  }).catch((err)=>{
    res.json({
      status:false,
      error:err
    })
  })
},
// Check Task
(req,res,next) => {
  const body = req.body;

  tasksRef.child(body.task_id).once('value', (snapshot) => {
    if(snapshot.val()) {
      const task = snapshot.val();
      req.body.task = task;
      next();
    } else {
      res.json({
        status:false,
        error:"Task Not Found !"
      })
    }
  }).catch((err)=>{
    res.json({
      status:false,
      error:err
    })
  })
},
// Minus Task Count
(req,res,next) => {
  const body = req.body;

  if(parseInt(body.task.count) === 0) {
    res.json({
      status:false,
      error: 'This Task Is Not Available To You!'
    })
  } else {
    tasksRef.child(body.task_id).update({
      count: parseInt(body.task.count) - 1
   }).then(()=>{
      res.json({
       status:true,
       message: `Task Completed Successfully !`
      })
   }).catch((err)=>{
      res.json({
       status:false,
       error:err
      })
   })
  }

  
},
// Get User's Wallet 
(req,res,next) => {
  const body = req.body;

  walletRef.child(body.uid).once('value', (snapshot) => {
    if(snapshot.val()) {
      const wallet = req.body;
      req.body.wallet = wallet;
      next();
    } else {
      res.json({
        status:false,
        error:'Wallet Not Found'
      })
    }
  }).catch((err)=>{
    res.json({
      status:false,
      error:err
    })
  })
},
// Update User's Wallet 
(req,res,next) => {
  const body = req.body;

  let newTrasaction = {
    task_id: body.task_id,
    task_name: body.task.name,
    task_type: body.task.type,
    task_reward: body.task.reward,
    previousBalance: body.wallet.amount,
    newBalance: parseInt(body.wallet.amount) + parseInt(body.task.reward),
    created: momenttimezone.tz("Asia/Karachi").valueOf()
  } 

  if(body.wallet.transactions) {
    body.wallet.transactions.push(newTrasaction);
  } else {
    body.wallet.transactions = [newTrasaction];
  }

  walletRef.child(body.uid).update({
    amount: parseInt(body.wallet.amount) + parseInt(body.task.reward),
    transactions: body.wallet.transactions
  }).then(()=>{
     next();
  }).catch((err)=>{
     res.json({
      status:false,
      error:err
     })
  }) 
},
// Complete The Task
(req,res,next) => {
  const body = req.body;

  let newCompletedTask = tasksRecordsRef.push();

  newCompletedTask.set({
    id: newCompletedTask.key,
    uid: body.uid,
    email: body.user.email,
    username: body.user.fullname,
    task_id: body.task_id,
    task_name: body.task.name,
    task_type: body.task.type,
    task_reward: body.task.reward,
    status: "completed",
    created: momenttimezone.tz("Asia/Karachi").valueOf()
  }).then(()=>{
    
    let newNotification = notificationsRef.child(body.uid).push();
    newNotification.set({
        id: newNotification.key,
        title: `You have completed ${body.task.name} task successfully !`,
        body: `You have been rewarded with ${body.task.reward} in your wallet`
    }).then(()=>{
      next()
    }).catch((err)=>{
      res.json({
        status:false,
        error:err
      })
    })
    
  }).catch((err)=>{
    res.json({
      status:false,
      error:err
    })
  })
},
// Send Notification
(req,res) => {
  const body = req.body;

  fcmRef
  .child(body.uid)
  .once("value")
  .then((snapshot) => {
    if(snapshot.val()) {
      let token = snapshot.val().token;

      send_notification_to_single_user(token, {
        title: "Task Has Been Completed !",
        body: `You have been rewarded for ${body.task.reward} for completing ${body.task.name} !`,
        routes: "",
      }).then(()=>{
        res.json({
          status:true,
          message: "Task Completed Successfully !" 
         })
      }).catch((err)=>{
        res.json({
          status:true,
          message: "Task Completed Successfully !" 
         })
         console.log('err -> ',err);
      })
    } else {
      res.json({
        status:true,
        message: "Task Completed Successfully !" 
       })
    }

  })
}
)

// App Download Task - Image Upload
router.post('/upload_app_image', 
// Get Task
(req,res,next) => {
  const body = req.body;

  tasksRef.child(body.task_id).once('value',(snapshot)=>{
    if(snapshot.val()) {
      const task = snapshot.val();

      if(task.type === 'app') {
        req.body.task = task;
          next();
      } else {
        res.json({
          status:false,
          error: `Provided Task ID is not for a app download task !. `
        })
      }
    } else {
      res.json({
       status:false,
       error: "No Task Found With This ID"
      })
    }
  }).catch((err)=>{
       res.json({
         status:false,
         error: err
       })
  })
},
// Upload Image
(req,res,next) => {
  const body = req.body;

  const { image } = req.files;

  const path = "Verification/";

   // Uploading Invoice
   const ntn_scan_image_filename = image.name;
   const ntn_scan_image_filetype = ntn_scan_image_filename.split(".")[1];
   const ntn_scan_image_name = `${body.task_id}_${body.uid}`;

  fileUpload(image, ntn_scan_image_name, path, ntn_scan_image_filetype, (err) => {
    if (err) {
      console.log("err -> ", err);
    } else {
      next();
    }
  });
},
// Get Images Links
async (req, res, next) => {
  const body = req.body;

  let options = {
    prefix: `Verification/`,
  };

  const [files] = await storage.bucket("aurkuch-982e5.appspot.com").getFiles(options);
  var profileImage;

  files.forEach((file) => {
    const fileName = file.name;

    if (fileName.includes(body.task_id) && fileName.includes(body.uid) ) {
      let image = file.publicUrl();
      profileImage = image;
      console.log("image -> ", image);
    }
  });

  req.body.profileImages = profileImage;
  console.log("uploadImages -> ", profileImage);
  next()
},
// Create Pending Task
(req,res) => {
    const body = req.body;

    console.log('profileImages -> ',body.profileImages)
    let newPendingTasks = pendingTasksRef.push();

    newPendingTasks.set({
        ...body.task,
        task_id: body.task_id,
        id: newPendingTasks.key,
        status:"pending",
        image: body.profileImages,
        user_id: body.uid
      }).then(()=>{
        res.json({
          status:true,
          message: 'App Image Uploaded ! It will be reviewed in 2-3 days !'
        })
      }).catch((err)=>{
        res.json({
          status:false,
          error: err
        })
      })
}
)  

// Approve App Image 
router.post('/approve_app_image', 
// Get User 
(req,res,next) => {
  const body = req.body;

  admin.auth().getUser(body.uid).then((user)=>{
    req.body.user = user;
    next()
  }).catch((err)=>{
    res.json({
      status:false,
      error: err
    })
  })
},
// Get Task
(req,res,next) => {
  const body = req.body;

  tasksRef.child(body.task_id).once('value', (snapshot) => {
    if(snapshot.val()) {
       const task = snapshot.val();

       if(parseInt(task.count) === 0) {
        res.json({
          status:false,
          error: 'This task has been ended ! its not available any more !'
        })
      } else {
        req.body.actualtask = task;
        next();
      }
      
    } else {
      res.json({
        status:false,
        error: 'No Task Exists Found With This Task ID !'
      })
    }
  })
},
// Check Pending Task
(req,res,next) => {
  const body = req.body;

  pendingTasksRef.child(body.id).once('value', (snapshot) => {
    if(snapshot.val()) {
        const task = snapshot.val();
        req.body.task = task;
        next();
    } else {
      res.json({
        status:false,
        error: 'No Pending Task Found With This Task ID !'
      })
    }
  })
},
// Get User's Wallet 
(req,res,next) => {
  const body = req.body;

  walletRef.child(body.uid).once('value', (snapshot) => {
    if(snapshot.val()) {
      const Wallet = snapshot.val();
      req.body.wallet = Wallet;
      console.log('Wallet -> ',Wallet)
      next();
    } else {
      res.json({
        status:false,
        error:'Wallet Not Found'
      })
    }
  }).catch((err)=>{
    res.json({
      status:false,
      error:err
    })
  })
},
// Minus Task Count
(req,res,next) => {
  const body = req.body;

  tasksRef.child(body.task_id).update({
    count: parseInt(body.task.count) - 1
  }).then(()=>{
      next()
  }).catch((err)=>{
      res.json({
      status:false,
      error:err
      })
  })

 
},
// Update User's Wallet 
(req,res,next) => {
  const body = req.body;

  
  let previousBalance = body.wallet.amount;
  let reward = body.task.reward;
  let newBalance = parseInt(previousBalance) + parseInt(reward);
  let transactions = body.wallet.transactions;
  console.log('previousBalance -> ',previousBalance)
  console.log('reward -> ',reward)
  console.log('newBalance -> ',newBalance)


  let newTrasaction = {
    task_id: body.task_id,
    task_name: body.task.name,
    task_type: body.task.type,
    task_reward: reward,
    previousBalance: parseInt(previousBalance),
    newBalance: newBalance,
    created: momenttimezone.tz("Asia/Karachi").valueOf()
  } 

  if(transactions) {
    transactions.push(newTrasaction);
  } else {
    transactions = [newTrasaction];
  }

  // console.log('newTrasaction -> ',newTrasaction)

  walletRef.child(body.uid).update({
    amount: newBalance,
    transactions: transactions
  }).then(()=>{
     next();
  }).catch((err)=>{
     res.json({
      status:false,
      error:err
     })
  }) 
},
// Complete The Task
(req,res,next) => {
  const body = req.body;

  let newCompletedTask = tasksRecordsRef.push();

  newCompletedTask.set({
    id: newCompletedTask.key,
    uid: body.uid,
    user_id: body.uid,
    email: body.user.email,
    username: body.user.displayName,
    task_id: body.task_id,
    task_name: body.task.name,
    task_thumbnail: body.task.thumbnail,
    task_verification_image: body.task.image,
    task_type: body.task.type,
    task_reward: body.task.reward,
    verification_image: body.task.image,
    status: "completed",
    created: momenttimezone.tz("Asia/Karachi").valueOf()
  }).then(()=>{
    let newNotification = notificationsRef.child(body.uid).push();
    newNotification.set({
        id: newNotification.key,
        title: `You have completed ${body.task.name} task successfully !`,
        body: `You have been rewarded with ${body.task.reward} in your wallet`
    }).then(()=>{
       next()
    }).catch((err)=>{
      res.json({
        status:false,
        error:err.message
      })
    })
    
  }).catch((err)=>{
    res.json({
      status:false,
      error:err.message
    })
  })
},
// Delete the pending task
(req,res) => {
  const body = req.body;

  pendingTasksRef.child(body.id).remove().then(()=>{
    res.json({
      status:true,
      message: "Task Completed Successfully !" 
     })
  }).catch((err)=>{
    res.json({
      status:false,
      error:err.message
    })
  })
} 
);

// Approve App Image 
router.post('/reject_app_image', 
// Get User 
(req,res,next) => {
  const body = req.body;

  admin.auth().getUser(body.uid).then((user)=>{
    req.body.user = user;
    next()
  }).catch((err)=>{
    res.json({
      status:false,
      error: err
    })
  })
},
// Get Task
(req,res,next) => {
  const body = req.body;

  tasksRef.child(body.task_id).once('value', (snapshot) => {
    if(snapshot.val()) {
       const task = snapshot.val();

       if(parseInt(task.count) === 0) {
        res.json({
          status:false,
          error: 'This task has been ended ! its not available any more !'
        })
      } else {
        req.body.actualtask = task;
        next();
      }
      
    } else {
      res.json({
        status:false,
        error: 'No Task Exists Found With This Task ID !'
      })
    }
  })
},
// Check Pending Task
(req,res,next) => {
  const body = req.body;
  console.log('body -> ',body);

  pendingTasksRef.child(body.id).once('value', (snapshot) => {
    if(snapshot.val()) {
        const task = snapshot.val();
        req.body.task = task;
        next();
    } else {
      res.json({
        status:false,
        error: 'No Pending Task Found With This Task ID !'
      })
    }
  })
},
// Reject The Task
(req,res,next) => {
  const body = req.body;

  let newRejectedTask = rejectedTasksRef.push();

  newRejectedTask.set({
    id: newRejectedTask.key,
    uid: body.uid,
    user_id: body.uid,
    email: body.user.email,
    username: body.user.displayName,
    task_id: body.task_id,
    task_name: body.task.name,
    task_thumbnail: body.task.thumbnail,
    task_verification_image: body.task.image,
    task_type: body.task.type,
    task_reward: body.task.reward,
    verification_image: body.task.image,
    status: "rejected",
    created: momenttimezone.tz("Asia/Karachi").valueOf()
  }).then(()=>{
    let newNotification = notificationsRef.child(body.uid).push();
    newNotification.set({
        id: newNotification.key,
        title: `Your app download image verification for ${body.task.name} has been rejected !`,
        body: `Your app download image verification for ${body.task.name} has been rejected !`
    }).then(()=>{
       next()
    }).catch((err)=>{
      res.json({
        status:false,
        error:err.message
      })
    })
    
  }).catch((err)=>{
    res.json({
      status:false,
      error:err.message
    })
  })
},
// Delete the pending task
(req,res) => {
  const body = req.body;

  pendingTasksRef.child(body.id).remove().then(()=>{
    res.json({
      status:true,
      message: "Task Rejected Successfully !" 
     })
  }).catch((err)=>{
    res.json({
      status:false,
      error:err.message
    })
  })
} 
);

// Get User's Completed Tasks
router.post("/user_completed_tasks", 
(req,res,next) => {
  const body = req.body;

  tasksRecordsRef.child(body.uid).once('value', (snapshot) => {
    if(snapshot.val()) {
      const tasks = [];
      snapshot.forEach((x)=>{
        tasks.push(x.val())
      })

      res.json({
        status:true,
        data: tasks
      })
    } else {
      res.json({
        status:true,
        data: []
      })
    }
  })
}) 

// Get User's Pending Tasks 
router.post("/user_pending_tasks", 
(req,res,next) => {
  const body = req.body;

  pendingTasksRef.child(body.uid).once('value', (snapshot) => {
    if(snapshot.val()) {
      const tasks = [];
      snapshot.forEach((x)=>{
        tasks.push(x.val())
      })

      res.json({
        status:true,
        data: tasks
      })
    } else {
      res.json({
        status:true,
        data: []
      })
    }
  })
}) 




// Task - Image Upload For Aur Kuch Youtube Channel
router.post('/upload_aurkuch_channel_image', 
// Get Task
(req,res,next) => {
  const body = req.body;

  tasksRef.child(body.task_id).once('value',(snapshot)=>{
    if(snapshot.val()) {
      const task = snapshot.val();

      if(task.type === 'webchannel') {
        req.body.task = task;
          next();
      } else {
        res.json({
          status:false,
          error: `Provided Task ID is not for a app download task !. `
        })
      }
    } else {
      res.json({
       status:false,
       error: "No Task Found With This ID"
      })
    }
  }).catch((err)=>{
       res.json({
         status:false,
         error: err
       })
  })
},
// Upload Image
(req,res,next) => {
  const body = req.body;

  const { image } = req.files;

  const path = "Verification/";

   // Uploading Invoice
   const ntn_scan_image_filename = image.name;
   const ntn_scan_image_filetype = ntn_scan_image_filename.split(".")[1];
   const ntn_scan_image_name = `${body.task_id}_${body.uid}`;

  fileUpload(image, ntn_scan_image_name, path, ntn_scan_image_filetype, (err) => {
    if (err) {
      console.log("err -> ", err);
    } else {
      next();
    }
  });
},
// Get Images Links
async (req, res, next) => {
  const body = req.body;

  let options = {
    prefix: `Verification/`,
  };

  const [files] = await storage.bucket("aurkuch-982e5.appspot.com").getFiles(options);
  var profileImage;

  files.forEach((file) => {
    const fileName = file.name;

    if (fileName.includes(body.task_id) && fileName.includes(body.uid) ) {
      let image = file.publicUrl();
      profileImage = image;
      console.log("image -> ", image);
    }
  });

  req.body.profileImages = profileImage;
  console.log("uploadImages -> ", profileImage);
  next()
},
// Create Pending Task
(req,res) => {
    const body = req.body;

    console.log('profileImages -> ',body.profileImages)
    let newPendingTasks = pendingTasksRef.push();

    newPendingTasks.set({
        ...body.task,
        task_id: body.task_id,
        id: newPendingTasks.key,
        status:"pending",
        image: body.profileImages,
        user_id: body.uid
      }).then(()=>{
        res.json({
          status:true,
          message: 'Aurkuch Channel Screenshot Uploaded ! It will be reviewed in 2-3 days !'
        })
      }).catch((err)=>{
        res.json({
          status:false,
          error: err
        })
      })
}
)  



// Approve App Image 
router.post('/approve_aurkuch_channel_image', 
// Get User 
(req,res,next) => {
  const body = req.body;

  admin.auth().getUser(body.uid).then((user)=>{
    req.body.user = user;
    next()
  }).catch((err)=>{
    res.json({
      status:false,
      error: err
    })
  })
},
// Get Task
(req,res,next) => {
  const body = req.body;

  tasksRef.child(body.task_id).once('value', (snapshot) => {
    if(snapshot.val()) {
       const task = snapshot.val();

       if(parseInt(task.count) === 0) {
        res.json({
          status:false,
          error: 'This task has been ended ! its not available any more !'
        })
      } else {
        req.body.actualtask = task;
        next();
      }
      
    } else {
      res.json({
        status:false,
        error: 'No Task Exists Found With This Task ID !'
      })
    }
  })
},
// Check Pending Task
(req,res,next) => {
  const body = req.body;

  pendingTasksRef.child(body.id).once('value', (snapshot) => {
    if(snapshot.val()) {
        const task = snapshot.val();
        req.body.task = task;
        next();
    } else {
      res.json({
        status:false,
        error: 'No Pending Task Found With This Task ID !'
      })
    }
  })
},
// Get User's Wallet 
(req,res,next) => {
  const body = req.body;

  walletRef.child(body.uid).once('value', (snapshot) => {
    if(snapshot.val()) {
      const Wallet = snapshot.val();
      req.body.wallet = Wallet;
      console.log('Wallet -> ',Wallet)
      next();
    } else {
      res.json({
        status:false,
        error:'Wallet Not Found'
      })
    }
  }).catch((err)=>{
    res.json({
      status:false,
      error:err
    })
  })
},
// Minus Task Count
(req,res,next) => {
  const body = req.body;

  tasksRef.child(body.task_id).update({
    count: parseInt(body.task.count) - 1
  }).then(()=>{
      next()
  }).catch((err)=>{
      res.json({
      status:false,
      error:err
      })
  })

 
},
// Update User's Wallet 
(req,res,next) => {
  const body = req.body;

  
  let previousBalance = body.wallet.amount;
  let reward = body.task.reward;
  let newBalance = parseInt(previousBalance) + parseInt(reward);
  let transactions = body.wallet.transactions;
  console.log('previousBalance -> ',previousBalance)
  console.log('reward -> ',reward)
  console.log('newBalance -> ',newBalance)


  let newTrasaction = {
    task_id: body.task_id,
    task_name: body.task.name,
    task_type: body.task.type,
    task_reward: reward,
    previousBalance: parseInt(previousBalance),
    newBalance: newBalance,
    created: momenttimezone.tz("Asia/Karachi").valueOf()
  } 

  if(transactions) {
    transactions.push(newTrasaction);
  } else {
    transactions = [newTrasaction];
  }

  // console.log('newTrasaction -> ',newTrasaction)

  walletRef.child(body.uid).update({
    amount: newBalance,
    transactions: transactions
  }).then(()=>{
     next();
  }).catch((err)=>{
     res.json({
      status:false,
      error:err
     })
  }) 
},
// Complete The Task
(req,res,next) => {
  const body = req.body;

  let newCompletedTask = tasksRecordsRef.push();

  newCompletedTask.set({
    id: newCompletedTask.key,
    uid: body.uid,
    user_id: body.uid,
    email: body.user.email,
    username: body.user.displayName,
    task_id: body.task_id,
    task_name: body.task.name,
    task_thumbnail: body.task.thumbnail,
    task_verification_image: body.task.image,
    task_type: body.task.type,
    task_reward: body.task.reward,
    verification_image: body.task.image,
    status: "completed",
    created: momenttimezone.tz("Asia/Karachi").valueOf()
  }).then(()=>{
    let newNotification = notificationsRef.child(body.uid).push();
    newNotification.set({
        id: newNotification.key,
        title: `You have completed ${body.task.name} task successfully !`,
        body: `You have been rewarded with ${body.task.reward} in your wallet`
    }).then(()=>{
       next()
    }).catch((err)=>{
      res.json({
        status:false,
        error:err.message
      })
    })
    
  }).catch((err)=>{
    res.json({
      status:false,
      error:err.message
    })
  })
},
// Delete the pending task
(req,res) => {
  const body = req.body;

  pendingTasksRef.child(body.id).remove().then(()=>{
    res.json({
      status:true,
      message: "Task Completed Successfully !" 
     })
  }).catch((err)=>{
    res.json({
      status:false,
      error:err.message
    })
  })
} 
);

// Track Users
router.post('/track_user', 
// Check If Already Exist 
(req,res,next) => {
  const body = req.body;

  trackingRef.orderByChild('uid').equalTo(body.uid).once('value', (snapshot) => {
    if(snapshot.val()) {
      let exists = false;

      snapshot.forEach((x)=>{
        if(x.task_id === body.task_id) {
          exists = true;
        }
      })

      if(exists) {
        res.json({
          status:false,
          error: 'already tracked this user and task!'
        })
      } else {
        next()
      }
    } else {
       next()
    }
  })
},
(req,res) => {
  const body = req.body;

  let newTrackRef = trackingRef.push();

  newTrackRef.set({
    uid: body.uid,
    task_id: body.task_id,
    created: moment().valueOf() 
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
