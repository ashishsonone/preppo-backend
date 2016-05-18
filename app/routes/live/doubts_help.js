'use strict'
var DoubtModel = require('../../models/live.doubt').model;
var TeacherModel = require('../../models/live.teacher').model;

var errUtils = require('../../utils/error');

function createDoubt(doubtId, studentUsername, details){
  var doubt = new DoubtModel();
  doubt.doubtId = doubtId;
  doubt.student = studentUsername;
  doubt.details = details;

  return doubt.save();
}

function findDoubtEntity(doubtId){
  var promise = DoubtModel.findOne({
    doubtId : doubtId
  }).exec();

  promise = promise.then(function(doubtEntity){
    if(doubtEntity == null){
      throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "No such doubt entity exists " + doubtId, null, 404);
      return;
    }
    return doubtEntity;
  });

  return promise;
}

function updateDoubtEntity(doubtId, update, wantNew){
  console.log("updateDoubtEntity | enter doubtId=" + doubtId);
  if(wantNew !== false){
    wantNew = true;
  }
  
  console.log("updating doubt " + doubtId + "| update=%j", update);

  var promise = DoubtModel.findOneAndUpdate({
    doubtId : doubtId
  },
  {
    '$set' : update
  },
  {
    new : wantNew
  })
  .exec();

  promise = promise.then(function(doubtEntity){
    if(doubtEntity == null){
      throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "No such doubt exists " + doubtId, null, 404);
      return;
    }
    return doubtEntity;
  });

  return promise;
}

/*
  returns list of teachers who are currently online and active
*/
function findActiveOnlineTeachers(){
  var promise = TeacherModel.aggregate([
    {$match : {online : {$ne : []}, status : "active"}}, 
    {$project : {username : true, doubtQueueSize : {$size : "$doubtQueue"}}}, 
    {$sort : {doubtQueueSize : 1}}
    ],
    function(err, result){
      console.log(err + " | " + result);
    });

  return promise;
}

function assignDoubt(doubtId, teacherUsername){
  console.log("assignDoubt | doubtId=" + doubtId + "|teacher=" + teacherUsername);
  var promise = TeacherModel.findOneAndUpdate({
    username : teacherUsername,
  },
  {
    '$addToSet' : {doubtQueue : doubtId}
  },
  {
    new : true
  })
  .exec();
  return promise;
}

function unAssignDoubt(doubtId, teacherUsername){
  console.log("unAssignDoubt | doubtId=" + doubtId + "|teacher=" + teacherUsername);
  var promise = TeacherModel.findOneAndUpdate({
    username : teacherUsername,
  },
  {
    '$pull' : {doubtQueue : doubtId}
  },
  {
    new : true
  })
  .exec();
  return promise;
}


module.exports = {
  createDoubt : createDoubt,
  findDoubtEntity : findDoubtEntity,
  updateDoubtEntity : updateDoubtEntity,

  findActiveOnlineTeachers : findActiveOnlineTeachers,
  assignDoubt : assignDoubt,
  unAssignDoubt : unAssignDoubt
};

