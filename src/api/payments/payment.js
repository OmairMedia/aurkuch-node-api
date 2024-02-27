const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const {
  userRef,
  walletRef,
  brandRef,
  brandCategoriesRef,
  withdrawRequestsRef,
  notificationsRef,
} = require("../../db/ref");
const { body, validationResult } = require("express-validator");
const momenttimezone = require("moment-timezone");
const axios = require("axios");
const credentials = require("../../config/private.json");
const { encryptRSAKey, encryptRSAKey2 } = require("../../functions/helper");

const EncryptRsa = require("encrypt-rsa").default;
// create instance
const encryptRsa = new EncryptRsa();

const sandbox_url =
  "https://api.eu-de.apiconnect.appdomain.cloud/easypaisaapigw-telenorbankpk-tmbdev/dev-catalog";

// Easypaisa Inquiry
router.post("/check-user-wallet", (req, res) => {
  const body = req.body;

  try {
    let url = `${sandbox_url}/MaToMA/Inquiry`;

    let config = {
      headers: {
        "X-IBM-Client-Id": "5f5c551f-8cd5-497a-b598-8875e7b1fc44",
        "X-IBM-Client-Secret":
          "B8kU1dI4tF2mH1gB3wJ4xE2kB5rD6xQ2fG5qL2uB6mI1rP7lX3",
        "X-Hash-Value": "REPLACE_THIS_VALUE",
        "X-Channel": "Aur Kuch Test",
        "content-type": "application/json",
        accept: "application/json",
      },
    };

    let requestBody = {
      Amount: "500",
      MSISDN: "utcofil",
      ReceiverMSISDN: "96318",
    };

    axios
      .post(url, body, config)
      .then((response) => {
        let data = response.data;
        console.log("res -> ", res);

        res.json({
          status: true,
          res: res,
          data: data,
        });
      })
      .catch((err) => {
        console.log("err -> ", err.message);
        res.json({
          status: false,
          error: err.message,
        });
      });
  } catch (err) {
    console.log("err -> ", err.message);
    res.json({
      status: false,
      error: err,
    });
  }
});

// Check Date
router.post("/check-date", (req, res) => {
  const formatDate = momenttimezone().tz("Asia/Karachi").format("YYYY-MM-DD");

  res.json({
    status: true,
    date,
  });
});

// Get Withdraw Requests For Table
router.get("/get_withdraw_datatable", (req, res) => {
  try {
    const params = req.query;
    let length;
    let projects = [];

    //   SORT , PAGINATION , SEARCH PARAMS
    let sort = params.sort;
    let page = parseInt(params.page) || 1;
    let per_page = parseInt(params.per_page) || 4;
    let search = params.search;

    withdrawRequestsRef
      .once("value", (querySnapshot) => {
        if (querySnapshot.val()) {
          let data = [];

          querySnapshot.forEach((doc) => {
            data.push(doc.val());
          });

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
          };

          console.log("final -> ", final);

          res.json(final);
        } else {
          let final = {
            status: true,
            total: 0,
            from: 0,
            to: 0,
            per_page: 0,
            current_page: 0,
            last_page: 0,
            items: [],
          };
          console.log("final -> ", final);
          res.json(final);
        }
      })
      .catch((err) => {
        console.log("err -> ", err);

        res.json({
          status: true,
          total: 1,
          from: 1,
          to: 1,
          per_page: 1,
          current_page: 1,
          last_page: 1,
          items: [],
        });
      });
  } catch (error) {
    console.log("error -> ", error);
    res.json({
      status: true,
      total: 0,
      from: 0,
      to: 0,
      per_page: 0,
      current_page: 0,
      last_page: 0,
      items: [],
    });
  }
});

