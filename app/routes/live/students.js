'use strict'

var express = require('express');
var RSVP = require('rsvp');
var passwordHash = require('password-hash');

var errUtils = require('../../utils/error');
var StudentModel = require('../../models/live.student').model;
var authApi = require('./auth');
var idGen = require('../../utils/id_gen');

//START PATH /v1/live/students/

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

function findStudentEntity(findQuery, selectQuery){
  console.log("finding student %j", findQuery);
  var promise = StudentModel
  .findOne(findQuery)
  .select(selectQuery)
  .exec();

  promise = promise.then(function(studentEntity){
    console.log("found student %j", studentEntity);
    if(studentEntity == null){
      throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "No such student exists " + JSON.stringify(findQuery), null, 404);
      return;
    }
    return studentEntity;
  });
  return promise;
}

function updateStudentEntity(findQuery, update, wantNew, throwNotFound){
  if(wantNew !== false){
    wantNew = true;
  }

  if(throwNotFound === true){
    throwNotFound = true;
  }
  else{
    throwNotFound = false;
  }

  console.log("updating student %j" + "| update=%j", findQuery, update);
  var promise = StudentModel.findOneAndUpdate(findQuery,
  {
    '$set' : update
  },
  {
    new : wantNew
  })
  .exec();

  promise = promise.then(function(studentEntity){
    console.log("updating student found = " + (studentEntity != null));
    if(throwNotFound && studentEntity == null){
      throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "No such student exists " + JSON.stringify(findQuery), null, 404);
      return;
    }
    return studentEntity;
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

  if(!(phone && otp && name && password)){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [phone, otp, name, password]"));
  }

  var username = idGen.generateNumericId();
  var promise = authApi.verifyOtp(phone, otp);
  promise = promise.then(function(result){
    return createNewStudent({
      username : username,
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
    return authApi.generateLiveToken('student', studentEntity.username); //role, username
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


/*login endpoint
  params:
    phone
    password OR otp
*/
router.post('/login', function(req, res){
  var phone = req.body.phone;

  var password = req.body.password;
  var otp = req.body.otp;

  if(!(phone && (otp || password))){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [phone, (otp or password)]"));
  }

  var isPasswordLogin = password ? true : false;

  var promise = RSVP.resolve(true);
  if(!isPasswordLogin){
    //otp login
    promise = authApi.verifyOtp(phone, otp);
  }

  //find user if all good
  promise = promise.then(function(result){
    console.log("login : otp verified");
    return findStudentEntity({phone : phone});
  });

  var returnResult = {};
  promise = promise.then(function(studentEntity){
    console.log("login : studentEntity found");
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
    return authApi.generateLiveToken('student', studentEntity.username); //role, username
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
      _id : false,
      __v : false,

      password : false,

      createdAt : false,
      updatedAt : false,
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

router.get('/:username', function(req, res){
  var username = req.params.username;

  var promise = findStudentEntity({username : username}, {_id : false, __v : false, password : false});
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
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to find student " + username, err));
    }
  });
});

//================= after this needs login ============
router.use(authApi.loginRequiredMiddleware);
//-----------------------------------------------------

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

  var promise = updateStudentEntity({username : username}, update, true, true);
  promise = promise.then(function(studentEntity){
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
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to update student", err));
    }
  });
});

module.exports.router = router;