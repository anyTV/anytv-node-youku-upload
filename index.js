'use strict';

module.exports = {
	auth: require('./lib/YoukuAuth').default,
	uploader: require('./lib/YoukuUploader').default
};
