'use strict'

var express = require('express');
var passwordHash = require('password-hash');

var UserModel = require('../../models/user').model;
var stringUtils = require('../../utils/string_utils');

var errUtils = require('../../utils/error');
var debugConfig = require('../../../config/common').debug;

var router = express.Router();

//start ENDPOINT /v1/admin/appusers

/*fetch userinfo from username
*/
router.get('/:username', function(req, res){
  var username = req.params.username;
  var promise = UserModel
    .findOne({
      username : username
    })
    .select({
      password : false,
      __v : false
    })
    .exec();

  promise = promise.then(
    function(user){
      if(!user){
        //username doesnot exist, throw error
        throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "requested resource not found", null, 404);
        return;
      }
      else{
        res.json(user);
        return;
      }
    }
  );

  promise.catch(
    function(err){
      //error caught and set earlier
      if(err && err.resStatus){
        res.status(err.resStatus);
        return res.json(err);
      }
      else{
        //uncaught error
        res.status(500);
        return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to get /" + id, err, 500));
      }
    }
  );
});

/*Update user info. needs session token
  post params:
    x-name (optional)
    x-photo (optional)
    x-email (optional)
    x-location (optional)
    x-language (optional)
    x-password (optional)
    sharedOnFb (optional)
*/
router.put('/:username', function(req, res){
  var username = req.params.username;

  var changes = {};
  /*if(req.body.name){
    changes.name = req.body.name;
  }
  if(req.body.photo){
    changes.photo = req.body.photo;
  }
  if(req.body.email){
    changes.email = req.body.email;
  }
  if(req.body.location){
    changes.location = req.body.location;
  }
  if(req.body.language){
    changes.language = req.body.language;
  }
  if(req.body.password){
    changes.password = passwordHash.generate(req.body.password);
  }*/
  if(req.body.sharedOnFb != null){
    changes.sharedOnFb = req.body.sharedOnFb;
  }

  var promise = UserModel.findOneAndUpdate(
    {username : username },
    {'$set' : changes},
    {new : true}, //return modified version of document
    function(err, result){
      if(err){
        res.status(500);
        res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to update user", err, 500));
        return;
      }
      else if(!result){
        res.status(400);
        res.json(errUtils.ErrorObject(errUtils.errors.USER_NOT_FOUND, "user not found in db", null, 400));
      }
      else{
        //all ok
        res.json(result);
      }
    }
  );
});

module.exports.router = router;