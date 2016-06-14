'use strict'

var express = require('express');
var RSVP = require('rsvp');
var shortid = require('shortid');

var LiveTokenModel = require('../../models/live.token').model;

var errUtils = require('../../utils/error');

//start ENDPOINT /v1/live/auth

/* generates a LiveToken.
  Returns a promise with token string
*/
function generateLiveToken(role, username){
  console.log("generateLiveToken : r=" + role + "| u=" + username);
  var liveTokenEntity = new LiveTokenModel();

  var token = shortid.generate();
  console.log("generateLiveToken : token=" + token);

  liveTokenEntity._id = token;
  liveTokenEntity.role = role;
  liveTokenEntity.username = username;

  var promise = liveTokenEntity.save();
  promise = promise.then(function(savedEntity){
    return token;
  });

  return promise;
}

/*
  middleware function to find token in header('x-live-token') and set the 'req.session'
  Sets if all ok
    req.session.token
    req.session.username
    req.session.role
  Always goes next()
  Only If some unexpected error occurs, return UNKNOWN error
*/

function findTokenAndSetSessionMiddleware(req, res, next){
  var token = req.headers['x-live-token'];

  if(!token){
    console.log("findTokenAndSetSession : no x-live-token header");
    return next();
  }

  var promise = LiveTokenModel.findOneAndUpdate(
    {_id : token},
    {'$set' : {touch : true}}
  ).exec();

  promise = promise.then(function(liveTokenEntity){
    //token not found. Just do next() without setting req.session fields
    if(!liveTokenEntity){
      return next();
    }

    //valid token, set req.session fields
    req.session = {}; //initialize
    req.session.token = liveTokenEntity._id;
    req.session.username = liveTokenEntity.username;
    req.session.role = liveTokenEntity.role;

    return next();
  });

  promise.catch(function(err){
    //unknown error, return response
    res.status(500);
    return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to verify live token", err));
  });
}

/* middleware function to check if req.session.username is present
  if yes : do next()
  otherwise : respond with UNAUTHENTICATED error
*/
function loginRequiredMiddleware(req, res, next){
  if(req.session && req.session.username){
    return next();
  }

  res.status(401);
  return res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHENTICATED, "login is required to access this end point"));
}

module.exports = {
  generateLiveToken : generateLiveToken,
  findTokenAndSetSessionMiddleware : findTokenAndSetSessionMiddleware,
  loginRequiredMiddleware :  loginRequiredMiddleware,
};