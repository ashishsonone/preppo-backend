'use strict'

var express = require('express');

var FeedbackModel = require('../../models/feedback').model;
var RatingNewsQuizModel = require('../../models/rating_news_quiz').model;

var errUtils = require('../../utils/error');
var sms = require('../../utils/sms');
var appLinks = require("../../../config/common").appLinks;

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

/*
  submit news quiz rating
  params required:
    quizId : string - object id of quiz
    rating : number - value in range 0-5
*/
router.post('/ratings/news/quiz', function(req, res){
  var quizId = req.body.quizId;
  var rating = parseFloat(req.body.rating);
  if(!(rating != null && quizId)){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required params [quizId, rating]"));
  }

  var incrementChanges = {};
  incrementChanges['ratingCount'] = 1;
  incrementChanges['ratingSum'] = rating;

  RatingNewsQuizModel.findOneAndUpdate(
    {quizId :  quizId},
    {'$inc' : incrementChanges},
    {new : true, upsert : true},
    function(err, result){
      if(!err && result){
        res.json(result);
        return;
      }
      else{
        res.status(500);
        res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "error updating cumulative rating for quiz", err));
        return;
      }
    }
  );
});

/*get app link on mobile number
  required params:
    phone : <string> 10 digit mobile number
*/
router.post('/send-app-link', function(req, res){
  var phone = req.body.phone;

  if(!phone){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required params [phone]"));
  }

  var template = "Read, Revise and Remember Current Affairs like never before. Please click on the link below to download the Preppo mobile app.";
  var link = appLinks["current_affairs"];

  var promise = sms.sendTransactionalMessage(phone, template + " " + link);

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