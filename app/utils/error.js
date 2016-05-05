"use strict"

/*
  response codes : 
  2xx
    200 : OK
    201 : created

  4xx
    400 : bad request
    401 : unauthenticated
    403 : unauthorized
    404 : not found

  5xx
    500 : internal server error
*/

/*
  custom error strings 'error' in response json data

  UNAUTHENTICATED
  UNAUTHORIZED

  DB_ERROR

  INVALID_CREDENTIALS
  INVALID_OBJECT_ID

  PARAMS_REQUIRED
  NOT_FOUND
*/

var errors = {
  UNAUTHENTICATED : "UNAUTHENTICATED",
  UNAUTHORIZED : "UNAUTHORIZED",

  DB_ERROR : "DB_ERROR",

  INVALID_CREDENTIALS : "INVALID_CREDENTIALS",
  INVALID_OBJECT_ID : "INVALID_OBJECT_ID",

  PARAMS_REQUIRED : "PARAMS_REQUIRED",
  NOT_FOUND : "NOT_FOUND",
  DUPLICATE : "DUPLICATE",

  //new general errors for app api
  THIRD_PARTY : "THIRD_PARTY",
  UNKNOWN : "UNKNOWN",

  //login related errors
  INVALID_OTP : "INVALID_OTP",
  USER_ALREADY_EXISTS : "USER_ALREADY_EXISTS",
  USER_NOT_FOUND : "USER_NOT_FOUND",
  INVALID_TOKEN : "INVALID_TOKEN", //for fb and google tokens

  //preppo live new errors
  BUSY : "BUSY" //already busy with another request(when student makes a request)
  //NOT_BUSY : "INVALID_REQUEST", //you're not currently busy with the request you're trying to modify
};

function ErrorObject(error, description, debug, resStatus){
  return {
    error : error,
    description : description,
    debug : debug,
    resStatus : resStatus
  }
}

module.exports = {
  errors : errors,
  ErrorObject : ErrorObject
};