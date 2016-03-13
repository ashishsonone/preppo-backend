'use strict'

var express = require('express');

var errUtils = require('../../utils/error');
var AdminUser = require('../../models/admin_user');
var enumStatus = require('../../utils/constants').enumStatus;

var NewsMonthlyDigestModel = require('../../models/news_monthly_digest').model;

var enumRoles = AdminUser.enumRoles;

var router = express.Router();
//start ENDPOINT /v1/admin/news/monthlydigest

/*
  Create a monthly digest entry
  params:
    name : string,
    publishDate : date string YYYY-MM-DD
    url : for the digest blog page
*/
router.post('/', function(req, res){
  if([enumRoles.ADMIN, enumRoles.EDITOR].indexOf(req.session.role) < 0){
    res.status(403);
    res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHORIZED, "you are not authorized - admin/editor only"));
    return;
  }

  if(!(req.body.name && req.body.publishDate && req.body.url )){
    res.status(400);
    res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [name, publishDate, url]"));
    return;
  }

  var newDigest = new NewsMonthlyDigestModel();
  newDigest.name = req.body.name;
  newDigest.publishDate = req.body.publishDate;
  newDigest.url = req.body.url;

  var promise = newDigest.save();
  promise = promise.then(function(digest){
    res.json(digest);
  });

  promise.catch(function(err){
    res.status(500);
    res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "could not save digest", err, 500));
  });
});

/*
  Return all monthly digest sorted by publishDate
*/
router.get('/', function(req, res){
  if([enumRoles.ADMIN, enumRoles.EDITOR].indexOf(req.session.role) < 0){
    res.status(403);
    res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHORIZED, "you are not authorized - admin/editor only"));
    return;
  }

  var promise = NewsMonthlyDigestModel
    .find({})
    .sort({
      publishDate : -1
    })
    .limit(50)
    .exec();

  promise = promise.then(function(digestList){
    res.json(digestList);
  });

  promise.catch(function(err){
    res.status(500);
    res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "could not fetch digest", err, 500));
  });
});

/*
  Delete monthly digest item
*/
router.delete('/:id', function(req, res){
  if([enumRoles.ADMIN, enumRoles.EDITOR].indexOf(req.session.role) < 0){
    res.status(403);
    res.json(errUtils.ErrorObject(errUtils.errors.UNAUTHORIZED, "you are not authorized - admin/editor only"));
    return;
  }

  var id = req.params.id;

  var promise = NewsMonthlyDigestModel
    .remove({
      _id : id
    })
    .exec();

  promise = promise.then(function(result){
    res.json(result);
  });

  promise.catch(function(err){
    res.status(500);
    res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "could not delete digest", err, 500));
  });
});

module.exports.router = router;