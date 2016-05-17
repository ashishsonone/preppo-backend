'use strict'
var Firebase = require('firebase');
var mongoose = require('./app/utils/mongoose_robust');

var TeacherModel = require('./app/models/live.teacher.js').model;

var firebaseConfig = require('./config/config').firebase;
var mongoConfig = require('./config/config').mongo;

var FIREBASE_BASE_URL = firebaseConfig.baseUrl;
var teacherPresenceBaseRef = new Firebase(FIREBASE_BASE_URL + "/teacher-presence/");

//connect to mongo db
mongoose.connectWithRetry(mongoConfig.url, mongoConfig.poolSize);

console.log("listening to presence events @ '" + FIREBASE_BASE_URL + "/teacher-presence/' FIREBASE endpoint");

function handleSessionEvent(snapshot){
  var session = snapshot.val();
  var token = snapshot.key();
  var ts = session.ts;

  //console.log("handleSessionEvent | session | username=" + session.username + ", online=" + session.online + ", key=" + token);
  if(session.online === false){//if goes offline remove the entry
    console.log("handleSessionEvent | deleting session | username=" + session.username + " | key " + token + " | ts " + ts);
    teacherPresenceBaseRef.child(snapshot.key()).remove();

    var promise = TeacherModel
      .findOneAndUpdate({
        username : session.username
      },
      {
        '$pull' : {online : {token : token}}
      },
      {
        new : true
      })
      .select({username : true, online : true, _id : false, status : true})
      .exec();

    promise.then(function(t){
      console.log("%j", t);
    }, function(e){
      console.log("%j", e);
    });
  }
  else{
    console.log("handleSessionEvent | processing session | username=" + session.username + " | key " + token + " | ts " + ts);
    teacherPresenceBaseRef.child(snapshot.key()).child('processed').set(true);

    var promise = TeacherModel
      .findOneAndUpdate({
        username : session.username,
        'online.token' : token
      },
      {
        '$set' : { 'online.$.ts' : ts}
      },
      {
        new : true, 
        upsert : true //NOTE upsert : true flag is critical here (otherwise won't fail with 16836 when this token doesn't exist in 'online' field)
      })
      .select({username : true, online : true, _id : false, status : true})
      .exec();

    promise = promise.then(null, 
    function(e){
      //console.log("handleSessionEvent | processing session | %j", e);
      if(e.code === 16836){//positional operator cannot upsert
        console.log("creating new token for " + session.username);
        var p = TeacherModel
        .findOneAndUpdate({
          username : session.username
        },
        {
          '$addToSet' : {online : {ts : ts, token : token}},
        },
        {
          new : true
        })
        .select({username : true, online : true, _id : false, status : true})
        .exec();

        return p;
      }
      else{
        throw e;
      }
    });

    promise.then(function(t){
      console.log("success %j", t);
    }, function(e){
      console.log("error %j", e);
    });
  }
}

var unprocessedPresenceEventsRef = teacherPresenceBaseRef.orderByChild('processed').equalTo(false);

unprocessedPresenceEventsRef.on('child_added', handleSessionEvent);
unprocessedPresenceEventsRef.on('child_changed', handleSessionEvent);