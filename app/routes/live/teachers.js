'use strict'

var express = require('express');
var RSVP = require('rsvp');

var errUtils = require('../../utils/error');
var requestsHelp = require('./requests_help');

var TeacherModel = require('../../models/live.teacher').model;
//START PATH /v1/live/requests/

var router = express.Router();

/*create a new user
*/
router.post('/', function(req, res){
  var username = req.body.username;
  var subjects = req.body.subjects;
  var topics = req.body.topics;
  
  if(!(username && subjects && topics)){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [username, subjects, topics]"));
  }
  
  var teacher = new TeacherModel();
  teacher.username = username;
  teacher.subjects = subjects;
  teacher.topics = topics;
  var promise = teacher.save();

  promise = promise.then(function(teacher){
    res.json(teacher);
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
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to create teacher entity", err));
    }
  });
});

router.get('/:username', function(req, res){
  var promise = requestsHelp.findTeacherEntity(req.params.username);
  promise = promise.then(function(teacher){
    //will either return a non-null teacher or throw error
    res.json(teacher);
  });

  promise = promise.catch(function(err){
    //error caught and set earlier
    if(err.resStatus){
      res.status(err.resStatus);
      return res.json(err);
    }
    else{
      //uncaught error
      res.status(500);
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to find teacher", err));
    }
  });
});

router.get('/', function(req, res){
  var promise = TeacherModel
    .find({
    })
    .select({
      username : true,
      subjects : true,
      topics : true,
      _id : false,
      status : true,
      online : true
    }).exec();

  promise = promise.then(function(teacherList){
    res.json(teacherList);
  });

  promise = promise.catch(function(err){
    //error caught and set earlier
    if(err.resStatus){
      res.status(err.resStatus);
      return res.json(err);
    }
    else{
      //uncaught error
      res.status(500);
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to find all teachers", err));
    }
  });
});

module.exports.router = router;