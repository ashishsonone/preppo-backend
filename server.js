//configuration either as a worker or standalone server
//special setup for mongoose disconnect
var cluster = require('cluster');
var mongoose = require('./app/utils/mongoose_robust');

var myId = 'S'; //by default standalone
if(cluster.isWorker){
  myId = cluster.worker.id; //if worker then, give its worker id

  cluster.worker.on('disconnect', function(message){
    mongoose.suicide = true; //so that it doesnot try to reconnect on connection close
    mongoose.connection.close(); //important to stop the node event loop and thereby exit
    //process.exit(); //no need, as master will kill if worker doesnot exit within timeout period
    console.log("#" + cluster.worker.id + ": disconnect");
  });
}

//Actual Server code
var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');

var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

var appConfig = require('./config/app')
var mongoConfig = require('./config/mongo');
var sessionConfig = require('./config/session');
var adminApi = require('./app/routes/admin');

var app = express();

//connect to mongo db
mongoose.connectWithRetry(mongoConfig.url);

//enable CORS
app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', req.headers.origin); //origins allowed for request, dynamically set to request's origin
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS, PATCH, PUT'); //type of methods allowed
  res.header('Access-Control-Allow-Headers', 'Content-Type'); //allow headers starting with
  res.header('Access-Control-Allow-Credentials', true); //allow cookie to be sent
  next();
});

//enable console logging using morgan
morgan.token('id', function(req, res){ return myId; }); //define a new token to log worker id also
var morganFormat = morgan('#:id :method :url :status :response-time ms - :res[content-length]'); //define the new format
app.use(morganFormat); //use the new format

//for extracting post parameters
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}));

//the admin api
//enable express-session only for the admin api
var sessionOptions = {
  secret : sessionConfig.secret,
  resave : false, //force save back to session store on every request even when not modified
  saveUninitialized : false, //save session into store even if not initialized(e.g not logged in)
  store : new MongoStore({
    mongooseConnection: mongoose.connection //reuse the mongoose connection
  }),
  cookie: {httpOnly: false, expires: new Date(253402300000000)}
};
app.use('/v1/admin', session(sessionOptions));
app.use('/v1/admin', adminApi.router);

app.get('/', function(req, res){ res.json({message : "welcome to the unauthenticated api endpoint"})});

//listen to port
app.listen(appConfig.port);
console.log("#" + myId + " pid=" + process.pid + " listening on port=" + appConfig.port);