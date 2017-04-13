var OAuth = require('oauth');

module.exports = {

		verifyTwitter : function(object, callback) {
			return new Promise(function (resolve, reject) {
				console.log('\nVerifyTwitter:\n'+JSON.stringify(object.twitterObject)+'\n'+object.token+'\n'+object.token_secret+'\n'+callback+'\n');

				var oauth = new OAuth.OAuth(
						'https://api.twitter.com/oauth/request_token',
						'https://api.twitter.com/oauth/access_token',
						object.twitterObject.CLIENT_ID,
						object.twitterObject.CLIENT_SECRET,
						'1.0',
						null,
						'HMAC-SHA1'
				);
				console.log("CALL GET");
				oauth.get(
						object.twitterObject.VERIFY_URL,
						object.token, //test user token
						object.token_secret, //test user secret
						function (e, data, res){
							if (e) {
								console.error(e); 
								reject(e)
							}
							resolve({"error":e, "body":data, "response":res});
						}
				);

			});
		}
}