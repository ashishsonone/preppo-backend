"use strict"
var fs = require('fs');
function getHealth(cb){
  fs.readFile('./config/health.json', 'utf8', function (err, data) {
    if (err) throw err;
    try{
      var obj = JSON.parse(data);
      cb(obj); //either true or false
    }
    catch(e){
      cb(null); //not healthy
    }
  });
}

module.exports = {
  getHealth : getHealth
};