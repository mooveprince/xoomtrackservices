var request = require('request');
var express = require('express');

var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  request({url:'http://localhost:3003/services/getSubscribers', json:true}, function (error, response, body ) {
    console.log("Response is.." + body[0].email);
    res.send("Services are up and running");
  });
});



module.exports = router;