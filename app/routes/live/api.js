'use strict'

var express = require('express');

var helpApi = require('./help');

var doubtsApi = require('./doubts');

var teachersApi = require('./teachers');

module.exports.router = function(){
  var router = express.Router();
  //start ENDPOINT /v1/live/

  //api help pages
  router.use('/', helpApi.router);

  router.use('/doubts', doubtsApi.router);

  router.use('/teachers', teachersApi.router);

  return router;
}