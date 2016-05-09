var request = require('request');
var gupshupConfig = require('../../config/common.js').gupshup;
var bulkSmsIndiaConfig = require('../../config/common.js').bulkSmsIndia;

var otpAccountCredentails = gupshupConfig.otpAccount;
var bulkAccountCredentails = gupshupConfig.bulkAccount;

var RSVP = require('rsvp');
var errUtils = require('./error');

function sendOTP(phone, msg){
  return sendSimpleMessageGupshup(phone, msg, otpAccountCredentails, "Text");
}

function sendBulk(phone, msg){
  return sendSimpleMessageGupshup(phone, msg, bulkAccountCredentails, "Unicode_text");
}

function sendOtpMessage(phone, msg){
  return sendSimpleMessageBulkSmsIndia(phone, msg, bulkSmsIndiaConfig.otpSmsType);
}

function sendTransactionalMessage(phone, msg){
  return sendSimpleMessageBulkSmsIndia(phone, msg, bulkSmsIndiaConfig.transactionalSmsType);
}

function sendPromotionalMessage(phone, msg){
  return sendSimpleMessageBulkSmsIndia(phone, msg, bulkSmsIndiaConfig.promotionalSmsType);
}

//send a message to a single number
function sendSimpleMessageBulkSmsIndia(phone, msg, smsType){
  var options = {
    method : 'GET',
    uri : "http://bulksmsindia.mobi/sendurlcomma.aspx",
    qs : {
      user : bulkSmsIndiaConfig.userid,
      pwd : bulkSmsIndiaConfig.password,
      senderid : bulkSmsIndiaConfig.senderid,
      smstype : smsType,
      
      msgtext : msg,
      mobileno : phone
    },
    headers : {
    }
  };

  return new RSVP.Promise(function(resolve, reject){
    request(options, function(err, res, body){
      if(err){
        return reject(errUtils.ErrorObject(errUtils.errors.THIRD_PARTY, "unknown error", err));
      }
      console.log(res.statusCode + " " + res.body);
      if(!err && res.body && res.body.trim().toLowerCase().indexOf("successful") > 0){
        return resolve(res.body);
      }
      else{
        return reject(errUtils.ErrorObject(errUtils.errors.THIRD_PARTY, "unknown error", res && res.body));
      }
    });
  });
}

//send a message to a single number
function sendSimpleMessageGupshup(phone, msg, credentials, msgType){
  var options = {
    method : 'GET',
    uri : "https://enterprise.smsgupshup.com/GatewayAPI/rest",
    qs : {
      method : "SendMessage",
      send_to : phone,
      msg : msg,
      msg_type : msgType,

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
      if(err){
        return reject(errUtils.ErrorObject(errUtils.errors.THIRD_PARTY, "unknown error", err));
      }
      console.log(res.statusCode + " " + res.body);
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
  sendTransactionalMessage : sendTransactionalMessage,
  sendOtpMessage: sendOtpMessage,
  sendPromotionalMessage : sendPromotionalMessage
};