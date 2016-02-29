'use strict'

var express = require('express');
var RSVP = require('rsvp');

var authApiHelper = require('./auth_help');

var StatsNewsQuizCumulativeModel = require('../../models/stats_news_quiz_cumulative').model;
var StatsNewsQuizIndividualModel = require('../../models/stats_news_quiz_individual').model;

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

  promise.then(function(result){
    if(!result){
      throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "cumulative stats not found", null, 404);
      return;
    }
    return res.json(result);
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
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "error getting stats", err));  
    }
  });

});

/*update(or insert) cumulative stats of news quiz for logged-in user
  params required:
    statsUpdates : dictionary/map of key-values like 
      {
        'politics' : { attempted : 3, correct : 2}.
        'international' : {attempted :5, correct : 1}
      }
*/
router.put('/cumulative', authApiHelper.loginRequiredMiddleware, function(req, res){
  if(!req.body.statsUpdates || req.body.statsUpdates.constructor !== Object){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [statsUpdates]"));
  }

  var username = req.session.username; //from session
  var statsUpdates = req.body.statsUpdates;
  var stats = null;
  var incrementChanges = {};
  for(var category in statsUpdates){
    stats = statsUpdates[category];
    incrementChanges['stats.' + category + '.attempted'] = parseInt(stats['attempted']);
    incrementChanges['stats.' + category + '.correct'] = parseInt(stats['correct']);
  }

  console.log("%j", incrementChanges);

  StatsNewsQuizCumulativeModel.findOneAndUpdate(
    {username :  username},
    {'$set' : {username : username}, '$inc' : incrementChanges},
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

router.get('/individual', authApiHelper.loginRequiredMiddleware, function(req, res){
  if(!req.query.month){
    return res.json({message : "params required : [month]"});
  }
  res.json({message : "Hello " + req.session.username + ". Under construction !!"});
});

//db.cumulative.update({username : 'ashish'}, {$set : {username : 'ashish'}, $inc : {'stats.politics.attempted' :10, 'stats.politics.correct' : 7}}, {upsert : true})
module.exports.router = router;