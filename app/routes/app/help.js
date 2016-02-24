'use strict'
var express = require('express');
var router = express.Router();
var errUtils = require('../../utils/error');

router.get('/help', function(req, res){
  res.json({
    message : "Welcome to app api home page", 
    api : [
      {
        "endpoint" : "GET /v1/app/help", 
        "info" : "See this help page",
      },
      {
        "endpoint" : "GET /v1/app/auth/help",
        "info" : "help page for auth api - login, logout, otp, signup",
      },
      {
        "endpoint" : "GET /v1/app/users/help",
        "info" : "help page for users api - get user info, update user info, etc",
      }
    ],
    errorObject : {
      "info" : "if the response is 2xx, then the api call was success. Otherwise if the error was caught on server-side, then there will be a error object in the body of response. Error object will be a JSON. Its structure will be as follows:",
      "errorSchema" : {
        "error" : "string - e.g 'USER_NOT_FOUND' - like a code to identify the error in client code",
        "description" : "string - human readable description of what went wrong",
        "debug": "JSON : in case the error was unknown like some unexpected database error, or gupshup api call error or some other, this will be set for debugging purpose",
        "resStatus" : "number(integer) : used internally in the server side code"
      }
    },
    errors : [
      {
        "error" : errUtils.errors.UNAUTHENTICATED,
        "info" : "not logged in and accessing a api endpoint which requires session"
      },
      {
        "error" : errUtils.errors.PARAMS_REQUIRED,
        "info" : "insufficient data or parameters provided to access the api"
      },
      {
        "error" : errUtils.errors.INVALID_OTP,
        "info" : "phone login or signup - otp not valid"
      },
      {
        "error" : errUtils.errors.USER_ALREADY_EXISTS,
        "info" : "during signup : user already exists"
      },
      {
        "error" : errUtils.errors.UNKNOWN,
        "info" : "general error : unknown unexpected error - handle gracefully client side"
      },
      {
        "error" : errUtils.errors.NOT_FOUND,
        "info" : "general error : resource not found"
      },
      {
        "error" : errUtils.errors.USER_NOT_FOUND,
        "info" : "during login : no such user not found"
      },
      {
        "error" : errUtils.errors.THIRD_PARTY,
        "info" : "general error : due to 3rd party service like gupshup"
      },
      {
        "error" : errUtils.errors.INVALID_CREDENTIALS,
        "info" : "phone login : password did not match"
      },
      {
        "error" : errUtils.errors.INVALID_TOKEN,
        "info" : "fb & google login/signup : invalid token - e.g expired token"
      }
    ]
  });
});


var uSchema = {
  "_id" : "string : mongodb object id",
  "username" : "string : could be phone number, fb id, google id",
  "name" : "string",
  "password" : "string : only in case of phone login",
  "photo" : "string : url",
  "email" : "string",
  "phone" : "string : 10 digit number",
  "location" : "string : city - optional",
  "language" : "string : language preference. e.g hindi, english",

  "createdAt" : "string : date in iso 8601 format. e.g '2016-02-23T16:29:31.000Z'",
  "updatedAt" : "string : date in iso 8601 format"
};

router.get('/auth/help', function(req, res){
  res.json({
    message : "Welcome to auth api home page", 
    UserSchema : uSchema,
    api : [
      {
        "endpoint" : "GET /v1/app/auth/help", 
        "info" : "See this help page",
      },
      {
        "endpoint" : "POST /v1/app/auth/signup", 
        "info" : "User signup",
        "return" : {"user" : "<user object>", "x-session-token" : "<session token>(string)"},
        "required" : [
          "for phone : [phone, otp, name, password]",
          "for fb : [fbToken]",
          "for google : [googleToken]"
        ],
        "optional" : [
          "for phone : [photo, email, location, language]",
          "for fb & google: [photo, location, language]",
        ],
        "possible errors" : "[USER_ALREADY_EXISTS, INVALID_OTP, INVALID_TOKEN]"
      },
      {
        "endpoint" : "POST /v1/app/auth/otp",
        "info" : "Generate otp. Valid for 5 minutes",
        "return" : "200 OK",
        "required" : "phone - string - 10 digit number",
      },
      {
        "endpoint" : "POST /v1/app/auth/login",
        "info" : "User login",
        "return" : {"user" : "<user object>", "x-session-token" : "<session token>(string)"},
        "required" : [
          "for phone login : [(phone & otp) OR (phone & password)]",
          "for fb : [fbToken]",
          "for google : [googleToken]"
        ],
        "possible errors" : "[USER_NOT_FOUND, INVALID_OTP, INVALID_CREDENTIALS, INVALID_TOKEN]"
      },
      {
        "endpoint" : "POST /v1/app/auth/passwordreset",
        "info" : "Reset password for phone login and get session token",
        "return" : {"user" : "<user object>", "x-session-token" : "<session token>(string)"},
        "required" : "[phone, otp, password] - here password is new password to set",
        "possible errors" : "[USER_NOT_FOUND, INVALID_OTP]"
      },
      {
        "endpoint" : "GET /v1/app/auth/logout",
        "info" : "User logout",
        "return" : "200 OK",
        "headers required" : {
          "x-session-token" : "<session token string> recieved during login or signup"
        }
      },
    ]
  });
});

router.get('/users/help', function(req, res){
  res.json({
    message : "Welcome to users api home page", 
    UserSchema : uSchema,
    api : [
      {
        "endpoint" : "GET /v1/app/users/help", 
        "info" : "See this help page",
      },
      {
        "endpoint" : "GET /v1/app/users/me", 
        "info" : "(login required) Get info of current logged in user",
        "return" : "<user object>",
        "headers required" : {
          "x-session-token" : "<session token string> recieved during login or signup"
        },
        "possible errors" : "[UNAUTHENTICATED, NOT_FOUND]"
      },
      {
        "endpoint" : "PUT /v1/app/users/me", 
        "info" : "(login required) Update info of current logged in user",
        "optional" : "[name, photo, email, location, language]",
        "return" : "updated <user object>",
        "headers required" : {
          "x-session-token" : "<session token string> recieved during login or signup"
        },
        "possible errors" : "[UNAUTHENTICATED, NOT_FOUND]"
      }
    ]
  });
});

module.exports.router = router;