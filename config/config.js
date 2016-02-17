"use strict"
var env = process.env.ENV;


const LOCAL = 'local';
const DEV = 'dev';
const PROD = 'prod';
var enumEnvironment = [LOCAL, DEV, PROD];

if(!env|| enumEnvironment.indexOf(env) == -1){
  console.log("######ALARM######");
  console.log("====environment variable 'ENV' must be one of [local, dev, prod]====");
  console.log("######ALARM######");
  process.exit();
}

var config = require("./config." + env);

module.exports = config;

console.log("%j", module.exports);