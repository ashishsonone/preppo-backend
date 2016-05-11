var mongoose = require('mongoose');

var LiveOtpSchema = mongoose.Schema({
  phone : String,
  otp : Number
},
{
  timestamps : {} //assigns default createdAt and updatedAt fields
});

module.exports = {
  model : mongoose.model('LiveOtp', LiveOtpSchema, 'live.otp'),
};