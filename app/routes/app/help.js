'use strict'
var express = require('express');
var router = express.Router();
var errUtils = require('../../utils/error');

router.get('/help', function(req, res){
  res.json({
    message : "Welcome to app api home page", 
    api : [
      {
        "info" : "See this help page",
        "endpoint" : "GET /v1/app/help", 
      },
      {
        "info" : "help page for auth api - login, logout, otp, signup",
        "endpoint" : "GET /v1/app/auth/help",
      }
    ],
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
        "info" : "fb & google login/signup : invalid token - can't verify"
      }
    ]
  });
});

router.get('/auth/help', function(req, res){
  res.json({
    message : "Welcome to auth api home page", 
    UserSchema : {
      "username" : "string : could be phone number, fb id, google id",
      "name" : "string",
      "password" : "string",
      "photo" : "string : url",
      "email" : "String",
      "phone" : "String : 10 digit number",
      "location" : "String : city"
    },
    api : [
      {
        "endpoint" : "GET /v1/app/auth/help", 
        "info" : "See this help page",
      },
      {
        "endpoint" : "POST /v1/auth/signup", 
        "info" : "User signup",
        "return" : {"user" : "<user object>", "x-session-token" : "<session token>(string)"},
        "required" : [
          "for phone : [phone, otp, name, password]",
          "for fb : [fbToken]",
          "for google : [googleToken]"
        ],
        "optional" : [
          "for phone : [photo, email, location]",
          "for fb & google: [photo, location]",
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
        "endpoint" : "GET /v1/app/auth/logout",
        "info" : "User logout",
        "return" : "200 OK",
        "headers required" : {
          "x-session-token" : "<session token string> recieved during login or signup"
        },
      },
    ]
  });
});
module.exports.router = router;