var BSON = require('bson').BSONPure;
var http = require('http'),
request = require('request'),
jwt = require('jwt-simple'),
constants = require('../config/const'),
twitterOAuth = require('../auth/twitterOAuth'),
util = require('util');;

var expiresIn = function(numDays) {
	var dateObj = new Date();
	return dateObj.setDate(dateObj.getDate() + numDays);
}

module.exports = function(db){
	var _this = this;
	var module = {};
	module.getAll = function(req, res) {
		db.collection(req.collection, function(err, collection) {
			collection.find().toArray(function(err, items) {
				res.send(items);
			});
		});
	};

	module.getRanking = function(req, res) {
		db.collection(req.collection, function(err, collection) {
			collection.find({
				score:{$ne : ""}
			}, {
				_id: 0, unique_id: 1, firstName: 1, lastName: 1, fullName: 1, nickName: 1, score: 1, rank: 1, lastTaskDateTime: 1
			}, {
				sort: {
					'score': -1, 'lastTaskDateTime': 1
				}
			}).toArray(function(err, items) {
				res.send(items);
			});
		});
	};

	module.postUser = function(req, res, next) {
		var user = req.body;

		db.collection(req.collection, function(err, collection) {

			try {

				if(!user || !user.unique_id) {
					console.log('No unique_id');
					return next('Ooops! Error with data insert.');
				}
				if(user._id != '') {
					var _id = user._id;
					delete user._id;
					console.log('user._id exist');
					collection.update({'_id':new BSON.ObjectID(_id)}, user, {safe: true, multi: false}, function(e, result){
						if (e) return next(e)
						console.log('update by id');

						collection.findOne({'_id':new BSON.ObjectID(_id)}, function(err, item) {
							if (err) return next(err)
							console.log('update by id -> find by id response\n'+JSON.stringify(item));
							res.send(item);
						});
					});
				} else {
					collection.count({'unique_id': user.unique_id}, function (err, count) {
						if(count > 0) {
							/*
							 * MUST UPDATE ONLY IMPORTANT FIELDS
							 * Define logic to include only updated or important params
							 */
							console.log('### update by uniqueId: '+JSON.stringify(user)+'\n');
							var userNew = {};
							delete user._id;
							for(var attributename in user) {
								userNew[attributename]=user[attributename];
							}
							console.log('### userNew: '+JSON.stringify(userNew)+'\n');
							collection.findAndModify({'unique_id': userNew.unique_id}, [['_id','asc']], userNew, {safe: true, multi: false}, function(e, result){
								if (e) return next(e)
								console.log('response update by uniqueId result: '+JSON.stringify(result)+'\n');

								collection.findOne({'_id': new BSON.ObjectID(result.value._id)}, function(err, item) {
									if (err) return next(err)
									console.log('update by uniqueId -> find by id response: '+JSON.stringify(item)+'\n');
									res.send(item);
								});
							});

						} else {
							var _id = user._id;
							delete user._id;
							collection.insert(user, {safe:true}, function(e, result){
								if (e) {
									console.log('Error occured ' + e);
									return next(e)
								}
								collection.findOne({'_id': new BSON.ObjectID(result.insertedIds[0])}, function(err, item) {
									if (err) return next(err)
									console.log('insert -> find by id response data\n'+JSON.stringify(item)+'\n');
									res.send(item);
								});
							});
						}
					});
				}
			} catch(e) {
				console.log('ERROR: '+e);
			}

		});
	};



	/* AUTHENTICATION */
	module.getToken = function(req, res) {
		// Grab the social network and token
		var network = req.body.network;
		var socialToken = req.body.socialToken;

		if(network == undefined || socialToken == undefined){
			console.log('ERROR: Invalid parameter(s)');
			res.json({result: "Invalid parameter(s)"});
			return;
		}
		// Validate the social token
		console.log('Invoke validateSocial: '+network+'/'+JSON.stringify(socialToken));
		module.validateSocial(network, socialToken).then(function (profile) {
			// Return the user data we got from Social Network
//			console.log('VALIDATE SOCIAL SUCCESS\n');
			console.log('validateSocial Success profile: '+JSON.stringify(profile)+"\n");
			var token = module.jwtEncode(network, socialToken, profile.id);
			res.json(token);
		}).catch(function (err) {
			res.json({result: "AuthError - "+err});
		});
	};

	module.validateSocial = function(network, socialToken) {
		if(network=='facebook'){
			console.log('facebook: '+constants.social[network].VERIFY_URL);
			return new Promise(function (resolve, reject) {
				// Send a GET request to Facebook with the token as query string
				request({
					url: constants.social[network].VERIFY_URL,
					qs: {access_token: socialToken.access_token}
				},
				function (error, response, body) {
					if (!error && response.statusCode == 200) {
						resolve(JSON.parse(body));
					} else {
						reject(error);
					}
				}
				);
			});
		} else if(network=='twitter'){
//			console.log('twitter: '+constants.social[network].VERIFY_URL);

			return new Promise(function (resolve, reject) {
				twitterOAuth.verifyTwitter({
					twitterObject: constants.social[network], 
					token: socialToken.oauth_token, 
					token_secret: socialToken.oauth_token_secret
				}).then( 
						function (obj) {
							if (!obj.error && obj.response.statusCode == 200) {
								console.log("TWITTER RESOLVE\n");
								resolve(JSON.parse(obj.body));
							} else {
								console.log("TWITTER REJECT\n");
								reject(obj.error);
							}
						}
				).catch(function (err) {
					console.log("CATCH REJECT\n");
					reject(err);
				});
			});
		} else if(network=='linkedin'){
			console.log('linkedin: '+constants.social[network].VERIFY_URL);
			return new Promise(function (resolve, reject) {
				// Send a GET request to Facebook with the token as query string
				request({
					url: constants.social[network].VERIFY_URL,
					qs: {
						oauth2_access_token: socialToken.access_token,
						format: "json"
					}
				},
				function (error, response, body) {
					if (!error && response.statusCode == 200) {
						console.log("###body: "+JSON.stringify(body)+"\n");
						resolve(JSON.parse(body));
					} else {
						reject(error);
					}
				}
				);
			});
		}
	};

	module.jwtEncode = function(network, socialToken, profile){
		try{
			var expires = expiresIn(3);

			var token = jwt.encode({
				iss: network+'-'+JSON.stringify(socialToken)+'-'+profile,
				exp: expires
			}, require('../config/secret')());

			console.log('jwtEncode token: '+token);
			return {
				token : token,
				expires: expires
			};
		} catch(err){
			res.status(500);
			res.json({
				"status": 500,
				"message": "Oops something went wrong",
				"error": err
			});
		}
	};

	module.jwtDecode = function(req, res, next){
		console.log("in JWT Decode\n");
		var token = req.headers['x-access-token'];
		if (token) {
			console.log('jwtDecode token: '+token);
			try {
				var decoded = jwt.decode(token, require('../config/secret')());

				if (decoded.exp <= Date.now()) {
					res.status(400);
					res.json({
						"status": 400,
						"message": "Token Expired"
					});
					return;
				}
				next();

			} catch (err) {
				res.status(500);
				res.json({
					"status": 500,
					"message": "Oops something went wrong",
					"error": err
				});
			}
		} else {
			res.status(401);
			res.json({
				"status": 401,
				"message": "Invalid Token"
			});
			return;
		}
	};

	return module;
}
