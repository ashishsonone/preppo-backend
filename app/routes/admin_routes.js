'use strict';

var express = require('express');
var adminUserModel = require('../models/admin_user.js');
var router = express.Router();

router.get('/', function(req, res){
	res.json({
		message : "Welcome to admin api home page", 
		supported : [
			"GET /v1/admin/", 
			"POST /v1/admin/users", 
			"GET /v1/admin/users"
		]
	});
});

router.get('/users', function(req, res){
	var projection = { 
    	__v: false,
    	password: false,
	};

	var role = req.query.role;
	var limit = req.query.limit || 10; //default limit is 10
	var selection = {};
	if(role){
		selection.role = role;
	}
	//check if authorized (role=[admin, publisher])
	adminUserModel.
		find(selection).
		select(projection).
		limit(limit).
		exec(function(err, users){
			if(!err){
				res.json(users);
			}
			else{
				res.json(err);
			}
		});
});

router.post('/users', function(req, res){
	//check if authorized (role = [admin])
	var newUser = new adminUserModel();
	newUser.email = req.body.email;
	newUser.name = req.body.name;
	newUser.role = req.body.role;
	newUser.password = req.body.password;

	newUser.save(function(err, user){
		res.json(user);
	});
});

module.exports.adminRouter = router;