'use strict';

var express = require('express');
var adminUserModel = require('../models/admin_user.js');
var router = express.Router();
var mongoose = require('mongoose');

/*
  response codes : 
  2xx
    200 : OK
    201 : created

  4xx
    400 : bad request
    401 : unauthenticated
    403 : unauthorized

  5xx
    500 : internal server error
*/
router.get('/', function(req, res){
  res.json({
    message : "Welcome to admin api home page", 
    supported : [
      {
        "info" : "See this help page",
        "endpoint" : "GET /v1/admin/", 
      },
      {
        "info" : "Create a user. You need to be logged in as an admin",
        "returns" : "Returns newly created user object",
        "endpoint" : "POST /v1/admin/users", 
        "required" : "email, password, role, name",
      },
      {
        "info" : "Retrieve all users. You need to be logged in as an admin or editor.",
        "returns" : "Returns array of user objects. If admin, returns all users. If editor, returns only editor and uploader type users.",
        "endpoint" : "GET /v1/admin/users",
        "optional" : "?limit=2&role=uploader"
      },
      {
        "info" : "Login to you account. Sets the session cookie",
        "returns" : "Returns user object",
        "endpoint" : "POST /v1/admin/login",
        "required" : "email, password"
      },
      {
        "info" : "Logout",
        "endpoint" : "GET /v1/admin/logout",
      },
      {
        "info" : "Delete a user. You need to be logged in as admin",
        "endpont" : "DELETE /v1/admin/<userid>"
      }
    ]
  });
});

router.post('/login', function(req, res){
  var email = req.body.email;
  var password = req.body.password;

  if(!email || !password){
    res.status(400);
    res.json({code : 400, error : "INVALID_PARAMETERS", description : "required post parameters : 'email', 'password'"});
  }
  else{
    adminUserModel.findOne(
      {email : email}, 
      function(err, user){
        if(err){
          console.log("%j", err);
          res.json({code : 500, error : "DB_ERROR", description : "unable to destroy session"});
        }
        if(!user){
          //email doesnot exist
          res.status(401);
          res.json({code : 401, error : "INVALID_CREDENTIALS", description : "user not found in db"});
        }
        else if(!user.password || user.password != password){
          //password doesnot match
          res.status(401);
          res.json({code : 401, error : "INVALID_CREDENTIALS", description : "wrong password"});
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
          res.json(newUser);
        }
      });
  }
});

router.get('/logout', function(req, res){
  if(req.session.email){
    req.session.destroy(function(err){
      if(err){
        res.status(500);
        res.json({code : 500, error : "DB_ERROR", description : "unable to destroy session"});
      }
      else{
        res.json({ message : "log out success"});
      }
    });
  }
  else{
    res.json({ message : "already logged out"});
  }
});

router.get('/users', function(req, res){
  if(!req.session.email){
    res.status(401);
    res.json({code : 401, error : "UNAUTHENTICATED", description : "login is required to access this end point"});
    return;
  }

  if(req.session.role !== 'admin' && req.session.role !== 'editor'){
    res.status(403);
    res.json({code : 403, error : "UNAUTHORIZED", description : "you are not authorized - admin/editor only"});
    return;
  }

  var projection = { 
      __v: false,
      password: false,
  };

  var limit = req.query.limit || 50; //default limit is 50

  var role = req.query.role;
  var query = {};
  if(role){
    query = { role : role };
  }

  if(req.session.role === 'editor'){
    query = { role :  {'$ne' : 'admin'}};
  }
  //check if authorized (role=[admin, publisher])
  adminUserModel.
    find(query).
    select(projection).
    limit(limit).
    exec(function(err, users){
      if(!err){
        res.json(users);
      }
      else{
        res.json(err);
      }
    });
});

router.post('/users', function(req, res){
  //check if authorized (role = [admin])
  if(!req.session.email){
    res.status(401);
    res.json({code : 401, error : "UNAUTHENTICATED", description : "login is required to access this end point"});
    return;
  }

  if(req.session.role !== 'admin'){
    res.status(403);
    res.json({code : 403, error : "UNAUTHORIZED", description : "you are not authorized - admin only"});
    return;
  }

  if(req.body.email && req.body.name && req.body.role && req.body.password){
    var newUser = new adminUserModel();
    newUser.email = req.body.email;
    newUser.name = req.body.name;
    newUser.role = req.body.role;
    newUser.password = req.body.password;

    newUser.save(function(err, user){
      if(!err){
        var result = {};
        result.email = user.email;
        result._id = user._id;
        result.role = user.role;
        result.name = user.name;
        res.json(result);
      }
      else{
        console.log("create user %j", err);
        res.status(400);
        res.json(err);
      }
    });
  }
  else{
    res.json({code : 400, error : "PARAMETERS_REQUIRED", description : "required : 'email', 'password', 'name', 'role'"});
  }
});

router.delete('/users/:id', function(req, res){
  //check if authorized (role = [admin])
  if(!req.session.email){
    res.status(401);
    res.json({code : 401, error : "UNAUTHENTICATED", description : "login is required to access this end point"});
    return;
  }

  if(req.session.role !== 'admin'){
    res.status(403);
    res.json({code : 403, error : "UNAUTHORIZED", description : "you are not authorized - admin only"});
    return;
  }

  var id = req.params.id;
  
  if(!mongoose.Types.ObjectId.isValid(id)){
    res.status(400);
    res.json({code : 400, error : "INVALID_OBJECT_ID", description : "object id provided is invalid format"});
    return;
  }

  if(id){
    adminUserModel.remove({_id : id}, function(err, result){
      if(!err){
        if(result){
          //x = {"ok":1,"n":1}, or {"ok":1,"n":0} i.e success count
          console.log("%j", result);
        }
        res.json({message : "success"});
      }
      else{
        console.log("%j", err);
        res.status(500);
        res.json({code : 500, error : "DB_ERROR", description : "unable to remove user"});
      }
    });
  }
});

module.exports.adminRouter = router;