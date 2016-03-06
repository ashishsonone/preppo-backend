'use strict'

var express = require('express');
var passwordHash = require('password-hash');

var authApi = require('./auth');
var authApiHelper = require('./auth_help');
var UserModel = require('../../models/user').model;

var errUtils = require('../../utils/error');

var router = express.Router();

//start ENDPOINT /v1/app/users

/*fetch logged-in user info. needs session token
*/
router.get('/me', authApiHelper.loginRequiredMiddleware, function(req, res){
  var id = req.session.userId; //it is the mongoose object id for the user
  var promise = UserModel
    .findById(id, {password : false, __v : false})
    .exec();

  promise = promise.then(
    function(user){
      if(!user){
        //username doesnot exist, throw error
        throw res.json(errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "requested resource not found", null, 404));
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
        return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to get /me", err, 500));  
      }
    }
  );
});

/*Update user info. needs session token
  post params:
    name (optional)
    photo (optional)
    email (optional)
    location (optional)
    language (optional)
    password (optional)

  Can not update 'password' (for phone login : forgot password case)
  Use PUT /me/password instead
*/
router.put('/me', authApiHelper.loginRequiredMiddleware, function(req, res){
  var id = req.session.userId; //it is the mongoose object id for the user

  var changes = {};
  if(req.body.name){
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
  }

  var promise = UserModel.findOneAndUpdate(
    {_id : id },
    {'$set' : changes},
    {new : true}, //return modified version of document
    function(err, result){
      if(err){
        res.status(500);
        res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to update self user", err, 500));
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

/*delete a given user
  ENDPOINT EXISTS ONLY if server's process.env.ENV is 'local' or 'dev'
  REQUIRED query param 'password'
*/
if(process.env.ENV === 'local' || process.env.ENV === 'dev'){
  router.get('/:username/delete', function(req, res){
    var p = req.query.password;
    if(p !== "kitneaadmithe"){
      return res.json({message : "wrong password"});
    }

    UserModel.remove(
      {username : req.params.username}, 
      function(err, result){
        if(err){
          res.status(500);
          res.json(err);
        }
        else{
          res.json(result);
        }
      }
    );
  });
}
module.exports.router = router;