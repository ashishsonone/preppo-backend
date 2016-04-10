'use strict'

var express = require('express');

var AdminUser = require('../../models/admin_user');
var mailer = require('../../utils/mailer');
var errUtils = require('../../utils/error');

var usersApi = require('./users');
var newsApi = require('./news');
var newsQuizApi = require('./news_quiz');
var newsQuizQuestionApi = require('./news_quiz_question');

var newsMonthlyDigestApi = require('./news_monthly_digest');
var notificationApi = require('./notification');

var helpApi = require('./help');
var extraApi = require('./extra');

var appUsersApi = require('./app_users');

var AdminUserModel = AdminUser.model;

module.exports.router = function(sessionMiddleWare){
  var router = express.Router();
  //start ENDPOINT /v1/admin/

  //api help pages
  router.use('/', helpApi.router);

  //extra api
  router.use('/extra', extraApi.router);

  //session middleware
  router.use('/', sessionMiddleWare);

  //admin api starts here
  router.post('/login', function(req, res){
    var email = req.body.email;
    var password = req.body.password;

    //console.log("/login post header:%j \nbody:%j \nquery:%j", req.headers, req.body, req.query);
    if(!email || !password){
      res.status(400);
      res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required post parameters : 'email', 'password'"));
      return;
    }
    else{
      AdminUserModel.findOne(
        {email : email}, 
        function(err, user){
          if(err){
            console.log("%j", err);
            res.status(500);
            res.json(errUtils.ErrorObject(errUtils.errors.DB_ERROR, "unable to find user", err));
            return;
          }
          if(!user){
            //email doesnot exist
            res.status(401);
            res.json(errUtils.ErrorObject(errUtils.errors.INVALID_CREDENTIALS, "user not found in db"));
            return;
          }
          else if(user.password != password){
            //password doesnot match
            res.status(401);
            res.json(errUtils.ErrorObject(errUtils.errors.INVALID_CREDENTIALS, "wrong password"));
            return;
          }
          else{
            //set session
            req.session.email = user.email;
            req.session.role = user.role;
            req.session._id = user._id;
            //all ok
            var newUser = {};
            newUser.email = user.email;
            newUser._id = user._id;
            newUser.role = user.role;
            newUser.name = user.name;
            newUser.createdAt = user.createdAt;
            newUser.updatedAt = user.updatedAt;
            res.json(newUser);
            return;
          }
        }
      );
    }
  });

  router.get('/logout', function(req, res){
    if(req.session.email){
      req.session.destroy(function(err){
        if(err){
          res.status(500);
          res.json(errUtils.ErrorObject(errUtils.errors.DB_ERROR, "unable to destroy session", err));
          return;
        }
        else{
          res.clearCookie('connect.sid');
          res.json({ message : "log out success"});
          return;
        }
      });
    }
    else{
      res.clearCookie('connect.sid');
      res.json({ message : "already logged out"});
      return;
    }
  });

  //middleware to check if logged in i.e session exists
  router.use(function(req, res, next){
    if(!req.session.email){
      console.log("authentication middleware : no session found");
      res.status(401);
      res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHENTICATED, "login is required to access this end point"));
      return;
    }
    else{
      next();
      return;
    }
  });

  // users administration
  router.use('/users', usersApi.router);

  // news quiz item administration, 
  // should come before /news to not confuse with '/news/<news_id>' endpoint
  router.use('/news/quiz', newsQuizApi.router);

  // news quiz item administration, 
  // should come before /news to not confuse with '/news/<news_id>' endpoint
  router.use('/news/quizquestion', newsQuizQuestionApi.router);

  // news monthly digest administration
  // should come before /news to not confuse with '/news/<news_id>' endpoint
  router.use('/news/monthlydigest', newsMonthlyDigestApi.router);

  // news item administration
  router.use('/news', newsApi.router);

  // send notification
  router.use('/notifications', notificationApi.router);

  // appusers management
  router.use('/appusers', appUsersApi.router);

  return router;
};