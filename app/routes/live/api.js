'use strict'

var express = require('express');

var helpApi = require('./help');
var reqestsApi = require('./requests');
var teachersApi = require('./teachers');

module.exports.router = function(){
  var router = express.Router();
  //start ENDPOINT /v1/app/

  //api help pages
  router.use('/', helpApi.router);

  //auth api (login, signup, gen otp)
  //Note: /auth/logout endpoint is after token verification middleware for obvious reasons
  //router.use('/auth', authApi.router);

  //token verification middleware
  //router.use('/', authApiHelper.findTokenAndSetSession);

  //logout endpoint
  //router.get('/auth/logout', authApiHelper.logout);

  router.use('/requests', reqestsApi.router);

  router.use('/teachers', teachersApi.router);
  return router;
}