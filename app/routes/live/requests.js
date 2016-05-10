'use strict'

var express = require('express');
var RSVP = require('rsvp');
var firebase = require('firebase');
var shortid = require('shortid');

var errUtils = require('../../utils/error');
var requestsHelp = require('./requests_help');
var RequestModel = require('../../models/live.request').model;

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

function selectBestTeacher(requestEntity, teacherList){
  //send request details to all teachers
  //wait for responses for 30-40 secs (using setTimeout)
  //pick the best teacher
  //notify all teachers and students
  var requestId = requestEntity.requestDate + '/' + requestEntity.requestCode;

  var details = {};
  if(requestEntity.details.subject){
    details.subject = requestEntity.details.subject;
  }
  if(requestEntity.details.topic){
    details.topic = requestEntity.details.topic;
  }
  if(requestEntity.details.description){
    details.description = requestEntity.details.description;
  }
  if(requestEntity.details.image){
    details.image = requestEntity.details.image;
  }

  var requestMessage = {
    type : "request",
    ts : Firebase.ServerValue.TIMESTAMP,
    requestId : requestId,
    details : details //requestEntity.details
  };

  for(var i = 0; i < teacherList.length; i++){
    var teacher = teacherList[i];
    console.log(requestId + "|" + "sending request to " + teacher.username);
    rootTeacherChannelRef.child(teacher.username).push(requestMessage);
  }

  var responseList = [];
  var responseReceiver = function(snapshot){
    var response = snapshot.val();
    console.log(requestId + "|" + "response received username=" + response.username + ", action=" + response.action);
    if(response.action === "accept"){
      responseList.push(response.username);
    }
  }

  //listen on request channel
  console.log(requestId + "|" + "waiting for responses");
  rootRequestRef.child(requestId).on('child_added', responseReceiver);

  var selectAppropriateTeacher = function(){
    rootRequestRef.child(requestId).off('child_added', responseReceiver); //stop listening for responses

    console.log(requestId + "|" + " selecting out of " + responseList.length);

    if(responseList.length === 0){
      return notifyUsers(null);
    }

    var promise = requestsHelp.setTeacherBusy(responseList[0], requestId);
    console.log(requestId + "|" + " trying out teacher [0] " + responseList[0]);
    promise = promise.then(function(teacher){
      if(teacher === null && responseList[1]){
        console.log(requestId + "|" + " trying out teacher [1] " + responseList[1]);
        return requestsHelp.setTeacherBusy(responseList[1], requestId);
      }
      else{
        return teacher;
      }
    });

    promise = promise.then(function(teacher){
      if(teacher === null && responseList[2]){
        console.log(requestId + "|" + " trying out teacher [2] " + responseList[2]);
        return requestsHelp.setTeacherBusy(responseList[2], requestId);
      }
      else{
        return teacher;
      }
    });

    promise = promise.then(function(teacher){
      if(teacher === null){
        console.log(requestId + "|" + " tried all (max 3) teachers - all busy");
        notifyUsers(null);
      }
      else{
        notifyUsers(teacher.username);
      }
    });

    promise = promise.catch(function(err){
      console.log(requestId + "|" + "error %j", err);
      notifyUsers(null); //#todo when could this happen and handle it properly
    });
  };

  var notifyUsers = function(selectedTeacher){
    var studentUsername = requestEntity.student;
    var denyMessage = {
      type : "deny",
      ts : Firebase.ServerValue.TIMESTAMP,
      requestId : requestId,
    };

    var assignMessage = {
      type : "assign",
      ts : Firebase.ServerValue.TIMESTAMP,
      requestId : requestId,
      teacher : selectedTeacher,
      student : studentUsername
    }

    if(selectedTeacher){
      console.log(requestId + "|" + "selected teacher " + selectedTeacher + " out of " + responseList.length + " ready teachers");

      //send reject msg to all teachers except selected teacher
      for(var i = 0; i < teacherList.length; i++){
        var teacher = teacherList[i];
        if(teacher.username !== selectedTeacher){
          console.log(requestId + "|" + "sending deny to teacher " + teacher.username);
          rootTeacherChannelRef.child(teacher.username).push(denyMessage);
        }
      }

      console.log(requestId + "|" + "sending assign to teacher " + selectedTeacher);
      rootTeacherChannelRef.child(selectedTeacher).push(assignMessage);
      console.log(requestId + "|" + "sending assign to student " + studentUsername);
      rootStudentChannelRef.child(studentUsername).push(assignMessage);

      //set current teaching session status to 'running'
      rootTeachingRef.child(requestId).child('status').set("assigned");
      rootTeacherProfile.child(selectedTeacher).child('status').set(requestId);
      rootStudentProfile.child(studentUsername).child('status').set(requestId);

      //teacher entity already set busy
      //#todo requestsHelp.setStudentBusy(studentUsername, requestId);
      requestsHelp.updateRequestEntity(requestId, {status : "assigned", teacher : selectedTeacher});
      requestsHelp.updateStudentEntity({username : studentUsername}, {status : requestId});
    }
    else{
      //send deny to all teachers as well the requesting student
      for(var i = 0; i < teacherList.length; i++){
        var teacher = teacherList[i];
        console.log(requestId + "|" + "sending deny to teacher " + teacher.username);
        rootTeacherChannelRef.child(teacher.username).push(denyMessage);
      }
      console.log(requestId + "|" + "sending deny to student " + studentUsername);
      rootStudentChannelRef.child(studentUsername).push(denyMessage);

      requestsHelp.updateRequestEntity(requestId, {status : "unassigned"});
    }
  };

  console.log(requestId + "|" + "timer for 30 seconds");
  setTimeout(selectAppropriateTeacher, 30000); //30 seconds #tod make it a config variable
}

