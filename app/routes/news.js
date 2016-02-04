'use strict'

var express = require('express');
var mongoose = require('mongoose');
var errUtils = require('../utils/error');
var AdminUser = require('../models/admin_user');
var News = require('../models/news');
var checker = require('../utils/checker');

var NewsModel = News.model;

var enumRoles = AdminUser.enumRoles;
var enumStatus = News.enumStatus;

var router = express.Router();
//start ENDPOINT /v1/admin/news/

/*get all news items
  get parameters: 
    status (required)

    limit (optional)
    gt=<date>(optional)
    lt=<date>(optional)
*/

router.get('/', function(req, res){
  if([enumRoles.ADMIN, enumRoles.EDITOR].indexOf(req.session.role) < 0){
    res.status(403);
    res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHORIZED, "you are not authorized - admin/editor only"));
    return;
  }

  var sane = true;
  //required
  var status = checker.isString(req.query.status);
  if(!status){
    sane = false;
  }

  if(!sane){
    res.status(400);
    res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : 'status'"));
    return;
  }

  //optional gt, lt, limit
  var limit = parseInt(req.query.limit) || 15; //default limit of 15

  if(req.query.gt){
    var gt = checker.isDateString(req.query.gt);
    if(!gt){
      sane = false;
    }
  }

  if(req.query.lt){
    var lt = checker.isDateString(req.query.lt);
    if(!lt){
      sane = false;
    }
  }

  console.log(gt + ", " + lt);

  if(!sane){
    res.status(400);
    res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, 
      "invalid optional parameters : [gt, lt]"));
    return;
  }

  var query = null;
  var sortBy = null;
  var projection = null;

  if(status === enumStatus.UPLOADED){
    query = {};
    query.status = status;
    if(gt){
      query.uploadedAt = {'$gt' : gt};
      limit = 100; //get all updated since last fetched (max 100)
    }
    else if(lt){
      query.uploadedAt = {'$lt' : lt};
    }

    sortBy = {uploadedAt : -1}; //-1 means decreasing order
  }
  else if(status === enumStatus.APPROVED){
    res.json({message : "implementing"});
  }
  else{
    res.json({message : "Not yet implemented"});
    return;
  }

  NewsModel
    .find(query)
    .sort(sortBy)
    .limit(limit)
    .exec(function (err, newsItems){
      if(!err){
        res.json(newsItems);
        return;
      }
      else{
        res.status(500);
        res.json(errUtils.ErrorObject(errUtils.errors.DB_ERROR, "unable to fetch news items", err));
        return;
      }
    });
});


/*
  create a new news item
  post params:
    heading (required)
    points (required) - array
    language (required)
    publishDate (required)

    imageUrl (optional)
    categories (optional)
    tags (optional)
    
  auto filled:
    uploadedAt //default value Date.now()
    uploadedBy 
    status //default value 'uploaded'

  not set: //since status is 'uploaded'
    editedBy
    editedAt
*/
router.post('/', function(req, res){
  //sanity check for required parms and their type
  var sane = true;
  var heading = checker.isString(req.body.heading);
  var points = checker.isArray(req.body.points);
  var language = checker.isString(req.body.language);
  var publishDate = checker.isDateString(req.body.publishDate);

  if(!(heading && points && language && publishDate)){
    sane = false;
  }

  if(!sane){
    res.status(400);
    res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [heading, points, language, publishDate]"));
    return;
  }

  //now optional params and their type
  if(req.body.imageUrl){
    var imageUrl = checker.isString(req.body.imageUrl);
    if(!imageUrl){
      sane = false;
    }
  }

  if(req.body.categories){
    var categories = checker.isArray(req.body.categories);
    if(!categories){
      sane = false;
    }
  } 

  if(req.body.tags){
    var tags = checker.isArray(req.body.tags);
    if(!tags){
      sane = false;
    }
  }

  if(!sane){
    res.status(400);
    res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, 
      "invalid optional parameters : [imageUrl, categories, tags]"));
    return;
  }

  var newsItem = new NewsModel();
  //set required
  newsItem.heading = heading;
  newsItem.points = points;
  newsItem.language = language;
  newsItem.publishDate = publishDate;

  newsItem.imageUrl = imageUrl;
  newsItem.categories = categories ? categories : [];
  newsItem.tags = tags ? tags : [];

  //fill auto (uploadedAt, status set by mongoose)
  newsItem.uploadedBy = req.session.email;

  newsItem.save(function(err, newNewsItem){
    if(!err){
      res.json(newNewsItem);
      return;
    }
    else{
      res.status(500);
      res.json(errUtils.ErrorObject(errUtils.errors.DB_ERROR, "error create news item", err));
      return;
    }
  });
});


module.exports.router = router;