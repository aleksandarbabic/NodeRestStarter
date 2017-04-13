var express = require('express'),
	mongo = require('./db/mongo'),
    bodyParser = require('body-parser'),
    logger = require('morgan'),
    routes = null;

var app = express()
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
app.use(logger('dev'))

mongo.init(function (error, database) {
    if (error)
        throw error;
    if(database != null) {
    	console.log("### Has db");
        routes = require('./routes/routes')(database)
    } else {
    	console.log("### NO db");
    	res.json({
			"status": 500,
			"message": "Oops something went wrong",
			"error": "Database initialization error"
		});
    }
    
    
    app.all('/collections/*', routes.jwtDecode);
//    app.use('/', require('./routes/routes'));
//    // If no route is matched by now, it must be a 404
//    app.use(function(req, res, next) {
//      var err = new Error('Not Found');
//      err.status = 404;
//      next(err);
//    });
    
	app.param('collectionName', function(req, res, next, collectionName){
	  req.collection = collectionName;
	  return next()
	})

	app.get('/', function(req, res, next) {
	  res.send('please select a collection, e.g., /collections/messages')
	})

	app.post('/auth', routes.getToken);
	app.get('/collections/:collectionName', routes.getAll);
	app.post('/collections/:collectionName', routes.postUser);
	app.get('/ranking/:collectionName', routes.getRanking);

	app.listen(3000);
	console.log('Listening on port 3000...');
});