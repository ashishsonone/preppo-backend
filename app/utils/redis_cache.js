//Since we're using redis as cache, disble disk persistence for redis server, for faster performance
//Run redis-server
// --save ""
// --maxmemory 100mb
// --maxmemory-policy volatile-ttl //remove the key with the nearest expire time (minor TTL)

var Redis = require('ioredis');
var redisConfig = require('../../config/config').redis;
var RSVP = require('rsvp');
var errUtils = require('./error');

var redis = new Redis({
  host : redisConfig.host,
  port : redisConfig.port,
  db : redisConfig.db, //databases are identified by integer numbers, default is 0
  //showFriendlyErrorStack: true //for show stacktraces with where in our code it occured, You shouldn't use this feature in a production environment.
});

Redis.Promise.onPossiblyUnhandledRejection(function (error) {
    console.log(error);
    // to produce error use redis.set('foo')
    // you can log the error here.
    // error.command.name is the command name, here is 'set'
    // error.command.args is the command arguments, here is ['foo']
});

//if redis.status == 'ready' only then use it, otherwise if its 'reconnecting' or something, directly use DB

/* retrieves the stringified json and returns json object
*/
function getFromCache(key){
  if(redis.status !== 'ready'){
    return RSVP.reject(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "redis not connected", null, 500));
  }

  //redis is ready
  var promise = redis.get(key);
  promise = promise.then(function(result){
    if(!result){
      throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "redis key not found", null, 404);
    }
    else{
      return JSON.parse(result); //promise with this resolved value is returned
    }
  });

  return promise;
}

/*
  strigifies the json value given, and stores it
*/
function putIntoCache(key, value){
  value = JSON.stringify(value);
  if(redis.status !== 'ready'){
    return RSVP.reject(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "redis not connected", null, 500));
  }

  //redis is ready
  var promise = redis.set(key, value, 'ex', redisConfig.expiry);
  return promise;
}

module.exports.getFromCache = getFromCache;
module.exports.putIntoCache = putIntoCache;