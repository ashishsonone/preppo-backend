'use strict'
var TeacherModel = require('../../models/live.teacher').model;
var RequestModel = require('../../models/live.request').model;
var StudentModel = require('../../models/live.student').model;

var errUtils = require('../../utils/error');

//=========== requests
function createRequest(requestDate, requestCode, studentUsername, details){
  var request = new RequestModel();
  request.requestDate = requestDate;
  request.requestCode = requestCode;
  request.student = studentUsername;
  request.details = details;

  return request.save();
}

function updateRequestEntity(requestId, update, wantNew){
  if(wantNew !== false){
    wantNew = true;
  }
  
  console.log("updating request " + requestId + "| update=%j", update);

  var requestCode = requestId.split('/')[1];
  var promise = RequestModel.findOneAndUpdate({
    requestCode : requestCode
  },
  {
    '$set' : update
  },
  {
    new : wantNew
  })
  .exec();

  promise = promise.then(function(requestEntity){
    if(requestEntity == null){
      throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "No such request exists " + requestId, null, 404);
      return;
    }
    return requestEntity;
  });

  return promise;
}

function findRequestEntity(requestId){
  console.log("finding request " + requestId);
  var requestCode = requestId.split('/')[1];

  var promise = RequestModel.findOne({
    requestCode : requestCode
  })
  .exec();

  promise = promise.then(function(requestEntity){
    if(requestEntity == null){
      throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "No such request entity exists " + requestId, null, 404);
      return;
    }
    return requestEntity;
  });

  return promise;
}

//======== teachers
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

function updateTeacherEntity(findQuery, update, wantNew){
  if(wantNew !== false){
    wantNew = true;
  }

  console.log("updating teacher %j" + "| update=%j", findQuery, update);
  var promise = TeacherModel.findOneAndUpdate(findQuery,
  {
    '$set' : update
  },
  {
    new : false //note we want old entity
  })
  .exec();

  promise = promise.then(function(teacherEntity){
    console.log("updating teacher found = " + (teacherEntity != null));
    // if(teacherEntity == null){
    //   throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "No such teacher exists " + username, null, 404);
    //   return;
    // }
    return teacherEntity;
  });

  return promise;
}

function findTeacherEntity(username){
  var promise = TeacherModel.findOne({
    username : username
  })
  .exec();

  promise = promise.then(function(teacherEntity){
    if(teacherEntity == null){
      throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "No such teacher exists " + username, null, 404);
      return;
    }
    return teacherEntity;
  });

  return promise;
}

//====== students =========
function updateStudentEntity(findQuery, update, wantNew){
  if(wantNew !== false){
    wantNew = true;
  }
  
  console.log("updating student %j" + "| update=%j", findQuery, update);
  var promise = StudentModel.findOneAndUpdate(findQuery,
  {
    '$set' : update
  },
  {
    new : wantNew
  })
  .exec();

  promise = promise.then(function(studentEntity){
    console.log("updating teacher found = " + (studentEntity != null));
    // if(studentEntity == null){
    //   throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "No such student exists " + username, null, 404);
    //   return;
    // }
    return studentEntity;
  });

  return promise;
}

function findStudentEntity(username){
  var promise = StudentModel.findOne({
    username : username
  })
  .exec();

  promise = promise.then(function(studentEntity){
    if(studentEntity == null){
      throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "No such student exists " + username, null, 404);
      return;
    }
    return studentEntity;
  });
  return promise;
}

module.exports = {
  createRequest : createRequest,
  updateRequestEntity : updateRequestEntity,
  findRequestEntity : findRequestEntity,

  findFreeTeachers : findFreeTeachers,
  setTeacherBusy : setTeacherBusy,
  updateTeacherEntity : updateTeacherEntity,
  findTeacherEntity : findTeacherEntity,

  updateStudentEntity : updateStudentEntity,
  findStudentEntity : findStudentEntity,
};