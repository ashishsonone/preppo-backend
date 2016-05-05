var mongoose = require('mongoose');

var LiveStudentSchema = mongoose.Schema({
  username : String,
  status :  {type : String, default : ""}
},
{
  timestamps : {} //assigns default createdAt and updatedAt fields
});

var LiveStudentModel = mongoose.model('LiveStudent', LiveStudentSchema, 'live.students');

module.exports = {
  model : LiveStudentModel
};