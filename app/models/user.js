var mongoose = require('mongoose');

var UserSchema = mongoose.Schema({
  username : String, //phone number, fb id or google id (TODO : make a unique index on this)
  password : String, //only in case of phone number

  name : String,
  
  photo : String, //url
  email : String,
  phone : String,
  location : String, //city
  language : String //language preference hindi, english
},
{
  timestamps : {} //assigns default createdAt and updatedAt fields
});

module.exports = {
  model : mongoose.model('User', UserSchema, 'user'),
};