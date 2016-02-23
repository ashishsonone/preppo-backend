var mongoose = require('mongoose');

var OTPSchema = mongoose.Schema({
  phone : String,
  otp : Number
},
{
  timestamps : {} //assigns default createdAt and updatedAt fields
});

module.exports = {
  model : mongoose.model('OTP', OTPSchema, 'otp'),
};