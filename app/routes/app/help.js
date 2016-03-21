'use strict'
var express = require('express');
var router = express.Router();
var errUtils = require('../../utils/error');

router.get('/help', function(req, res){
  res.json({
    message : "Welcome to app api home page", 
    api : [
      {
        "endpoint" : "GET /v1/app/help", 
        "info" : "See this help page",
      },
      {
        "endpoint" : "GET /v1/app/auth/help",
        "info" : "help page for auth api - login, logout, otp, signup",
      },
      {
        "endpoint" : "GET /v1/app/users/help",
        "info" : "help page for users api - get user info, update user info, etc",
      },
      {
        "endpoint" : "GET /v1/app/news/help",
        "info" : "help page for news api : get daily updates, get montly digest",
      },
      {
        "endpoint" : "GET /v1/app/news/quiz/help",
        "info" : "help page for news quiz api - get quiz list, get content of a quiz",
      },
      {
        "endpoint" : "GET /v1/app/extra/help",
        "info" : "help page for extra api - currently for feedback endpoint",
      }
    ],
    errorObject : {
      "info" : "if the response is 2xx, then the api call was success. Otherwise if the error was caught on server-side, then there will be a error object in the body of response. Error object will be a JSON. Its structure will be as follows:",
      "errorSchema" : {
        "error" : "string - e.g 'USER_NOT_FOUND' - like a code to identify the error in client code",
        "description" : "string - human readable description of what went wrong",
        "debug": "JSON : in case the error was unknown like some unexpected database error, or gupshup api call error or some other, this will be set for debugging purpose",
        "resStatus" : "number(integer) : used internally in the server side code"
      }
    },
    errors : [
      {
        "error" : errUtils.errors.UNAUTHENTICATED,
        "info" : "not logged in and accessing a api endpoint which requires session"
      },
      {
        "error" : errUtils.errors.PARAMS_REQUIRED,
        "info" : "insufficient data or parameters provided to access the api"
      },
      {
        "error" : errUtils.errors.INVALID_OTP,
        "info" : "phone login or signup - otp not valid"
      },
      {
        "error" : errUtils.errors.USER_ALREADY_EXISTS,
        "info" : "during signup : user already exists"
      },
      {
        "error" : errUtils.errors.UNKNOWN,
        "info" : "general error : unknown unexpected error - handle gracefully client side"
      },
      {
        "error" : errUtils.errors.NOT_FOUND,
        "info" : "general error : resource not found"
      },
      {
        "error" : errUtils.errors.USER_NOT_FOUND,
        "info" : "during login : no such user not found"
      },
      {
        "error" : errUtils.errors.THIRD_PARTY,
        "info" : "general error : due to 3rd party service like gupshup"
      },
      {
        "error" : errUtils.errors.INVALID_CREDENTIALS,
        "info" : "phone login : password did not match"
      },
      {
        "error" : errUtils.errors.INVALID_TOKEN,
        "info" : "fb & google login/signup : invalid token - e.g expired token"
      }
    ]
  });
});

var uSchema = {
  "_id" : "string : mongodb object id",
  "username" : "string : could be phone number, fb id, google id",
  "name" : "string",
  "password" : "string : only in case of phone login",
  "photo" : "string : url",
  "email" : "string",
  "phone" : "string : 10 digit number",
  "location" : "string : city - optional",
  "language" : "string : language preference. e.g hindi, english",
  "sharedOnFb" : "boolean : whether shared the app link on fb",

  "createdAt" : "string : date in iso 8601 format. e.g '2016-02-23T16:29:31.000Z'",
  "updatedAt" : "string : date in iso 8601 format"
};

var UserInviteSchema = {
  "username" : "string - unique",
  "code" : "unique invite code for each user - e.g AS0231",
  "inviteList" : "array of usernames of people successfully invited"
};

router.get('/auth/help', function(req, res){
  res.json({
    message : "Welcome to auth api home page", 
    UserSchema : uSchema,
    api : [
      {
        "endpoint" : "GET /v1/app/auth/help", 
        "info" : "See this help page",
      },
      {
        "endpoint" : "POST /v1/app/auth/signup", 
        "info" : "User signup",
        "return" : {
          "user" : "<user object>", 
          "x-session-token" : "<session token>(string)",
          "isNewUser" : "<boolean> true/false - whether new user created - to track signup"
        },
        "required" : [
          "for phone : [phone, otp, name, password]",
          "for fb : [fbToken]",
          "for google : [googleToken]"
        ],
        "optional" : [
          "for phone : [photo, email, location, language]",
          "for fb & google: [photo, location, language]"
        ],
        "possible errors" : "[USER_ALREADY_EXISTS, INVALID_OTP, INVALID_TOKEN]"
      },
      {
        "endpoint" : "POST /v1/app/auth/otp",
        "info" : "Generate otp. Valid for 5 minutes",
        "return" : "200 OK",
        "required" : "phone - string - 10 digit number",
      },
      {
        "endpoint" : "POST /v1/app/auth/login",
        "info" : "User login",
        "return" : {
          "user" : "<user object>", 
          "x-session-token" : "<session token>(string)",
          "isNewUser" : "<boolean> true/false - whether new user created - to track signup"
        },
        "required" : [
          "for phone login : [(phone & otp) OR (phone & password)]",
          "for fb : [fbToken]",
          "for google : [googleToken]"
        ],
        "possible errors" : "[USER_NOT_FOUND, INVALID_OTP, INVALID_CREDENTIALS, INVALID_TOKEN]"
      },
      {
        "endpoint" : "GET /v1/app/auth/logout",
        "info" : "User logout",
        "return" : "200 OK",
        "headers required" : {
          "x-session-token" : "<session token string> recieved during login or signup"
        }
      },
    ]
  });
});

