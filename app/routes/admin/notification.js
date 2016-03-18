'use strict'

var express = require('express');
var RSVP = require('rsvp');

var notificationLocalyticsUtils = require('../../utils/notification_localytics');
var errUtils = require('../../utils/error');

var router = express.Router();

//start ENDPOINT /v1/app/extra

/*
  post a new notification
  refer to https://slack-files.com/T034SA2M9-F0TMH1HDE-61eb13a017 for payload schema

  required params:
    targetType : one of ["customer_id", "broadcast"]
    secret : password to access
    _type
    _action

  optional:
    target : string <customer id> in case when targetType="customer_id"
    other fields of notification as described in documentation
*/

router.post('/', function(req, res){
  var targetType = req.body.targetType;
  var secret = req.body.secret;

  if(secret !== 'notsparta'){
    res.status(400);
    return res.json({message : "Wrong secret key"});
  }

  var _type = req.body._type;
  var _action = req.body._action;
  if(!(targetType && _type && _action)){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required params [targetType, _type, _action]"));
    return;
  }

  var target = req.body.target; //if targetType = customer_id
  if(["customer_id", "broadcast"].indexOf(targetType) < 0){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "invalid targetType value"));
    return;
  }

  var promise = RSVP.reject(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to send notification", null, 500));

  if(targetType === "customer_id"){
    if(!target){
      res.status(400);
      return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "for targetType='customer_id' : required param [target]"));
    }

    promise = notificationLocalyticsUtils.sendNotificationToCustomerId(target, req.body);
  }
  else{
    res.status(200);
    promise = notificationLocalyticsUtils.sendNotificationBroadcast(req.body);
  }
    
  promise = promise.then(function(result){
    return res.json(result);
  });

  promise.catch(function(err){
    res.status(500);
    return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to get feedbacks", err, 500));      
  });

});

module.exports.router = router;