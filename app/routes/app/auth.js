'use strict'

var express = require('express');
var passwordHash = require('password-hash');
var RSVP = require('rsvp');

var UserModel = require('../../models/user').model;
var TokenModel = require('../../models/token').model;
var OTPModel = require('../../models/otp').model;

var sms = require('../../utils/sms');
var errUtils = require('../../utils/error');
var socialUtils = require('../../utils/social');
var authHelp = require('./auth_help.js');
var usersApi = require('./users');

var router = express.Router();

//start ENDPOINT /v1/app/auth

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
    var message = "Your OTP is " + otp;
    return sms.sendOTP(phone, message);
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

/*social login/signup flow
  verify token
  find user
  if user not found, create user

  returns a promise with value user object
*/
function fbOrGoogleFlow(req){
  req.isNewUser = false; //we first check if user already there

  var googleToken = req.body.googleToken;
  var fbToken = req.body.fbToken;

  var promise = null;
  if(googleToken){
    promise = socialUtils.verifyGoogleToken(googleToken);
  }
  else{
    promise = socialUtils.verifyFBToken(fbToken);
  }

  var userInfo = null;
  //non null promise
  promise = promise.then(function(userDetails){
    userInfo = userDetails;
    return authHelp.findUser(userDetails.username);
  });

  promise = promise.then(null, function(err){
    //if USER_NOT_FOUND error, then create that user
    if(err && err.error === errUtils.errors.USER_NOT_FOUND){
      req.isNewUser = true; //override - creating new user

      //this means that token was verified successfully, hence userInfo would be non-null
      return authHelp.createUser({
        username : userInfo.username,
        email : userInfo.email,
        name : userInfo.name,

        photo : req.body.photo || userInfo.photo,
        location : req.body.location,
        language : req.body.language
      });
    }

    //continue with error
    throw err;
  });

  //this promise would contain actual userObject on fulfill
  return promise;
}

/*user signup
  post data:
    //phone only
    phone : String,
    otp : Number,
    name : String,
    password: String,
    email : String (optional)

    //fb only
    fbToken : String,

    //google only
    googleToken : String

    //for all types (optional)
    photo : String,
    location : String
    language : String

    //invite code
    inviteCode : String (optional)

  For signup other than phone, we need to extract user details like name, photo, email 
  using the token given and save in the user object
*/
router.post('/signup', function(req, res){
  req.isNewUser = true; //default for signup, override if needed

  //console.log("------>SIGNUP %j", req.body);
  var phone = req.body.phone;
  var googleToken = req.body.googleToken;
  var fbToken = req.body.fbToken;

  var inviteCode = req.body.inviteCode;

  var promise = null;

  if(phone){
    //required
    var otp = req.body.otp;
    var name = req.body.name;
    var password = req.body.password;

    //optional
    var photo = req.body.photo;
    var email = req.body.email;
    var location = req.body.location;
    var language = req.body.language;

    if(!(otp && name && password)){
      res.status(400);
      return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, 
        "required : 'phone, otp, name, password'", null, 400));
    }

    promise = authHelp.verifyOTP(otp, phone);

    //create user
    promise = promise.then(function(result){
      //console.log("generated otp = " + result.otp);
      return authHelp.createUser({
        username : phone,
        password : password,
        name : name,

        phone : phone,
        photo : photo,
        email : email,
        language : language,

        location : location
      });
    });
  }
  else if(googleToken || fbToken){
    promise = fbOrGoogleFlow(req); //takes care of all the cases
  }
  else{
    //parameters required
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "please provide appropriate signup data"));
  }

  var returnResult = {}; //will contain x-sesion-token, user and invite

  //generate token
  promise = promise.then(
    function(userObject){
      returnResult['user'] = userObject;
      //generate and return token
      return authHelp.generateToken(userObject);
    }
  );

  promise = promise.then(function(result){//contain both user & token
    returnResult['x-session-token'] = result.token;
    return usersApi.getInviteCode(returnResult.user); //user is non-null
  });

  promise = promise.then(function(invite){
    returnResult['invite'] = invite;

    //if signed up using an inviteCode, then use it with current user
    if(inviteCode != null){
      return usersApi.useInviteCode(returnResult.user.username, inviteCode);
    }
    else{
      return true; //do nothing, all good
    }
  });

  promise = promise.then(function(success){
    //return response
    returnResult['isNewUser'] = req.isNewUser;
    return res.json(returnResult);
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
  req.isNewUser = false;

  var phone = req.body.phone;
  var googleToken = req.body.googleToken;
  var fbToken = req.body.fbToken;

  var promise = null;

  var isPasswordLogin = false; //whether login using phone number and password

  var password = ""; //used in above case

  if(phone){
    //required
    var otp = req.body.otp;
    password = req.body.password;

    if(!(phone && (otp || password))) {
      res.status(400);
      return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, 
        "required : 'phone & [otp or password]'", null, 401));
    }

    isPasswordLogin = password ? true : false;
    promise = RSVP.resolve(true);
    if(!isPasswordLogin){
      //otp login
      promise = authHelp.verifyOTP(otp, phone);
    }

    //find user if all good
    promise = promise.then(function(result){
      return authHelp.findUser(phone);
    });
  }
  else if(googleToken || fbToken){
    promise = fbOrGoogleFlow(req);
  }
  else {
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "please provide appropriate login data"));
  }

  var returnResult = {}; //will contain x-session-token, user and invite
  
  //generate token
  promise = promise.then(
    function(userObject){
      if(!userObject){
        throw errUtils.ErrorObject(errUtils.errors.USER_NOT_FOUND, "user not found in db", null, 400);
      }

      if(isPasswordLogin){
        //password login, check if passwords match
        var hash = userObject.password;
        if(!passwordHash.verify(password, hash)){
          throw errUtils.ErrorObject(errUtils.errors.INVALID_CREDENTIALS, "invalid credentials", null, 400);
        }
        //password verified
      }

      returnResult['user'] = userObject;

      return authHelp.generateToken(userObject);
    }
  );

  promise = promise.then(
    function(result){
      returnResult['x-session-token'] = result.token;
      return usersApi.getInviteCode(returnResult.user); //user is non-null
    }
  );

  promise = promise.then(function(invite){
    returnResult['invite'] = invite;
    returnResult['isNewUser'] = req.isNewUser;
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
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to signup", err));  
    }
  });
});

module.exports.router = router;
