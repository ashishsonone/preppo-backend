var mongoose = require('mongoose');

var LiveTokenSchema = mongoose.Schema({
  _id : String, //<shortid> + "|" + <device name>
  username : String, //username of user object
  role : String, //either 'teacher' or 'student'
  touch : Boolean, //field to touch the token
                   //(to update updatedAt everytime token is used in a request header)
                   //so that we can discard a token if not used for say a few weeks
},
{
  timestamps : {} //assigns default createdAt and updatedAt fields
});

module.exports = {
  model : mongoose.model('LiveToken', LiveTokenSchema, 'live.tokens'),
};