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
        "endpoint" : "GET /v1/live/doubts/help",
        "info" : "help page doubts api : post a new doubt, end doubt",
      },
      {
        "endpoint" : "GET /v1/live/teachers/help",
        "info" : "help page for teachers api - teacher type users",
      }
    ],
    errorObject : {
      "info" : "if the response is 2xx, then the api call was success. Otherwise if the error was caught on server-side, then response will be a JSON to be interpreted as Error object. Its structure will be as follows:",
      "errorSchema" : {
        "error" : "string - e.g 'USER_NOT_FOUND' - like a code to identify the error in client code",
        "description" : "string - human readable description of what went wrong",
        "debug": "JSON : in case the error was unknown like some unexpected database error, or gupshup api call error or some other, this will be set for debugging purpose",
        "resStatus" : "number(integer) : used internally in the server side code"
      }
    }
  });
});

var doubtDetailsScheama = {
  description : "string", //text description of the problem
  images : "[<url>]", //url
};

var doubtResponseScheama = {
  description : "string", //text description of the problem
  images : "[<url>]", //url
};

var doubtSchema = {
  "doubtId" : "string",
  "student" : "username of student who posted this doubt",

  "details" : doubtDetailsScheama,
  "status" : "current status : enum [unassigned, assigned, solved, unsolved]",

  "teacher" : "username of teacher who was assigned this doubt - could be empty if no teacher could be assigned",
  "assignTime" : "iso datetime string : when was assigned to a teacher",

  "response" : doubtResponseScheama,
  "endTime" : "iso datetime string : when doubt was ended - either solved/unsolved",

  "billingId" : "NOT IN USE : id corresponding to the billing entity of this request"
};

router.get('/doubts/help', function(req, res){
  res.json({
    message : "Welcome to live doubts api home page",
    DoubtSchema : doubtSchema,
    api : [
      {
        "endpoint" : "GET /v1/live/requests/help",
        "info" : "See this help page",
      },
      {
        "endpoint" : "POST /v1/live/doubts",
        "info" : "submit a new doubt",
        "return" : {
          "success" : "true if online teachers available, false otherwise",
          "doubtId" : "<requestId>(string) - if success true",
          "position" : "integer - Your position in the doubtQueue of assigned teacher"
        },
        "required" : [
          "username : string",
          "description : textual description of the doubt",
          "images : array [<url>] - doubt photos"
        ],
        "possible errors" : "[]"
      },
      {
        "endpoint" : "GET /v1/live/doubts/<doubtId>",
        "info" : "Get Doubt entity",
        "return" : "Doubt entity",
        "required" : [
        ],
        "possible errors" : "[]"
      },
      {
        "endpoint" : "POST /v1/live/doubts/end",
        "info" : "end the doubt - either to 'solved' or 'unsolved' status",
        "return" : "updated doubt entity",
        "required" : [
          "username : string",
          "doubtId : string",
          "status : string - one of [solved, unsolved]",
          "description : solution description(if solved) or reason(if unsolved)",
          "images : [<url>] solution photos(if solved), empty array(if unsolved)"
        ],
        "possible errors" : "[]"
      },
    ]
  });
});

var teacherSessionSchema = {
  token : "string - token returned during login/signup",
  ts : "number - datetime in millis"
};

var teacherSchema = {
  username : "string - backend generated random username",
  phone : "string - 10 digit phone number",
  name : "string",

  status : "string - enum [active, away]",
  online : "[<SessionSchema>] - active teacher device sessions",
  doubtQueue : "[<doubtId>] - currently assinged doubts"
};

router.get('/teachers/help', function(req, res){
  res.json({
    message : "Welcome to live teachers api home page. API IS INCOMPLETE right now.",
    SessionSchema : teacherSessionSchema,
    TeacherSchema : teacherSchema,
    api : [
      {
        "endpoint" : "GET /v1/live/teachers/help",
        "info" : "See this help page",
      },
      {
        "endpoint" : "POST /v1/live/teachers",
        "info" : "[FOR TESTING ONLY] create a new teacher : WILL CHANGE TO /singup endpoint",
        "return" : "Teacher entity on success",
        "required" : [
          "username : string",
          "phone : string - 10 digit phone number",
          "name : string"
        ],
        "possible errors" : "[]"
      },
      {
        "endpoint" : "GET /v1/live/teachers/<username>",
        "info" : "[FOR TESTING ONLY] Get Teacher entity by username",
        "return" : "Teacher entity",
        "required" : [
        ],
        "possible errors" : "[]"
      },
      {
        "endpoint" : "PUT /v1/live/teachers/<username>",
        "info" : "[FOR TESTING ONLY] Get Teacher entity by username",
        "return" : "Teacher entity",
        "optional params" : [
          "name : string",
          "status : string - enum in [active, away]"
        ],
        "possible errors" : "[]"
      },
      {
        "endpoint" : "GET /v1/live/teachers/",
        "info" : "[FOR TESTING ONLY]  Get all teachers",
        "return" : "array of Teacher entity",
        "required" : [
        ],
        "possible errors" : "[]"
      },
    ]
  });
});
module.exports.router = router;