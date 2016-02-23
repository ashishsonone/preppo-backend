var mongoose = require('mongoose');

var TokenSchema = mongoose.Schema({
  _id : String, //generated random token using shortid
  userId : mongoose.Schema.Types.ObjectId, //_id of user object
  username : String, //username of user object
});

module.exports = {
  model : mongoose.model('Token', TokenSchema, 'token'),
};