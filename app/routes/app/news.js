'use strict'

var express = require('express');
var RSVP = require('rsvp');

var authApiHelper = require('./auth_help');
var NewsModel = require('../../models/news').model;
var NewsMonthlyDigestModel = require('../../models/news_monthly_digest').model;

var errUtils = require('../../utils/error');
var enumStatus = require('../../utils/constants').enumStatus;

var redisCache = require('../../utils/redis_cache');

//START PATH /v1/app/news
var router = express.Router();

/*get news items for a particular date sorted by decreasing updatedAt
  required params:
    date : String (format YYYY-MM-DD)
  first look into cache, if not found then fetch from db and insert into cache
*/
router.get('/', function(req, res){
  var dateString = req.query.date;

  if(!dateString){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : 'date'"));
  }

  //find in cache
  var key = '/news/?date=' + dateString;
  var promise = redisCache.getFromCache(key);
  var cached = true; //hoping we will find in cache(used not to reinsert into cache)

  //catch not-found-in-cache error and return find-in-db promise
  promise = promise.then(null, function(err){
    cached = false;
    console.log("GET /app/news cache error -----> %j", err);
    //use index on news {status:1, publishDate:1}
    return NewsModel
      .find({
        status : enumStatus.PUBLISHED,
        publishDate : dateString, //it will get converted into date by mongoose :)
      })
      .sort({
        updatedAt : -1
      })
      .select({
        content : true,
        imageWeb : true,
        imageMobile : true,
        publishDate : true,
        
        updatedAt : true,
        createdAt : true
      })
      .limit(30) //assuming max 30 news items for the date
      .exec();
  });

  promise = promise.then(function(newsItems){
    //got the news items either from cache or db
    if(!cached){
      var p = redisCache.putIntoCache(key, newsItems);
      
      //debug
      p.then(function(r){
        console.log("redis ---> success r=%j", r)
      }, function(e){
        console.log("redis ---> error e=%j", e);
      });
    }

    return res.json(newsItems);
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
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to fetch news", err, 500));  
    }
  });
});

/*return monthly digest items sorted descending by publishDate

Note: insert manually using 
db.news_monthly_digest.insert({name : "March 2016", publishDate : ISODate("2016-04-02"), url : "https://preppo.in"})
*/
router.get('/monthlydigest',  authApiHelper.loginRequiredMiddleware, function(req, res){
  //find in cache
  var key = '/news/monthlydigest';
  var promise = redisCache.getFromCache(key);
  var cached = true; //hoping we will find in cache(used not to reinsert into cache)

  //catch not-found-in-cache error and return find-in-db promise
  promise = promise.then(null, function(err){
    cached = false;
    console.log("GET /app/news/monthlydigest cache error -----> %j", err);

    //use index on news {publishDate:1}
    return NewsMonthlyDigestModel
    .find({})
    .sort({
      publishDate : -1
    })
    .limit(50)
    .exec();
  });

  promise = promise.then(function(digestItems){
    //got the news items either from cache or db
    if(!cached){
      var p = redisCache.putIntoCache(key, digestItems);
      
      //debug
      p.then(function(r){
        console.log("redis digest---> success r=%j", r)
      }, function(e){
        console.log("redis digest---> error e=%j", e);
      });
    }

    return res.json(digestItems);
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
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to get digest items", err, 500));  
    }
  });

});

module.exports.router = router;