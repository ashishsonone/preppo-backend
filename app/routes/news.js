'use strict'

var express = require('express');
var mongoose = require('mongoose');
var errUtils = require('../utils/error');
var AdminUser = require('../models/admin_user');
var News = require('../models/news');

var NewsModel = News.model;

var enumRoles = AdminUser.enumRoles;
var enumNewsStatus = News.enumStatus;

var router = express.Router();
//start ENDPOINT /v1/admin/news/

/*get all news items
  parameters: 
    status (required)
    limit (optional)
    gt=<date>(optional)
    lt=<date>(optional)
*/
router.get('/', function(req, res){
  if([enumRoles.ADMIN, enumRoles.EDITOR].indexOf(req.session.role) < 0){
    res.status(403);
    res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHORIZED, "you are not authorized - admin/editor only"));
    return;
  }

  if(!req.query.status){
    res.status(400);
    res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : 'status'"));
    return;
  }

  res.json({message : "Not yet implemented"});
});

module.exports.router = router;