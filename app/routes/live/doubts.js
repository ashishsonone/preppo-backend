'use strict'

var express = require('express');
var RSVP = require('rsvp');
var shortid = require('shortid');
var moment = require('moment');

var errUtils = require('../../utils/error');
var idGen = require('../../utils/id_gen');
var doubtsHelp = require('./doubts_help');
var firebaseHelp = require('./firebase_help');
var DoubtModel = require('../../models/live.doubt').model;

var rootRef = firebaseHelp.rootRef;
var rootStudentChannelRef = rootRef.child('student-channels'); //send doubt status notification/message
var rootTeacherProfile = rootRef.child('teachers'); //update doubtQueue

//START PATH /v1/live/doubts/
var router = express.Router();

/*
  Analytics
  show by
    student - status
    teacher - status

  match
    date
    status
    teacher
    student

  required params:
    by : enum from ['s', 'ss', 't', 'ts']

  optional params:
    date : date string '2016-06-09'
    status : a valid <status> value
    teacher : string - username
    student : string - username

  Use aggregate function
  db.live.doubts.aggregate([{$match : {}}, {$group : {_id : {teacher : '$teacher', status : '$status'}, count : {$sum : 1}}}])
*/

router.get('/analytics', function(req, res){
  var by = req.query.by;

  if(!(by)){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [by]"));
  };

  //process by-fields
  var firstByFieldMap = {
    's' : 'student',
    't' : 'teacher',
  };

  var byFields = by.split('');

  var groupQuery = {};
  var firstByField = firstByFieldMap[byFields[0]];
  var secondByField = byFields[1];

  if(firstByField){
    groupQuery[firstByField] = '$' + firstByField;
  }
  else{
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "invalid 'by' param value=" + by));
  }

  if(secondByField){
    if(secondByField != 's'){
      res.status(400);
      return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "invalid 'by' param value=" + by));
    }
    else{
      groupQuery['status'] = '$status';
    }
  }

  //process match fields
  var matchQuery = {};
  if(req.query.student){
    matchQuery['student'] = req.query.student;
  }
  if(req.query.teacher){
    matchQuery['teacher'] = req.query.teacher;
  }
  if(req.query.status){
    matchQuery['status'] = req.query.status;
  }
  if(req.query.date){
    var dateString = req.query.date;
    var dateStringIST = dateString + "T00:00:00.000+0530"; //pad to make this date IST date string

    var todayDate = moment(dateStringIST);
    var tomorrowDate = moment(todayDate).add(1, 'day');

    todayDate = todayDate.toDate();
    tomorrowDate = tomorrowDate.toDate();

    matchQuery['createdAt'] = {
      '$gte' : todayDate,
      '$lt' : tomorrowDate
    };
  }

  //var promise = DoubtModel.aggregate([{$match : matchQuery}]).exec();
  var promise = DoubtModel.aggregate([{$match : matchQuery}, {$group : {_id : groupQuery, count : {$sum : 1}}}]).exec();

  promise.then(function(summary){
    res.json(summary);
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
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to fetch analytics", err));
    }
  });
});

