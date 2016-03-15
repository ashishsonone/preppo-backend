var mongoose = require('mongoose');

var FeedbackSchema = mongoose.Schema({
  username : String, //phone number, fb id or google id (TODO : make a unique index on this)
  message : String //feedback content
},
{
  timestamps : {} //assigns default createdAt and updatedAt fields
});

module.exports = {
  model : mongoose.model('Feedback', FeedbackSchema, 'feedback'),
};