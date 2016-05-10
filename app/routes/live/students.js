'use strict'

var express = require('express');
var RSVP = require('rsvp');

var errUtils = require('../../utils/error');
var requestsHelp = require('./requests_help');
var StudentModel = require('../../models/live.student').model;
//START PATH /v1/live/requests/

var router = express.Router();

/*create a new student
*/
router.post('/', function(req, res){
  var username = req.body.username;
  
  if(!(username)){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [username]"));
  }
  
  var student = new StudentModel();
  student.username = username;
  var promise = student.save();

  promise = promise.then(function(studentEntity){
    res.json(studentEntity);
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
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to create student entity", err));
    }
  });
});

router.get('/:username', function(req, res){
  var promise = requestsHelp.findStudentEntity(req.params.username);
  promise = promise.then(function(student){
    //will either return a non-null student or throw error
    res.json(student);
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
  var promise = StudentModel
    .find({
    })
    .select({
      username : true,
      _id : false,
      status : true,
    }).exec();

  promise = promise.then(function(studentList){
    res.json(studentList);
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
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to find all students", err));
    }
  });
});

module.exports.router = router;