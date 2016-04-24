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

var onesignal = {
  //preppo-DEV
  app_id : "fa97c8fe-2a0b-498e-ac4c-73a444ad0ceb",
  rest_api_key : "YWJkMmI1MWUtMGI0Mi00NWVlLWI5NWQtZThlODAwNmJjNGQy"
};

var localytics = {
  app_id : "0e0c204e4a831266ac35782-ec62a0e4-e062-11e5-1165-00cef1388a40",
  authorization : "N2RjZGFhNDgzMzhlNTllNGJkMjlhZDItZDgwYTlkNTAtZTA2Mi0xMWU1LTExNjUtMDBjZWYxMzg4YTQwOmUyYzM2MWNmNzhkM2U3YTlmZTU0OWU4LWQ4MGFhMDk4LWUwNjItMTFlNS0xMTY1LTAwY2VmMTM4OGE0MA=="
};

var firebase = {
  baseUrl : "https://shining-inferno-4918.firebaseio.com",
  secret : "6Uqqvzd5nXmc4di7m1G53atJa2jXJXouh46C63rp"
};

module.exports = {
  app : app,
  cluster : cluster,
  mongo : mongo,
  session : session,
  redis : redis,
  onesignal : onesignal,
  localytics : localytics,
  firebase : firebase
};