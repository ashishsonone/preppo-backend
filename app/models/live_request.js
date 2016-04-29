var mongoose = require('mongoose');

var LiveRequestSchema = mongoose.Schema({
  requestId : String, //init
  student : String, //init
  teacher : String, //after teacher selection
  sessionInfo : String, //after session over
  billingId : String //after payment
});

var LiveRequestModel = mongoose.model('LiveRequest', LiveRequestSchema, 'live_request');

module.exports = {
  model : LiveRequestModel
};