var mongoose = require('mongoose');

var StatsNewsQuizIndividualSchema = mongoose.Schema({
  username : String, //username of user
  month : String, //2016-03 for march 2016
  stats : mongoose.Schema.Types.Mixed
  //stats : { 
  //  quiz_id_1 : [30, 24] //means 30 attempted, 24 correct
  //  quiz_id_2 : [13, 10]
  //}
},
{
  timestamps : {} //assigns default createdAt and updatedAt fields
});

//Mongoose#model(name, [schema], [collection], [skipInit])
module.exports = {
  model : mongoose.model('StatsNewsQuizIndividual', StatsNewsQuizIndividualSchema, 'stats_news_quiz_individual')
};