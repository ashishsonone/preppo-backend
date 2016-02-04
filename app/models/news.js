var mongoose = require('mongoose');

var enumStatus = {
  UPLOADED : 'uploaded',
  APPROVED : 'approved',
  PUBLISHED : 'published'
};

var NewsSchema = mongoose.Schema({
  //main content
  heading : String,
  points : [String],
  language : String, //hindi, english
  imageUrl : String,

  //metadata
  publishDate : Date,
  categories : [String],
  tags : [String],

  //admin
  status : {type : String, default : enumStatus.UPLOADED},
  editedBy : String, //email
  editedAt : Date,

  //always
  uploadedBy : String, //email
  uploadedAt : {type : Date, default : Date.now}
});

//Mongoose#model(name, [schema], [collection], [skipInit])
module.exports = {
  model : mongoose.model('News', NewsSchema, 'news'),
  enumStatus : enumStatus
};