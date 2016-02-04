'use strict'

var express = require('express');
var AdminUserModel = require('../models/admin_user.js');
var router = express.Router();
var mongoose = require('mongoose');
var mailer = require('../utils/mailer');
var errUtils = require('../utils/error');
var constants = require('../utils/constants');

var roles = constants.roles;

//start ENDPOINT /v1/admin/users/

router.get('/', function(req, res){
  if([roles.ADMIN, roles.EDITOR].indexOf(req.session.role) < 0){
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

  if(req.session.role === roles.EDITOR){
    query = { role :  {'$ne' : roles.ADMIN}};
  }
  //check if authorized (role=[admin, publisher])
  AdminUserModel.
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

router.post('/', function(req, res){
  //check if authorized (role = [admin])

  if([roles.ADMIN, roles.EDITOR].indexOf(req.session.role) < 0){
    res.status(403);
    res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHORIZED, "you are not authorized - admin/editor only"));
    return;
  }

  if(req.session.role === roles.EDITOR && [roles.ADMIN, roles.EDITOR].indexOf(req.body.role) > 0 ){
    res.status(403);
    res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHORIZED, "editor can't create admin or editor user"));
    return;
  }

  if(req.body.email && req.body.name && req.body.role && req.body.password){
    var newUser = new AdminUserModel();
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
      else if(err.code == 11000){ //duplicate key error
        console.log("create user duplicate email err.code=%j", err.code);
        res.status(400);
        res.json(errUtils.ErrorObject(errUtils.errors.DUPLICATE, "email already exists"));
        return;
      }
      else{ //duplicate key error
        console.log("create user %j", err);
        res.status(500);
        res.json(errUtils.ErrorObject(errUtils.errors.DB_ERROR, "error create user", err));
        return;
      }
    });
  }
  else{
    res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : 'email', 'password', 'name', 'role'"));
    return;
  }
});

router.delete('/:id', function(req, res){
  //check if authorized (role = [admin, editor])

  if([roles.ADMIN, roles.EDITOR].indexOf(req.session.role) < 0){
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

  AdminUserModel.findOne(
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
      
      if([roles.ADMIN, roles.EDITOR].indexOf(user.role) > 0 && req.session.role !== roles.ADMIN){
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

router.patch('/me', function(req, res){
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

    AdminUserModel.update(
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

router.get('/me', function(req, res){
  var _id = req.session._id;
  AdminUserModel.findById(
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

module.exports.router = router;