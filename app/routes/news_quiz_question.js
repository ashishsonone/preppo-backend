'use strict'

var express = require('express');
var mongoose = require('mongoose');
var errUtils = require('../utils/error');
var AdminUser = require('../models/admin_user');
var NewsQuizQuestion = require('../models/news_quiz_question');
var enumStatus = require('../utils/constants').enumStatus;

var NewsQuizRoute = require('./news_quiz');

var NewsQuizQuestionModel = NewsQuizQuestion.model;

var enumRoles = AdminUser.enumRoles;

var router = express.Router();
//start ENDPOINT /v1/admin/news/quizquestion

/*
  create a new quiz item
  query params:
    quizId : (optional) - if want to add it to the quiz also
    
  post params:
    content (required)
    level (required)
    
  auto filled:
    count //default value=0 (if no quizId param), o/w value=1
    uploadedAt //default value Date.now()
    uploadedBy //to current user email
    status //default value 'uploaded'
    editedAt //equal to uploadedAt

  not set: //since status is 'uploaded'
    editedBy
*/
router.post('/', function(req, res){
  if(!(req.body.content && req.body.level)){
    res.status(400);
    res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [content, level]"));
    return;
  }

  var quizId = req.query.quizId; //if need to add

  var content = req.body.content;
  var level = req.body.level;

  var quizQuestion = new NewsQuizQuestionModel();

  //set required
  quizQuestion.content = content;
  quizQuestion.level = level;

  //auto fill (uploadedAt, status, count set by mongoose)
  quizQuestion.uploadedBy = req.session.email;
  quizQuestion.editedAt = quizQuestion.uploadedAt;

  if(quizId){
    quizQuestion.count = 1;
  }

  quizQuestion.save(function(err, newQuestion){
    if(!err){
      var promise = require('rsvp').resolve(true);
      if(quizId){
        promise = NewsQuizRoute.pushQuestion(quizId, newQuestion._id);
      }
      promise.then(
        function(result){
          res.json(newQuestion);        
        },
        function(err){
          res.status(500);
          res.json(errUtils.ErrorObject(errUtils.errors.DB_ERROR, "error create quiz item", err));
        }
      );
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
    editedAt (to current time)

  can not be changed:
    uploadedBy
    uploadedAt
*/
// router.put('/:id', function(req, res){
//   if([enumRoles.ADMIN, enumRoles.EDITOR].indexOf(req.session.role) < 0){
//     res.status(403);
//     res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHORIZED, "you are not authorized - admin/editor only"));
//     return;
//   }

//   var id = req.params.id;
  
//   if(!mongoose.Types.ObjectId.isValid(id)){
//     res.status(400);
//     res.json(errUtils.ErrorObject(errUtils.errors.INVALID_OBJECT_ID, "object id provided is invalid format"));
//     return;
//   }

//   var changes = {};
//   if(req.body.nickname){
//     changes.nickname = req.body.nickname;
//   }
//   if(req.body.type){
//     changes.type = req.body.type;
//   }
//   if(req.body.publishDate){
//     changes.publishDate = req.body.publishDate;
//   }

//   if(req.body.status){
//     changes.status = req.body.status;
//   }

//   changes.editedAt = Date.now();
//   changes.editedBy = req.session.email;

//   NewsQuizModel.findOneAndUpdate(
//     {_id : id },
//     {'$set' : changes},
//     {new : true},
//     function(err, result){
//       if(!err){
//         res.json(result);
//         return;
//       }
//       else{
//         res.status(500);
//         res.json(errUtils.ErrorObject(errUtils.errors.DB_ERROR, "unable to update news item", err));
//         return;
//       }
//     }
//   );
// });

// router.delete('/:id', function(req, res){
//   if([enumRoles.ADMIN, enumRoles.EDITOR].indexOf(req.session.role) < 0){
//     res.status(403);
//     res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHORIZED, "you are not authorized - admin/editor only"));
//     return;
//   }

//   var id = req.params.id;
  
//   if(!mongoose.Types.ObjectId.isValid(id)){
//     res.status(400);
//     res.json(errUtils.ErrorObject(errUtils.errors.INVALID_OBJECT_ID, "object id provided is invalid format"));
//     return;
//   }

//   NewsQuizModel.remove(
//     {_id : id}, 
//     function(err, result){
//       if(!err){
//         res.json(result);
//         return;
//       }
//       else{
//         res.status(500);
//         res.json(errUtils.ErrorObject(errUtils.errors.DB_ERROR, "unable to delete quiz item", err));
//         return;
//       }
//     }
//   );
// });
module.exports.router = router;