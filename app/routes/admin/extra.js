'use strict'

var express = require('express');

var FeedbackModel = require('../../models/feedback').model;
var RatingNewsQuizModel = require('../../models/rating_news_quiz').model;

var errUtils = require('../../utils/error');

var router = express.Router();

//start ENDPOINT /v1/app/extra

/*
  get user feedbacks (sorted by createdAt)
  optional params:
    lt : get feedbacks less that this timestamp(createdAt)
    limit : how many items to return (default 20)
*/
router.get('/feedback', function(req, res){
  var lt = req.query.lt;
  var limit = parseInt(req.query.limit) || 20;

  var findQuery = {};
  if(lt){
    findQuery['createdAt'] = {'$lt' : lt};
  }

  var promise = FeedbackModel
    .find(findQuery)
    .sort({createdAt : -1})
    .limit(limit)
    .select({
      __v : false,
      _id : false,
      updatedAt : false
    })
    .exec();
    
  promise = promise.then(function(feedbackList){
    return res.json(feedbackList);
  });

  promise.catch(function(err){
    res.status(500);
    return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to get feedbacks", err, 500));      
  });
});


router.get('/ratings/news/quiz/:id', function(req, res){
  var quizId = req.params.id;

  var promise = RatingNewsQuizModel.findOne(
    {quizId :  quizId}
  ).exec();

  promise = promise.then(function(ratingObject){
    if(!ratingObject){
      throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "rating for this quiz not found", null, 404);
      return;
    }
    var result = {};
    result.quizId = ratingObject.quizId;
    result.ratingCount = ratingObject.ratingCount;
    result.ratingSum = ratingObject.ratingSum;
    var avg = ratingObject.ratingSum/ratingObject.ratingCount;
    avg = avg.toFixed(2); //returns string with rouded to 2 decimal places '2.30'
    avg = +avg; //converts string back to number
    result.ratingAverage = avg
    res.json(result);
  });

  promise.catch(function(err){
    if(err.resStatus){
      res.status(err.resStatus);
      res.json(err);
    }
    else{
      res.status(500);
      res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to fetch rating object", err));
    }
  });
});

router.get('/ratings/news/quiz/', function(req, res){
  var lt = req.query.lt;

  var findQuery = {};
  if(lt){
    findQuery.createdAt = {'$lt' : lt};
  }

  var promise = RatingNewsQuizModel.find(findQuery).limit(10).exec();

  promise = promise.then(function(ratingList){
    res.json(ratingList);
  });

  promise.catch(function(err){
    if(err.resStatus){
      res.status(err.resStatus);
      res.json(err);
    }
    else{
      res.status(500);
      res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to fetch rating objects", err));
    }
  });
});

module.exports.router = router;