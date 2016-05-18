"use strict";
var shortid = require('shortid');

var ALPHABET = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz'.split('').sort().join('');

shortid.characters(ALPHABET);

var radix64 = require('radix-64')(ALPHABET);

//=====================================

//generate 10-digit random numeric id
//use 5 chars from <shortid> and then use radix64 to convert it to integer
//radix64.decodeToInt("zzzzz") = 1073741823  i.e 10 digits
//if the decoded int is not 10 digits just left pad with 1
function generateNumericId(){
  var sid = shortid.generate().substr(0, 5); //short id, 5 chars long
  var iid = radix64.decodeToInt(sid); //integer id

  var iidString = iid + "";

  iidString = leftPad(iidString, 10);
  return iidString;
}

function leftPad(str, maxLen){
  var padCount = maxLen - str.length;
  if(padCount <= 0){
    return str;
  }

  console.log("padding str |" + str + "|");
  for(var i = 0; i < padCount; i++){
    str = "1" + str;
  }

  return str;
}

function generateSequentialId(){
  var ts = new Date().getTime();
  var tsPart = radix64.encodeInt(ts); //timestamp part for sequential nature (7 chars long in time range 2015 to 2050)
  var shortIdPart = shortid.generate().substr(0, 3); //random shortid (just 3 chars long)

  var id = tsPart + shortIdPart; //total 10 chars long sequential id
  return id;
}

module.exports = {
  generateNumericId : generateNumericId,
  leftPad : leftPad,
  generateSequentialId : generateSequentialId
};