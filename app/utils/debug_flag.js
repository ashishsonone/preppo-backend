"use strict"
var fs = require('fs');
function getDebugFlag(cb){
  try{
    var data = fs.readFileSync('./config/debug_flag.json', 'utf8');
    var value = JSON.parse(data);
    return value; //either true or false
  }
  catch(e){
    console.log(e);
    return false; //false (on error either due to missing file or improper json)
  }
}

module.exports = {
  getDebugFlag : getDebugFlag
};