// Create Withdrawel Request
router.post(
  "/create_withdraw_request",
  // Check if withdrawal request exists
  (req, res, next) => {
    const body = req.body;

    try {
      withdrawRequestsRef
        .orderByChild("user_id")
        .equalTo(body.uid)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            let havePendingRequest = false;
            snapshot.forEach((x) => {
              if (x.val().status === "pending") {
                havePendingRequest = true;
              }
            });

            if (havePendingRequest) {
              res.json({
                status: false,
                error: "A Withdrawal Request Already Exists For This User!",
              });
            } else {
              next();
            }
          }
        });
    } catch (err) {
      console.log("err -> ", err);
      res.json({
        status: false,
        error: err,
      });
    }
  },
  // Get User
  (req, res, next) => {
    const body = req.body;

    try {
      admin
        .auth()
        .getUser(body.uid)
        .then((user) => {
          req.body.user = user;
          next();
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err,
          });
        });
    } catch (err) {
      res.json({
        status: false,
        error: err,
      });
    }
  },
  // Get User's Wallet
  (req, res, next) => {
    const body = req.body;

    try {
      walletRef
        .child(body.uid)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const Wallet = snapshot.val();
            req.body.wallet = Wallet;

            next();
            // res.json({
            //   status: false,
            //   data: body,
            // });
          } else {
            res.json({
              status: false,
              error: "Wallet Not Found!",
            });
          }
        })
        .catch((err) => {
          console.log(err);
          res.json({
            status: false,
            error: err,
          });
        });
    } catch (err) {
      console.log(err);
      res.json({
        status: false,
        error: err,
      });
    }
  },
  // Create Withdrawel Request
  (req, res, next) => {
    const body = req.body;

    try {
      let newCompletedTask = withdrawRequestsRef.push();
      let data = {
        id: newCompletedTask.key,
        uid: body.uid,
        user_id: body.uid,
        email: body.user.email,
        username: body.user.displayName,
        amount: body.wallet.amount,
        status: "pending",
        created: momenttimezone.tz("Asia/Karachi").valueOf(),
        bank_details: body.bank_details,
        easypaisa: body.easypaisa,
        jazzcash: body.jazzcash,
        status: "pending",
      };

      // console.log("data -> ", data);

      newCompletedTask
        .set(data)
        .then(() => {
          let newNotification = notificationsRef.child(body.uid).push();
          newNotification
            .set({
              id: newNotification.key,
              title: `${body.user.displayName} has created a withdrawel request!`,
              body: `Withdrawel request will be reviewed soon, you will be notified on approval`,
            })
            .then(() => {
              res.json({
                status: true,
                message: "Withdrawel Request Has Been Created!",
              });
              // next();
            })
            .catch((err) => {
              res.json({
                status: false,
                error: err.message,
              });
            });
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
    } catch (err) {
      console.log(err);
      res.json({
        status: false,
        error: err,
      });
    }
  }
);

// Approve Withdraw Request
router.post(
  "/approve_withdraw_request",
  // Get User
  (req, res, next) => {
    const body = req.body;

    try {
      admin
        .auth()
        .getUser(body.uid)
        .then((user) => {
          req.body.user = user;
          next();
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err,
          });
        });
    } catch (err) {
      console.log("err -> ", err);
      res.json({
        status: false,
        error: err,
      });
    }
  },
  // Get Task
  (req, res, next) => {
    try {
      tasksRef
        .orderByChild("type")
        .equalTo("subscribe")
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const tasks = [];
            snapshot.forEach((x) => {
              tasks.push(x.val());
            });
            let task = tasks[0];

            req.body.actualtask = task;
            next();
          } else {
            res.json({
              status: false,
              error: "No Task Exists Found With This Task ID!",
            });
          }
        });
    } catch (err) {
      console.log("err -> ", err);
      res.json({
        status: false,
        error: err,
      });
    }
  },
  // Get User's Wallet
  (req, res, next) => {
    const body = req.body;

    try {
      walletRef
        .child(body.uid)
        .once("value", (snapshot) => {
          if (snapshot.val()) {
            const Wallet = snapshot.val();
            req.body.wallet = Wallet;
            console.log("Wallet -> ", Wallet);
            next();
          } else {
            res.json({
              status: false,
              error: "Wallet Not Found!",
            });
          }
        })
        .catch((err) => {
          console.log(err);
          res.json({
            status: false,
            error: err,
          });
        });
    } catch (err) {
      console.log(err);
      res.json({
        status: false,
        error: err,
      });
    }
  },
  // Approve Withdraw Request
  (req, res, next) => {
    const body = req.body;

    try {
      let newCompletedTask = withdrawRequests.push();

      newCompletedTask
        .set({
          id: newCompletedTask.key,
          uid: body.uid,
          user_id: body.uid,
          email: body.user.email,
          username: body.user.displayName,
          task_id: body.task_id,
          task_name: body.task.name,
          task_verification_image: body.task.image,
          task_type: body.task.type,
          task_reward: body.task.reward,
          verification_image: body.task.image,
          status: "approved",
          created: momenttimezone.tz("Asia/Karachi").valueOf(),
        })
        .then(() => {
          let newNotification = notificationsRef.child(body.uid).push();
          newNotification
            .set({
              id: newNotification.key,
              title: `You have completed ${body.task.name} task successfully!`,
              body: `You have been rewarded with ${body.task.reward} in your wallet`,
            })
            .then(() => {
              next();
            })
            .catch((err) => {
              res.json({
                status: false,
                error: err.message,
              });
            });
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err.message,
          });
        });
    } catch (err) {
      console.log(err);
      res.json({
        status: false,
        error: err,
      });
    }
  },
  // Update User's Wallet
  (req, res, next) => {
    const body = req.body;

    try {
      let previousBalance = body.wallet.amount;
      let reward = body.task.reward;
      let newBalance = parseInt(previousBalance) + parseInt(reward);
      let transactions = body.wallet.transactions;
      console.log("previousBalance -> ", previousBalance);
      console.log("reward -> ", reward);
      console.log("newBalance -> ", newBalance);

      let newTrasaction = {
        task_id: body.task_id,
        task_name: body.task.name,
        task_type: body.task.type,
        task_reward: reward,
        previousBalance: parseInt(previousBalance),
        newBalance: newBalance,
        created: momenttimezone.tz("Asia/Karachi").valueOf(),
      };

      if (transactions) {
        transactions.push(newTrasaction);
      } else {
        transactions = [newTrasaction];
      }

      walletRef
        .child(body.uid)
        .update({
          amount: newBalance,
          transactions: transactions,
        })
        .then(() => {
          next();
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err,
          });
        });
    } catch (err) {
      console.log(err);
      res.json({
        status: false,
        error: err,
      });
    }
  }
);

