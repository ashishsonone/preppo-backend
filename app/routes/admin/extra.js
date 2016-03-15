'use strict'

var express = require('express');

var FeedbackModel = require('../../models/feedback').model;

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

module.exports.router = router;