'use strict'

var express = require('express');

var FeedbackModel = require('../../models/feedback').model;

var errUtils = require('../../utils/error');

var router = express.Router();

//start ENDPOINT /v1/app/extra

/*
  store user feedback
  required:
    message
  optional:
    username
*/
router.post('/feedback', function(req, res){
  var message = req.body.message;
  var username = req.body.username;

  //parameters required
  if(!(message)){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required params [message], optional [username]"));
  }

  var newFeedback = new FeedbackModel();
  newFeedback.message = message;
  if(username){
    newFeedback.username = username;
  }

  var promise = newFeedback.save();

  promise = promise.then(function(feedbackObject){
    return res.json(feedbackObject);
  });

  promise.catch(function(err){
    res.status(500);
    return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable store feedback", err, 500));      
  });
});

module.exports.router = router;