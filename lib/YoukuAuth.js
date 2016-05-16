'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _YoukuUploader = require('./YoukuUploader');

var _YoukuUploader2 = _interopRequireDefault(_YoukuUploader);

var _cuddle = require('cuddle');

var _cuddle2 = _interopRequireDefault(_cuddle);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * A simple class that stores connections and returns connection on open
 */

var YoukuAuth = function () {
    function YoukuAuth(config) {
        _classCallCheck(this, YoukuAuth);

        this.ACCESS_TOKEN_URL = 'https://openapi.youku.com/v2/oauth2/token';
        this.AUTHORIZATION_URL = 'https://openapi.youku.com/v2/oauth2/authorize';
        this.USER_INFO_URL = 'https://openapi.youku.com/v2/users/myinfo.json';

        this.base_config = config;
        this.client_id = config.client_id;
        this.client_secret = config.client_secret;
        this.redirect_uri = config.redirect_uri;
        this.slice_size = config.slice_size || 10240;
        this.uploads = {};
    }

    _createClass(YoukuAuth, [{
        key: 'get_auth_url',
        value: function get_auth_url(state) {
            var params = {
                response_type: 'code',
                client_id: this.client_id,
                redirect_uri: this.redirect_uri
            };

            if (state) {
                params.state = state;
            }

            return this.AUTHORIZATION_URL + '?' + _cuddle2.default.stringify(params);
        }
    }, {
        key: 'get_access_token',
        value: function get_access_token(type, payload, callback) {
            var params = {
                client_id: this.client_id,
                client_secret: this.client_secret,
                redirect_uri: this.redirect_uri,
                grant_type: type
            };

            params[type === 'authorization_code' ? 'code' : type] = payload;

            _cuddle2.default.post.to(this.ACCESS_TOKEN_URL).send(params).end(this.save_access_token.bind(this, callback));
        }
    }, {
        key: 'save_access_token',
        value: function save_access_token(callback, err, result) {
            if (!err) {
                this.access_token = result.access_token;
                this.refresh_token = result.refresh_token;
            }

            callback(err, result);
        }
    }, {
        key: 'get_user_info',
        value: function get_user_info(callback) {
            _cuddle2.default.post.to(this.USER_INFO_URL).send({
                client_id: this.client_id,
                access_token: this.access_token
            }).end(callback);
        }
    }, {
        key: 'upload',
        value: function upload(metadata, callback, check_progress) {
            var _this = this;

            var uploader = new _YoukuUploader2.default(this.base_config, metadata, this.access_token);

            uploader.on_video_id(function (result) {
                _this.uploads[result.video_id] = uploader;
            });

            if (check_progress) {
                uploader.on_progress(check_progress);
            }

            uploader.upload(callback);
        }
    }]);

    return YoukuAuth;
}();

exports.default = YoukuAuth;