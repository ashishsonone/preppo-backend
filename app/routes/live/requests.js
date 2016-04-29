'use strict'

var express = require('express');
var RSVP = require('rsvp');

var errUtils = require('../../utils/error');

//START PATH /v1/live/requests/

var router = express.Router();

/*post a teaching request
*/
router.post('/', function(req, res){
  res.json({message : "post /requests/ - not yet implemented"});
});

module.exports.router = router;