'use strict'

var express = require('express');
var mongoose = require('mongoose');

var helpApi = require('./help');
var authApi = require('./auth');
var authApiHelper = require('./auth_help');
var usersApi = require('./users');

module.exports.router = function(){
  var router = express.Router();
  //start ENDPOINT /v1/app/

  //api help pages
  router.use('/', helpApi.router);

  //auth api (login, signup, gen otp)
  //Note: /auth/logout endpoint is after token verification middleware for obvious reasons
  router.use('/auth', authApi.router);

  //token verification middleware
  router.use('/', authApiHelper.findTokenAndSetSession);

  //logout endpoint
  router.get('/auth/logout', authApiHelper.logout);

  router.use('/users', usersApi.router);

  //other routes
  router.get('/news', function(req, res){
    if(!(req.session && req.session.username)){
      res.status(401);
      return res.json({message : "unauthenticated"});
    }

    res.json({message : "Not yet implemented"});
  });

  return router;
}