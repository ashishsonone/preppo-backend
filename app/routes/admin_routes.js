'use strict';

var express = require('express');
var adminUserModel = require('../models/admin_user.js');
var router = express.Router();
var mongoose = require('mongoose');
var mailer = require('../utils/mailer');
var errUtils = require('../utils/error');

/*
  response codes : 
  2xx
    200 : OK
    201 : created

  4xx
    400 : bad request
    401 : unauthenticated
    403 : unauthorized
    404 : not found

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
        "endpont" : "PATCH /v1/admin/users/me",
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
    adminUserModel.findOne(
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
      });
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
        res.json({ message : "log out success"});
        return;
      }
    });
  }
  else{
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

router.get('/users', function(req, res){
  if(['admin', 'editor'].indexOf(req.session.role) < 0){
    res.status(403);
    res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHORIZED, "you are not authorized - admin/editor only"));
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
        return;
      }
      else{
        res.status(500);
        res.json(errUtils.ErrorObject(errUtils.errors.DB_ERROR, "unable to remove user", err));
        return;
      }
    });
});

router.post('/users', function(req, res){
  //check if authorized (role = [admin])

  if(['admin', 'editor'].indexOf(req.session.role) < 0){
    res.status(403);
    res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHORIZED, "you are not authorized - admin/editor only"));
    return;
  }

  if(req.session.role === 'editor' && ['admin', 'editor'].indexOf(req.body.role) > 0 ){
    res.status(403);
    res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHORIZED, "editor can't create admin or editor user"));
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
        mailer.sendMail(user.email, 
          "welcome to admin platform", "Hi " + user.name + "," + 
            "\nHere are your login details :" + 
            "\nemail : " + user.email +
            "\npassword : " + user.password);
        var result = {};
        result.createdAt = user.createdAt;
        result.email = user.email;
        result._id = user._id;
        result.role = user.role;
        result.name = user.name;
        res.json(result);
        return;
      }
      else{
        console.log("create user %j", err);
        res.status(500);
        res.json(errUtils.ErrorObject(errUtils.errors.DB_ERROR, "unable to create user", err));
        return;
      }
    });
  }
  else{
    res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : 'email', 'password', 'name', 'role'"));
    return;
  }
});

router.delete('/users/:id', function(req, res){
  //check if authorized (role = [admin, editor])

  if(['admin', 'editor'].indexOf(req.session.role) < 0){
    res.status(403);
    res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHORIZED, "you are not authorized - admin/editor only"));
    return;
  }

  var id = req.params.id;
  
  if(!mongoose.Types.ObjectId.isValid(id)){
    res.status(400);
    res.json(errUtils.ErrorObject(errUtils.errors.INVALID_OBJECT_ID, "object id provided is invalid format"));
    return;
  }

  adminUserModel.findOne(
    {_id : id},
    function(err, user){
      if(err){
        console.log("%j", err);
        res.status(500);
        res.json(errUtils.ErrorObject(errUtils.errors.DB_ERROR, "unable to remove user", err));
        return;
      }

      if(!user){
        //account doesnot exist or already deleted
        res.json({message : "success"});
        return;
      }
      
      if(['admin', 'editor'].indexOf(user.role) > 0 && req.session.role !== 'admin'){
        //unauthorized
        res.status(403);
        res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHORIZED, "only admin can delete admin/editor accounts"));
        return;
      }
      else{
        user.remove(function(err){
          if(!err){
            res.json({message : "success"});
            return;
          }
          else{
            res.status(500);
            res.json(errUtils.ErrorObject(errUtils.errors.DB_ERROR, "unable to remove user", err));
            return;
          }
        });
      }
    });
});

router.patch('/users/me', function(req, res){
  //only can change own [password, name]
  console.log("/users/me : req.body : %j", req.body);
  if(req.body.name || req.body.password){
    var _id = req.session._id;

    var changes = {};
    if(req.body.name){
      changes.name = req.body.name;
    }
    if(req.body.password){
      changes.password = req.body.password;
    }

    adminUserModel.update(
      {_id : _id },
      {'$set' : changes},
      {multi : false},
      function(err, result){
        if(!err){
          res.json({"message" : "success"});
          return;
        }
        else{
          res.status(500);
          res.json(errUtils.ErrorObject(errUtils.errors.DB_ERROR, "unable to remove user", err));
          return;
        }
      }
    );
  }
  else{
    res.status(400);
    res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required one/more of : [name, password]"));
  }
});

router.get('/users/me', function(req, res){
  var _id = req.session._id;
  adminUserModel.findById(
    _id,
    function(err, user){
      if(err){
        console.log("%j", err);
        res.status(500);
        res.json(errUtils.ErrorObject(errUtils.errors.DB_ERROR, "unable to find user", err));
        return;
      }
      if(!user){
        //email doesnot exist
        res.status(404);
        res.json(errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "user not found in db"));
        return;
      }
      else{
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
});

module.exports.adminRouter = router;