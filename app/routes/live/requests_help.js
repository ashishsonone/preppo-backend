'use strict'
var TeacherModel = require('../../models/live.teacher').model;
var RequestModel = require('../../models/live.request').model;

function findFreeTeachers(subject, topic){
  //check if subject or topic is not null and then query accordingly
  var query = {
    online : {$ne : []},
    status : ""
  };
  
  if(subject){
    query.subjects = subject;
  }

  if(topic){
    query.topics = topic;
  }

  //decide a sort criteria
  var promise = TeacherModel.find(query).limit(10).exec();

  console.log("finding free teachers for subject=" + subject + ", topic=" + topic);
  return promise;
}

function createRequest(requestDate, requestCode, studentUsername, details){
  var request = new RequestModel();
  request.requestDate = requestDate;
  request.requestCode = requestCode;
  request.student = studentUsername;
  request.details = details;

  return request.save();
}

function updateRequestEntity(requestId, update){
  var requestCode = requestId.split('/')[1];
  var promise = RequestModel.findOneAndUpdate({
    requestCode : requestCode
  },
  {
    '$set' : update
  })
  .exec();
  return promise;
}

function setTeacherBusy(username, requestId){
  console.log("setting teacher busy " + username + "| requestId=" + requestId);
  var promise = TeacherModel.findOneAndUpdate({
    username : username,
    status : ""
  },
  {
    '$set' : {status : requestId}
  },
  {
    new : true
  })
  .exec();
  return promise;
}

function setStudentBusy(username, requestId){
  console.log("setting student busy " + username + "| requestId=" + requestId);
  var promise = StudentModel.findOneAndUpdate({
    username : username,
  },
  {
    '$set' : {status : requestId}
  },
  {
    new : true
  })
  .exec();
  return promise;
}


function setTeacherFree(username){
  var promise = TeacherModel.findOneAndUpdate({
    username : username  
  },
  {
    '$set' : {status : ""}
  },
  {
    new : false //note we want old entity
  })
  .exec();
  return promise;
}

module.exports = {
  findFreeTeachers : findFreeTeachers,
  createRequest : createRequest,
  setTeacherBusy : setTeacherBusy,
  setTeacherFree : setTeacherFree,
  updateRequestEntity : updateRequestEntity,
  setStudentBusy : setStudentBusy
};