var mongoose = require('mongoose');

var NewsMonthlyDigestSchema = mongoose.Schema({
  name : String,
  publishDate : Date,
  url : String
});

module.exports = {
  model : mongoose.model('NewsMonthlyDigest', NewsMonthlyDigestSchema, 'news_monthly_digest')
};