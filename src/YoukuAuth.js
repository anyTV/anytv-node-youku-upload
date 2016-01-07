'use strict';

import YoukuUploader from './YoukuUploader'
import cudl from 'cuddle';

/**
 * A simple class that stores connections and returns connection on open
 */
export default class YoukuAuth {

	constructor (config) {
		this.ACCESS_TOKEN_URL = 'https://openapi.youku.com/v2/oauth2/token';
        this.AUTHORIZATION_URL = 'https://openapi.youku.com/v2/oauth2/authorize';
        this.USER_INFO_URL = 'https://openapi.youku.com/v2/users/myinfo.json';

        this.base_config = config;
        this.client_id = config.client_id
        this.client_secret = config.client_secret;
        this.redirect_uri = config.redirect_uri;
        this.slice_size = config.slice_size || 10240;
        this.uploads = {};
    }

    get_auth_url () {
        const params = {
            response_type:  'code',
            client_id:      this.client_id,
            redirect_uri:   this.redirect_uri
        };

        return this.AUTHORIZATION_URL + '?' + cudl.stringify(params);
    }

    get_access_token (type, payload, callback) {
        const params = {
            client_id:      this.client_id,
            client_secret:  this.client_secret,
            redirect_uri:   this.redirect_uri,
            grant_type:     type
        };

        params[type === 'authorization_code'
            ? 'code'
            : type] = payload;

        cudl.post
            .to(this.ACCESS_TOKEN_URL)
            .send(params)
            .then(this.save_access_token.bind(this, callback))
    }

    save_access_token (callback, err, result) {
        if (!err) {
            this.access_token = result.access_token;
            this.refresh_token = result.refresh_token;
        }

        callback(err, result);
    }

    get_user_info (callback) {
        cudl.post
            .to(this.USER_INFO_URL)
            .send({
                client_id: this.client_id,
                access_token: this.access_token,
            })
            .then(callback);
    }

    upload (metadata, callback, check_progress) {
    	const uploader = new YoukuUploader(this.base_config, metadata, this.access_token);

        uploader.on_video_id((result) => {
        	this.uploads[result.video_id] = uploader;
        });

        if (check_progress) {
        	uploader.on_progress(check_progress);
        }

        uploader.upload(callback);
    }
}
