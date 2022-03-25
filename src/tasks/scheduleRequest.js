const schedule = require('node-schedule');
const moment = require('moment') 


const now = moment().toDate();
console.log('now -> ',now.toString());

// Get Date
// Get Time
const input = new Date("December 8, 2021 6:28 PM")  // December 8, 2021 6:28 PM

// Required Format
// Wed Dec 08 2021 18:12:09 GMT+0500
const date = new Date("Wed Dec 08 2021 18:12:09 GMT+0500");


schedule.scheduleJob(date, function(){
    const now = new Date();
    console.log('The world is going to end today.');
    console.log('now -> ',now.toString());
});