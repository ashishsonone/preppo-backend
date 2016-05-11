'use strict'

var express = require('express');
var RSVP = require('rsvp');
var passwordHash = require('password-hash');

var errUtils = require('../../utils/error');
var requestsHelp = require('./requests_help');
var StudentModel = require('../../models/live.student').model;
var authApi = require('./auth');
//START PATH /v1/live/requests/

var router = express.Router();

function createNewStudent(data){
  console.log("createNewStudent : %j", data);
  data.password = passwordHash.generate(data.password);

  var studentObject = new StudentModel(data);

  var promise = studentObject.save();
  promise = promise.then(null, function(err){
    if(err.code == 11000){
      //console.log("catching and throwing : username duplicate err=%j", err);
      throw errUtils.ErrorObject(errUtils.errors.USER_ALREADY_EXISTS, "username already exists", err, 400);
      return;
    }

    //continue with error
    throw err;
  });

  return promise;
}

/* signup a student
  required params:
    phone : String,
    otp : Number,

    name: String,
    password : String
*/

router.post('/signup', function(req, res){
  var phone = req.body.phone;
  var otp = req.body.otp;

  var name = req.body.name;
  var password = req.body.password;

  var device = req.body.device;

  if(!(phone && otp && name && password && device)){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [phone, otp, name, password, device]"));
  }

  var promise = authApi.verifyOtp(phone, otp);
  promise = promise.then(function(result){
    return createNewStudent({
      username : phone,
      phone : phone,
      name : name,
      password : password
    });
  });

  var returnResult = {}; //will contain x-live-token, user and invite

  promise = promise.then(function(studentEntity){
    console.log("signup : studentEntity created");
    returnResult['user'] = studentEntity;
    //generate and return token
    return authApi.generateLiveToken('student', device, phone); //role, device, username
  });

  promise = promise.then(function(tokenString){
    console.log("signup : tokenEntity created");
    returnResult['x-live-token'] = tokenString;
    return res.json(returnResult);
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
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to signup student", err));
    }
  });

});

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