var mongoose = require('mongoose');

var DetailsSchema = mongoose.Schema({
  _id : false,
  description : String, //text description of the problem
  images : [String], //url
});

var ResponseSchema = mongoose.Schema({
  _id : false,
  description : String, //text description of the problem
  images : [String], //url
});

var LiveDoubtSchema = mongoose.Schema({
  doubtDate : String, //init
  doubtId : String, //init
  student : String, //init

  details : DetailsSchema, //init
  status : {type : String, default : ""}, //on teacher selection set ["" -> "unassigned"/"assigned" -> "solved"/"unsolved"]

  teacher : {type : String, default : ""}, //set after teacher selection
  assignTime : Date, //set when teacher assigned

  endTime : Date, //set when doubt closed either to "solved" or "unsolved"
  response : ResponseSchema, 

  billingId : String //after payment
},
{
  timestamps : {} //assigns default createdAt and updatedAt fields
});

var LiveDoubtModel = mongoose.model('LiveDoubtModel', LiveDoubtSchema, 'live.doubts');

module.exports = {
  model : LiveDoubtModel
};