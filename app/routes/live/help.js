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
    }
  });
});

var teacherSchema = {
  "_id" : "string : mongodb object id",
  "username" : "string : could be phone number, fb id, google id",
  "name" : "string",

  "online" : "[<session>] : array of login session objects - if empty means the teacher is offline right now",
  "status" : "either ''(empty string) or <requestId> : whether the teacher is busy currently with a teaching request",

  "createdAt" : "string : date in iso 8601 format. e.g '2016-02-23T16:29:31.000Z'",
  "updatedAt" : "string : date in iso 8601 format"
};

var requestDetailsSchema = {
  subject : "string", //subject
  topic : "string", //topic within the subject
  description : "string", //text description of the problem
  image : "string", //url
};

var requestSchema = {
  "_id" : "string - mongodb object id",
  "requestDate" : "date string YYYY-MM-DD format",
  "requestCode" : "unique id for the request. <requestId> = <requestDate> + '/' + <requestCode>",
  "student" : "username of student who made this request",
  "details" : requestDetailsSchema,

  "teacher" : "username of teacher who was assigned this request - could be empty if no teacher could be assigned",

  "sessionStartTime" : "iso datetime string : when session started",
  "sessionEndTime" : "iso datetime string : when session ended",
  "sessionDuration" : "duration of session in seconds used for billing",

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
          "success" : "true if online teachers available, false otherwise",
          "requestId" : "<requestId>(string) - if success true"
        },
        "required" : [
          "username : string",
          "subject : string",
          "topic : string",
          "description : textual description of the doubt",
          "image : url string : doubt image"
        ],
        "possible errors" : "[PARAMS_REQUIRED, BUSY]"
      },
      {
        "endpoint" : "GET /v1/live/requests/<requestId>",
        "info" : "Get Request entity",
        "return" : "request entity",
        "required" : [
        ],
        "possible errors" : "[]"
      },
      {
        "endpoint" : "POST /v1/live/requests/start",
        "info" : "start the teaching session - sets the sessionStartTime field",
        "return" : "updated request entity",
        "required" : [
          "username : string",
          "role : 'teacher' or 'student'",
          "requestId : string"
        ],
        "possible errors" : "[PARAMS_REQUIRED]"
      },
      {
        "endpoint" : "POST /v1/live/requests/update",
        "info" : "modify the teaching session - update the sessionDuration field",
        "return" : "updated request entity",
        "required" : [
          "username : string",
          "requestId : string",
          "sessionDuration : number - in seconds"
        ],
        "possible errors" : "[PARAMS_REQUIRED]"
      },
      {
        "endpoint" : "POST /v1/live/requests/end",
        "info" : "terminate the teaching session - sets the sessionEndTime field",
        "return" : "updated request entity",
        "required" : [
          "username : string",
          "role : 'teacher' or 'student'",
          "requestId : string"
        ],
        "possible errors" : "[PARAMS_REQUIRED]"
      },
    ]
  });
});

module.exports.router = router;