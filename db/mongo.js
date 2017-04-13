var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;

module.exports.init = function (callback) {

	MongoClient.connect("mongodb://<IP>:<PORT>/<DBNAME>", function(err, database) {
		if(err) throw err;
	    console.log("Database opened");
	    console.log("Connected to '<DBNAME>' database");
	    callback(err,database);
	});
}