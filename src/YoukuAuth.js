'use strict';

import cudl from 'cuddle';
import YoukuUploader from './YoukuUploader'
/**
 * A simple class that stores connections and returns connection on open
 */
export default class YoukuAuth {

	constructor (config) {
		this.ACCESS_TOKEN_URL = "https://openapi.youku.com/v2/oauth2/token";
        this.AUTHORIZATION_URL = "https://openapi.youku.com/v2/oauth2/authorize";

        this.base_config = config;
        this.client_id = config.client_id
        this.client_secret = config.client_secret;
        this.redirect_uri = config.redirect_uri;
        this.slice_size = config.slice_size || 10240;
        this.uploads = {};
    }

    get_auth_url () {
        let params = {
                response_type:  'code',
                client_id:      this.client_id,
                redirect_uri:   this.redirect_uri
            };

        return this.AUTHORIZATION_URL + '?' + cudl.stringify(params);
    }

    get_access_token (type, payload, callback) {
        let params = {
                client_id:      this.client_id,
                client_secret:  this.client_secret,
                redirect_uri:   this.redirect_uri,
                grant_type:     type
            };

        switch (type) {
            case 'authorization_code':
                params.code = payload;
                break;
            default:
                params[type] = payload;
                break;
        }

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

    upload (metadata, filepath, callback, check_progress) {
        metadata.filepath = filepath;

    	let uploader = new YoukuUploader(this.base_config, metadata, this.access_token);

        uploader.on_video_id((result) => {
        	this.uploads[result.video_id] = uploader;
        });

        if (check_progress) {
        	uploader.on_progress(check_progress);
        }

        uploader.upload(metadata, filepath, callback);
    }
}