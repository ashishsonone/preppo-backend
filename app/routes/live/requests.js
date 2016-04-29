'use strict'

var express = require('express');
var RSVP = require('rsvp');

var errUtils = require('../../utils/error');

//START PATH /v1/live/requests/

var router = express.Router();

/*post a teaching request
*/
router.post('/', function(req, res){
  var studentUsername = req.body.username;
  var topic = req.body.topic;
  
  if(!(topic && studentUsername)){
    res.json({error : 401, message : "required fields : [username, topic]"});
    return;
  }
  
  var date = new Date().toISOString().slice(0, 10);
  var requestId = date + "/" + studentUsername + "_" + parseInt(new Date().getTime()/1000);
  
  res.json({
    requestId : requestId,
    message : "wait for 60 seconds"
  });

});

module.exports.router = router;