/*post a teaching request
*/
router.post('/', function(req, res){
  var studentUsername = req.body.username;
  var subject = req.body.subject;
  var topic = req.body.topic;
  var description = req.body.description;
  var image = req.body.image;

  if(!(studentUsername)){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [username]"));
  }

  var requestEntity;
  var details = {
    subject : subject,
    topic : topic,
    description : description,
    image : image
  };

  var requestDate = new Date().toISOString().slice(0, 10);
  var requestCode = shortid.generate();

  var requestId = requestDate + '/' + requestCode;

  var promise = requestsHelp.findStudentEntity(studentUsername);
  promise = promise.then(function(studentEntity){
    console.log("studentEntity.status=" + studentEntity.status);
    if(studentEntity.status && studentEntity.status !== ""){
      throw errUtils.ErrorObject(errUtils.errors.BUSY, "already busy with requestId=" + studentEntity.status, null, 400);
    }

    return requestsHelp.createRequest(requestDate, requestCode, studentUsername, details);
  });

  promise = promise.then(function(r){
    requestEntity = r;
    console.log(requestId + "|" + "new request entity created %j", requestEntity);
    return requestsHelp.findFreeTeachers(subject, topic);
  });

  promise = promise.then(function(teacherList){
    console.log(requestId + "|" + "found " + teacherList.length + " eligible teachers");
    if(teacherList.length === 0){
      res.json({
        success : false,
        message : "no eligible online teachers"
      });
      requestsHelp.updateRequestEntity(requestId, {status : "unassigned"});
    }
    else{
      res.json({
        success : true,
        requestId : requestId,
        message : "wait for 60 seconds"
      });

      selectBestTeacher(requestEntity, teacherList);
    }
  });

  promise.catch(function(err){
    //error caught and set earlier
    if(err.resStatus){
      res.status(err.resStatus);
      return res.json(err);
    }
    else{
      //uncaught error
      res.status(500);
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to create your request", err));
    }
  });
});

router.get('/', function(req, res){
  var findQuery = {};
  if(req.query.student){
    findQuery.student = req.query.student;
  }
  if(req.query.teacher){
    findQuery.teacher = req.query.teacher;
  }

  //#todo for debugging purposes only
  var promise = RequestModel
    .find(findQuery)
    .sort({
      createdAt : -1
    })
    .limit(10)
    .exec();

  promise = promise.then(function(requestList){
    return res.json(requestList);
  });

  promise.catch(function(err){
    //error caught and set earlier
    if(err.resStatus){
      res.status(err.resStatus);
      return res.json(err);
    }
    else{
      //uncaught error
      res.status(500);
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to fetch requests", err));
    }
  });
});

router.get('/:requestDate/:requestCode', function(req, res){
  var findQuery = {};

  //#todo for debugging purposes only
  var promise = RequestModel
    .findOne({
      requestCode : req.params.requestCode
    })
    .exec();

  promise = promise.then(function(requestEntity){
    if(!requestEntity){
      throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "No such request exists", null, 404);
    }
    return res.json(requestEntity);
  });

  promise.catch(function(err){
    //error caught and set earlier
    if(err.resStatus){
      res.status(err.resStatus);
      return res.json(err);
    }
    else{
      //uncaught error
      res.status(500);
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to fetch requests", err));
    }
  });
});

