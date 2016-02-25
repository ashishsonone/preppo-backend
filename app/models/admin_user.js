var mongoose = require('mongoose');

var AdminUserSchema = mongoose.Schema({
  email : String,
  name : String,
  password: String,
  role: String,
},
{
  timestamps : {} //assigns default createdAt and updatedAt fields
});

var enumRoles = {
  ADMIN : 'admin',
  UPLOADER : 'uploader',
  EDITOR : 'editor'
};

module.exports = {
  model : mongoose.model('AdminUser', AdminUserSchema, 'admin_user'),
  enumRoles : enumRoles
};