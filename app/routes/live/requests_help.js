'use strict'
var TeacherModel = require('../../models/live_teacher').model;
var RequestModel = require('../../models/live_request').model;

function findFreeTeachers(topic){
  //decide a sort criteria
  var promise = TeacherModel.find({
    topics : topic,
    online : {$ne : []},
    status : ""
  }).limit(10).exec();

  console.log("finding free teachers for topic=" + topic);
  
  return promise;
}

function createRequest(requestId, student, details){
  var request = new RequestModel();
  request.requestId = requestId;
  request.student = student;
  request.details = details;

  return request.save();
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
  setTeacherFree : setTeacherFree
};
