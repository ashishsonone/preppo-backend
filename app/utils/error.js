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
  DUPLICATE : "DUPLICATE"
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