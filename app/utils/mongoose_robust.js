/*
  mongoose with retry functionality
*/

"use strict"
var mongoose = require('mongoose');
var attempting = true; //if attempting to connect, dont connectWithRetry on disconnect event

mongoose.connectWithRetry = function connectWithRetry(url){
  if(url){
    mongoose.url = url;
  }
  attempting = true;
  mongoose.connect(
    mongoose.url, 
    {
      server:{
        auto_reconnect:false, 
        //socketOptions: {connectTimeoutMS: 30000, socketTimeouMS : 15000} 
        //Need to understand how to actually set timetouts
      }
    }, 
    function(err){
      if (err) {
          console.log("(retry in 5s)connectWithRetry error %j", err);
          setTimeout(connectWithRetry, 5000);
      }
    }
  );
}


/*
 * mongoose.connection.readyState
 * Connection ready state
 * 0 = disconnected
 * 1 = connected
 * 2 = connecting
 * 3 = disconnecting
 */

var db = mongoose.connection;
db.on('error', function() {
  console.log("db error");
});

db.on('connecting', function() {
  console.log("db connecting");
});

db.on('connected', function() {
  attempting = false;
  console.log("db connected");
});

db.on('disconnecting', function() {
  console.log("db disconnecting");
});

db.on('disconnected', function() {
  console.log("db disconnected readyState=" + db.readyState);
  if(!attempting){
      connectWithRetry();
  }
});

db.on('reconnected', function() {
  console.log("db reconnected");
});

module.exports = mongoose;