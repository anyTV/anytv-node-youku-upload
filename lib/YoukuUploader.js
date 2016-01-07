'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _dns = require('dns');

var _dns2 = _interopRequireDefault(_dns);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _cuddle = require('cuddle');

var _cuddle2 = _interopRequireDefault(_cuddle);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _md5File = require('md5-file');

var _md5File2 = _interopRequireDefault(_md5File);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var YoukuUploader = (function () {
    function YoukuUploader(config, _metadata, _access_token) {
        _classCallCheck(this, YoukuUploader);

        this.UPLOAD_TOKEN_URL = 'https://openapi.youku.com/v2/uploads/create.json';
        this.UPLOAD_COMMIT_URL = 'https://openapi.youku.com/v2/uploads/commit.json';
        this.VERSION_UPDATE_URL = 'http://open.youku.com/sdk/version_update';

        this.metadata = _metadata;
        this.client_id = config.client_id;
        this.access_token = _access_token;
        this.filepath = this.metadata.filepath;
        this.client_secret = config.client_secret;
        this.slice_size = config.slice_size || 10240;

        this.metadata.file_md5 = (0, _md5File2.default)(this.metadata.filepath);
        this.metadata.file_size = _fs2.default.statSync(this.metadata.filepath).size;
        this.metadata.file_ext = _path2.default.extname(this.metadata.filepath).slice(1);
    }

    _createClass(YoukuUploader, [{
        key: 'set_slice_size',
        value: function set_slice_size(size) {
            this.slice_size = size;
        }
    }, {
        key: 'get_upload_token',
        value: function get_upload_token(callback) {
            this.metadata.client_id = this.client_id;
            this.metadata.access_token = this.access_token;

            _cuddle2.default.get.to(this.UPLOAD_TOKEN_URL).send(this.metadata).then(this.save_upload_token.bind(this, callback));
        }
    }, {
        key: 'save_upload_token',
        value: function save_upload_token(callback, err, result) {
            if (err) {
                return callback(err);
            }

            this.token_info = result;

            callback(null, result);
        }
    }, {
        key: 'create_file',
        value: function create_file(callback) {
            var _this = this;

            if (!this.create_url) {
                return _dns2.default.resolve4(this.token_info.upload_server_uri, function (err, result) {
                    if (err) {
                        return callback(err);
                    }

                    var params = {
                        upload_token: _this.token_info.upload_token
                    };

                    //TODO: make it random
                    _this.upload_ip = result[0];
                    _this.create_url = 'http://' + _this.upload_ip + '/gupload/create_file';

                    _this.create_file(callback);
                });
            }

            var params = {
                ext: this.metadata.file_ext,
                file_size: this.metadata.file_size,
                upload_token: this.token_info.upload_token,
                slice_length: this.slice_size
            };

            _cuddle2.default.post.to(this.create_url).send(params).then(callback);
        }
    }, {
        key: 'upload',
        value: function upload(metadata, filepath, callback) {
            var _this2 = this;

            this.get_upload_token(function (err, result) {
                if (err) {
                    console.log('Error getting upload token');
                    return callback(err);
                }

                if (_this2.video_id_callback) {
                    _this2.video_id_callback(result);
                }

                _this2.create_file(function (err, result) {
                    if (err) {
                        console.log('Error creating file');
                        return callback(err);
                    }

                    _this2.new_slice(function (err, result, args, request) {
                        if (err) {
                            console.log('Error creating new slice');
                            return callback(err);
                        }

                        _this2.upload_slice(result, function (err, result) {
                            if (err) {
                                console.log('Error uploading slice');
                                _this2.stop_checking = true;
                                return callback(err);
                            }

                            _this2.checker = setInterval(function () {
                                if (_this2.finished) {
                                    _this2.commit(callback);
                                    clearInterval(_this2.checker);
                                }
                            }, 1000);
                        });

                        _this2.check(function (err, result) {
                            if (err) {
                                return callback(err);
                            }

                            _this2.uploader_ip = result.upload_server_ip;
                            _this2.finished = result.finished;
                        });
                    });
                });
            });
        }
    }, {
        key: 'new_slice',
        value: function new_slice(callback) {
            var _this3 = this;

            if (!this.slice_url) {
                this.slice_url = 'http://' + this.upload_ip + '/gupload/new_slice';
            }

            _cuddle2.default.get.to(this.slice_url).send({ upload_token: this.token_info.upload_token }).then(function (err, result, request) {
                if (err) {
                    return callback(err);
                }

                _this3.slice_upload_meta = result;

                callback(err, result);
            });
        }
    }, {
        key: 'upload_slice',
        value: function upload_slice(upload_meta, callback) {
            var _this4 = this;

            if (!this.upload_url) {
                this.upload_url = 'http://' + this.upload_ip + '/gupload/upload_slice';
            }

            if (typeof upload_meta === 'string') {
                upload_meta = JSON.parse(upload_meta);
            }

            var buffer = new Buffer(upload_meta.length);
            var params = {
                upload_token: this.token_info.upload_token,
                slice_task_id: upload_meta.slice_task_id,
                offset: upload_meta.offset,
                length: upload_meta.length
            };

            _fs2.default.open(this.metadata.filepath, 'r', function (err, fd) {
                _fs2.default.read(fd, buffer, 0, upload_meta.length, upload_meta.offset, function (err, bytesRead, buffer) {
                    if (err) {
                        return callback(err);
                    }

                    params.hash = _this4.hash(buffer.toString('binary'));

                    (0, _request2.default)({
                        url: _this4.upload_url,
                        qs: params,
                        method: 'POST',
                        body: buffer,
                        headers: {
                            'Accept': 'application/json'
                        }
                    }, function (err, response, body) {
                        if (err) {
                            return callback(err);
                        }

                        if (typeof body === 'string') {
                            body = JSON.parse(body);
                        }

                        _fs2.default.close(fd);

                        if (body.slice_task_id != 0) {
                            upload_meta.offset = body.offset;
                            upload_meta.length = body.length;
                            upload_meta.slice_task_id = body.slice_task_id;

                            return _this4.upload_slice(upload_meta, callback);
                        }

                        callback(null, body);
                    });
                });
            });
        }
    }, {
        key: 'check',
        value: function check(callback) {
            var _this5 = this;

            if (!this.check_url) {
                this.check_url = 'http://' + this.upload_ip + '/gupload/check';
            }

            var params = { upload_token: this.token_info.upload_token };

            _cuddle2.default.get.to(this.check_url).send(params).then(function (err, result) {
                if (err) {
                    return callback(err);
                }

                if (typeof result === 'string') {
                    result = JSON.parse(result);
                }

                if (result.status) {
                    switch (result.status) {
                        case 1:
                            return callback(null, result);
                        case 2:
                        case 3:
                        default:
                            _this5.progress_callback(result);
                            setTimeout(function () {
                                _this5.check(callback);
                            }, 1000);

                            break;
                    }
                }
            });
        }
    }, {
        key: 'commit',
        value: function commit(callback) {
            var params = {
                access_token: this.access_token,
                client_id: this.client_id,
                upload_token: this.token_info.upload_token,
                upload_server_ip: this.uploader_ip
            };

            _cuddle2.default.get.to(this.UPLOAD_COMMIT_URL).send(params).then(callback);
        }
    }, {
        key: 'on_video_id',
        value: function on_video_id(callback) {
            this.video_id_callback = callback;
        }
    }, {
        key: 'on_progress',
        value: function on_progress(callback) {
            this.progress_callback = callback;
        }
    }, {
        key: 'hash',
        value: function hash(string, algo) {
            return require('crypto').createHash(algo || 'md5').update('' + string, 'ascii').digest('hex');
        }
    }]);

    return YoukuUploader;
})();

exports.default = YoukuUploader;
;