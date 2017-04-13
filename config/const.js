const social = {
		'twitter' : {
			'CLIENT_ID' : '<CLIENT_ID>',
			'CLIENT_SECRET': '<CLIENT_SECRET>',
			'VERIFY_URL' : 'https://api.twitter.com/1.1/account/verify_credentials.json'
		},
		'linkedin' : {
			'CLIENT_ID': '<CLIENT_ID>',
			'CLIENT_SECRET': '<CLIENT_SECRET>',
			'VERIFY_URL' : 'https://api.linkedin.com/v1/people/~'
		},
		'facebook' : {
			'APP_ID': '<APP_ID>',
			'VERIFY_URL' : 'https://graph.facebook.com/me'
		}
};

module.exports = {
		social : social
};