router.get('/users/help', function(req, res){
  res.json({
    message : "Welcome to users api home page", 
    UserSchema : uSchema,
    UserInviteSchema : UserInviteSchema,
    api : [
      {
        "endpoint" : "GET /v1/app/users/help", 
        "info" : "See this help page",
      },
      {
        "endpoint" : "GET /v1/app/users/me", 
        "info" : "(login required) Get info of current logged in user",
        "return" : "<user object>",
        "headers required" : {
          "x-session-token" : "<session token string> recieved during login or signup"
        },
        "possible errors" : "[UNAUTHENTICATED, NOT_FOUND]"
      },
      {
        "endpoint" : "PUT /v1/app/users/me", 
        "info" : "(login required) Update info of current logged in user(including password reset)",
        "optional" : "[name, photo, email, location, language, password, sharedOnFb]",
        "return" : "updated <user object>",
        "headers required" : {
          "x-session-token" : "<session token string> recieved during login or signup"
        },
        "possible errors" : "[UNAUTHENTICATED, NOT_FOUND]"
      },
      {
        "endpoint" : "GET /v1/app/users/invites/me", 
        "info" : "(login required) get my UserInvite object",
        "return" : "<User Invite object>",
        "headers required" : {
          "x-session-token" : "<session token string> recieved during login or signup"
        },
        "possible errors" : "[UNAUTHENTICATED, NOT_FOUND]"
      }
    ]
  });
});

var NewsContentSchema = {
  "heading" : "string",
  "points" : "[string]"
};

var NewsMonthlyDigestSchema = {
  "name" : "string",
  "publishDate" : "date string",
  "url" : "string",
  "language" : "string in [english, hindi]"
};

var NewsSchema = {
  "content" : {
    "english" : "ContentSchema",
    "hindi" : "ContentSchema"
  },
  "imageMobile" : "string",
  "imageWeb" : "string",

  "publishDate" : "date",
  "updatedAt" : "date string",
  "createdAt" : "date string"
};

router.get('/news/help', function(req, res){
  res.json({
    message : "Welcome to news api home page", 
    ContentSchema : NewsContentSchema,
    NewsSchema : NewsSchema,
    MonthlyDigestSchema : NewsMonthlyDigestSchema,
    api : [
      {
        "endpoint" : "GET /v1/app/news/help", 
        "info" : "See this help page",
      },
      {
        "endpoint" : "GET /v1/app/news", 
        "info" : "(login NOT required) Get published news items for given date",
        "required query params" : "[date] - date will be of form 2016-02-27 (i.e. YYYY-MM-DD)",
        "return" : "array of news items",
        "possible errors" : "[]"
      },
      {
        "endpoint" : "GET /v1/app/news/monthlydigest", 
        "info" : "(login required) Get list of monthly digest items",
        "return" : "array of monthly digest items",
        "possible errors" : "[]"
      }
    ]
  });
});


var NewsQuizSchema = {
  //questionIdList : ["string"],
  type : "string - e.g [Weekly, Daily, Monthly]",
  publishDate : "date string",
  nickname : "string - e.g weekly-week-1-march, daily-2016-02-23",

  updatedAt : "date string",
  createdAt : "date string"
};

var NewsQuizQuestionOptionSchema = {
  optionString : "string",
  correct : "boolean"
};

var NewsQuizQuestionContentSchema = {
  questionString : "string",
  solution : "string",
  options : ["NewsQuizQuestionOptionSchema"]
};

var NewsQuizQuestionSchema = {
  content : {
    english : "NewsQuizQuestionContentSchema",
    hindi : "NewsQuizQuestionContentSchema"
  },
  level : "number",

  updatedAt : "date string",
  createdAt : "date string"
};

