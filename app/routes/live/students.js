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


router.post('/login', function(req, res){
  var phone = req.body.phone;
  var device = req.body.device;

  var password = req.body.password;
  var otp = req.body.otp;

  if(!(phone && device && (otp || password))){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [phone, device, (otp or password)]"));
  }

  var isPasswordLogin = password ? true : false;

  var promise = RSVP.resolve(true);
  if(!isPasswordLogin){
    //otp login
    promise = authApi.verifyOtp(phone, otp);
  }

  //find user if all good
  promise = promise.then(function(result){
    return requestsHelp.findStudentEntity(phone);
  });

  var returnResult = {};
  promise = promise.then(function(studentEntity){
    if(isPasswordLogin){
      //password login, check if passwords match
      var hash = studentEntity.password;
      if(!passwordHash.verify(password, hash)){
        throw errUtils.ErrorObject(errUtils.errors.INVALID_CREDENTIALS, "invalid credentials", null, 400);
      }
      //password verified
    }

    returnResult['user'] = studentEntity;
    //generate and return token
    return authApi.generateLiveToken('student', device, phone); //role, device, username
  });

  promise = promise.then(function(tokenString){
    console.log("login : tokenEntity created");
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
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to login student", err));
    }
  });

});

router.get('/', function(req, res){
  var promise = StudentModel
    .find({
    })
    .select({
      username : true,
      name : true,
      _id : false,
      status : true,
    })
    .limit(20)
    .exec();

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

//================= after this needs login ============
router.use(authApi.loginRequiredMiddleware);
//-----------------------------------------------------

router.get('/:username', function(req, res){

  console.log("get username : %j", req.session);

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

/*update self [name, password]
*/
router.put('/me', function(req, res){
  var username = req.session.username;

  var update = {};
  if(req.body.name){
    update.name = req.body.name;
  }
  if(req.body.password){
    update.password = passwordHash.generate(req.body.password);
  }

  var promise = requestsHelp.updateStudentEntity({username : username}, update, true);
  promise = promise.then(function(studentEntity){
    if(!studentEntity){
      throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "No such student exists " + username, null, 404);
    }
    res.json(studentEntity);
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