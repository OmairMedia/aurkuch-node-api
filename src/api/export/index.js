const express = require('express');
const router = express.Router();
const admin = require("firebase-admin");
const { userRef } = require("../../db/ref");
const path = require('path');
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
const PDFDocument = require("pdfkit");


router.post('/export-all-users',
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
      worksheet.cell(1,4).string('Phone').style(style);
      worksheet.cell(1,5).string('Address').style(style);


      body.users.forEach((user, index) => {
          index = index + 1;
          // Set value of cell A1 to 100 as a number type styled with paramaters of style
          worksheet.cell(index + 1,1).number(index+1).style(style);
          // Set value of cell B1 to 300 as a number type styled with paramaters of style
          worksheet.cell(index + 1,2).string(user.fullname).style(style);
          // Set value of cell C1 to a formula styled with paramaters of style
          worksheet.cell(index + 1,3).string(user.email).style(style);
          // Set value of cell A2 to 'string' styled with paramaters of style
          worksheet.cell(index + 1,4).string(user.phone).style(style);
          // Set value of cell A3 to true as a boolean type styled with paramaters of style but with an adjustment to the font size.
          worksheet.cell(index + 1,5).string(user.address).style(style);
      });

      workbook.write('exports/user_record.xlsx', function(err, stats) {
        if (err) {
          console.error('excel file write error -> ',err);
        } else {
          console.log(stats); // Prints out an instance of a node.js fs.Stats object
        }
      });
      console.log('step-2')
      next();

  } catch (err) {
     console.log(err);
      res.json({
        status: false,
        error: err,
      });
  }
  },
  // Get Excel Sheet And Upload It 
  async (req,res,next) => {
    try {
      let uploaded = await uploadExcelSheetToStorage().catch(err => console.log(err))
      console.log(uploaded);
      console.log('uploaded!');

      console.log('step-3')


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
      console.log(err);
      res.json({
        status: false,
        error: err,
      });
    }
  }
)


const uploadExcelSheetToStorage = () => {
  return new Promise((resolve, reject) => {
    try {
      let metadata = {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }

     return bucket.upload('exports/user_record.xlsx', metadata)
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

function TransformDate(date) {
  let newdate = new Date(date);
  return newdate.toLocaleString();
}

module.exports = router;
