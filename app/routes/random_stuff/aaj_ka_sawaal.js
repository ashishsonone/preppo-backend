"use strict"

var express = require('express');
var mongoose = require('mongoose');
var util = require('util');
var moment = require('moment');

var sms = require('../../utils/sms');
var errUtils = require('../../utils/error');

var router = express.Router();
//start ENDPOINT /v1/randomstuff/aajkasawaal

var AajKaSawaalQuestionSchema = mongoose.Schema({
  content : String,
  publishDate : Date,
  bulkSentCount : Number,
  formSentCount : Number,
  bulk : Boolean
},
{
  timestamps : {} //assigns default createdAt and updatedAt fields
});

var AajKaSawaalQuestionModel = mongoose.model('AajKaSawaalQuestion', AajKaSawaalQuestionSchema, 'random_aaj_ka_sawaal_question');

/*
create index on phone field table
*/
var AajKaSawaalUserSchema = mongoose.Schema({
  name : String,
  phone : String,
  email : String
},
{
  timestamps : {} //assigns default createdAt and updatedAt fields
});

var AajKaSawaalUserModel = mongoose.model('AajKaSawaalUser', AajKaSawaalUserSchema, 'random_aaj_ka_sawaal_user');

var zapierContentWithoutQuestion = "Hi %s, welcome to aajkasawaal service. You will receive updates regularly now on your phone number";
var zapierContentWithQuestion = "Hi %s, welcome to aajkasawaal service. Here is our picked aajkasawaal : %s";
var question = "Who is the railway minister of India?";

function processPhoneNumber(phone){
  console.log("-----> " + phone);
  if(!phone){
    return null;
  }

  phone = phone.trim();
  //p1 = "8976208510"
  if(phone.length === 10){
    return phone;
  }

  //p2 = "08976208510"
  if(phone.startsWith('0') && phone.length === 11){
    phone = phone.slice(1);
    return phone;
  }

  //p3 = "918976208510"
  if(phone.startsWith('91') && phone.length === 12){
    phone = phone.slice(2);
    return phone;
  }

  //p4 = "+918976208510"
  if(phone.startsWith('+91') && phone.length === 13){
    phone = phone.slice(3);
    return phone;
  }

  //some other format, just return null;
  return null;
}

/* to be used by zapier to send first message to people who fill the typeform
  Adds the user's phone to database
*/
router.get('/zapier', function(req, res){
  var phone = req.query.phone;
  var name = req.query.name;
  var email = req.query.email;

  phone = processPhoneNumber(phone);

  if(!(phone && name && email)){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [phone, name, email]"));
  };

  var currentISTDateString = moment().utcOffset('+0530').format('YYYY-MM-DD');
  console.log("******* aajkasawaal/zapier %s currentISTDateString=" + currentISTDateString, phone);

  AajKaSawaalQuestionModel.findOne(
    {publishDate : {'$lte' : currentISTDateString}}, 
    null, 
    {sort:{publishDate : -1}}, 
    function(err, result){
    var content;
    if(err || !result){
      content = util.format(zapierContentWithoutQuestion, name);
    }
    else{
      content = util.format(zapierContentWithQuestion, name, result.content);
      AajKaSawaalQuestionModel.update({
        publishDate : result.publishDate
      }, {'$inc' : {formSentCount : 1}}).exec();
    }

    console.log("******* aajkasawaal/zapier %s content=%s", phone, content);
    var promise = sms.sendSingleMessage(phone, content);

    promise.then(function(result){
      console.log("******* aajkasawaal/zapier %s sms result %j", phone, result);
    });

    promise.catch(function(err){
      console.log("******* aajkasawaal/zapier %s sms error %j", phone, err);
    });

    //insert into user table
    var newUser = new AajKaSawaalUserModel();
    newUser.phone = phone;
    newUser.name = name;
    newUser.email = email;
    newUser.save(function(e, r){
      console.log("******* aajkasawaal/zapier %s\n save err=%j, result=%j", phone, e, r);
    });

    res.json({success : true});
  });
});

