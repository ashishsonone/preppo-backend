'use strict'

var shortid = require('shortid');
var passwordHash = require('password-hash');
var RSVP = require('rsvp');

var UserModel = require('../../models/user').model;
var TokenModel = require('../../models/token').model;
var OTPModel = require('../../models/otp').model;

var errUtils = require('../../utils/error');

function verifyOTP(otp, phone){
  //verify otp
  var currentTime = new Date();
  var allowedTime = new Date(currentTime.getTime() - 5*60*1000); //5 minute

  //console.log(otp + " | " + phone + " | " + allowedTime.toISOString());
  var promise = OTPModel
  .findOne(
  {
    otp : otp,
    phone : phone,
    createdAt : {'$gt' : allowedTime}
  })
  .exec();

  promise = promise.then(function(result){
    if(!result){
      throw errUtils.ErrorObject(errUtils.errors.INVALID_OTP, "invalid otp for " + phone, null, 400); 
    }
    return result; //simply pass on the result
  });

  return promise;
}

function findUser(username){
  var promise = UserModel.findOne(
  {
    username : username
  },
  {
    //exclude __v
    //password field required for phone-password login
    __v : false,
  }).exec();

  promise = promise.then(function(userObject){
    //if user not found, throw appropriate error
    if(!userObject){
      throw errUtils.ErrorObject(errUtils.errors.USER_NOT_FOUND, "user not found in db", null, 400);
      return;
    }

    //otherwise continue
    return userObject;
  });

  return promise;
}

function createUser(data){
  if(data.password){
    data.password = passwordHash.generate(data.password);
  }
  if(!data.language){
    data.language = 'english'
  }

  var userObject = new UserModel(data);

  var promise = userObject.save();
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
  //console.log("findToken with token=%j", token);
  var promise = TokenModel.findOneAndUpdate(
    {_id : token},
    {'$set' : {touch : true}}
  ).exec();

  return promise;
}

/*
  middleware function to verify the token.
  Sets if all ok
    req.session.token
    req.session.username
    req.session.userId
  Always goes next()
  Only If some unexpected error occurs, return UNKNOWN error
*/

function findTokenAndSetSession(req, res, next){
  var token = req.headers['x-session-token'];
  
  if(!token){
    return next();
  }

  var promise = findToken(token);
  promise = promise.then(function(tokenObject){
    //token not found. Just do next() without setting req.session fields
    if(!tokenObject){
      return next();
    }

    //valid token, set req.session fields
    req.session = {}; //initialize
    req.session.token = tokenObject._id;
    req.session.username = tokenObject.username;
    req.session.userId = tokenObject.userId;

    return next();
  });

  promise.catch(function(err){
    //unknown error, return response
    res.status(500);
    return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to verify session token", err));
  });
}

/* middleware function to check if req.session.username is present
  if yes : do next()
  otherwise : respond with UNAUTHENTICATED error
*/
function loginRequiredMiddleware(req, res, next){
  if(req.session && req.session.username){
    return next();
  }

  res.status(401);
  return res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHENTICATED, "login is required to access this end point"));
}

/*
  Deletes the session(if any)
*/
function logout(req, res){
  if(req.session && req.session.token){
    var promise = TokenModel
    .remove({_id : req.session.token})
    .exec();
    promise = promise.then(function(result){
      return res.json({ message : "log out success"});
    });

    promise.catch(function(err){
      res.status(500);
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to logout", err));
    });
  }
  else{
    return res.json({message : "already logged out"});
  }
}

module.exports.verifyOTP = verifyOTP;
module.exports.findUser = findUser;
module.exports.createUser = createUser;
module.exports.generateToken = generateToken;
module.exports.findToken = findToken;
module.exports.findTokenAndSetSession = findTokenAndSetSession;
module.exports.loginRequiredMiddleware = loginRequiredMiddleware;
module.exports.logout = logout;