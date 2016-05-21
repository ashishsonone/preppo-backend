'use strict'

var express = require('express');
var RSVP = require('rsvp');
var passwordHash = require('password-hash');

var authApi = require('./auth');
var errUtils = require('../../utils/error');
var idGen = require('../../utils/id_gen');

var TeacherModel = require('../../models/live.teacher').model;
//START PATH /v1/live/teachers/

var router = express.Router();

function createNewTeacher(data){
  console.log("createNewTeacher : %j", data);
  data.password = passwordHash.generate(data.password);

  var teacherObject = new TeacherModel(data);

  var promise = teacherObject.save();
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

function findTeacherEntity(findQuery, selectQuery){
  console.log("finding teacher %j", findQuery);

  var promise = TeacherModel
  .findOne(findQuery)
  .select(selectQuery)
  .exec();

  promise = promise.then(function(teacherEntity){
    console.log("found teacher %j", teacherEntity);
    if(teacherEntity == null){
      throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "No such teacher exists " + JSON.stringify(findQuery), null, 404);
      return;
    }
    return teacherEntity;
  });
  return promise;
}

function updateTeacherEntity(findQuery, update, wantNew, throwNotFound){
  if(wantNew !== false){
    wantNew = true;
  }

  if(throwNotFound === true){
    throwNotFound = true;
  }
  else{
    throwNotFound = false;
  }

  console.log("updating teacher %j" + "| update=%j", findQuery, update);
  var promise = TeacherModel.findOneAndUpdate(findQuery,
  {
    '$set' : update
  },
  {
    new : wantNew
  })
  .exec();

  promise = promise.then(function(teacherEntity){
    console.log("updating teacher found = " + (teacherEntity != null));
    if(throwNotFound && teacherEntity == null){
      throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "No such teacher exists " + JSON.stringify(findQuery), null, 404);
      return;
    }
    return teacherEntity;
  });

  return promise;
}

/* signup a teacher
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
    return createNewTeacher({
      username : username,
      phone : phone,
      name : name,
      password : password
    });
  });

  var returnResult = {}; //will contain x-live-token, user and invite

  promise = promise.then(function(teacherEntity){
    console.log("signup : teacherEntity created");
    returnResult['user'] = teacherEntity;
    //generate and return token
    return authApi.generateLiveToken('teacher', teacherEntity.username); //role, username
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
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to signup teacher", err));
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
    return findTeacherEntity({phone : phone});
  });

  var returnResult = {};
  promise = promise.then(function(teacherEntity){
    console.log("login : teacherEntity found");
    if(isPasswordLogin){
      //password login, check if passwords match
      var hash = teacherEntity.password;
      if(!passwordHash.verify(password, hash)){
        throw errUtils.ErrorObject(errUtils.errors.INVALID_CREDENTIALS, "invalid credentials", null, 400);
      }
      //password verified
    }

    returnResult['user'] = teacherEntity;
    //generate and return token
    return authApi.generateLiveToken('teacher', teacherEntity.username); //role, username
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
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to login teacher", err));
    }
  });

});

router.get('/:username', function(req, res){
  var username = req.params.username;

  var promise = findTeacherEntity({username : username}, {_id :false, password : false, __v : false});

  promise = promise.then(function(teacher){
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
      _id : false,
      __v : false,

      password : false,

      updatedAt : false,
      createdAt : false
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

//================= after this needs login ============
router.use(authApi.loginRequiredMiddleware);
//-----------------------------------------------------

/*update self [name, password, status]
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

  if(req.body.status){
    update.status = req.body.status;

    if(!(update.status === "active" || update.status === "away")){
      res.status(400);
      return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_INVALID, "'status' must belong to [active, away]"));
    }
  }

  var promise = updateTeacherEntity({username : username}, update, true, true);

  promise = promise.then(function(teacherEntity){
    //non-null teacher entity
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