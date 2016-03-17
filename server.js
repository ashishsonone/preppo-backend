
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
var moment = require('moment');

var session = require('express-session');
var GooseSession = require('goose-session');

var appConfig = require('./config/config').app;
var mongoConfig = require('./config/config').mongo;
var sessionConfig = require('./config/config').session;
var debugConfig = require('./config/common').debug;

var adminApi = require('./app/routes/admin/admin');
var appApi = require('./app/routes/app/api');
var randomAajKaSawaalApi = require('./app/routes/random_stuff/aaj_ka_sawaal');

var healthUtil = require('./app/utils/health');

var app = express();

//disable etag (and hence trailing header causing frequent 502 errors)
app.set('etag', false);

//connect to mongo db
mongoose.connectWithRetry(mongoConfig.url, mongoConfig.poolSize);

//for extracting post parameters
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}));

//enable CORS
app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', req.headers.origin); //origins allowed for request, dynamically set to request's origin
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS, PATCH, PUT'); //type of methods allowed
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-session-token'); //allow headers starting with
  res.header('Access-Control-Allow-Credentials', true); //allow cookie to be sent

  if(req.method && req.method.toUpperCase() === 'OPTIONS'){
    if(debugConfig.debugFlag){
      console.log("OPTIONS URL=" + req.url + "| response Access-Control-Allow-Headers=" + res.get('Access-Control-Allow-Headers'));
      //console.log("OPTIONS HEADERS=%j", req.headers);
      //console.log("OPTIONS BODY=%j", req.body);
    }
    res.json({});
  }
  else{
    next();
  }
});

//loader.io load testing tool verification
app.get('/loaderio-62df51d7c17c6d40d6e8831e723ee4cd.txt', function(req, res){
  res.end("loaderio-62df51d7c17c6d40d6e8831e723ee4cd");
});

//root end point
app.get('/', function(req, res){
  res.json({message : "welcome to the unauthenticated root api endpoint"});
});

//health endpoint for use by google load balancer to know healthy VMs
app.get('/health',
  function(req, res){
    healthUtil.getHealth(function(h){
      if(h){
        res.status(200);
        res.json({running : true});
      }
      else{
        res.status(500);
        res.json({running : false});
      }
    });
  }
);

app.get('/health-db',
  function(req, res){
    var promise = require('./app/routes/admin/users').getAdminUserCount();
    promise.then(function(result){
      res.json(result);
    });
    promise.catch(function(err){
      res.json(err);
    });
  }
);

//enable console logging using morgan
morgan.token('id', function(req, res){ return myId; }); //define a new token to log worker id also

//timestamp
var formatString = 'YY-MM-DDTHH:mm:ss.SSSZ';
morgan.token('ts', function(req, res){return moment().utcOffset('+0530').format(formatString)});
//to get back moment time from the string : parsed = moment(string, formatString)
var morganFormat = morgan('#:id :ts :method :url :status :response-time ms - :res[content-length]'); //define the new format
app.use(morganFormat); //use the new format

// If debug flag is ON, then register this middleware
// show debug stuff - request headers, query params & body
if(debugConfig.debugFlag){
  app.use(function(req, res, next){
      console.log("HEADERS=%j || QUERY=%j || BODY=%j", req.headers, req.query, req.body);
    next();
  });
}
//--------------------------------
//the admin api
var gooseStore = GooseSession(mongoose, {
  collection : 'sessions'
});

//enable express-session only for the admin api
var sessionOptions = {
  store : gooseStore,
  secret : sessionConfig.secret,
  resave : false, //force save back to session store on every request even when not modified
  saveUninitialized : false, //save session into store even if not initialized(e.g not logged in)
  cookie: {httpOnly: false, expires: new Date(253402300000000)}
};

var adminSesionMiddleWare = session(sessionOptions);
app.use('/v1/admin', adminApi.router(adminSesionMiddleWare));

//---------------------------------
//product api
app.use('/v1/app/', appApi.router());

//random aaj ka sawaal api
app.use('/v1/randomstuff/aajkasawaal', randomAajKaSawaalApi.router);

//listen to port
app.listen(appConfig.port);
console.log("#" + myId + " pid=" + process.pid + " listening on port=" + appConfig.port);