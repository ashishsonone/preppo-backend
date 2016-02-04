'use strict'

var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var errUtils = require('../utils/error');
var constants = require('../utils/constants');

var roles = constants.roles;

//start ENDPOINT /v1/admin/news/

router.get('/', function(req, res){
  res.json({message : "Not yet implemented"});
});

module.exports.router = router;