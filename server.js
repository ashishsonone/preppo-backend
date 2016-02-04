var cluster = require('cluster');

console.log("spawning with cluster.isMaster=" + cluster.isMaster);

if(cluster.isMaster){
  //Master node server
  numCPUs = require('os').cpus().length;
  console.log("#M : pid = " + process.pid + ", numCPUs=" + numCPUs);
  for(var i=0; i < numCPUs; i++){
      cluster.fork();
  }

  cluster.on('fork', (worker) => {
      console.log("#M : fork msg : #" + worker.id + " " + (worker==cluster.workers[worker.id]));
  });

  cluster.on('online', (worker) => {
      console.log("#M : online msg : #" + worker.id);
  });

  cluster.on('listening', (worker, address) => {
      console.log("#M : listening msg : #" + worker.id);
      worker.send('bow before thy master');
  });

  cluster.on('message', (message) => {
      console.log("#M : received message : " + message.sender + " | " + message.msg);
  });

  cluster.on('exit', (worker, code, signal) => {
      if(worker.suicide == true){
          console.log("#M : suidice attempt of #" + worker.id + ", code=" + code + ", signal=" + signal);
      }
      else{
          console.log("#M : murder of #" + worker.id + ", code=" + code + ", signal=" + signal);
          console.log("#M : spawning another worker");
          cluster.fork();
      }
  });
}
else{
  //worker threads doing the actual work of api server
  //all import at one place
  var express = require('express');
  var bodyParser = require('body-parser');
  var mongoose = require('./app/utils/mongoose_robust');
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
  morgan.token('id', function(req, res){ return cluster.worker.id; }); //define a new token to log worker id also
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
}