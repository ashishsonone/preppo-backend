var mongoose = require('mongoose');

var LiveStudentSchema = mongoose.Schema({
  name : String,
  username : String, //random numeric id
  password: String,
  phone : String, //verified phone number
},
{
  timestamps : {} //assigns default createdAt and updatedAt fields
});

var LiveStudentModel = mongoose.model('LiveStudent', LiveStudentSchema, 'live.students');

module.exports = {
  model : LiveStudentModel
};