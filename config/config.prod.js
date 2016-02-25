"use strict"

var app = {
  port : 8002
};

var cluster = {
  numCPUs : 2, // number of worker processes
  //numCPUs : require('os').cpus().length, // number of worker processes
  timeout : 10000   // seconds to wait after disconnect before killing the worker
                    // i.e time given to worker to complete pending requests and 
                    // and to a clean exit
};

var mongo = {
  url : "mongodb://prod-mongo-1:27017/preppo",
  poolSize : 10
};

var redis = {
  host : "prod-mongo-1",
  port : "6379",
  db : 0,
  expiry : 120, //seconds
};

var session = {
  secret : "hoohqwertykilometerprod"
};

module.exports = {
  app : app,
  cluster : cluster,
  mongo : mongo,
  session : session,
  redis : redis
}