/*
  - from the list of active teachers, pick the least busy(mininum doubtQueue length)
  - if multiple teachers with minimum doubtQueue length, pick one among them randomly
  - update Teacher entity field (by pushing to): doubtQueue
  - notify teacher, by setting doubtQueue in firebase reference
  - update Doubt entity fields : 'teacher', 'status'
*/
function pickATeacher(doubtEntity, activeTeacherList, res){
  var minQueueSize = 1000;
  var teacherMap = {};
  for(var i = 0; i < activeTeacherList.length; i++){
    var teacher = activeTeacherList[i];
    var queueSize = teacher.doubtQueueSize;
    if(queueSize < minQueueSize){
      minQueueSize = queueSize;
      console.log("selectBestTeacher | updating minQueueSize=" + minQueueSize + "|t=" + teacher.username);
    }

    if(!teacherMap[queueSize]){
      console.log("selectBestTeacher | init [] for queueSize=" + queueSize);
      teacherMap[queueSize] = [];
    }
    teacherMap[queueSize].push(teacher.username);
  }

  console.log("selectBestTeacher | minQueue Size=" + minQueueSize);
  var minQueueTeachers = teacherMap[minQueueSize];
  console.log("selectBestTeacher | minQueue Teachers=%j", minQueueTeachers);
  var randomIndex = Math.floor(Math.random() * minQueueTeachers.length);
  console.log("selectBestTeacher | selected teacher=" + minQueueTeachers[randomIndex]);

  var selectedTeacherUsername = minQueueTeachers[randomIndex];
  console.log("selectBestTeacher | doubtEntity %j", doubtEntity);
  var promise = doubtsHelp.assignDoubt(doubtEntity.doubtId, selectedTeacherUsername);

  promise = promise.then(function(teacherEntity){
    var doubtQueue = teacherEntity.doubtQueue.map(function(e){return e}); //convert object(teacherEntity.doubtQueue) to plain array
    rootTeacherProfile.child(selectedTeacherUsername).child('doubtQueue').set(doubtQueue);
    console.log("selectBestTeacher | doubt assigned after %j", doubtQueue);
    return doubtsHelp.updateDoubtEntity({doubtId : doubtEntity.doubtId}, {teacher : selectedTeacherUsername, status : "assigned", assignTime : new Date()});
  });

  promise = promise.then(function(updatedDoubtEntity){
    console.log("selectBestTeacher | updateDoubtEntity %j", updatedDoubtEntity);
    if(!res) return;
    res.json({
      success : true,
      doubtId : updatedDoubtEntity.doubtId,
      position : (minQueueSize + 1),
      message : "Aap katar me hai",
      createdAt : updatedDoubtEntity.createdAt
    });
  });

  promise.catch(function(err){
    console.log("selectBestTeacher | error %j", err);
    if(!res) return;
    //error caught and set earlier
    if(err.resStatus){
      res.status(err.resStatus);
      return res.json(err);
    }
    else{
      //uncaught error
      res.status(500);
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to create your doubt", err));
    }
  });

  return promise; //return promise before 'catch' clause
}

function handleUnAssignedDoubts(){
  console.log("handleUnAssignedDoubts | entered");
  var promise = doubtsHelp.findUnAssignedDoubts();
  var pendingDoubts;

  promise = promise.then(function(pDoubts){
    pendingDoubts = pDoubts;
    if(pendingDoubts.length == 0){
      console.log("handleUnAssignedDoubts | no unassiged doubts | OVER");
      return [];
    }

    console.log("handleUnAssignedDoubts | doubt count=" + pendingDoubts.length);
    return doubtsHelp.findActiveTeachers();
  });

  promise = promise.then(function(teacherList){
    if(teacherList.length == 0){
      console.log("handleUnAssignedDoubts | no active teachers | OVER");
      return false;
    }

    console.log("handleUnAssignedDoubts | online teacher count=" + teacherList.length);

    var temp = RSVP.resolve(true);
    pendingDoubts.forEach(function(doubtEntity){
      temp = temp.then(function(){
        console.log("handleUnAssignedDoubts | find " + doubtEntity.doubtId);
        return doubtsHelp.findActiveTeachers();
      });

      temp = temp.then(function(activeTeacherList){
        console.log("handleUnAssignedDoubts | assign " + doubtEntity.doubtId);
        if(activeTeacherList.length == 0){
          throw "NO_ACTIVE_TEACHERS"; //can't continue
        }
        return pickATeacher(doubtEntity, activeTeacherList, null);
      });
    });

    return temp;
  });

  promise = promise.then(function(){
    console.log("handleUnAssignedDoubts | OVER WITHOUT ERROR");
  });

  promise.catch(function(err){
    console.log("handleUnAssignedDoubts | error %j", err);
  });
}

/*post a teaching request
  params:
    username : string
    description : string
    images : [<url>]
*/
router.post('/', function(req, res){
  var studentUsername = req.body.username;
  var description = req.body.description;
  var images = req.body.images;

  if(!(studentUsername && (description != undefined) && images)){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [username, description, images]"));
  };

  var details = {
    description : description,
    images : images
  };

  var doubtEntity;
  var doubtId = idGen.generateSequentialId();

  var promise = doubtsHelp.createDoubt(doubtId, studentUsername, details);
  promise = promise.then(function(d){
    doubtEntity = d;

    return doubtsHelp.findActiveTeachers();
  });

  promise.then(function(activeTeacherList){
    console.log(doubtId + "|" + "found " + activeTeacherList.length + " eligible teachers");
    if(activeTeacherList.length === 0){
      res.json({
        success : false,
        message : "no online active teachers : we will assign this doubt when a teacher becomes actives",
        doubtId : doubtId,
        createdAt : doubtEntity.createdAt
      });
      doubtsHelp.updateDoubtEntity({doubtId : doubtId}, {status : "unassigned"});
    }
    else{
      pickATeacher(doubtEntity, activeTeacherList, res);
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
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to create your doubt", err));
    }
  });

});

