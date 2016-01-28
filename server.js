var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');

var mongoConfig = require('./config/mongo');
var routes = require('./app/routes/admin_routes');

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}));

mongoose.connect(mongoConfig.url);

app.use('/v1/admin', routes.adminRouter);

app.listen(8002);