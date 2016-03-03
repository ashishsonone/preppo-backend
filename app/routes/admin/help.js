'use strict'

var express = require('express');
var router = express.Router();
var errUtils = require('../../utils/error');
//start ENDPOINT /v1/admin/

// main admin help
router.get('/help', function(req, res){
  res.json({
    message : "Welcome to admin api home page", 
    api : [
      {
        "info" : "See this help page",
        "endpoint" : "GET /v1/admin/help", 
      },
      {
        "info" : "Login to you account. Sets the session cookie",
        "return" : "Returns user object",
        "endpoint" : "POST /v1/admin/login",
        "required" : "all of [email, password] as POST body"
      },
      {
        "info" : "Logout from session",
        "endpoint" : "GET /v1/admin/logout",
      },
      {
        "info" : "See help for users api",
        "endpoint" : "GET /v1/admin/users/help"
      },
      {
        "info" : "See help for news api",
        "endpoint" : "GET /v1/admin/news/help"
      },
      {
        "info" : "See help for newsquiz api",
        "endpoint" : "GET /v1/admin/news/quiz/help"
      }
    ],
    errors : [
      {
        "error" : errUtils.errors.UNAUTHENTICATED,
        "info" : "not logged in and accessing a api endpoint which requires session"
      },
      {
        "error" : errUtils.errors.UNAUTHORIZED,
        "info" : "not authorized to perform that action"
      },
      {
        "error" : errUtils.errors.DB_ERROR,
        "info" : "unknown error on part of the server. client should fail gracefully"
      },
      {
        "error" : errUtils.errors.INVALID_CREDENTIALS,
        "info" : "during login, if provided with invalid email password combo"
      },
      {
        "error" : errUtils.errors.INVALID_OBJECT_ID,
        "info" : "while operating on a particular resource, the object id is given invalid. e.g when DELETE /users/<user_id>"
      },
      {
        "error" : errUtils.errors.PARAMS_REQUIRED,
        "info" : "insufficient data or parameters provided"
      },
      {
        "error" : errUtils.errors.NOT_FOUND,
        "info" : "resouce requested not found. e.g accesing GET /users/me when you have been deleted from system"
      },
      {
        "error" : errUtils.errors.DUPLICATE,
        "info" : "when unique index on a key(say email) and try to insert an entity with duplicate key(same email)"
      }
    ]
  });
});

// admin/users api help
router.get('/users/help', function(req, res){
  res.json({
    message : "Welcome to users api home page", 
    schema : {
      "email" : "string",
      "name" : "string",
      "password" : "string",
      "role" : "string",
      "createdAt" : "date",
      "updatedAt" : "date"
    },
    api : [
      {
        "info" : "See this help page",
        "endpoint" : "GET /v1/admin/users/help", 
      },
      {
        "info" : "Create a user. You need to be logged in as an admin or editor. admin can create all users. editor can create only uploader type users",
        "return" : "Returns newly created user object",
        "endpoint" : "POST /v1/admin/users", 
        "required" : "all of [email, password, role, name] as POST body",
      },
      {
        "info" : "Retrieve all users. You need to be logged in as an admin or editor.",
        "return" : "Returns array of user objects(default limit=50). If admin, returns all users. If editor, returns only editor and uploader type users.",
        "endpoint" : "GET /v1/admin/users",
        "optional" : "?limit=2&role=uploader"
      },
      
      {
        "info" : "Delete a user. You need to be logged in as an admin or editor. admin can delete all users. editor can delete only uploader type users",
        "endpont" : "DELETE /v1/admin/users/<userid>",
        "return" : "200 OK"
      },
      {
        "info" : "get details of logged-in user",
        "endpont" : "GET /v1/admin/users/me",
        "return" : "user object"
      },
      {
        "info" : "update name and/or password of logged-in user",
        "endpont" : "PUT /v1/admin/users/me",
        "required" : "one of [name, password] like POST body",
        "return" : "200 OK"
      }
    ]
  });
});

