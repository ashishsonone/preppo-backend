'use strict'

var express = require('express');
var mongoose = require('mongoose');
var errUtils = require('../../utils/error');
var AdminUser = require('../../models/admin_user');
var News = require('../../models/news');
var enumStatus = require('../../utils/constants').enumStatus;

var NewsModel = News.model;

var enumRoles = AdminUser.enumRoles;

var router = express.Router();
//start ENDPOINT /v1/admin/news/



function helperGetByStatus(req, res){
  var status = req.query.status;
  //optional gt, lt, limit
  var limit = parseInt(req.query.limit) || 15; //default limit of 15
  var gt = req.query.gt; //mongoose will cast date string to date object
  var lt = req.query.lt;

  //console.log(gt + ", " + lt);

  var query = null;
  var sortBy = null;
  var projection = null;

  if(status === enumStatus.UPLOADED){
    query = {};
    query.status = status;
    if(gt){
      query.createdAt = {'$gt' : gt};
      limit = 100; //get all updated since last fetched (max 100)
    }
    else if(lt){
      query.createdAt = {'$lt' : lt};
    }

    sortBy = {createdAt : -1}; //-1 means decreasing order
  }
  else if(status === enumStatus.APPROVED || status === enumStatus.PUBLISHED){
    query = {};
    query.status = status;
    if(gt){
      query.updatedAt = {'$gt' : gt};
      limit = 100;
    }
    else if(lt){
      query.updatedAt = {'$lt' : lt};
    }

    sortBy = {updatedAt : -1};
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
}

function helperGetByDate(req, res){
  var date = req.query.date;
  var limit = 100; //return all items for the date

  var query = {
    status : { '$in' : 
      [enumStatus.UPLOADED, enumStatus.APPROVED, enumStatus.PUBLISHED]
    },
    publishDate : date
  };

  NewsModel
    .find(query)
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
}

/*get all news items
  get parameters: 
    status (required)
    OR
    date (required)

    limit : <integer> (optional)
    gt : <date>(optional)
    lt : <date>(optional)

  if status='uploaded' then return latest uploaded news using 'createdAt' date
  otherwise use 'updatedAt' date field to return documents for 'approved' & 'published' news
*/
router.get('/', function(req, res){
  if([enumRoles.UPLOADER, enumRoles.ADMIN, enumRoles.EDITOR].indexOf(req.session.role) < 0){
    res.status(403);
    res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHORIZED, "you are not authorized - admin/editor only"));
    return;
  }

  //required one of status, date
  if(!(req.query.status || req.query.date)){
    res.status(400);
    res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : 'status' or 'date'"));
    return;
  }

  if(req.query.status){
    helperGetByStatus(req, res);
  }

  if(req.query.date){
    helperGetByDate(req, res);
  }
  
});

/*
  create a new news item
  post params:
    content (required) - array of ContentSchema
    publishDate (required) - date string

    imageWeb (optional)
    imageMobile (optional)

    categories (optional) - array
    tags (optional) - array
    
  auto filled:
    uploadedBy //to current user email
    status //default value 'uploaded'

  not set: //since status is 'uploaded'
    editedBy
*/
router.post('/', function(req, res){
  if(!(req.body.content && req.body.publishDate)){
    res.status(400);
    res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [content, publishDate]"));
    return;
  }

  var content = req.body.content;
  var publishDate = req.body.publishDate;

  var imageMobile = req.body.imageMobile;
  var imageWeb = req.body.imageWeb;
  var categories = req.body.categories;
  var tags = req.body.tags;

  var newsItem = new NewsModel();
  //set required
  newsItem.content = content;
  newsItem.publishDate = publishDate; //mongoose will cast it into date

  //set optional
  newsItem.imageMobile = imageMobile;
  newsItem.imageWeb = imageWeb;
  newsItem.categories = categories ? categories : [];
  newsItem.tags = tags ? tags : [];

  //auto fill (status set by mongoose)
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
    edit a news item detail - (content, imageWeb, imageMobile, publishDate, tags, categories)
    or approve/publish a news by setting 'status'

  post parameters:
    content (optional)
    imageWeb (optional)
    imageMobile (optional)

    publishDate (optional)
    categories (optional)
    tags (optional)

    status (optional)(either 'approved' or 'published')

  auto set:
    editedBy (to current user email)

  can not be changed:
    uploadedBy
*/
router.put('/:id', function(req, res){
  if([enumRoles.UPLOADER, enumRoles.ADMIN, enumRoles.EDITOR].indexOf(req.session.role) < 0){
    res.status(403);
    res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHORIZED, "you are not authorized - admin/editor only"));
    return;
  }

  var id = req.params.id;
  
  if(!mongoose.Types.ObjectId.isValid(id)){
    res.status(400);
    res.json(errUtils.ErrorObject(errUtils.errors.INVALID_OBJECT_ID, "object id provided is invalid format"));
    return;
  }

  var changes = {};
  if(req.body.content){
    changes.content = req.body.content;
  }
  if(req.body.imageMobile){
    changes.imageMobile = req.body.imageMobile;
  }
  if(req.body.imageWeb){
    changes.imageWeb = req.body.imageWeb;
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

  changes.editedBy = req.session.email;

  NewsModel.findOneAndUpdate(
    {_id : id },
    {'$set' : changes},
    {new : true}, //return modified version of document
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

router.delete('/:id', function(req, res){
  if([enumRoles.UPLOADER, enumRoles.ADMIN, enumRoles.EDITOR].indexOf(req.session.role) < 0){
    res.status(403);
    res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHORIZED, "you are not authorized - admin/editor only"));
    return;
  }

  var id = req.params.id;
  
  if(!mongoose.Types.ObjectId.isValid(id)){
    res.status(400);
    res.json(errUtils.ErrorObject(errUtils.errors.INVALID_OBJECT_ID, "object id provided is invalid format"));
    return;
  }

  NewsModel.remove(
    {_id : id}, 
    function(err, result){
      if(!err){
        res.json(result);
        return;
      }
      else{
        res.status(500);
        res.json(errUtils.ErrorObject(errUtils.errors.DB_ERROR, "unable to delete news item", err));
        return;
      }
    }
  );
});

module.exports.router = router;