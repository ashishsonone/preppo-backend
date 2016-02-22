var mongoose = require('mongoose');
var enumStatus = require('../utils/constants').enumStatus;

var OptionSchema = {
  _id : false,
  optionString : String,
  correct : Boolean //-defaults to false
};

var QuestionSchema = {
  _id : false,
  questionString : String,
  options : [OptionSchema]
};

var NewsQuizQuestionSchema = mongoose.Schema({
  content : {
    english : QuestionSchema,
    hindi : QuestionSchema
  },

  //metadata
  level : Number,
  count : {type : Number, default : 0}, //approximate number of times it has been used in quiz
  category : String,

  //admin
  status : {type : String, default : enumStatus.UPLOADED},
  editedBy : String, //email
  editedAt : Date, //force to be equal to uploadedAt on creation

  //always
  uploadedBy : String, //email
  uploadedAt : {type : Date, default : Date.now}
});

//Mongoose#model(name, [schema], [collection], [skipInit])
module.exports = {
  model : mongoose.model('NewsQuizQuestion', NewsQuizQuestionSchema, 'news_quiz_question'),
  enumStatus : enumStatus
};