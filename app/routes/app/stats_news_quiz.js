'use strict'

var express = require('express');
var RSVP = require('rsvp');

var authApiHelper = require('./auth_help');

var StatsNewsQuizCumulativeModel = require('../../models/stats_news_quiz_cumulative').model;
var StatsNewsQuizIndividualModel = require('../../models/stats_news_quiz_individual').model;
var StatsNewsQuizSingleModel = require('../../models/stats_news_quiz_single').model;

var errUtils = require('../../utils/error');

//START PATH /v1/app/stats/news/quiz/

var router = express.Router();

/*returns cumulative stats of news quiz for logged-in user
*/
router.get('/cumulative', authApiHelper.loginRequiredMiddleware, function(req, res){
  var username = req.session.username;
  var promise = StatsNewsQuizCumulativeModel
    .findOne({username : username})
    .exec();

  promise = promise.then(function(result){
    if(!result){
      throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "cumulative stats not found", null, 404);
      return;
    }
    return res.json(result);
  });

  promise = promise.catch(function(err){
    //error caught and set earlier
    if(err.resStatus){
      res.status(err.resStatus);
      return res.json(err);
    }
    else{
      //uncaught error
      res.status(500);
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "error getting stats", err));  
    }
  });

});

/*update(or insert) cumulative stats of news quiz for logged-in user
  params required:
    updates : dictionary/map of key-values like 
      {
        'politics' : {attempted : 3, correct : 2} //for sending 3 attempted, 2 correct
        'international' : {attempted : 5, correct : 1}
      }
*/
router.put('/cumulative', authApiHelper.loginRequiredMiddleware, function(req, res){
  if(!req.body.updates || req.body.updates.constructor !== Object){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [updates]"));
  }

  var username = req.session.username; //from session
  var updates = req.body.updates;
  var stats = null;
  var incrementChanges = {};
  for(var category in updates){
    stats = updates[category];
    incrementChanges['stats.' + category + '.attempted'] = parseInt(stats.attempted) || 0;
    incrementChanges['stats.' + category + '.correct'] = parseInt(stats.correct) || 0;
  }

  console.log("%j", incrementChanges);

  StatsNewsQuizCumulativeModel.findOneAndUpdate(
    {username :  username},
    {'$inc' : incrementChanges},
    {new : true, upsert : true},
    function(err, result){
      if(!err && result){
        res.json(result);
        return;
      }
      else{
        res.status(500);
        res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "error updating cumulative stats", err));
        return;
      }
    }
  );
});

/*get individual record of stats
  params required:
    months : command seperated e.g : ?months=2016-01,2016-02 
*/
/*router.get('/individual', authApiHelper.loginRequiredMiddleware, function(req, res){
  var months = req.query.months;
  if(!months){
    return res.json({message : "params required : [months]"});
  }

  var monthArray = null;
  monthArray = months.split(',');
  monthArray.map(function(x){return x.trim();}) //trim spaces around month values after splitting

  var username = req.session.username;

  var promise = StatsNewsQuizIndividualModel
    .find({
      username : username, 
      month : {'$in' : monthArray}
    })
    .limit(12)
    .exec();

  promise = promise.then(function(result){
    return res.json(result);
  });

  promise = promise.catch(function(err){
    //error caught and set earlier
    if(err.resStatus){
      res.status(err.resStatus);
      return res.json(err);
    }
    else{
      //uncaught error
      res.status(500);
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "error getting stats", err));  
    }
  });
});*/

/*update(or insert) individual quiz-wise stats bucketed monthly
  params required:
    month : string in form '2016-02' for feb 2016
    quizId : object id of quiz
    attempted : Number
    correct : Number
*/
/*router.put('/individual', authApiHelper.loginRequiredMiddleware, function(req, res){
  var month = req.body.month;
  var quizId = req.body.quizId;
  var attempted = req.body.attempted;
  var correct = req.body.correct;
  if(!(month && quizId && attempted != undefined && correct != undefined)){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [month, quizId, attempted, correct]"));
  }

  attempted = parseInt(req.body.attempted) || 0;
  correct = parseInt(req.body.correct) || 0;

  var username = req.session.username; //from session

  var setChanges = {};
  setChanges['stats.' + quizId + '.a'] = attempted;
  setChanges['stats.' + quizId + '.c'] = correct;

  StatsNewsQuizIndividualModel.findOneAndUpdate(
    {username :  username, month : month},
    {'$set' : setChanges},
    {new : true, upsert : true},
    function(err, result){
      if(!err && result){
        res.json(result);
        return;
      }
      else{
        res.status(500);
        res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "error updating individual stats", err));
        return;
      }
    }
  );
});*/

/*get individual record of stats
  params (optional):
    lt : string - publishDate of quiz //default latest according to publishDate
    limit : number //default 20 entries
    miminal : number 0 or 1, //if not specified default is 0 (i.e all fields returned)
*/
router.get('/single', authApiHelper.loginRequiredMiddleware, function(req, res){
  var username = req.session.username;
  var ltDateString = req.query.lt;

  //console.log("%j", req.query);
  
  var MAX_LIMIT = 50;
  var DEFAULT_LIMIT = 20;

  var limit = parseInt(req.query.limit) || DEFAULT_LIMIT;
  limit = limit > MAX_LIMIT ? MAX_LIMIT : limit;

  //console.log("/single limit = " + limit);

  var minimal = parseInt(req.query.minimal) || 0;
  var findQuery = {username : username};
  if(ltDateString){
    findQuery.publishDate = { '$lte' : ltDateString};
  }

  var selectFields = null;

  //if minimal desired, select fields like quizId, attempted, correct
  if(minimal === 1){
    selectFields = {
      quizId : true,
      attempted : true,
      correct : true,
      publishDate : true
    }
  }

  var promise = StatsNewsQuizSingleModel
    .find(findQuery)
    .sort({
      publishDate : -1
    })
    .select(selectFields)
    .limit(limit)
    .exec();

  promise = promise.then(function(result){
    return res.json(result);
  });

  promise = promise.catch(function(err){
    //uncaught error
    res.status(500);
    return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "error getting stats", err));  
  });
});

/*update(or insert) individual quiz-wise stats
  params required:
    publishDate : of quiz
    quizId : object id of quiz
    attempted : Number
    correct : Number
*/
router.put('/single', authApiHelper.loginRequiredMiddleware, function(req, res){
  var publishDate = req.body.publishDate;
  var quizId = req.body.quizId;
  var attempted = req.body.attempted;
  var correct = req.body.correct;

  if(!(publishDate && quizId && attempted != undefined && correct != undefined)){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [publishDate, quizId, attempted, correct]"));
  }

  attempted = parseInt(req.body.attempted) || 0;
  correct = parseInt(req.body.correct) || 0;

  var username = req.session.username; //from session

  var setChanges = {
    publishDate : publishDate,
    attempted : attempted,
    correct : correct
  };

  StatsNewsQuizSingleModel.findOneAndUpdate(
    {username :  username, quizId : quizId},
    {'$set' : setChanges},
    {new : true, upsert : true},
    function(err, result){
      if(!err && result){
        res.json(result);
        return;
      }
      else{
        res.status(500);
        res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "error updating single stats", err));
        return;
      }
    }
  );
});

module.exports.router = router;