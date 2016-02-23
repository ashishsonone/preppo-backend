'use strict'

var express = require('express');
var mongoose = require('mongoose');

var authApi = require('./auth');
var UserModel = require('../../models/user').model;

var router = express.Router();

//start ENDPOINT /v1/app/users

router.get('/me', authApi.loginRequiredMiddleware, function(req, res){
  var _id = req.session.userId; //it is the mongoose object id for the user
  var promise = UserModel
    .findById(_id, {password : false, __v : false})
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
        return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to get /me", err));  
      }
    }
  );
});

module.exports.router = router;