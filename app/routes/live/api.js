'use strict'

var express = require('express');

var helpApi = require('./help');

var doubtsApi = require('./doubts');

var authApi = require('./auth');

var teachersApi = require('./teachers');
var studentsApi = require('./students');

module.exports.router = function(){
  var router = express.Router();
  //start ENDPOINT /v1/live/

  //api help pages
  router.use('/', helpApi.router);

  //auth api (gen otp)
  router.use('/auth', authApi.router);
  //Note: /auth/logout endpoint is after token verification middleware for obvious reasons

  //token verification middleware
  router.use('/', authApi.findTokenAndSetSessionMiddleware);

  //logout endpoint
  //router.get('/auth/logout', authApiHelper.logout);

  router.use('/doubts', doubtsApi.router);

  router.use('/teachers', teachersApi.router);

  router.use('/students', studentsApi.router);

  return router;
}