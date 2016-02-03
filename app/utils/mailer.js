'use strict'

var nodemailer = require('nodemailer');
var mailerConfig = require('../../config/mailer');

var transportURL = mailerConfig.protocol + "://" + mailerConfig.email 
  + ":" + mailerConfig.password + "@" + mailerConfig.smtp_server;

//console.log(transportURL);

// create reusable transporter object using the default SMTP transport
var transporter = nodemailer.createTransport('smtps://ashish@trumplab.com:trumplab%400@smtp.gmail.com');


function sendMail(to, subject, text){// setup e-mail data with unicode symbols
  var mailOptions = {
      from: mailerConfig.email, // sender address
      to: to, // list of receivers
      subject: subject, // Subject line
      text: text, // plaintext body
      html: text // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, function(error, info){
      if(error){
          return console.log(error);
      }
      console.log('Message sent: ' + info.response);
  });
}

module.exports = {
  sendMail : sendMail
};