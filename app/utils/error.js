"use strict"

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
  NOT_FOUND : "NOT_FOUND"
};

function ErrorObject(error, description, debug){
  return {
    error : error,
    description : description,
    debug : debug
  }
}

module.exports = {
  errors : errors,
  ErrorObject : ErrorObject
};