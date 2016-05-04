var mongoose = require('mongoose');

var DetailsSchema = mongoose.Schema({
  _id : false,
  topic : String
});

var LiveRequestSchema = mongoose.Schema({
  requestId : String, //init
  student : String, //init
  details: DetailsSchema, //init - to decide on its schema
  teacher : {type : String, default : ""}, //set after teacher selection
  sessionInfo : String, //after session over
  billingId : String //after payment
},
{
  timestamps : {} //assigns default createdAt and updatedAt fields
});

var LiveRequestModel = mongoose.model('LiveRequest', LiveRequestSchema, 'live_requests');

module.exports = {
  model : LiveRequestModel
};