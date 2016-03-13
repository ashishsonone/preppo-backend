'use strict'

var express = require('express');

var helpApi = require('./help');

var authApi = require('./auth');
var authApiHelper = require('./auth_help');

var newsApi = require('./news');
var newsQuizApi = require('./news_quiz');
var statsNewsQuizApi = require('./stats_news_quiz');
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
  router.use('/news/quiz', newsQuizApi.router);
  router.use('/news', newsApi.router);
  return router;
}