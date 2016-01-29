var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');

var session = require('express-session');
var MongoStore = require('connect-mongo')(session);


var mongoConfig = require('./config/mongo');
var sessionConfig = require('./config/session');
var sessionOptions = {
  secret : sessionConfig.secret,
  resave : false, //force save back to session store on every request even when not modified
  saveUninitialized : false, //save session into store even if not initialized(e.g not logged in)
  store : new MongoStore({
    url : mongoConfig.url
  }),
  cookie: { httpOnly: false }
};


var routes = require('./app/routes/admin_routes');

var app = express();

//enable CORS
app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Credentials', true);
  next();
});

//enable session
app.use(session(sessionOptions));

//for post parameters
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}));

//connect to mongo db
mongoose.connect(mongoConfig.url);

app.use('/v1/admin', routes.adminRouter);

app.listen(8002);