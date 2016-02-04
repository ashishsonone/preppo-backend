
function check(obj, type){
  if(obj && obj.constructor === type){
    return true;
  }
  return false;
}

function isString(obj){
  if(check(obj, String)){
    return obj;
  }
}

function isArray(obj){
  if(check(obj, Array)){
    return obj;
  }
}

function isMap(obj){
  //not an array but an object
  if(!check(obj, Array) && check(obj, Object)){
    return obj;
  }
}

function isDateString(obj){
  //should be a proper date string
  if(!isString(obj)){
    return null;
  }
  var date = new Date(obj);
  if(date.getDate()){
    return date;
  }
}

module.exports = {
  isString : isString,
  isArray : isArray,
  isMap : isMap,
  isDateString : isDateString
};