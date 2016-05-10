'use strict'

var express = require('express');
var RSVP = require('rsvp');

var errUtils = require('../../utils/error');
var appLinks = require("../../../config/common").appLinks;

var sms = requre('../../utils/sms');

//START PATH /v1/live/extra/
var router = express.Router();

/*get app link (-- NOT IN USE --)
  params:
    phone : string
    app : <app name> [live_teacher, live_student]
*/
router.post('/send-app-link', function(req, res){
  var phone = req.body.phone;
  var app = req.body.app;
  
  if(!(phone && app)){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [phone, app]"));
  }

  if(!appLinks[app]){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_INVALID, "invalid 'app' param value"));
  }

  var message = "Go to " + link + " to download Preppo Current Affairs App";
  var promise = sms.sendTransactionalMessage(phone, message);

  //check for result
  promise = promise.then(function(result){
    console.log("link sent result = %j", result);
    return res.json({"success" : true});
  });

  promise.catch(function(err){
    //error caught and set earlier
    if(err.resStatus){
      res.status(err.resStatus);
      return res.json(err);
    }
    else{
      //uncaught error
      res.status(500);
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to send app link", err));
    }
  });

});

module.exports.router = router;
