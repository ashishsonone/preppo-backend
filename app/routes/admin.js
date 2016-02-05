'use strict'

var express = require('express');
var mongoose = require('mongoose');

var AdminUser = require('../models/admin_user');
var mailer = require('../utils/mailer');
var errUtils = require('../utils/error');

var usersApi = require('./users');
var newsApi = require('./news');

var AdminUserModel = AdminUser.model;

var router = express.Router();
//start ENDPOINT /v1/admin/

router.get('/', function(req, res){
  res.json({
    message : "Welcome to admin api home page", 
    supported : [
      {
        "info" : "See this help page",
        "endpoint" : "GET /v1/admin/", 
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
        "info" : "Login to you account. Sets the session cookie",
        "return" : "Returns user object",
        "endpoint" : "POST /v1/admin/login",
        "required" : "all of [email, password] as POST body"
      },
      {
        "info" : "Logout",
        "endpoint" : "GET /v1/admin/logout",
      },
      {
        "info" : "Delete a user. You need to be logged in as an admin or editor. admin can delete all users. editor can delete only uploader type users",
        "endpont" : "DELETE /v1/admin/users/<userid>"
      },
      {
        "info" : "get details of logged-in user",
        "endpont" : "GET /v1/admin/users/me"
      },
      {
        "info" : "update name and/or password of logged-in user",
        "endpont" : "PUT /v1/admin/users/me",
        "required" : "one of [name, password] like POST body"
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

router.post('/login', function(req, res){
  var email = req.body.email;
  var password = req.body.password;

  //console.log("/login post header:%j \nbody:%j \nquery:%j", req.headers, req.body, req.query);
  if(!email || !password){
    res.status(400);
    res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required post parameters : 'email', 'password'"));
    return;
  }
  else{
    AdminUserModel.findOne(
      {email : email}, 
      function(err, user){
        if(err){
          console.log("%j", err);
          res.status(500);
          res.json(errUtils.ErrorObject(errUtils.errors.DB_ERROR, "unable to find user", err));
          return;
        }
        if(!user){
          //email doesnot exist
          res.status(401);
          res.json(errUtils.ErrorObject(errUtils.errors.INVALID_CREDENTIALS, "user not found in db"));
          return;
        }
        else if(user.password != password){
          //password doesnot match
          res.status(401);
          res.json(errUtils.ErrorObject(errUtils.errors.INVALID_CREDENTIALS, "wrong password"));
          return;
        }
        else{
          //set session
          req.session.email = user.email;
          req.session.role = user.role;
          req.session._id = user._id;
          //all ok
          var newUser = {};
          newUser.email = user.email;
          newUser._id = user._id;
          newUser.role = user.role;
          newUser.name = user.name;
          newUser.createdAt = user.createdAt;
          res.json(newUser);
          return;
        }
      }
    );
  }
});

router.get('/logout', function(req, res){
  if(req.session.email){
    req.session.destroy(function(err){
      if(err){
        res.status(500);
        res.json(errUtils.ErrorObject(errUtils.errors.DB_ERROR, "unable to destroy session", err));
        return;
      }
      else{
        res.clearCookie('connect.sid');
        res.json({ message : "log out success"});
        return;
      }
    });
  }
  else{
    res.clearCookie('connect.sid');
    res.json({ message : "already logged out"});
    return;
  }
});

//middleware to check if logged in i.e session exists
router.use(function(req, res, next){
  if(req.method == 'OPTIONS'){
    next();
    return;
  }

  if(!req.session.email){
    console.log("authentication middleware : no session found");
    res.status(401);
    res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHENTICATED, "login is required to access this end point"));
    return;
  }
  else{
    next();
    return;
  }
});

// users administration
router.use('/users', usersApi.router);

// news item administration
router.use('/news', newsApi.router);
module.exports.router = router;