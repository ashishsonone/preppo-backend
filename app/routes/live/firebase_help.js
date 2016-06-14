var firebaseConfig = require('../../../config/config').firebase;
var firebase = require('firebase');

var FIREBASE_BASE_URL = firebaseConfig.baseUrl;
var FIREBASE_SECRET = firebaseConfig.secret;

var rootRef = new Firebase(FIREBASE_BASE_URL);

//IMPORTANT admin-level access to the firebase database(all references)
rootRef.authWithCustomToken(FIREBASE_SECRET,function(error, result) {
  if (error) {
    console.log("Authentication Failed!", error);
  } else {
    console.log("Authenticated successfully with payload:", result.auth);
    console.log("Auth expires at:", new Date(result.expires * 1000));
  }
});

module.exports = {
  firebase : firebase,
  rootRef : rootRef
};