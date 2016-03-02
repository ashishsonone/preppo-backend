"use strict"

var gupshup = {
  bulkAccount : {
    userid : "2000133095",
    password : "wdq6tyUzP"
  },
  otpAccount : {
    userid : "2000149020",
    password : "abc123"
  }
};

var mailer = {
  protocol : 'smtps',
  email : 'ashish@trumplab.com',
  password : 'trumplab%400',
  smtp_server : 'smtp.gmail.com',
};

var google = {
  clientIdList : [
    "851960487439-kjv325718755mjfociosthd29i0v951q.apps.googleusercontent.com", //web client
  ],
};

var debug = {
  debugFlag : require('../app/utils/debug_flag').getDebugFlag()
};

var config = {
  gupshup : gupshup,
  mailer : mailer,
  google : google,
  debug : debug
};

module.exports = config;