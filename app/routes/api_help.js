'use strict'

var express = require('express');
var router = express.Router();
var errUtils = require('../utils/error');
//start ENDPOINT /v1/admin/

// main admin help
router.get('/help', function(req, res){
  res.json({
    message : "Welcome to admin api home page", 
    supported : [
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
        "info" : "See help for news api",
        "endpoint" : "GET /v1/admin/news/help"
      },
      {
        "info" : "See help for users api",
        "endpoint" : "GET /v1/admin/users/help"
      },
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
    message : "Welcome to admin/users api home page", 
    schema : {
      "email" : "string",
      "name" : "string",
      "password" : "string",
      "role" : "string",
      "createdAt" : "date"
    },
    supported : [
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
      message : "Welcome to admin/news api home page", 
      schema : {
        "heading" : "string",
        "points" : "[string]",
        "imageUrl" : "string",

        "language" : "string",
        "publishDate" : "date",
        "categories" : "[string]",
        "tags" : "[string]",

        "status" : "string",
        "editedBy" : "string",
        "editedAt" : "date",
        
        "uploadedBy" : "string",
        "uploadedAt" : "date"
      },
      supported : [
        {
          "info" : "See this help page",
          "endpoint" : "GET /v1/admin/news/help", 
        },
        {
          "info" : "create a news item",
          "endpoint" : "POST /v1/admin/news/",
          "return" : "created news item",
          "required" : "[heading, points, language, publishDate]",
          "optional" : "[imageUrl, categories, tags]"
        },
        {
          "info" : "get news items",
          "endpoint" : "GET /v1/admin/news",
          "return" : "array of news items",
          "required" : "[status]",
          "optional" : "[limit, gt, lt] : gt=greater-than date, lt=less-than date",
          "detail" : "if status=uploaded, return latest news items sorted by 'uploadedAt' time; otherwise return items sorted by 'editedAt' time"
        },
        {
          "info" : "update a news item",
          "endpoint" : "PUT /v1/admin/news/<newsid>",
          "required" : "one of [heading, points, imageUrl, language, publishDate, categories, tags, status]",
          "return" : "200 OK success message"
        }
      ]
    }
  );
});

module.exports.router = router;