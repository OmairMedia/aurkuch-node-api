const express = require('express');
const router = express.Router();
const admin = require("firebase-admin");
const { userRef, walletRef, tasksRef, pendingTasksRef,tasksRecordsRef,notificationsRef, rejectedTasksRef, trackingRef } = require("../../db/ref");

const { body, validationResult } = require("express-validator");
const momenttimezone = require("moment-timezone");
// Storage For File Uploads
const { Storage } = require("@google-cloud/storage");

const storage = new Storage({
  keyFilename: "src/config/serviceAccount.json",
  
});
const fs = require("fs");
const excel = require('excel4node');

const bucket = storage.bucket("aurkuch-982e5.appspot.com");


// Export All Users To Excel Sheet 
router.post(
  "/export-all-users",
  //  Get All Users
  (req, res, next) => {
    userRef.once("value", (snapshot) => {
      if (snapshot.val()) {
        const users = [];

        snapshot.forEach((x) => {
          users.push({
            ...x.val(),
            created: TransformDate(x.val().created),
          });
        });

        req.body.users = users;
        next();
      } else {
        res.json({
          status: false,
          error: "No User Found !",
        });
      }
    });
  },
  //   Completed Tasks
  (req,res,next) => {
    const body = req.body;

    tasksRecordsRef.once('value', (snapshot) => {
        if(snapshot.val()) {
           let completedTasks = [];
           let completed_tasks = [];
           snapshot.forEach((completedTask)=>{
            completedTasks.push(completedTask.val())
           })

        //    Customer's Completed Task
        body.users.map((x)=>{
            
            let usercompletedTasks = completedTasks.filter(y => y.uid === x.id);
            if(usercompletedTasks && usercompletedTasks.length > 0) {
                usercompletedTasks.forEach((u) => {
                    
                        completed_tasks.push(u)
                  
                })
            } 

            return {
                ...x,
                completed_tasks
            }
        })


        next();


        } else {
             //    Customer's Completed Task
             let completed_tasks = [];
            body.users.map((x)=>{
                return {
                    ...x,
                    completed_tasks: completed_tasks
                }
            })
            
            next()
        }
    })
  },
  //  Get Tracking Data 
  (req,res,next) => {
    const body = req.body;
    
    
    trackingRef.once('value', (snapshot) => {
      if(snapshot.val()){
        let tracks = [];
        snapshot.forEach((x) => {
          tracks.push(x.val())
        })
      }
    })
  },
  // Export All Date To Excel
  async (req, res, next) => {
    const body = req.body;

    
    
    try {
  
      // Create a new instance of a Workbook class
      const workbook = new excel.Workbook();

      // Add Worksheets to the workbook
      const worksheet = workbook.addWorksheet('User Records');

      
      // Create a reusable style
      const style = workbook.createStyle({
        font: {
          color: '#1e293b',
          size: 13
        },
      });



      worksheet.cell(1,1).string('Sno').style(style);
      worksheet.cell(1,2).string('Fullname').style(style);
      worksheet.cell(1,3).string('Email').style(style);
      worksheet.cell(1,4).string('Email Verified').style(style);
      worksheet.cell(1,5).string('Phone').style(style);
      worksheet.cell(1,6).string('Phone Verified').style(style);


      body.users.forEach((user, index) => {
          index = index + 1;
          // Set value of cell A1 to 100 as a number type styled with paramaters of style
          worksheet.cell(index + 1,1).number(index+1).style(style);
          // Set value of cell B1 to 300 as a number type styled with paramaters of style
          worksheet.cell(index + 1,2).string(`${user.displayName}`).style(style);
          // Set value of cell C1 to a formula styled with paramaters of style
          worksheet.cell(index + 1,3).string(user.email).style(style);
          // Set value of cell D1 to 'string' styled with paramaters of style
          worksheet.cell(index + 1,4).bool(user.emailVerified).style(style);
          // Set value of cell E1 to true as a boolean type styled with paramaters of style but with an adjustment to the font size.
          worksheet.cell(index + 1,5).string(`${user.phone === undefined ? "" : user.phone}`).style(style);
          worksheet.cell(index + 1,6).bool(user.phoneVerified).style(style);

      });

    workbook.write('exports/user_record.xlsx');
    next();
    } catch (err) {
        console.log('err -> ',err);
    }
  },
  // Get Excel Sheet And Upload It 
  async (req,res,next) => {
    try {
      let uploaded = await uploadExcelSheetToStorage().catch(err => console.log(err))
      console.log(uploaded);
      console.log('uploaded!');

      res.json({
        status:true,
        message: 'User Records Sheet Generated!',
        link: uploaded
      })

    } catch (err) {
      console.log(err)
      res.json({
        status:false,
        error:err
      })
    }
  },
  // Get User Record File Link
  async (req,res,next) => {
    const params = req.body;

    try {
       
    let options = {
      prefix: `Exports/`,
    };

    const [files] = await storage.bucket("aurkuch-982e5.appspot.com").getFiles(options);
    let userRecordsLink = "";

    files.forEach((file) => {
      const fileName = file.name;
      console.log('fileName -> ',fileName);


      if (fileName.includes('user_record.xlsx')) {
        userRecordsLink = file.publicUrl()
      }
    });
   
    console.log('userRecordsLink -> ',userRecordsLink);

    res.json({
      status:true,
      link: userRecordsLink,
      message: 'ok!'
    })
    } catch (err) {
      console.log('error -> ',err);
      
    }
  }
);



const uploadExcelSheetToStorage = () => {
  return new Promise((resolve, reject) => {
    try {
      let metadata = {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }


     return bucket.upload('Exports/user_record.xlsx', metadata)
      .then((file) => {
        let link = file[0].metadata.mediaLink;
        // console.log('link -> ',link);
        resolve(link)
      })

    } catch (e) {
      console.log('e -> ',e);
      // catches errors from createWriteStream
      reject(e);
    }
  })
}


async function fileUpload(callback) {
    const img_file = bucket.file(`Exports/user_record.xlsx`);
    const stream = img_file.createWriteStream({
      gzip: true,
      resumable: false,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    stream.on("error", (err) => {
      console.log('error -> ',error);
      callback(err);
    });

    stream.on("finish", () => {
      console.log('finish -> ');

      callback(null);
    });

    stream.end(img_file.data);
}


function TransformDate(date) {
  let newdate = new Date(date);
  return newdate.toLocaleString();
}

module.exports = router;