/*
  Fetch doubt entity by its id
*/
router.get('/:doubtId', function(req, res){
  var doubtId = req.params.doubtId;
  var promise = doubtsHelp.findDoubtEntity(doubtId);

  promise.then(function(doubtEntity){
    res.json(doubtEntity);
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
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to fetch give doubt", err));
    }
  });
});

/*get all doubts
  optional params:
    student : username of student
    teacher : username of teacher
    status : string - doubt status
    lt : iso date string - less than this createdAt timestamp
*/
router.get('/', function(req, res){
  var findQuery = {};
  if(req.query.student){
    findQuery.student = req.query.student;
  }
  if(req.query.teacher){
    findQuery.teacher = req.query.teacher;
  }
  if(req.query.status){
    findQuery.status = req.query.status;
  }
  if(req.query.lt){
    findQuery.createdAt = {
      '$lt' : req.query.lt
    };
  }

  var promise = DoubtModel
    .find(findQuery)
    .sort({
      createdAt : -1
    })
    .select({
      _id : false,
      __v : false
    })
    .limit(20)
    .exec();

  promise = promise.then(function(doubtList){
    return res.json(doubtList);
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
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to fetch doubts", err));
    }
  });
});

/*
  params:
    username
    doubtId
    status

    description : <string> - solution description
    images : [<url>] - solution photos

  how:
    check current doubt status
    update doubt status to "solved", "unsolved". Also update endTime. Set response
    update teacher entity's doubtQueue : both DB and firebase
    send notification to student
*/
router.post('/end', function(req, res){
  var teacherUsername = req.body.username;
  var doubtId = req.body.doubtId;
  var status = req.body.status;

  var description = req.body.description;
  var images = req.body.images;

  if(!(teacherUsername && doubtId && status && (description != undefined) && images)){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [username, doubtId, status, description, images]"));
  }

  if(!(status === "solved" || status === "unsolved")){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_INVALID, "'status' must belong to [solved, unsolved]"));
  }

  var response = {
    description : description,
    images : images
  };

  var promise = doubtsHelp.findDoubtEntity(doubtId);

  promise = promise.then(function(d){
    console.log("end api request | current status=" + d.status + ", teacher=" + d.teacher);
    if(d.teacher !== teacherUsername){
      throw errUtils.ErrorObject(errUtils.errors.REQUEST_INVALID, "this doubt was not assigned to you", null, 401);
    }

    if(d.status === "solved" || d.status === "unsolved"){
      console.log("end api request : already ended");
      return d;
    }
    else if(d.status === "assigned"){
      console.log("end api request : setting status & endTime");
      return doubtsHelp.updateDoubtEntity({doubtId : doubtId}, {status : status, endTime : new Date(), response : response});
    }
    else{
      //throw error
      throw errUtils.ErrorObject(errUtils.errors.REQUEST_INVALID, "end not allowed with current status=" + d.status, null, 401);
    }
  });

  var doubtEntity;
  promise = promise.then(function(d){
    doubtEntity = d;
    return doubtsHelp.unAssignDoubt(doubtId, doubtEntity.teacher);
  });

  promise = promise.then(function(teacherEntity){
    console.log("end api request : doubt unassign success %j", teacherEntity);
    var doubtQueue = teacherEntity.doubtQueue.map(function(e){return e}); //convert object(teacherEntity.doubtQueue) to plain array
    rootTeacherProfile.child(teacherEntity.username).child('doubtQueue').set(doubtQueue); //set doubtQueue in teacher's firebase ref

    var notificationPayload = {
      type : "doubt",
      doubtId : doubtEntity.doubtId,
      status : doubtEntity.status,
      ts : Firebase.ServerValue.TIMESTAMP,
    };
    rootStudentChannelRef.child(doubtEntity.student).push(notificationPayload); //notify the user through firebase channel
    //#todo send GCM notification also

    res.json(doubtEntity);
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
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to end the doubt", err));
    }
  });
});



module.exports.router = router;
module.exports.handleUnAssignedDoubts = handleUnAssignedDoubts;