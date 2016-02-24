'use strict'

var express = require('express');
var mongoose = require('mongoose');
var passwordHash = require('password-hash');
var RSVP = require('rsvp');

var UserModel = require('../../models/user').model;
var TokenModel = require('../../models/token').model;
var OTPModel = require('../../models/otp').model;

var sms = require('../../utils/sms');
var errUtils = require('../../utils/error');
var socialUtils = require('../../utils/social');
var authHelp = require('./auth_help.js');

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

  For signup other than phone, we need to extract user details like name, photo, email 
  using the token given and save in the user object
*/
router.post('/signup', function(req, res){
  var phone = req.body.phone;
  var googleToken = req.body.googleToken;
  var fbToken = req.body.fbToken;

  var promise = RSVP.reject(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "code error /signup", null, 500));

  if(phone){
    //required
    var otp = req.body.otp;
    var name = req.body.name;
    var password = req.body.password;

    //optional
    var photo = req.body.photo;
    var email = req.body.email;
    var location = req.body.location;

    if(!(otp && name && password)){
      res.status(400);
      return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, 
        "required : 'phone, otp, name, password'", null, 400));
    }

    promise = authHelp.verifyOTP(otp, phone);

    //create user
    promise = promise.then(function(result){
      if(!result){
        //console.log("error invalid otp");
        throw errUtils.ErrorObject(errUtils.errors.INVALID_OTP, "invalid otp for " + phone, null, 400); 
      }

      //console.log("generated otp = " + result.otp);
      return authHelp.createUser({
        username : phone,
        password : password,
        name : name,

        phone : phone,
        photo : photo,
        email : email,

        location : location
      });
    });
  }
  else if(googleToken || fbToken){
    //optional fields
    var photo = req.body.photo;
    var location = req.body.location;

    //verify google token and get user details
    if(googleToken){
      promise = socialUtils.verifyGoogleToken(googleToken);
    }
    else{
      promise = socialUtils.verifyFBToken(fbToken);
    }

    promise = promise.then(function(userDetails){
      //userDetails contains username(google or fb id), name, email
      //we have optional photo and location seperately. 
      //We are not filling phone; password field not required

      return authHelp.createUser({
        username : userDetails.username,
        email : userDetails.email,
        name : userDetails.name,

        photo : photo,
        location : location
      });
    });
  }
  else{
    //parameters required
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "please provide appropriate signup data"));
  }

  //generate token
  promise = promise.then(
    function(userObject){
      //console.log("got user object" + userObject);
      //generate and return token
      return authHelp.generateToken(userObject);
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
  var googleToken = req.body.googleToken;
  var fbToken = req.body.fbToken;

  var promise = RSVP.reject(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "code error /signup", null, 500));

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
    if(!isPasswordLogin){
      //otp login
      promise = authHelp.verifyOTP(otp, phone);
      //find user
      promise = promise.then(
        function(result){
          if(!result){
            //console.log("error invalid otp");
            throw errUtils.ErrorObject(errUtils.errors.INVALID_OTP, "invalid otp for " + phone, null, 400); 
          }

          //find user
          return authHelp.findUser(phone);
        }
      );
    }
    else{
      //password login, just find the user using phone number and check password provided
      promise = authHelp.findUser(phone);
    }
  }
  else if(googleToken || fbToken){
    //verify google or fb token and get user details
    if(googleToken){
      promise = socialUtils.verifyGoogleToken(googleToken);
    }
    else{
      promise = socialUtils.verifyFBToken(fbToken);
    }

    promise = promise.then(function(userDetails){
      return authHelp.findUser(userDetails.username);
    });
  }
  else {
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "please provide appropriate login data"));
  }

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

      return authHelp.generateToken(userObject);
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
});

/*reset password for phone login (forgot password case) and generates session token
  post params:
    phone (required)
    password (required)
    otp (required)

  returns: {
    user : <user object>
    'x-session-token' : "token string"
  }
*/

router.post('/passwordreset', function(req, res){
  var phone = req.body.phone;
  var password = req.body.password;
  var otp = req.body.otp;

  if(!(phone && otp && password)) {
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, 
      "required : '[phone, otp, password]'", null, 400));
  }

  var promise = authHelp.verifyOTP(otp, phone);
  promise = promise.then(
    function(result){
      if(!result){
        //console.log("error invalid otp");
        throw errUtils.ErrorObject(errUtils.errors.INVALID_OTP, "invalid otp for " + phone, null, 400); 
      }

      //update user's password
      return authHelp.updateUserPassword(phone, password);
    }
  );

  //generate token
  promise = promise.then(
    function(userObject){
      if(!userObject){
        throw errUtils.ErrorObject(errUtils.errors.USER_NOT_FOUND, "user not found in db", null, 400);
      }

      return authHelp.generateToken(userObject);
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
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "error change password", err));  
    }
  });

});

module.exports.router = router;
