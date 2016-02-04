var mongoose = require('mongoose');

var AdminUserSchema = mongoose.Schema({
  email : String,
  name : String,
  password: String,
  role: String,
  createdAt : {type: Date, default: Date.now}
});

module.exports = mongoose.model('AdminUser', AdminUserSchema, 'adminuser');