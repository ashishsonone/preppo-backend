var mongoose = require('mongoose');

var StatsSchema = mongoose.Schema({
  _id : false,
  category : String,
  attempted : Number,
  correct : Number
});

var StatsNewsQuizCumulativeSchema = mongoose.Schema({
  username : String, //username of user
  stats : mongoose.Schema.Types.Mixed //will look like this
  //stats : { 
  //  politics : {attempted : 3, correct : 4}
  //}
},
{
  timestamps : {} //assigns default createdAt and updatedAt fields
});

//update-cum-insert can be common
//db.cumulative.update(
//  {username : 'hardik'}, 
//  {$inc : {'stats.international affairs.attempted' :6, 'stats.international affairs.correct' : 2}}
//  {upsert : true}
//)

//Mongoose#model(name, [schema], [collection], [skipInit])
module.exports = {
  model : mongoose.model('StatsNewsQuizCumulative', StatsNewsQuizCumulativeSchema, 'stats_news_quiz_cumulative')
};