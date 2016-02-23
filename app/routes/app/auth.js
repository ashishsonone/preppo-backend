'use strict'

var express = require('express');
var mongoose = require('mongoose');
var shortid = require('shortid');

var UserModel = require('../../models/user').model;
var TokenModel = require('../../models/token').model;
var OTPModel = require('../../models/otp').model;

var sms = require('../../utils/sms');
var errUtils = require('../../utils/error');

var router = express.Router();

//start ENDPOINT /v1/app/auth
router.get('/', function(req, res){
  return res.json({message : "/v1/app/auth : Under construction ! :)"});
});

/*generate otp
  post body: 
    phone : String (required)
*/
router.post('/otp', function(req, res){
  if(!req.body.phone){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : 'phone'"));
  }

  //generate otp
  var phone = req.body.phone;
  var otp = Math.floor(Math.random() * 9000 + 1000);

  var otpObject = new OTPModel();
  otpObject.phone = phone;
  otpObject.otp = otp;

  //save in otp table
  var promise = otpObject.save();

  //send otp
  promise = promise.then(function(result){
    console.log("otp saved in table");
    var message = otp + " is your preppo verification code";
    return sms.sendSingleMessage(phone, message);
  });

  //check for result
  promise = promise.then(function(result){
    console.log("otp sent result = %j", result);
    return res.json({"success" : true});
  });

  promise.catch(function(err){
    console.log("otp send error = %j",err);
    res.status(400);
    return res.json(err);
  });
});

function verifyOTP(otp, phone){
  //verify otp
  var currentTime = new Date();
  var allowedTime = new Date(currentTime.getTime() - 5*60*1000); //5 minute
  var promise = OTPModel
  .findOne(
  {
    otp : otp,
    phone : phone,
    createdAt : {'$gt' : allowedTime}
  })
  .sort({createdAt : -1})
  .exec();
  return promise;
}

function findUser(username){
  var promise = UserModel.findOne(
  {
    username : username
  }).exec();
  return promise;
}

function createUser(data){
  console.log("createUser() %j", data);
  var userObject = new UserModel(data);
  
  return userObject.save();
}

function generateToken(userObject){
  var tokenObject = new TokenModel();
  var token = shortid.generate() + shortid.generate();

  tokenObject._id = token;
  tokenObject.userId = userObject._id;
  tokenObject.username = userObject.username;

  var promise = tokenObject.save();
  promise = promise.then(function(savedToken){
    return {
      token : token,
      user : userObject
    }
  });

  return promise;
}

function findToken(token){
  console.log("findToken with token=%j", token);
  var promise = TokenModel.findOne(
    {_id : token}
  ).exec();

  return promise;
}

/*user signup
  post data:
    //if through phone number
    phone : String,
    otp : Number,
    name : String,
    photo : String,
    email : String

    //fb only
    fbToken : String,

    //google only
    googleToken : String

    //for all types (optional)
    location : String

  For signup other than phone, we need to extract user details like name, photo, email 
  using the token given and save in the user object
*/
router.post('/signup', function(req, res){
  var phone = req.body.phone;
  if(phone){
    //required
    var otp = req.body.otp;
    var name = req.body.name;
    var password = req.body.password;

    //optional
    var photo = req.body.photo;
    var email = req.body.email;

    //optional location
    var location = req.body.location;

    if(!(otp && name && password)){
      res.status(400);
      return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, 
        "required : 'phone, otp, name, password'", null, 401));
    }

    var promise = verifyOTP(otp, phone);

    //create user
    promise = promise.then(function(result){
      if(!result){
        //console.log("error invalid otp");
        throw errUtils.ErrorObject(errUtils.errors.INVALID_OTP, "invalid otp for " + phone, null, 400); 
      }

      //console.log("generated otp = " + result.otp);
      return createUser({
        username : phone,
        password : password,
        name : name,

        phone : phone,
        photo : photo,
        email : email,

        location : location
      });
    });

    //generate token
    promise = promise.then(
      function(userObject){
        //console.log("got user object" + userObject);
        //generate and return token
        return generateToken(userObject);
      },
      function(err){
        //check for special error
        if(err.code == 11000){ //duplicate key error
          //console.log("catching and throwing : username duplicate err=%j", err);
          throw errUtils.ErrorObject(errUtils.errors.USER_ALREADY_EXISTS, "username already exists", err, 400);
          return;
        }

        //console.log("propagating general error in or before createUser()")
        //otherwise throw the same error
        throw err; //can check if user was duplicate already exist
      }
    );

    promise = promise.then(function(result){//contain both user token
      return res.json({'x-session-token' : result.token, user : result.user});
    });

    //all errors come here
    promise.catch(function(err){
      //error caught and set earlier
      if(err.resStatus){
        res.status(err.resStatus);
        return res.json(err);
      }
      else{
        //uncaught error
        res.status(500);
        return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to signup", err));  
      }
    });
  }
  else{
    res.status(400);
    return res.json({message : "Only phone login implemented"});
  }
});


