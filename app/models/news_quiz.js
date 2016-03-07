var mongoose = require('mongoose');
var enumStatus = require('../utils/constants').enumStatus;


var NewsQuizSchema = mongoose.Schema({
  //main content
  questionIdList : [mongoose.Schema.ObjectId],

  //metadata
  type : String,
  publishDate : Date,
  nickname : String, //e.g "weekly-week-1-jun-2016"

  //admin
  status : {type : String, default : enumStatus.UPLOADED},
  editedBy : String, //email

  //always
  uploadedBy : String, //email
},
{
  timestamps : {} //assigns default createdAt and updatedAt fields
});

var enumNewsQuizType = {
  DAILY : 'Daily',
  WEEKLY : 'Weekly',
  MONTHLY : 'Monthly'
};

//Mongoose#model(name, [schema], [collection], [skipInit])
module.exports = {
  model : mongoose.model('NewsQuiz', NewsQuizSchema, 'news_quiz'),
  enumNewsQuizType : enumNewsQuizType
};