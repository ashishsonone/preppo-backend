'use strict'

var express = require('express');
var RSVP = require('rsvp');

var authApiHelper = require('./auth_help');
var NewsQuizModel = require('../../models/news_quiz').model;
var enumNewsQuizType = require('../../models/news_quiz').enumNewsQuizType;

var NewsQuizQuestionModel = require('../../models/news_quiz_question').model;

var errUtils = require('../../utils/error');
var enumStatus = require('../../utils/constants').enumStatus;

var redisCache = require('../../utils/redis_cache');

//START PATH /v1/app/news/quiz
var router = express.Router();

/*get latest published quiz items(sorted by publishDate)
  Note : 
    if(lt not given) return only 1 latest daily quiz, and all weekly and monthly quizzes, 
    the daily quiz must be at the top

    otherwise return all weekly & monthly quizzes with publishDate <= lt

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
    var allQuizItems = [];

    var findQuery = {
      status : enumStatus.PUBLISHED,
      type : {'$in' : [enumNewsQuizType.WEEKLY, enumNewsQuizType.MONTHLY] }
    };
    if(ltDateString){
      findQuery.publishDate = { '$lte' : ltDateString};
    }

    console.log("GET /app/news/quiz cache error -----> %j query %j", err, findQuery);

    //first find all weekly and montly quizzes
    //use index on news {status:1, type : 1, publishDate:1}
    var findPromise = NewsQuizModel
      .find(findQuery)
      .sort({
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

    findPromise = findPromise.then(function(weelyQuizItems){
      allQuizItems = weelyQuizItems;
      if(ltDateString){
        //since lt param present, no daily quiz returned, return empty array
        return [];
      }
      else{
      //second find the one latest daily quiz
        return NewsQuizModel
          .find({
            status : enumStatus.PUBLISHED,
            type : enumNewsQuizType.DAILY
          })
          .sort({
            publishDate : -1,
          })
          .select({
            type : true,
            publishDate : true,
            nickname : true,

            updatedAt : true,
            createdAt : true
          })
          .limit(1)
          .exec();
      }
    });

    findPromise = findPromise.then(function(dailyQuizItems){
      return dailyQuizItems.concat(allQuizItems);
    });

    return findPromise;
  });

  promise = promise.then(function(resultQuizItems){
    console.log("GET /app/news/quiz result #num=" + resultQuizItems.length);
    //got the news items either from cache or db
    if(!cached){
      var p = redisCache.putIntoCache(key, resultQuizItems);
      
      //debug
      p.then(function(r){
        console.log("redis nq---> success r=%j", r)
      }, function(e){
        console.log("redis nq---> error e=%j", e);
      });
    }

    return res.json(resultQuizItems);
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

  var questionIdList = null; //ordered as stored in quiz entity

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

      questionIdList = quiz.questionIdList;

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
    var orderedQuestionItems = questionItems; //default if cached

    //got the news items either from cache or db
    if(!cached){
      //only if not cached, order the question according to that in quiz
      orderedQuestionItems = []; //reset
    
      //create a ordered list of question items
      var questionMap = {};
      questionItems.map(function(q){
        questionMap[q._id] = q;
      });

      questionIdList.map(function(qId){ //questionIdList won't be null
        var q = questionMap[qId];
        if(q != null){
          orderedQuestionItems.push(q);
        }
      });

      var p = redisCache.putIntoCache(key, orderedQuestionItems);
      
      //debug
      p.then(function(r){
        console.log("redis nqq---> success r=%j", r)
      }, function(e){
        console.log("redis nqq---> error e=%j", e);
      });
    }

    return res.json(orderedQuestionItems);
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