/*user login
  post data:
    //if using phone number
    phone : String (required)
    
    otp : Number (required)
      or 
    password : String (required)

    //fb only
    fbToken : String

    //google only
    googleToken : String
*/
router.post('/login', function(req, res){
  var phone = req.body.phone;
  if(phone){
    //required
    var otp = req.body.otp;
    if(!(otp && phone)){
      res.status(400);
      return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, 
        "required : 'phone, otp'", null, 401));
    }

    var promise = verifyOTP(otp, phone);
    //create user
    promise = promise.then(
      function(result){
        if(!result){
          //console.log("error invalid otp");
          throw errUtils.ErrorObject(errUtils.errors.INVALID_OTP, "invalid otp for " + phone, null, 400); 
        }

        //find user
        return findUser(phone);
      }
    );

    //generate token
    promise = promise.then(
      function(userObject){
        if(!userObject){
          throw errUtils.ErrorObject(errUtils.errors.USER_NOT_FOUND, "user not found in db", null, 400);
        }
        return generateToken(userObject);
      }
    );

    promise = promise.then(
      function(result){
        return res.json({'x-session-token' : result.token, user : result.user});
      }
    );

    promise.catch(function(err){
      //error caught and set earlier
      if(err.resStatus){
        res.status(err.resStatus);
        return res.json(err);
      }
      else{
        //uncaught error
        res.status(500);
        return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to signup", err));  
      }
    });
  }
  else {
    res.status(400);
    return res.json({message : "Only phone login implemented"});
  }
});

/*
  function to verify the token.
  Sets if all ok
    req.session.token
    req.session.username
    req.session.userId
  Always goes next()
  Only If some unexpected error occurs, return UNKNOWN error
*/

function findTokenAndSetSession(req, res, next){
  console.log("verifyTokenMiddleware : headers=%j", req.headers);
  var token = req.headers['x-session-token'];
  var unauthenticatedError = errUtils.ErrorObject(errUtils.errors.UNAUTHENTICATED, "login is required to access this end point");
  
  if(!token){
    return next();
  }

  var promise = findToken(token);
  promise = promise.then(function(tokenObject){
    console.log("found token %j", tokenObject);
    //token not found. Just do next() without setting req.session fields
    if(!tokenObject){
      return next();
    }

    console.log("2 found token %j", tokenObject);

    //valid token, set req.session fields
    req.session = {}; //initialize
    req.session.token = tokenObject._id;
    req.session.username = tokenObject.username;
    req.session.userId = tokenObject.userId;

    console.log("3 found token %j", tokenObject);
    return next();
  });

  promise.catch(function(err){
    //unknown error, return response
    res.status(500);
    return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to verify session token", err));
  });
}

/*
  Deletes the session(if any)
*/
function logout(req, res){
  console.log("logout called req.session=%j", req.session);

  if(req.session && req.session.token){
    var promise = TokenModel
    .remove({_id : req.session.token})
    .exec();
    promise = promise.then(function(result){
      console.log("session remove result = %j", result);
      return res.json({ message : "log out success"});
    });

    promise.catch(function(err){
      console.log("session remove result = %j", result);
      res.status(500);
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to logout", err));
    });
  }
  else{
    return res.json({message : "already logged out"});
  }
}

module.exports.router = router;
module.exports.findTokenAndSetSession = findTokenAndSetSession;
module.exports.logout = logout;