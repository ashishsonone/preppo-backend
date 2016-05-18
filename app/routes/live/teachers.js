'use strict'

var express = require('express');
var RSVP = require('rsvp');

var errUtils = require('../../utils/error');
var idGen = require('../../utils/id_gen');

var TeacherModel = require('../../models/live.teacher').model;
//START PATH /v1/live/requests/

var router = express.Router();

/*create a new user
  params:
    phone
    name
*/
router.post('/', function(req, res){
  var username = idGen.generateNumericId();
  var phone = req.body.phone;
  var name = req.body.name;

  if(!(phone && name)){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [phone, name]"));
  }
  
  var teacher = new TeacherModel();
  teacher.username = username;
  teacher.name = name;
  teacher.phone = phone;
  
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
  var username = req.params.username;

  var promise = TeacherModel
    .findOne({username : username})
    .select({
      name : true,
      username : true,
      phone : true,
      _id : false,
      status : true,
      doubtQueue : true,
      online : true
    })
    .exec();

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
      name : true,
      username : true,
      phone : true,
      _id : false,
      status : true,
      doubtQueue : true,
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


/*update self [name, password]
*/
router.put('/:username', function(req, res){
  var username = req.params.username;

  var update = {};
  if(req.body.name){
    update.name = req.body.name;
  }

  if(req.body.status){
    update.status = req.body.status;

    if(!(update.status === "active" || update.status === "away")){
      res.status(400);
      return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_INVALID, "'status' must belong to [active, away]"));
    }
  }

  var promise = TeacherModel.findOneAndUpdate({username : username}, {$set : update}, {new : true});

  promise = promise.then(function(teacherEntity){
    if(!teacherEntity){
      throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "No such teacher exists " + username, null, 404);
    }
    res.json(teacherEntity);
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

module.exports.router = router;