// admin/news api help
router.get('/news/help', function(req, res){
  res.json({
      message : "Welcome to news api home page", 
      ContentSchema : {
        "heading" : "string",
        "points" : ["string"]
      },
      NewsSchema : {
        "content" : {
          "english" : "ContentSchema",
          "hindi" : "ContentSchema"
        },
        "imageMobile" : "string",
        "imageWeb" : "string",

        "publishDate" : "date",
        "categories" : "[string]",
        "tags" : "[string]",

        "status" : "string",
        "editedBy" : "string",
        "updatedAt" : "date",
        
        "uploadedBy" : "string",
        "createdAt" : "date"
      },
      api : [
        {
          "info" : "See this help page",
          "endpoint" : "GET /v1/admin/news/help", 
        },
        {
          "info" : "create a news item",
          "endpoint" : "POST /v1/admin/news/",
          "return" : "created news item",
          "required" : "[content, publishDate]",
          "optional" : "[imageWeb, imageMobile, categories, tags]"
        },
        {
          "info" : "get news items",
          "endpoint" : "GET /v1/admin/news",
          "return" : "array of news items",
          "required" : "status or date",
          "optional" : "[limit, gt, lt] : gt=greater-than date, lt=less-than date",
          "details" : [
            "if status=uploaded, return latest 'uploaded' news items sorted by 'createdAt' time",
            "if status=approved or published return 'approved' or 'published' items sorted by 'updatedAt' time",
            "if status param missing but date given, return all news items(with all 3 status) for that publish date"
          ]
        },
        {
          "info" : "update a news item",
          "endpoint" : "PUT /v1/admin/news/<newsid>",
          "optional" : "[content, imageWeb, imageMobile, publishDate, categories, tags, status]",
          "return" : "updated news item"
        },
        {
          "info" : "delete a news item",
          "endpoint" : "DELETE /v1/admin/news/<newsid>",
          "return" : "200 OK"
        },
      ]
    }
  );
});

router.get('/news/quiz/help', function(req, res){
  res.json({
      message : "Welcome to news-quiz api home page", 
      NewsQuizSchema : {
        questionIdList : ["string"],
        type : "string - e.g [weekly, daily, monthly]",
        publishDate : "date",
        nickname : "string - e.g weekly-week-1-march, daily-2016-02-23",

        status : "string",
        editedBy : "string",
        updatedAt : "date",

        uploadedBy : "string",
        createdAt : "date"
      },
      api : [
        {
          "info" : "See this help page",
          "endpoint" : "GET /v1/admin/news/quiz/help", 
        },
        {
          "info" : "create a quiz item",
          "endpoint" : "POST /v1/admin/news/quiz/",
          "return" : "created quiz item",
          "required" : "[type, nickname, publishDate]",
        },
        {
          "info" : "get quiz items",
          "endpoint" : "GET /v1/admin/news/quiz/",
          "return" : "array of quiz items",
          "required" : "status",
          "optional" : "[limit, gt, lt] : gt=greater-than date, lt=less-than date",
          "detail" : "return quiz entities ordered by updatedAt timestamp"
        },
        {
          "info" : "update a quiz item",
          "endpoint" : "PUT /v1/admin/news/quiz/<quizid>",
          "optional" : "[nickname, type, publishDate, status]",
          "return" : "updated quiz item"
        },
        {
          "info" : "get a quiz item with all its questions",
          "endpoint" : "GET /v1/admin/news/quiz/<quizid>",
          "return" : { quiz : "<Quiz>", questionList : ["<QuizQuestion>"]}
        },
        {
          "info" : "delete a quiz item",
          "endpoint" : "DELETE /v1/admin/news/quiz/<quizid>",
          "return" : "200 OK"
        }
      ]
    }
  );
});

router.get('/news/quizquestion/help', function(req, res){
  res.json({
      message : "Welcome to news-quiz-question api home page", 
      OptionSchema : {
        optionString : "string",
        correct : "boolean"
      },
      QuestionSchema : {
        questionString : "string",
        solution : "string",
        options : ["OptionSchema"]
      },
      NewsQuizQuestionSchema : {
        content : {
          english : "QuestionSchema",
          hindi : "QuestionSchema"
        },
        level : "number",
        count : "number - of times used in quiz",

        status : "string",
        editedBy : "string",
        updatedAt : "date",

        uploadedBy : "string",
        createdAt : "date"
      },
      api : [
        {
          "info" : "See this help page",
          "endpoint" : "GET /v1/admin/news/quizquestion/help", 
        },
        {
          "info" : "create a question entry",
          "endpoint" : "POST /v1/admin/news/quizquestion",
          "return" : "created question item",
          "required" : "[content, level]",
          "optional" :  "[category]",
          "optional Query params" : "quizId - to add this question to this quiz"
        },
        {
          "info" : "update a question entry",
          "endpoint" : "PUT /v1/admin/news/quizquestion/<questionid>",
          "return" : "updated question item",
          "optional" : "[content, level, status]",
        },
        {
          "info" : "delete a question entry and remove it from quiz",
          "endpoint" : "DELETE /v1/admin/news/quizquestion/<questionid>",
          "return" : "200 OK",
          "optional Query params" : "quizId - to remove the question from that quiz"
        }
      ]
    }
  );
});

module.exports.router = router;