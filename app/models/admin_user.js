var mongoose = require('mongoose');

var AdminUserSchema = mongoose.Schema({
  email : String,
  name : String,
  password: String,
  role: String,
  createdAt : {type: Date, default: Date.now}
});

var enumRoles = {
  ADMIN : 'admin',
  UPLOADER : 'uploader',
  EDITOR : 'editor'
};

module.exports = {
  model : mongoose.model('AdminUser', AdminUserSchema, 'adminuser'),
  enumRoles : enumRoles
};