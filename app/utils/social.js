"use strict"
var request = require('request');
var errUtils = require('./error');
var RSVP = require('rsvp');
var googleConfig = require('../../config/common').google;

/* verify token and extract details(username, email, name)
   here username is the user's unique google id

  returns a promise with 
    success : if 200 OK : result containing above values
    otherwise : INVALID_TOKEN or other
*/
function verifyGoogleToken(googleToken){
  var options = {
    method : 'GET',
    uri : "https://www.googleapis.com/oauth2/v3/tokeninfo",
    qs : {
      id_token : googleToken  
    },
    json : true //parse respone body json
  };

  return new RSVP.Promise(function(resolve, reject){
    request(options, function(err, res, body){
      if(err){
        return reject(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unknown error", err, null, 500));
      }

      if(res && res.statusCode === 200){
        var result = res.body;
        //check 'aud' field is one of our app's client ids
        if(googleConfig.clientIdList.indexOf(result.aud) != -1){
          var user = {};
          user.name = result.name;
          user.email = result.email;
          user.username = result.sub;
          return resolve(user);
        }
      }

      return reject(errUtils.ErrorObject(errUtils.errors.INVALID_TOKEN, "invalid google token", res && res.body, 400));
    });
  });
}

function verifyFBToken(fbToken){
  var options = {
    url: "https://graph.facebook.com/me",
    headers: {
      "Content-Type": "application/json"
    },
    qs: {
      access_token: fbToken,
      fields: "id,name,email"
    },
    json : true //parse response body into json
  };

  return new RSVP.Promise(function(resolve, reject){
    request(options, function(err, res, body){
      if(err){
        return reject(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unknown error", err, null, 500));
      }

      if(res && res.statusCode === 200){
        var result = res.body;
        var user = {};
        user.name = result.name;
        user.email = result.email;
        user.username = result.id;
        return resolve(user);
      }

      return reject(errUtils.ErrorObject(errUtils.errors.INVALID_TOKEN, "invalid fb token", res && res.body, 400));
    });
  });
}

module.exports.verifyGoogleToken = verifyGoogleToken;
module.exports.verifyFBToken = verifyFBToken;