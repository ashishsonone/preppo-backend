//generate a random string of given length,
//taking characters from the list provided
function getRandomString(len, allowedChars){
  var result = "";
  var allowedLen = allowedChars.length;

  for(var i=0; i<len; i++){
    var index = Math.floor(Math.random() * allowedLen);
    result += allowedChars[index];
  }

  return result;
}

//convert number into string, with minLen size, 
//padding left with 0 if necessary
function padZeroes(num, minLen){
  var s = num + "";
  while (s.length < minLen) s = "0" + s;
  return s;
}

module.exports.getRandomString = getRandomString;
module.exports.padZeroes = padZeroes;
