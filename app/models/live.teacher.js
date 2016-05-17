var mongoose = require('mongoose');

var SessionSchema = mongoose.Schema({
  _id : false,
  token : String,
  ts : Number
});

/*
  indexes:
    username : unique
    phone : unique
*/
var LiveTeacherSchema = mongoose.Schema({
  username : String,
  password : String,

  phone : String,
  name : String,

  online : {type : [SessionSchema], default : []}, //array of Session schema
  status : {type : String, default : "away"}, //"active", "away"

  doubtQueue :  {type : [String], default : []} //array of doubt-id strings
},
{
  timestamps : {} //assigns default createdAt and updatedAt fields
});

var LiveTeacherModel = mongoose.model('LiveTeacher', LiveTeacherSchema, 'live.teachers');

module.exports = {
  model : LiveTeacherModel
};