router.get('/questions/', function(req, res){
  var publishDate = req.query.publishDate;
  AajKaSawaalQuestionModel.findOne({publishDate : publishDate}, function(err, result){
    if(err || !result){
      res.status(500);
      res.json({message : "NOT_FOUND"});
    }
    else{
      var value = {};
      value.content = result.content;
      value.publishDate = moment(result.publishDate).format('YYYY-MM-DD');
      value.bulkSentCount = result.bulkSentCount;
      value.formSentCount = result.formSentCount;
      value.bulk = result.bulk;
      res.json(value);
    }
  });
});

router.get('/questions/delete/', function(req, res){
  var publishDate = req.query.publishDate;
  var secret = req.query.secret;
  if(secret !== 'toofan'){
    res.status(400);
    return res.json({message : "Wrong secret key"});
  }
  
  AajKaSawaalQuestionModel.remove({publishDate : publishDate}, function(err){
    if(err){
      res.status(500);
      res.json({message : "ERROR deleting question"});
    }
    else{
      res.json({message : "SUCCESS deleted question"});
    }
  });
});

var bulkPrefix = "Today's aajkasawaal is : ";
router.post('/send', function(req, res){
  var content = req.body.content;
  var publishDate = req.body.publishDate;
  var secret = req.body.secret;
  
  console.log("******* aajkasawaal/send content=%s, publishDate=%s, secret=%s", content, publishDate, secret);

  var currentISTDateString = moment().utcOffset('+0530').format('YYYY-MM-DD');
  if(!(content && publishDate && secret)){
    res.status(400);
    return res.json(errUtils.ErrorObject(errUtils.errors.PARAMS_REQUIRED, "required : [content, publishDate, secret]"));
  };

  if(secret !== 'toofaan'){
    res.status(400);
    return res.json({message : "Wrong secret key"});
  }

  if(currentISTDateString != publishDate){
    res.status(400);
    return res.json({message : "Can only send today's message"});
  }

  var newQuestion = new AajKaSawaalQuestionModel();
  newQuestion.content = content;
  newQuestion.publishDate = publishDate;
  newQuestion.bulkSentCount = 0;
  newQuestion.formSentCount = 0;
  newQuestion.bulk = true;

  newQuestion.save(function(err, result){
    if(err || !result){
      res.status(500);
      res.json({message : "FAILED TO SAVE QUESTION(may be duplicate entry for same publishDate)"});
    }
    else{
      console.log("%j", req.body);
      var stream = AajKaSawaalUserModel.find().stream();
      var phoneList = [];
      var batchSize = 50;
      stream.on('data', function(doc){
        phoneList.push(doc.phone);
        if(phoneList.length === batchSize){
          console.log("******* aajkasawaal/send sending next batch size=%s", phoneList.length);
          sms.sendSingleMessage(phoneList.join(), bulkPrefix + content);

          AajKaSawaalQuestionModel.update({
            publishDate : newQuestion.publishDate
          }, {'$inc' : {bulkSentCount : phoneList.length}}).exec();

          phoneList = [];
        }
      });

      stream.on('error', function (err) {
        res.status(500);
        res.json(err);
      });

      stream.on('close', function () {
        if(phoneList.length > 0){
          console.log("******* aajkasawaal/send sending last remaining batch size=%s", phoneList.length);
          sms.sendSingleMessage(phoneList.join(), bulkPrefix + content);

          AajKaSawaalQuestionModel.update({
            publishDate : newQuestion.publishDate
          }, {'$inc' : {bulkSentCount : phoneList.length}}).exec();

          phoneList = [];
        }
        res.json({message : "success"});
      });
    }
  });
});

module.exports.router = router;
module.exports.processPhoneNumber = processPhoneNumber;