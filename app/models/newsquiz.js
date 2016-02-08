var mongoose = require('mongoose');

var enumStatus = {
  UPLOADED : 'uploaded',
  APPROVED : 'approved',
  PUBLISHED : 'published'
};

var QuestionSchema = mongoose.Schema({
  language : String,
  questionString : String,
  options : [{_id : false, optionString : String, correct : {type : Boolean, default : false}}]
}, {_id : false});

var NewsQuizSchema = mongoose.Schema({
  //main content
  content : [QuestionSchema],

  //metadata
  type : String,
  publishDate : Date,
  level : Number,

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
  model : mongoose.model('NewsQuiz', NewsQuizSchema, 'newsquiz'),
  enumStatus : enumStatus
};