var mongoose = require('mongoose');

var TokenSchema = mongoose.Schema({
  _id : String, //generated random token using shortid
  userId : mongoose.Schema.Types.ObjectId, //_id of user object
  username : String, //username of user object
  touch : Boolean, //field to touch the token
                   //(to update updatedAt everytime token is used in a request header)
                   //so that we can discard a token if not used for say a few weeks
},
{
  timestamps : {} //assigns default createdAt and updatedAt fields
});

module.exports = {
  model : mongoose.model('Token', TokenSchema, 'token'),
};