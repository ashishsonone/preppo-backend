var mongoose = require('mongoose');

var RatingNewsQuizSchema = mongoose.Schema({
  quizId : mongoose.Schema.ObjectId,
  ratingCount : Number, //number of ratings received
  ratingSum : Number //sum of rating values
},
{
  timestamps : {} //assigns default createdAt and updatedAt fields
});

module.exports = {
  model : mongoose.model('RatingNewsQuiz', RatingNewsQuizSchema, 'rating_news_quiz'),
};