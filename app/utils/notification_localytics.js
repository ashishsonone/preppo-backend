"use strict"

var request = require('request');
var RSVP = require('rsvp');

var localyticsConfig = require('../../config/config.js').localytics;

var errUtils = require('./error');

//payload schema described in notification doc
//https://slack-files.com/T034SA2M9-F0TMH1HDE-61eb13a017

//send a notification to a known customerId
function sendNotificationToCustomerId(customerId, payload){
  var body = {
    campaign_key: "target-customer-id",
    target_type : "customer_id",
    all_devices : true,

    messages: [
      {
          "alert" : "Welcome to Preppo",
          "target": customerId,
          "android" : {
              "extra" : payload
          }
      }
    ]
  };

  return callLocalyticsApi(body);
}

function sendNotificationBroadcast(payload){
  var body = {
    campaign_key: "target-broadcast",
    target_type : "broadcast",
    messages: [
      {
          "alert" : "Welcome to Preppo",
          "android" : {
              "extra" : payload
          }
      }
    ]
  };
  return callLocalyticsApi(body);
}


function sendNotificationToProfileTag(tag, payload){
  var body = {
    campaign_key: "target-profile-" + tag,
    target_type : "profile",
    messages: [
      {
        "alert" : "Welcome to Preppo",
        "android" : {
            "extra" : payload
        },
        "target" : {
          "profile" :{
            "criteria" : [
                {
                    "key" : "tag",
                    "scope" : "LocalyticsApplication",
                    "type" : "string",
                    "op" : "in",
                    "values" : [
                        tag
                    ]
                }
            ],
            "op" : "and"
          }
        }
      }
    ]
  };
  return callLocalyticsApi(body);
}

function callLocalyticsApi(body){
  var options = {
    method : 'POST',
    uri : "https://messaging.localytics.com/v2/push/" + localyticsConfig.app_id,
    body : body,
    headers : {
      "Content-Type": "application/json",
      "Authorization" : "Basic " + localyticsConfig.authorization
    },
    json : true
  };

  //console.log("%j", options);
  return new RSVP.Promise(function(resolve, reject){
    request(options, function(err, res, body){
      if(err){
        console.log("%j", err);
        return reject(errUtils.ErrorObject(errUtils.errors.THIRD_PARTY, "unknown error", err));
      }
      else {
        console.log(res.statusCode + " %j", res.body);
        return resolve(res.body);
      }
    });
  });
}

function testSend(){
  var customerId = "966376753458525";
  var payload = {
    _type : "SHOW",
    _action : "NEWS_QUIZ_UPDATE",
    _title : "Preppo-backend",
    _msg : "Weekly Quiz available for this week"
  };
  return sendNotificationToCustomerId(customerId, payload);
}

module.exports = {
  sendNotificationToCustomerId : sendNotificationToCustomerId,
  sendNotificationBroadcast : sendNotificationBroadcast,
  sendNotificationToProfileTag : sendNotificationToProfileTag,
  testSend : testSend
};