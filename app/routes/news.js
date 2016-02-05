'use strict'

var express = require('express');
var mongoose = require('mongoose');
var errUtils = require('../utils/error');
var AdminUser = require('../models/admin_user');
var News = require('../models/news');

var NewsModel = News.model;

var enumRoles = AdminUser.enumRoles;
var enumStatus = News.enumStatus;

var router = express.Router();
//start ENDPOINT /v1/admin/news/

/*get all news items
  get parameters: 
    status (required)

    limit : <integer> (optional)
    gt : <date>(optional)
    lt : <date>(optional)

  if status='uploaded' then return latest uploaded news using 'uploadedAt' date
  otherwise use 'editedAt' date field to return documents for 'approved' & 'published' news
*/

router.get('/', function(req, res){
  if([enumRoles.ADMIN, enumRoles.EDITOR].indexOf(req.session.role) < 0){
    res.status(403);
    res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHORIZED, "you are not authorized - admin/editor only"));
    return;
  }

  //required
  if(!req.query.status){
    res.status(400);
    res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : ['status']"));
    return;
  }

  var status = req.query.status;
  //optional gt, lt, limit
  var limit = parseInt(req.query.limit) || 15; //default limit of 15
  var gt = req.query.gt; //mongoose will cast date string to date object
  var lt = req.query.lt;

  console.log(gt + ", " + lt);

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
  else if(status === enumStatus.APPROVED || status === enumStatus.PUBLISHED){
    query = {};
    query.status = status;
    if(gt){
      query.editedAt = {'$gt' : gt};
      limit = 100;
    }
    else if(lt){
      query.editedAt = {'$lt' : lt};
    }

    sortBy = {editedAt : -1};
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
    publishDate (required) - date string

    imageUrl (optional)
    categories (optional) - array
    tags (optional) - array
    
  auto filled:
    uploadedAt //default value Date.now()
    uploadedBy //to current user email
    status //default value 'uploaded'

  not set: //since status is 'uploaded'
    editedBy
    editedAt
*/
router.post('/', function(req, res){
/*
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

  //till here sane = true
  //now optional params and their type
  if(req.body.imageUrl){
    var imageUrl = checker.isString(req.body.imageUrl);
    if(!imageUrl){
      sane = false;
    }
  }

  if(sane && req.body.categories){
    var categories = checker.isArray(req.body.categories);
    if(!categories){
      sane = false;
    }
  } 

  if(sane && req.body.tags){
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
*/

  if(!(req.body.heading && req.body.points && req.body.language && req.body.publishDate)){
    res.status(400);
    res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [heading, points, language, publishDate]"));
    return;
  }

  var newsItem = new NewsModel();
  //set required
  newsItem.heading = heading;
  newsItem.points = points;
  newsItem.language = language;
  newsItem.publishDate = publishDate; //mongoose will cast it into date

  newsItem.imageUrl = imageUrl;
  newsItem.categories = categories ? categories : [];
  newsItem.tags = tags ? tags : [];

  //auto fill (uploadedAt, status set by mongoose)
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

/*
  update a news item : it could be 
    edit a news item detail - (heading, points, etc)
    or approve a news
    or publish a news

  post parameters:
    heading (optional)
    points (optional)
    imageUrl (optional)

    language (optional)
    publishDate (optional)
    categories (optional)
    tags (optional)

    status (optional)(either 'approved' or 'published')

  auto set:
    editedBy (to current user email)
    editedAt (to current time)

  can not be changed:
    uploadedBy
    uploadedAt
*/
router.patch('/:id', function(req, res){
  if([enumRoles.ADMIN, enumRoles.EDITOR].indexOf(req.session.role) < 0){
    res.status(403);
    res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHORIZED, "you are not authorized - admin/editor only"));
    return;
  }

/*
  var sane = true;
  //data fields - heading, points, imageUrl
  if(req.body.heading){
    var heading = checker.isString(req.body.heading);
    if(!heading){
      sane = false;
    }
  }

  if(req.body.points){
    var points = checker.isArray(req.body.points);
    if(!points){
      sane = false;
    }
  }

  if(req.body.imageUrl){
    var imageUrl = checker.isString(req.body.imageUrl);
    if(!imageUrl){
      sane = false;
    }
  }

  //metadata fields - language, publishDate, categories, tags
  if(req.body.language){
    var language = checker.isString(req.body.language);
    if(!language){
      sane = false;
    }
  }

  if(sane && req.body.publishDate){
    var publishDate = checker.isDateString(req.body.publishDate);
    if(!publishDate){
      sane = false;
    }
  }

  if(sane && req.body.categories){
    var categories = checker.isArray(req.body.categories);
    if(!categories){
      sane = false;
    }
  }

  if(sane && req.body.tags){
    var tags = checker.isArray(req.body.tags);
    if(!tags){
      sane = false;
    }
  }

  //admin fields - status
  if(req.body.status){
    var status = checker.isString(req.body.status);
    if(!status){
      sane = false;
    }
  }

  if(!sane){
    res.status(400);
    res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "invalid optional parameters"));
    return;
  }

*/
  var id = req.params.id;
  
  if(!mongoose.Types.ObjectId.isValid(id)){
    res.status(400);
    res.json(errUtils.ErrorObject(errUtils.errors.INVALID_OBJECT_ID, "object id provided is invalid format"));
    return;
  }

  var changes = {};
  if(req.body.heading){
    changes.heading = req.body.heading;
  }
  if(req.body.points){
    changes.points = req.body.points;
  }
  if(req.body.imageUrl){
    changes.imageUrl = req.body.imageUrl;
  }

  if(req.body.language){
    changes.language = req.body.language;
  }
  if(req.body.publishDate){
    changes.publishDate = req.body.publishDate;
  }
  if(req.body.categories){
    changes.categories = req.body.categories;
  }
  if(req.body.tags){
    changes.tags = req.body.tags;
  }

  if(req.body.status){
    changes.status = req.body.status;
  }

  changes.editedAt = Date.now();
  changes.editedBy = req.session.email;

  NewsModel.update(
    {_id : id },
    {'$set' : changes},
    {multi : false},
    function(err, result){
      if(!err){
        res.json(result);
        return;
      }
      else{
        res.status(500);
        res.json(errUtils.ErrorObject(errUtils.errors.DB_ERROR, "unable to update news item", err));
        return;
      }
    }
  );

});
module.exports.router = router;