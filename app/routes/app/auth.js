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
    //var message = "Your otp is " + otp;
    var message = otp + " is your Knit verification code";
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

  For signup other than phone, we need to extract user details like name, photo, email 
  using the token given and save in the user object
*/
router.post('/signup', function(req, res){
  //console.log("------>SIGNUP %j", req.body);
  var phone = req.body.phone;
  var googleToken = req.body.googleToken;
  var fbToken = req.body.fbToken;

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

  //generate token
  promise = promise.then(
    function(userObject){
      //console.log("got user object" + userObject);
      //generate and return token
      return authHelp.generateToken(userObject);
    }
  );

  promise = promise.then(function(result){//contain both user & token
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