router.get('/news/quiz/help', function(req, res){
  res.json({
    message : "Welcome to news quiz api home page", 
    NewsQuizSchema : NewsQuizSchema,
    NewsQuizQuestionSchema : NewsQuizQuestionSchema,
    NewsQuizQuestionContentSchema : NewsQuizQuestionContentSchema,
    NewsQuizQuestionOptionSchema : NewsQuizQuestionOptionSchema,
    api : [
      {
        "endpoint" : "GET /v1/app/news/quiz/help", 
        "info" : "See this help page",
      },
      {
        "endpoint" : "GET /v1/app/news/quiz", 
        "info" : [
          "(login required)",
          "if 'lt' param NOT given return only 1 latest daily quiz, and all weekly and monthly quizzes. The daily quiz will be at the top",
          "if 'lt' param given, return only weekly & monthly quizzes with publishDate <= lt"
        ],
        "optional query params" : [
          "lt - lt is date string in form YYYY-MM-DD or ISO string. get weekly and monthly quiz items with publishDate<=lt",
          "limit - number of items to return - default=15, upper-limit=50"],
        "return" : "array of <NewsQuiz> items",
        "possible errors" : "[]"
      },
      {
        "endpoint" : "GET /v1/app/news/quiz/<quizid>",
        "info" : "(login REQUIRED) get a quiz item with all its questions",
        "return" : "[<NewsQuizQuestion>]",
        "headers required" : {
          "x-session-token" : "<session token string> recieved during login or signup"
        },
        "possible errors" : "[UNAUTHENTICATED, NOT_FOUND]"
      }
    ]
  });
});

router.get('/stats/news/quiz/help', function(req, res){
  res.json({
    message : "Welcome to stats api for news quiz home page", 
    StatsNewsQuizCumulativeSchema: {
      username : "string - username of user",
      stats : {
        "politics" : { "attempted" : 10, "correct" : 6},
        "international" : {"attempted" : 23, "correct" : 19}
      }
    },
    StatsNewsQuizSingleSchema: {
      username : "string - username of user",
      publishDate : "date string - quiz publish date",
      attempted : "number",
      correct : "number"
    },
    api : [
      {
        "endpoint" : "GET /v1/app/stats/news/quiz/help", 
        "info" : "See this help page",
      },
      {
        "endpoint" : "GET /v1/app/stats/news/quiz/cumulative", 
        "info" : "(login required) Get your cumulative stats for news quiz",
        "return" : "<StatsNewsQuizCumulativeSchema>",
        "possible errors" : "[UNAUTHENTICATED, NOT_FOUND]"
      },
      {
        "endpoint" : "PUT /v1/app/stats/news/quiz/cumulative", 
        "info" : "(login required) update your cumulative stats for news quiz",
        "required" : [
          "updates - contains increments to be made in each category. " + 
          "Must be a map like {'politics' : {'attempted' : 20, 'correct' : 12}}. "
          ],
        "return" : "<StatsNewsQuizCumulativeSchema> - updated one",
        "possible errors" : "[UNAUTHENTICATED]"
      },
      {
        "endpoint" : "GET /v1/app/stats/news/quiz/single",
        "info" : "(login required) Get your individual quiz-wise stats ordered by quiz publish date",
        "optional params" : [
          "lt - date string - to get older stats with publishDate <= lt",
          "limit - number - how many items to return (max 50)",
          "minimal - 0 or 1 - when minimal=1, return only fields=[_id, publishDate, quizId, attempted, correct]. Otherwise return all fields extra=[updatedAt, createdAt, username]"
          ],
        "return" : "[<StatsNewsQuizSingleSchema>] - array - could be empty if none found",
        "possible errors" : "[UNAUTHENTICATED]"
      },
      {
        "endpoint" : "PUT /v1/app/stats/news/quiz/single", 
        "info" : "(login required) update your individual stats for news quiz",
        "required" : [
          "quizId - object id of quiz",
          "publishDate - date string = quiz's publish date",
          "attempted - number",
          "correct - number"
          ],
        "return" : "<StatsNewsQuizSingleSchema> - updated one",
        "possible errors" : "[UNAUTHENTICATED]"
      }
    ]
  });
});

router.get('/extra/help', function(req, res){
  res.json({
      message : "Welcome to 'extra' api home page",
      FeedbackSchema: {
        username : "string",
        message : "string"
      },
      RatingNewsQuiz: {
        quizId : "string",
        ratingCount : "number",
        ratingSum : "number",
      },
      api : [
        {
          "endpoint" : "GET /v1/app/extra/help",
          "info" : "See this help page",
        },
        {
          "endpoint" : "POST /v1/app/extra/feedback",
          "info" : "create a new feedback entry",
          "return" : "newly created <feedback> entry",
          "required" : [
            "message : string - the feedback message"
          ],
          "optional" : [
            "username : string - if available"
          ]
        },
        {
          "endpoint" : "POST /v1/app/extra/ratings/news/quiz",
          "info" : "submit a quiz rating",
          "return" : "updated news quiz rating entry",
          "required" : [
            "quizId : object id of the quiz",
            "rating : number in [0-5]. Can be decimal"
          ]
        }
      ]
    }
  );
});


module.exports.router = router;