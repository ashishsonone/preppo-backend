var mongoose = require('mongoose');

var DetailsSchema = mongoose.Schema({
  _id : false,
  subject : String, //subject
  topic : String, //topic within the subject
  description : String, //text description of the problem
  image : String, //url
});

var LiveRequestSchema = mongoose.Schema({
  requestDate : String, //init
  requestCode : String, //init | requestId = requestDate + '/' + requestCode
  student : String, //init
  details : DetailsSchema, //init

  status : {type : String, default : ""}, //on teacher selection set ["" -> "unassigned"/"assigned" -> "started" -> "ended"]

  teacher : {type : String, default : ""}, //set after teacher selection

  sessionStartTime : Date, //set on start api request
  sessionEndTime : Date, //set on terminate api request
  sessionDuration : {type : Number, default : 0}, //(in seconds) updated periodically by teacher via update api request

  billingId : String //after payment
},
{
  timestamps : {} //assigns default createdAt and updatedAt fields
});

var LiveRequestModel = mongoose.model('LiveRequest', LiveRequestSchema, 'live.requests');

module.exports = {
  model : LiveRequestModel
};