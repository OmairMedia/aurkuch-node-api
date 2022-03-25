// Database Reference
// Not Been Used Now ...
// TODO:

// Libraries Here
const admin = require('firebase-admin');

cloud_message = admin.messaging();

// Exporting Functions Here
module.exports = {
  send_notification_to_single_user(notificationData, user) {
    console.log(notificationData);

    cloud_message
      .sendToDevice(notificationData.token, {
        data: notificationData.data,
      })
      .then((data) => {
        console.log(data);
      })
      .catch((e) => console.log(e));
  },
  send_notification_to_single_driver(notificationData, driver) {
    console.log(notificationData);

    cloud_message
      .sendToDevice(notificationData.token, {
        data: notificationData.data,
      })
      .then((data) => {
        console.log(data);
      })
      .catch((e) => console.log(e));
  },
  send_notification_to_single_vendor(notificationData, vendor) {
    console.log(notificationData);

    cloud_message
      .sendToDevice(notificationData.token, {
        data: notificationData.data,
      })
      .then((data) => {
        console.log(data);
      })
      .catch((e) => console.log(e));
  },
  send_pro_user_application_status_notification(
    notificationData,
    user
  ) {
    console.log(notificationData);

    cloud_message
      .sendToDevice(notificationData.token, {
        data: notificationData.data,
      })
      .then((data) => {
        console.log(data);
      })
      .catch((e) => console.log(e));
  },
  
};
