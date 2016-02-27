var request = require('request');
var gupshupConfig = require('../../config/common.js').gupshup;

var otpAccountCredentails = gupshupConfig.otpAccount;
var bulkAccountCredentails = gupshupConfig.bulkAccount;

var RSVP = require('rsvp');
var errUtils = require('./error');

function sendOTP(phone, msg){
  return sendSimpleMessage(phone, msg, otpAccountCredentails);
}

function sendBulk(phone, msg){
  return sendSimpleMessage(phone, msg, bulkAccountCredentails);
}

//send a message to a single number
function sendSimpleMessage(phone, msg, credentials){
  var options = {
    method : 'GET',
    uri : "https://enterprise.smsgupshup.com/GatewayAPI/rest",
    qs : {
      method : "SendMessage",
      send_to : phone,
      msg : msg,
      msg_type : "TEXT",

      auth_scheme : "plain",
      userid : credentials.userid,
      password : credentials.password,
      
      v : "1.1",
      format : "text"      
    },
    headers : {
    }
  };

  return new RSVP.Promise(function(resolve, reject){
    request(options, function(err, res, body){
      console.log(res.statusCode + " " + res.body);
      if(err){
        return reject(errUtils.ErrorObject(errUtils.errors.THIRD_PARTY, "unknown error", err));
      }
      if(!err && res && res.body && res.body.trim().substr(0,7) === 'success'){
        return resolve(res.body);
      }
      else{
        return reject(errUtils.ErrorObject(errUtils.errors.THIRD_PARTY, "unknown error", res && res.body));
      }
    });
  });
}

module.exports = {
  sendOTP : sendOTP,
  sendBulk : sendBulk,
};