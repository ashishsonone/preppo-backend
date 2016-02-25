var mongoose = require('mongoose');
var enumStatus = require('../utils/constants').enumStatus;

var ContentSchema = mongoose.Schema({
  _id : false,
  heading : String,
  points : [String]
});

var NewsSchema = mongoose.Schema({
  //main content
  content : {
    english : ContentSchema,
    hindi : ContentSchema
  },

  imageWeb : String,
  imageMobile : String,

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