'use strict'

var express = require('express');

var helpApi = require('./help');
var reqestsApi = require('./requests');
var teachersApi = require('./teachers');
var studentsApi = require('./students');
var authApi = require('./auth');

module.exports.router = function(){
  var router = express.Router();
  //start ENDPOINT /v1/live/

  //api help pages
  router.use('/', helpApi.router);

  //auth api (gen otp)
  router.use('/auth', authApi.router);

  //Note: /auth/logout endpoint is after token verification middleware for obvious reasons
  //router.use('/auth', authApi.router);

  //token verification middleware
  //router.use('/', authApiHelper.findTokenAndSetSession);

  //logout endpoint
  //router.get('/auth/logout', authApiHelper.logout);

  router.use('/requests', reqestsApi.router);

  router.use('/teachers', teachersApi.router);

  router.use('/students', studentsApi.router);

  return router;
}