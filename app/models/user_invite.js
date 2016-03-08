var mongoose = require('mongoose');

var UserInviteSchema = mongoose.Schema({
  username : String, //phone number, fb id or google id (TODO : make a unique index on this)
  code : String, //invite code such as ASHI2313
  inviteList : [String], //array of username of those invited successfully
},
{
  timestamps : {} //assigns default createdAt and updatedAt fields
});

module.exports = {
  model : mongoose.model('UserInvite', UserInviteSchema, 'user_invite'),
};