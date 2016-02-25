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
  url : "mongodb://localhost:27017/Backend",
  poolSize : 10
};

var redis = {
  host : "localhost",
  port : "6379",
  db : 0,
  expiry : 60, //seconds
};

var session = {
  secret : "hoohqwertykilometer"
};

module.exports = {
  app : app,
  cluster : cluster,
  mongo : mongo,
  redis : redis,
  session : session
}