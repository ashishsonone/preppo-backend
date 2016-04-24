var mongoose = require('mongoose');

var SessionSchema = mongoose.Schema({
  _id : false,
  token : String,
  ts : Number
});

var LiveTeacherSchema = mongoose.Schema({
  username : String,
  online : [SessionSchema],
  status :  {type : String, default : "free"}
});

var LiveTeacherModel = mongoose.model('LiveTeacher', LiveTeacherSchema, 'live_teacher');

module.exports = {
  LiveTeacherModel : LiveTeacherModel
};