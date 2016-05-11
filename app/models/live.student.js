var mongoose = require('mongoose');

var LiveStudentSchema = mongoose.Schema({
  name : String,
  username : String,
  password: String,
  phone : String, //same as username as login via phone allowed as of now

  status :  {type : String, default : ""}
},
{
  timestamps : {} //assigns default createdAt and updatedAt fields
});

var LiveStudentModel = mongoose.model('LiveStudent', LiveStudentSchema, 'live.students');

module.exports = {
  model : LiveStudentModel
};