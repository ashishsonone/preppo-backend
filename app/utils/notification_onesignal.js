var request = require('request');
var gupshupConfig = require('../../config/config.js').onesignal;

var RSVP = require('rsvp');
var errUtils = require('./error');

//send a notification
function sendNotification(body){
  var body = body || 
    { 
      app_id: gupshupConfig.app_id,
      contents: {"en": "English Message"},
      included_segments: ["All"]
    };

  var options = {
    method : 'POST',
    uri : "https://onesignal.com/api/v1/notifications",
    body : body,
    headers : {
      "Content-Type": "application/json",
      "Authorization" : "Basic " + gupshupConfig.rest_api_key
    },
    json : true
  };

  console.log("%j", options);
  return new RSVP.Promise(function(resolve, reject){
    request(options, function(err, res, body){
      if(err || !res.body){
        return reject(errUtils.ErrorObject(errUtils.errors.THIRD_PARTY, "unknown error", err));
      }
      else {
        console.log(res.statusCode + " " + res.body);
        return resolve(res.body);
      }
    });
  });
}

module.exports = {
  sendNotification : sendNotification
};