'use strict'
var express = require('express');
var router = express.Router();
var errUtils = require('../../utils/error');

router.get('/help', function(req, res){
  res.json({
    message : "Welcome to live api home page", 
    api : [
      {
        "endpoint" : "GET /v1/live/help", 
        "info" : "See this help page",
      },
      {
        "endpoint" : "GET /v1/live/requests/help",
        "info" : "help page requests api : post a teaching request, and stuff",
      },
      {
        "endpoint" : "GET /v1/live/teachers/help",
        "info" : "help page for teachers api - teacher type users",
      },
      {
        "endpoint" : "GET /v1/live/students/help",
        "info" : "help page for students api - student type users",
      },
      {
        "endpoint" : "GET /v1/live/auth/help",
        "info" : "help page auth api - login, signup, etc",
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

var teacherSchema = {
  "_id" : "string : mongodb object id",
  "username" : "string : could be phone number, fb id, google id",
  "name" : "string",

  "online" : "[<session>] : array of login session objects - if empty means the teacher is offline right now",
  "status" : "either 'free' or <requestId> : whether the teacher is busy currently with a teaching request",

  "createdAt" : "string : date in iso 8601 format. e.g '2016-02-23T16:29:31.000Z'",
  "updatedAt" : "string : date in iso 8601 format"
};

var requestSchema = {
  "_id" : "string - mongodb object id",
  "requestId" : "sytem generated unique id for request",
  "student" : "username of student who made this request",
  "teacher" : "username of teacher who was assigned this request - could be empty if no teacher could be assigned",
  "info" : "after session ends, details of the teaching session e.g startTime, endTime, duration",
  "billingId" : "id corresponding to the billing entity of this request"
};

router.get('/requests/help', function(req, res){
  res.json({
    message : "Welcome to requests api home page", 
    RequestSchema : requestSchema,
    api : [
      {
        "endpoint" : "GET /v1/live/requests/help", 
        "info" : "See this help page",
      },
      {
        "endpoint" : "POST /v1/live/requests", 
        "info" : "Create a teaching requests",
        "return" : {
          "requestId" : "<requestId>(string)"
        },
        "required" : [
          "requestDetails : ...to be decided..."
        ],
        "possible errors" : "[UNAUTHENTICATED]"
      }
    ]
  });
});

module.exports.router = router;