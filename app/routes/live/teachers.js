'use strict'

var express = require('express');
var RSVP = require('rsvp');

var errUtils = require('../../utils/error');

var TeacherModel = require('../../models/live_teacher').model;
//START PATH /v1/live/requests/

var router = express.Router();

/*post a teaching request
*/
router.post('/', function(req, res){
  var username = req.body.username;
  var topics = req.body.topics;
  
  if(!(topics && username)){
    res.json({error : 401, message : "required fields : [username, topics]"});
    return;
  }
  
  var teacher = new TeacherModel();
  teacher.username = username;
  teacher.topics = topics;
  teacher.save
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
  var promise = TeacherModel.findOne({
    username : req.params.username
  }).exec();

  promise = promise.then(function(teacher){
    if(!teacher){
      throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "No such teacher exists", null, 404);
    }
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
  })
});

router.get('/', function(req, res){
  var promise = TeacherModel
    .find({
    })
    .select({
      username : true,
      topics : true,
      _id : false,
      status : true,
      online : true
    }) .exec();

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
  })
});

module.exports.router = router;