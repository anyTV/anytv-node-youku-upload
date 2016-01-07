# anytv-node-youku-upload

# Install

```sh
npm install anytv-node-youku-upload --save
```

# Features

* Login with Youku OAuth2
* Upload Videos


# Usage

### Opening a connection
On your index.js / server.js / app.js, register your database using a key.
```javascript
import mongo from 'anytv-node-mongo';

const config = {
	host: 'localhost',
	user: 'root',
	password: '',
	database: test
};

mongo.open(config)
	.collection('users')
	.findOne({_id: 'SOMEID'}, callback);
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
