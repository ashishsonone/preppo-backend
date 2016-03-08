'use strict'

var express = require('express');
var passwordHash = require('password-hash');

var authApi = require('./auth');
var authApiHelper = require('./auth_help');
var UserModel = require('../../models/user').model;
var UserInviteModel = require('../../models/user_invite').model;
var stringUtils = require('../../utils/string_utils');

var errUtils = require('../../utils/error');

var router = express.Router();

//start ENDPOINT /v1/app/users

/*fetch logged-in user info. needs session token
*/
router.get('/me', authApiHelper.loginRequiredMiddleware, function(req, res){
  var id = req.session.userId; //it is the mongoose object id for the user
  var promise = UserModel
    .findById(id, {password : false, __v : false})
    .exec();

  promise = promise.then(
    function(user){
      if(!user){
        //username doesnot exist, throw error
        throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "requested resource not found", null, 404);
        return;
      }
      else{
        res.json(user);
        return;
      }
    }
  );

  promise.catch(
    function(err){
      //error caught and set earlier
      if(err && err.resStatus){
        res.status(err.resStatus);
        return res.json(err);
      }
      else{
        //uncaught error
        res.status(500);
        return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to get /me", err, 500));  
      }
    }
  );
});

/*Update user info. needs session token
  post params:
    name (optional)
    photo (optional)
    email (optional)
    location (optional)
    language (optional)
    password (optional)

  Can not update 'password' (for phone login : forgot password case)
  Use PUT /me/password instead
*/
router.put('/me', authApiHelper.loginRequiredMiddleware, function(req, res){
  var id = req.session.userId; //it is the mongoose object id for the user

  var changes = {};
  if(req.body.name){
    changes.name = req.body.name;
  }
  if(req.body.photo){
    changes.photo = req.body.photo;
  }
  if(req.body.email){
    changes.email = req.body.email;
  }
  if(req.body.location){
    changes.location = req.body.location;
  }
  if(req.body.language){
    changes.language = req.body.language;
  }
  if(req.body.password){
    changes.password = passwordHash.generate(req.body.password);
  }

  var promise = UserModel.findOneAndUpdate(
    {_id : id },
    {'$set' : changes},
    {new : true}, //return modified version of document
    function(err, result){
      if(err){
        res.status(500);
        res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to update self user", err, 500));
        return;
      }
      else if(!result){
        res.status(400);
        res.json(errUtils.ErrorObject(errUtils.errors.USER_NOT_FOUND, "user not found in db", null, 400));
      }
      else{
        //all ok
        res.json(result);
      }
    }
  );
});

/*delete a given user
  ENDPOINT EXISTS ONLY if server's process.env.ENV is 'local' or 'dev'
  REQUIRED query param 'password'
*/
if(process.env.ENV === 'local' || process.env.ENV === 'dev'){
  router.get('/:username/delete', function(req, res){
    var p = req.query.password;
    if(p !== "kitneaadmithe"){
      return res.json({message : "wrong password"});
    }

    UserModel.remove(
      {username : req.params.username}, 
      function(err, result){
        if(err){
          res.status(500);
          res.json(err);
        }
        else{
          res.json(result);
        }
      }
    );
  });
}

var AtoZ = "ABCDEFGHIJKLMNOPQRSTUVWY".split(''); //exclude X and Z

function createInvite(req){
  //find user using username or _id
  var username = req.session.username;
  var promise = UserModel.findOne({
    username : username
  });

  var codeName = null;
  var codeNumber = null;

  promise = promise.then(function(userObject){
    console.log("user object %j", userObject);

    if(userObject == null){
      throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "user not found", null, 404);
    }
    var name = userObject.name;
    name = name.replace(/\W/g, '').toUpperCase();

    if(name.length < 4){ //one extra letter for later purposes
      name += stringUtils.getRandomString(4, AtoZ);
    }

    codeName = name.slice(0, 4);
    var regex = new RegExp('^' + codeName);
    //find last invite code starting with codeName
    return UserInviteModel
      .find({
        code : {'$regex' : regex}
      })
      .sort({
        code : -1
      })
      .limit(1)
      .exec();

  });

  promise = promise.then(function(lastInviteList){
    console.log("last invite list " + lastInviteList.length);
    var code;
    if(lastInviteList.length == 0){
      codeNumber = "0001";
    }
    else{
      var code = lastInviteList[0].code;

      //extract codeName and codeNumber (it could be ASHIB0023 i.e 5 letter code name instead of 4 letter code name)
      codeName = code.replace(/[0-9]+/, '');

      codeNumber = code.replace(/[a-zA-Z]+/, '');

      codeNumber = parseInt(codeNumber);
      if(codeNumber < 9999){
        codeNumber = codeNumber + 1; //Math.floor(Math.random()*2 + 1); //increment by 1 or 2
        codeNumber = stringUtils.padZeroes(codeNumber, 4);
      }
      else {
        //need to get next codeName
        if(codeName.length <= 4){
          //first 5 letter codeName with given prefix - by adding 'A' at end
          codeName = codeName + "A";
        }
        else{
          //increment the last character of codeName part(hoping it won't reach 'Z' ever)
          var codeNameLen = codeName.length;
          var nextChar = String.fromCharCode(codeName.charCodeAt(codeNameLen - 1) + 1);
          codeName = codeName.slice(0, codeNameLen - 1) + nextChar;
        }
        codeNumber = "0001";
      }
    }

    //save this UserInvite object
    var invite = new UserInviteModel();
    invite.username = username;
    invite.code = codeName + codeNumber;
    invite.inviteList = [];
    console.log("invite to save %j", invite);
    return invite.save();
  });

  return promise;
}

/* return UserInvite for logged in user
   if it doesnot exist create one and return
*/
router.get('/invites/me', authApiHelper.loginRequiredMiddleware, function(req, res){
  var username = req.session.username;

  var promise = UserInviteModel.findOne({
    username : username
  }).exec();

  promise = promise.then(function(invite){
    if(invite != null){
      return invite;
    }
    console.log("/invite creating");
    return createInvite(req);
  });

  promise = promise.then(function(invite){
    //invite will be non null(either found or saved)
    res.json(invite);
  });

  promise.catch(function(err){
    //error caught and set earlier
    if(err.resStatus){
      res.status(err.resStatus);
      return res.json(err);
    }
    else{
      //uncaught error
      res.status(500);
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to get your invite", err));
    }
  });
});

/* return UserInvite for logged in user
   if it doesnot exist create one and return
*/
router.put('/invites/:code', authApiHelper.loginRequiredMiddleware, function(req, res){
  var username = req.session.username;
  var code = req.params.code;
  var promise = UserInviteModel.findOneAndUpdate(
    {
      code : code
    },
    {
      '$addToSet' : { inviteList : username }
    },
    {
      new : true
    }
  );

  promise = promise.then(function(invite){
    if(invite == null){
      throw errUtils.ErrorObject(errUtils.errors.NOT_FOUND, "invite code not found", null, 404);
    }
    res.json({success : true});
  });

  promise.catch(function(err){
    //error caught and set earlier
    if(err.resStatus){
      res.status(err.resStatus);
      return res.json(err);
    }
    else{
      //uncaught error
      res.status(500);
      return res.json(errUtils.ErrorObject(errUtils.errors.UNKNOWN, "unable to get your invite", err));
    }
  });
});

module.exports.router = router;