// Disapprove Withdraw Request
router.post(
  "/reject_withdraw_request",
  // Get Request
  (req, res, next) => {
    const body = req.body;

    withdrawRequests.child(body.id).once("value", (snapshot) => {
      if (snapshot.val()) {
        req.body.request = snapshot.val();
        next();
      } else {
        res.json({
          status: false,
          error: "Error",
        });
      }
    });
  },
  // Check Request
  (req, res, next) => {
    const body = req.body;
    const request = body.request;

    if (request.status === "pending") {
      withdrawRequests
        .update({
          status: "rejected",
        })
        .then(() => {
          res.json({
            status: true,
            message: "Request has been rejected!",
          });
        })
        .catch((err) => {
          res.json({
            status: false,
            error: err,
          });
        });
    } else {
      res.json({
        status: false,
        error: `Request has status of ${request.status}!`,
      });
    }
  }
);

async function authenticateEasypaisa() {
  try {
    let phone = "923243280234";
    let timestamp = momenttimezone()
      .tz("Asia/Karachi")
      .format("YYYY-MM-DD HH:mm:ss.x");
    let total = `${phone}~${timestamp}`;
    console.log("total -> ", total);

    let url = `${sandbox_url}/LoginAPI/token`;
    let username = "923243280234";

    let key = await encryptRSAKey(username);

    // const encryptedText = encryptRsa.encryptStringWithRsaPublicKey({
    //   text: username,
    //   publicKey: key,
    // });

    // console.log(encryptedText);

    let config = {
      headers: {
        "X-IBM-Client-Id": "5f5c551f-8cd5-497a-b598-8875e7b1fc44",
        "X-IBM-Client-Secret":
          "B8kU1dI4tF2mH1gB3wJ4xE2kB5rD6xQ2fG5qL2uB6mI1rP7lX3",
        "X-Msisdn": encryptedText,
        "X-Channel": "Aur Kuch Test",
        "content-type": "application/json",
        accept: "application/json",
      },
    };

    axios
      .post(url, config)
      .then((response) => {
        let data = response.data;
        console.log("response -> ", response);
        console.log("data -> ", data);

        // res.json({
        //     status:true,
        //     res:response,
        //     data: data
        // })
      })
      .catch((err) => {
        console.log("err -> ", err);
        // res.json({
        //     status:false,
        //     error:err.message
        // })
      });
  } catch (err) {
    console.log("err -> ", err);
    // res.json({
    //     status:false,
    //     error:err.message
    // })
  }
}

// authenticateEasypaisa()

module.exports = router;
