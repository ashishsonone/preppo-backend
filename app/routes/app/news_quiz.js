'use strict'

var express = require('express');
var RSVP = require('rsvp');

var authApiHelper = require('./auth_help');
var NewsQuizModel = require('../../models/news_quiz').model;
var NewsQuizQuestionModel = require('../../models/news_quiz_question').model;

var errUtils = require('../../utils/error');
var enumStatus = require('../../utils/constants').enumStatus;

var redisCache = require('../../utils/redis_cache');

//START PATH /v1/app/news/quiz
var router = express.Router();

/*get latest published quiz items(sorted by publishDate)
  optional params:
    lt : Date String (format YYYY-MM-DD)
    limit : Number (max 30)
  first look into cache, if not found then fetch from db and insert into cache
*/
router.get('/', authApiHelper.loginRequiredMiddleware, function(req, res){
  var ltDateString = req.query.lt;

  //find in cache
  var key = '/news/quiz?';

  var MAX_LIMIT = 50;
  var DEFAULT_LIMIT = 15;

  var limit = parseInt(req.query.limit) || DEFAULT_LIMIT;
  limit = limit > MAX_LIMIT ? MAX_LIMIT : limit;

  key += 'limit=' + limit;

  if(ltDateString){
    key += '&lt=' + ltDateString;
  }

  var promise = redisCache.getFromCache(key);
  var cached = true; //hoping we will find in cache(used not to reinsert into cache)

  //catch not-found-in-cache error and return find-in-db promise
  promise = promise.then(null, function(err){
    cached = false;
    var findQuery = {status : enumStatus.PUBLISHED};
    if(ltDateString){
      findQuery.publishDate = { '$lte' : ltDateString};
    }

    console.log("GET /app/news/quiz cache error -----> %j query %j", err, findQuery);
    //use index on news {status:1, publishDate:1}
    return NewsQuizModel
      .find(findQuery)
      .sort({
        status : -1,
        publishDate : -1,
      })
      .select({
        type : true,
        publishDate : true,
        nickname : true,

        updatedAt : true,
        createdAt : true
      })
      .limit(limit)
      .exec();
  });

  promise = promise.then(function(newsQuizItems){
    //got the news items either from cache or db
    if(!cached){
      var p = redisCache.putIntoCache(key, newsQuizItems);
      
      //debug
      p.then(function(r){
        console.log("redis nq---> success r=%j", r)
      }, function(e){
        console.log("redis nq---> error e=%j", e);
      });
    }

    return res.json(newsQuizItems);
  });

  promise.catch(function(err){
    //error caught and set earlier
    if(err && err.resStatus){
      res.status(err.resStatus);
      return res.json(err);
    }
    else{
      //uncaught error
      res.status(500);
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to fetch news quiz", err, 500));  
    }
  });
});

/*get all the questions for the quiz given its id
  first look into cache, if not found then fetch from db and insert into cache
*/
router.get('/:id', authApiHelper.loginRequiredMiddleware, function(req, res){
  var quizId = req.params.id;

  //find in cache
  var key = '/news/quiz/' + quizId;

  var promise = redisCache.getFromCache(key);
  var cached = true; //hoping we will find in cache(used not to reinsert into cache)

  //catch not-found-in-cache error and return find-in-db promise
  promise = promise.then(null, function(err){
    cached = false;

    var p = NewsQuizModel.findOne({_id : quizId}).select({questionIdList : true}).exec();

    console.log("GET /app/news/quiz/<id> cache error -----> %j", err);
    //use index on news {status:1, publishDate:1}
    p = p.then(function(quiz){
      if(!quiz || !quiz.questionIdList){
        throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "quiz not found", null, 404);
        return;
      }

      var questionIdList = quiz.questionIdList;

      return NewsQuizQuestionModel.find({
        '_id' : {
          '$in' : questionIdList
        }
      })
      .select({
        content : true,
        level : true,
        category : true,

        updatedAt : true,
        createdAt : true
      })
      .limit(100)
      .exec();
    });

    return p;
  });

  promise = promise.then(function(questionItems){
    //got the news items either from cache or db
    if(!cached){
      var p = redisCache.putIntoCache(key, questionItems);
      
      //debug
      p.then(function(r){
        console.log("redis nqq---> success r=%j", r)
      }, function(e){
        console.log("redis nqq---> error e=%j", e);
      });
    }

    return res.json(questionItems);
  });

  promise.catch(function(err){
    //error caught and set earlier
    if(err && err.resStatus){
      res.status(err.resStatus);
      return res.json(err);
    }
    else{
      //uncaught error
      res.status(500);
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to fetch news quiz questions", err, 500));  
    }
  });
});

module.exports.router = router;