var mongoose = require('mongoose');

var StatsNewsQuizSingleSchema = mongoose.Schema({
  username : String, //username of user
  publishDate : Date, //date string
  quizId : mongoose.Schema.ObjectId, //quiz id
  attempted : Number,
  correct : Number
},
{
  timestamps : {} //assigns default createdAt and updatedAt fields
});

//Mongoose#model(name, [schema], [collection], [skipInit])
module.exports = {
  model : mongoose.model('StatsNewsQuizSingle', StatsNewsQuizSingleSchema, 'stats_news_quiz_single')
};