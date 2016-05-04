var mongoose = require('mongoose');

var SessionSchema = mongoose.Schema({
  _id : false,
  token : String,
  ts : Number
});

var LiveTeacherSchema = mongoose.Schema({
  username : String,
  subjects : [String],
  topics : [String],
  online : [SessionSchema],
  status :  {type : String, default : ""}
},
{
  timestamps : {} //assigns default createdAt and updatedAt fields
});

var LiveTeacherModel = mongoose.model('LiveTeacher', LiveTeacherSchema, 'live.teachers');

module.exports = {
  model : LiveTeacherModel
};