/*
  start the teaching session
  params required:
    username
    requestId
    role - 'teacher' or 'student'

  returns:
    updated Request entity
*/
router.post('/start', function(req, res){
  var username = req.body.username;
  var requestId = req.body.requestId;
  var role = req.body.role;

  if(!(username && requestId && role)){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "params required [username, requestId, role]"));
  }

  var updateTeachingChannelStatus = false;
  var promise = requestsHelp.findRequestEntity(requestId);
  promise = promise.then(function(r){
    if(r.status === "assigned"){
      //only if current status is assigned, update the request entity's sessionStartTime
      updateTeachingChannelStatus = true;
      return requestsHelp.updateRequestEntity(requestId, {sessionStartTime : new Date(), status : "started"});
    }
    else{
      if(r.status === "started"){
        updateTeachingChannelStatus = true; //overwriting for robustness
      }
      return r;
    }
  });


  promise = promise.then(function(requestEntity){
    if(updateTeachingChannelStatus){
      rootTeachingRef.child(requestId).child('status').set('started');
    }
    res.json(requestEntity);
  });

  promise.catch(function(err){
    //error caught and set earlier
    if(err.resStatus){
      res.status(err.resStatus);
      return res.json(err);
    }
    else{
      //uncaught error
      res.status(500);
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to start teaching request", err));
    }
  });
});

/* update Request entity's sessionDuration(only teacher can call this)
  params:
    username
    requestId
    sessionDuration - number (seconds)
  returns:
    updated Request entity
*/
router.post('/update', function(req, res){
  var username = req.body.username;
  var requestId = req.body.requestId;
  var sessionDuration = req.body.sessionDuration;

  if(!(username && requestId && (sessionDuration != null))){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "params required [username, requestId, sessionDuration]"));
  }

  var promise = requestsHelp.findRequestEntity(requestId);
  promise = promise.then(function(r){
    if(r.status === "started"){
      //only if current status is started, can the sessionDuration be updated
      return requestsHelp.updateRequestEntity(requestId, {sessionDuration : sessionDuration});
    }
    else{
      return r;
    }
  });

  promise = promise.then(function(requestEntity){
    res.json(requestEntity);
  });

  promise.catch(function(err){
    //error caught and set earlier
    if(err.resStatus){
      res.status(err.resStatus);
      return res.json(err);
    }
    else{
      //uncaught error
      res.status(500);
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to update the request", err));
    }
  });
});

/*
  end the teaching session
  params required:
    username
    requestId
    role - 'teacher' or 'student'
  returns:
    updated Request entity
*/
router.post('/end', function(req, res){
  var username = req.body.username;
  var requestId = req.body.requestId;
  var role = req.body.role;

  console.log("end api request for %j", req.body);

  if(!(username && requestId && role)){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "params required [username, requestId, role]"));
  }


  var updateTeachingChannelStatus = false;
  var promise = requestsHelp.findRequestEntity(requestId);
  promise = promise.then(function(r){
    if(r.status === "assigned" || r.status === "started"){
      //only if current status is assigned or started, update the request entity's sessionStartTime
      console.log("end api request : setting sessionEndTime");
      updateTeachingChannelStatus = true;
      return requestsHelp.updateRequestEntity(requestId, {sessionEndTime : new Date(), status : "ended"});
    }
    else{
      console.log("end api request : request no longer in 'assigned' or 'started' status");
      if(r.status === "ended"){
        updateTeachingChannelStatus = true; //overwriting for robustness
      }
      return r;
    }
  });

  var requestEntity;
  var studentUsername;
  var teacherUsername;

  promise = promise.then(function(r){
    requestEntity = r;
    rootTeachingRef.child(requestId).child('status').set('ended'); //firebase request status
    
    //free student & teacher
    studentUsername = requestEntity.student;
    teacherUsername = requestEntity.teacher;

    return requestsHelp.updateStudentEntity({username : studentUsername, status : requestId}, {status : ""}, false);
  });

  promise = promise.then(function(oldStudentEntity){
    if(oldStudentEntity){
      console.log("end api request student " + studentUsername + " was busy with=" + oldStudentEntity.status);
      rootStudentProfile.child(studentUsername).child('status').set(''); //firebase student status
    }
    else{
      console.log("end api request student : student not busy with this request");
    }

    if(teacherUsername && teacherUsername !== ""){
      return requestsHelp.updateTeacherEntity({username : teacherUsername, status : requestId}, {status : ""}, false);
    }

    //no teacher involved, just return null
    return null;
  });

  promise = promise.then(function(oldTeacherEntity){
    if(oldTeacherEntity){
      console.log("end api request teacher " + teacherUsername + " was busy with " + oldTeacherEntity.status);
      rootTeacherProfile.child(teacherUsername).child('status').set(''); //firebase teacher status
    }
    else{
      console.log("end api request teacher : either no teacher assinged or teacher no longer busy with this request");
    }

    res.json(requestEntity);
  });

  promise.catch(function(err){
    //error caught and set earlier
    if(err.resStatus){
      res.status(err.resStatus);
      return res.json(err);
    }
    else{
      //uncaught error
      res.status(500);
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to end teaching request", err));
    }
  });

});

module.exports.router = router;