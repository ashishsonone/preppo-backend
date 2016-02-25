'use strict'

var express = require('express');
var mongoose = require('mongoose');
var errUtils = require('../../utils/error');
var AdminUser = require('../../models/admin_user');
var NewsQuiz = require('../../models/news_quiz');
var enumStatus = require('../../utils/constants').enumStatus;
var RSVP = require('rsvp');

var NewsQuizQuestionRoute = require('./news_quiz_question');

var NewsQuizModel = NewsQuiz.model;

var enumRoles = AdminUser.enumRoles;

var router = express.Router();
//start ENDPOINT /v1/admin/news/quiz

/*get all quiz items
  get parameters: 
    status (required)
    limit : <integer> (optional)
    gt : <date>(optional)
    lt : <date>(optional)

    updatedAt field is used for sorting results and filtering for gt, lt
*/

router.get('/', function(req, res){
  if([enumRoles.ADMIN, enumRoles.EDITOR].indexOf(req.session.role) < 0){
    res.status(403);
    res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHORIZED, "you are not authorized - admin/editor only"));
    return;
  }

  if(!req.query.status){
    res.status(400);
    res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : 'status'"));
    return;
  }

  //required
  var status = req.query.status;
  //optional gt, lt, limit
  var limit = parseInt(req.query.limit) || 15; //default limit of 15
  var gt = req.query.gt; //mongoose will cast date string to date object
  var lt = req.query.lt;

  var query = null;
  var sortBy = null;
  var projection = null;

  var query = {
    status : status
  };

  if(gt){
    query.updatedAt = {'$gt' : gt};
    limit = 100; //get all updated since last fetched (max 100)
  }
  else if(lt){
    query.updatedAt = {'$lt' : lt};
  }

  sortBy = {updatedAt : -1}; //-1 means decreasing order

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
    publishDate (required) - date string
    nickname : (required)
    
  auto filled:
    uploadedBy //to current user email
    status //default value 'uploaded'

  not set: //since status is 'uploaded'
    editedBy
*/
router.post('/', function(req, res){
  if(!(req.body.type && req.body.publishDate) && req.body.nickname){
    res.status(400);
    res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [type, nickname, publishDate]"));
    return;
  }

  var nickname = req.body.nickname;
  var type = req.body.type;
  var publishDate = req.body.publishDate;

  var quizItem = new NewsQuizModel();
  //set required
  quizItem.type = type;
  quizItem.publishDate = publishDate;
  quizItem.nickname = nickname;

  //auto fill (status set by mongoose)
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
  update a quiz item

  post parameters:
    type (optional)
    publishDate (optional)
    nickname (optional)

    status (optional) - either approved, uploaded

  auto set:
    editedBy (to current user email)

  can not be changed:
    uploadedBy
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
  if(req.body.nickname){
    changes.nickname = req.body.nickname;
  }
  if(req.body.type){
    changes.type = req.body.type;
  }
  if(req.body.publishDate){
    changes.publishDate = req.body.publishDate;
  }

  if(req.body.status){
    changes.status = req.body.status;
  }

  changes.editedBy = req.session.email;

  NewsQuizModel.findOneAndUpdate(
    {_id : id },
    {'$set' : changes},
    {new : true},
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

  NewsQuizModel.remove(
    {_id : id}, 
    function(err, result){
      if(!err){
        res.json(result);
        return;
      }
      else{
        res.status(500);
        res.json(errUtils.ErrorObject(errUtils.errors.DB_ERROR, "unable to delete quiz item", err));
        return;
      }
    }
  );
});

router.get('/:id', function(req, res){
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

  var promise = NewsQuizModel.findOne(
    {_id : id }
  ).exec();

  var resultQuiz = null;
  promise = promise.then(function(quiz){
    resultQuiz = quiz;
    if(!resultQuiz){
      throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "quiz not found", null, 404);
      return;
    }

    var p = NewsQuizQuestionRoute.fetchQuestions(quiz.questionIdList);
    return p;
  });

  promise = promise.then(function(questionList){
    //no error means resultQuiz is non null
    var result = {};
    result.quiz = resultQuiz;
    result.questionList = questionList;
    res.json(result);
    return RSVP.resolve(true);
  });

  promise.catch(function(err){
    if(err.resStatus){
      res.status(err.resStatus);
      res.json(err);
    }
    else{
      res.status(500);
      res.json(errUtils.ErrorObject(errUtils.errors.DB_ERROR, "unable to fetch questions", err));  
    }
  });

});
//helper exports
function pushQuestion(quizId, questionId){
  var query = NewsQuizModel.findOneAndUpdate(
    {
      _id : quizId
    },
    {
      '$addToSet' : { questionIdList : questionId }
    },
    {
      new : true
    }
  );
  var promise = query.exec(); 
  return promise;
}

module.exports.router = router;
module.exports.pushQuestion = pushQuestion;