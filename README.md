# anytv-node-youku-upload

# Install

```sh
npm install anytv-node-youku-uploader --save
```

# Features

* Login with Youku OAuth2
* Upload Videos


# Usage

### Opening a connection
On your index.js / server.js / app.js, register your database using a key.
```javascript
import Youku from 'anytv-node-youku-uploader';

const config = {
        client_id: 'YOUR CLIENT ID',
        client_secret: 'YOUR CLIENT SECRET',
        redirect_uri: 'YOUR REDIRECT URI',
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
youku.get_access_token('GRANT TYPE', 'IDENTIFIER', (err, result) => {
    //4. upload!
    const metadata = {
            title: 'sample123',
            description: 'sample description123',
            tags: 'sample anytv youku 123',
            file_name: 'sample.avi'
        };
        
    youku.upload(metadata, 'FILE PATH', (err, result) => {
        //this is the callback after uploading
    }, (progress) => {
        //this is optional, do something with the progress/status
    });
    
    //optional: get user info
    youku.get_user_info((err, result) => {
        //do whatever u want with the result
    })
});

```

# Documentation
```
to follow
```

# Contributing

Install the tools needed:
```sh
npm install babel -g
npm install esdoc -g
npm install mocha -g
npm install --dev
```

To compile the ES6 source code to ES5:
```sh
babel src --watch --out-dir lib
```

To generate the docs:
```sh
npm run docs
```

# Running test

```sh
npm test
```

# Code coverage

```sh
npm run coverage
```
Then open coverage/lcov-report/index.html.

# License

MIT


# Author
[Freedom! Labs, any.TV Limited DBA Freedom!](https://www.freedom.tm)
