'use strict'

var express = require('express');
var mongoose = require('mongoose');
var errUtils = require('../utils/error');
var AdminUser = require('../models/adminuser');
var NewsQuiz = require('../models/newsquiz');

var NewsQuizModel = NewsQuiz.model;

var enumRoles = AdminUser.enumRoles;
var enumStatus = NewsQuiz.enumStatus;

var router = express.Router();
//start ENDPOINT /v1/admin/news/

/*get all quiz items
  get parameters: 
    status (required)

    limit : <integer> (optional)
    gt : <date>(optional)
    lt : <date>(optional)

  if status='uploaded' then return latest uploaded quiz using 'uploadedAt' date
  otherwise use 'editedAt' date field to return documents for 'approved' & 'published' quiz
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

  //console.log(gt + ", " + lt);

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

  NewsQuizModel
    .find(query)
    .sort(sortBy)
    .limit(limit)
    .exec(function (err, newsQuizItems){
      if(!err){
        res.json(newsQuizItems);
        return;
      }
      else{
        res.status(500);
        res.json(errUtils.ErrorObject(errUtils.errors.DB_ERROR, "unable to fetch quiz items", err));
        return;
      }
    });
});

/*
  create a new quiz item
  post params:
    type (required)
    content (required) - array of QuestionSchema
    publishDate (required) - date string

    level (optional)
    
  auto filled:
    uploadedAt //default value Date.now()
    uploadedBy //to current user email
    status //default value 'uploaded'

  not set: //since status is 'uploaded'
    editedBy
    editedAt
*/
router.post('/', function(req, res){
  // var hindiQuestion = newsQuizItem.content.create();
  // hindiQuestion.language = "hindi",
  // hindiQuestion.question = "Kaun banega crorepati ?";
  // newsQuizItem.content.push(hindiQuestion);

  if(!(req.body.type && req.body.content && req.body.publishDate)){
    res.status(400);
    res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [type, content, publishDate]"));
    return;
  }

  var content = req.body.content;
  var type = req.body.type;
  var publishDate = req.body.publishDate;

  var level = req.body.level;

  var quizItem = new NewsQuizModel();
  //set required
  quizItem.type = type;
  quizItem.publishDate = publishDate;
  quizItem.content = content;
  
  if(level){
    quizItem.level = level;
  }

  //auto fill (uploadedAt, status set by mongoose)
  quizItem.uploadedBy = req.session.email;

  quizItem.save(function(err, newItem){
    if(!err){
      res.json(newItem);
      return;
    }
    else{
      res.status(500);
      res.json(errUtils.ErrorObject(errUtils.errors.DB_ERROR, "error create quiz item", err));
      return;
    }
  });
});

/*
  update a quiz item : it could be 
    edit a quiz item detail - (heading, points, etc)
    or approve a news
    or publish a news

  post parameters:
    content (optional)

    type (optional)
    publishDate (optional)
    level (optional)

    status (optional)(either 'approved' or 'published')

  auto set:
    editedBy (to current user email)
    editedAt (to current time)

  can not be changed:
    uploadedBy
    uploadedAt
*/
router.put('/:id', function(req, res){
  if([enumRoles.ADMIN, enumRoles.EDITOR].indexOf(req.session.role) < 0){
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
  if(req.body.type){
    changes.type = req.body.type;
  }
  if(req.body.level){
    changes.level = req.body.level;
  }

  if(req.body.status){
    changes.status = req.body.status;
  }

  changes.editedAt = Date.now();
  changes.editedBy = req.session.email;

  NewsQuizModel.update(
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