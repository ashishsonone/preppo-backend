'use strict'

var express = require('express');
var RSVP = require('rsvp');
var firebase = require('firebase');

var errUtils = require('../../utils/error');
var requestsHelp = require('./requests_help');
var RequestModel = require('../../models/live_request').model;

var firebaseConfig = require('../../../config/config').firebase;

var FIREBASE_BASE_URL = firebaseConfig.baseUrl;
var FIREBASE_SECRET = firebaseConfig.secret;

var rootRef = new Firebase(FIREBASE_BASE_URL);

//IMPORTANT admin-level access to the firebase database(all references)
rootRef.auth(FIREBASE_SECRET,function(error, result) {
  if (error) {
    console.log("Authentication Failed!", error);
  } else {
    console.log("Authenticated successfully with payload:", result.auth);
    console.log("Auth expires at:", new Date(result.expires * 1000));
  }
});

var rootChannelRef = rootRef.child('channels');
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
  var requestId = requestEntity.requestId;

  var details = {
    topic : requestEntity.details.topic
  };

  var requestMessage = {
    type : "request",
    ts : Firebase.ServerValue.TIMESTAMP,
    requestId : requestId,
    details : details //requestEntity.details
  };

  for(var i = 0; i < teacherList.length; i++){
    var teacher = teacherList[i];
    console.log(requestId + "|" + "sending request to " + teacher.username);
    rootChannelRef.child(teacher.username).push(requestMessage);
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
          rootChannelRef.child(teacher.username).push(denyMessage);
        }
      }

      console.log(requestId + "|" + "sending assign to teacher " + selectedTeacher);
      rootChannelRef.child(selectedTeacher).push(assignMessage);
      console.log(requestId + "|" + "sending assign to student " + studentUsername);
      rootChannelRef.child(studentUsername).push(assignMessage);

      //set current teaching session status to 'running'
      rootTeachingRef.child(requestId).child('status').set('running');
      rootTeacherProfile.child(selectedTeacher).child('status').set(requestId);
      rootStudentProfile.child(studentUsername).child('status').set(requestId);
      //#todo update requestEntity.teacher = the assigned teacher (nothing to do in 'else' case)
      //#todo set teachers/<username>/status = requestId
      //#todo set students/<username>/status = requestId
    }
    else{
      //send deny to all teachers as well the requesting student
      for(var i = 0; i < teacherList.length; i++){
        var teacher = teacherList[i];
        console.log(requestId + "|" + "sending deny to teacher " + teacher.username);
        rootChannelRef.child(teacher.username).push(denyMessage);
      }
      console.log(requestId + "|" + "sending deny to student " + studentUsername);
      rootChannelRef.child(studentUsername).push(denyMessage);
    }
  };

  console.log(requestId + "|" + "timer for 30 seconds");
  setTimeout(selectAppropriateTeacher, 30000); //30 seconds #tod make it a config variable
}

/*post a teaching request
*/
router.post('/', function(req, res){
  var studentUsername = req.body.username;
  var topic = req.body.topic;
  
  if(!(topic && studentUsername)){
    res.json({error : 401, message : "required fields : [username, topic]"});
    return;
  }

  var date = new Date().toISOString().slice(0, 10);
  var requestId = date + "/" + studentUsername + "_" + parseInt(new Date().getTime()/1000);
  var promise = requestsHelp.createRequest(requestId, studentUsername, {topic : topic});

  var requestEntity;
  promise = promise.then(function(r){
    requestEntity = r;
    console.log(requestId + "|" + "new request entity created %j", requestEntity);
    return requestsHelp.findFreeTeachers(topic);
  });

  promise = promise.then(function(teacherList){
    console.log(requestId + "|" + "found " + teacherList.length + " eligible teachers");
    if(teacherList.length === 0){
      res.json({
        success : false,
        message : "no eligible online teachers"
      });
      //requestEntity.teacher is already set to "none" so nothing else to do
    }
    else{
      res.json({
        status : true,
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
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to create your requests", err));
    }
  });
});

router.get('/', function(req, res){
  var findQuery = {};
  if(req.query.student){
    findQuery.student = req.query.student;
  }
  if(req.query.teacher){
    findQuery.teaching = req.query.teacher;
  }

  //#todo for debugging purposes only
  var promise = RequestModel
    .find(findQuery)
    .sort({
      createdAt : -1
    })
    .limit(10);

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

/*
  params:
    username
    #whoever calls terminate, it should terminate on both teacher and student
    #update request entity about termination
    #currently only teacher can call - think it over
*/
router.post('/terminate', function(req, res){
  console.log("terminate api request for %j", req.body);
  var username = req.body.username;

  if(!(username)){
    res.status(400);
    res.json({message : "params required [username]"});
    return;
  }

  var promise = requestsHelp.setTeacherFree(username);

  promise = promise.then(function(oldTeacher){
    if(!oldTeacher){
      throw {
        message : username + " not found"
      };
    }
    else{
      var requestId = oldTeacher.status;
      if(requestId !== "free"){
        console.log("terminate api request for " + username + " | was busy with " + requestId);
        rootTeachingRef.child(requestId).child('status').set('terminated');
        rootTeacherProfile.child(username).child('status').set('free');
        //free the student also
      }
      res.json({message : "success | old status=" + requestId});
    }
  });

  promise = promise.catch(function(err){
    res.status(500);
    res.json(err);
  });

});

module.exports.router = router;
module.exports.rootChannelRef = rootChannelRef;