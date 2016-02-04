var mongoose = require('mongoose');

var NewsSchema = mongoose.Schema(
  {
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
    approved : {type : Boolean, default : false},
    approvedBy : String, //email
    approvedAt : Date,

    //always
    uploadedBy : String, //email
    createdAt : {type : Date, default : Date.now}
  }
);

//Mongoose#model(name, [schema], [collection], [skipInit])
module.exports = mongoose.model('News', adminUserSchema, 'news');