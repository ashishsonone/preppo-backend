'use strict'

var express = require('express');
var RSVP = require('rsvp');
var firebase = require('firebase');
var shortid = require('shortid');

var errUtils = require('../../utils/error');

var firebaseConfig = require('../../../config/config').firebase;

var FIREBASE_BASE_URL = firebaseConfig.baseUrl;
var FIREBASE_SECRET = firebaseConfig.secret;

var rootRef = new Firebase(FIREBASE_BASE_URL);

//IMPORTANT admin-level access to the firebase database(all references)
rootRef.authWithCustomToken(FIREBASE_SECRET,function(error, result) {
  if (error) {
    console.log("Authentication Failed!", error);
  } else {
    console.log("Authenticated successfully with payload:", result.auth);
    console.log("Auth expires at:", new Date(result.expires * 1000));
  }
});

var rootTeacherChannelRef = rootRef.child('teacher-channels');
var rootStudentChannelRef = rootRef.child('student-channels');
var rootRequestRef = rootRef.child('requests');
var rootTeachingRef = rootRef.child('teaching');

var rootTeacherProfile = rootRef.child('teachers');
var rootStudentProfile = rootRef.child('students');

//START PATH /v1/live/requests/
var router = express.Router();

/*post a teaching request
*/
router.post('/', function(req, res){
  res.json({success : true});
});

module.exports.router = router;