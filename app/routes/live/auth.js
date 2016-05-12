'use strict'

var express = require('express');
var passwordHash = require('password-hash');
var RSVP = require('rsvp');
var shortid = require('shortid');

var LiveOtpModel = require('../../models/live.otp').model;
var LiveTokenModel = require('../../models/live.token').model;

var sms = require('../../utils/sms');
var errUtils = require('../../utils/error');

var router = express.Router();

//start ENDPOINT /v1/live/auth

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

  var otpObject = new LiveOtpModel();
  otpObject.phone = phone;
  otpObject.otp = otp;

  //save in otp table
  var promise = otpObject.save();

  //send otp
  promise = promise.then(function(result){
    console.log("otp saved in table | phone=" + phone + "| otp=" + otp);
    var message = "Your OTP is " + otp;
    return sms.sendOtpMessage(phone, message);
  });

  promise = promise.then(function(result){
    console.log("live.otp sent result = %j", result);
    return res.json({"success" : true});
  });

  promise = promise.catch(function(err){
    console.log("live.otp send error = %j",err);
    //error caught and set earlier
    if(err.resStatus){
      res.status(err.resStatus);
      return res.json(err);
    }
    else{
      //uncaught error
      res.status(500);
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to generate otp", err));
    }
  });
});

function verifyOtp(phone, otp){
  //verify otp
  var currentTime = new Date();
  var allowedTime = new Date(currentTime.getTime() - 5*60*1000); //5 minute

  //console.log(otp + " | " + phone + " | " + allowedTime.toISOString());
  var promise = LiveOtpModel
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

/* generates a LiveToken.
  Returns a promise with token string
*/
function generateLiveToken(role, device, username){
  console.log("generateLiveToken : r=" + role + "| d=" + device + "| u=" + username);

  //clean device string : allowed chars alpha-numeric, single quote, underscore, dash & space

  device = device.replace(/[^a-zA-Z0-9'_ -]/g, '-')  //remove unwanted chars with '-'
  device = device.replace(/[-]+/g, '-') //remove multiple consecutive '-' with single one

  var liveTokenEntity = new LiveTokenModel();

  var token = shortid.generate() + "|" + device;
  console.log("generateLiveToken : token=" + token);

  liveTokenEntity._id = token;
  liveTokenEntity.role = role;
  liveTokenEntity.username = username;

  var promise = liveTokenEntity.save();
  promise = promise.then(function(savedEntity){
    return token;
  });

  return promise;
}

/*
  middleware function to find token in header('x-live-token') and set the 'req.session'
  Sets if all ok
    req.session.token
    req.session.username
    req.session.role
  Always goes next()
  Only If some unexpected error occurs, return UNKNOWN error
*/

function findTokenAndSetSessionMiddleware(req, res, next){
  var token = req.headers['x-live-token'];

  if(!token){
    console.log("findTokenAndSetSession : no x-live-token header");
    return next();
  }

  var promise = LiveTokenModel.findOne({
    _id : token
  }).exec();

  promise = promise.then(function(liveTokenEntity){
    //token not found. Just do next() without setting req.session fields
    if(!liveTokenEntity){
      return next();
    }

    //valid token, set req.session fields
    req.session = {}; //initialize
    req.session.token = liveTokenEntity._id;
    req.session.username = liveTokenEntity.username;
    req.session.role = liveTokenEntity.role;

    return next();
  });

  promise.catch(function(err){
    //unknown error, return response
    res.status(500);
    return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to verify live token", err));
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

module.exports = {
  router : router,
  verifyOtp : verifyOtp,
  generateLiveToken : generateLiveToken,
  findTokenAndSetSessionMiddleware : findTokenAndSetSessionMiddleware,
  loginRequiredMiddleware :  loginRequiredMiddleware,
};