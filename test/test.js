'use strict';

var Youku = require(__dirname + '/../index');

const config = {
    client_id: '***REMOVED***',
    client_secret: '***REMOVED***',
    redirect_uri: '***REMOVED***',
    slice_size: 4096 //optional
};

//get auth class
const auth = Youku.auth;
//initialize auth
const youku = new auth(config);

//authorize a user
//1. get auth url
const authurl = youku.get_auth_url();
//2. redirect user to auth url
//3. get access token, accepts `authorization_code` and `refresh_token` as grant type
youku.get_access_token('refresh_token', '***REMOVED***', (err, result) => {
    //4. upload!
    const metadata = {
        title: 'sample123',
        description: 'sample description123',
        tags: 'sample anytv youku 123',
        file_name: 'sample.avi',
        filepath: 'sample.avi'
    };

    youku.upload(metadata, (err, result) => {
        //this is the callback after uploading
        if (err) {
            return console.log('err', err);
        }

        console.log(result);

    }, (progress) => {
        console.log('progress', progress);
    });

    //optional: get user info
    youku.get_user_info((err, result) => {
        //do whatever u want with the result
    })
});