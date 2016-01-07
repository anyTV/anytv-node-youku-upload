'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _md5File = require('md5-file');

var _md5File2 = _interopRequireDefault(_md5File);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _cuddle = require('cuddle');

var _cuddle2 = _interopRequireDefault(_cuddle);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _dns = require('dns');

var _dns2 = _interopRequireDefault(_dns);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var YoukuUploader = (function () {
    function YoukuUploader(config, _metadata, _access_token) {
        _classCallCheck(this, YoukuUploader);

        this.UPLOAD_TOKEN_URL = 'https://openapi.youku.com/v2/uploads/create.json';
        this.UPLOAD_COMMIT_URL = 'https://openapi.youku.com/v2/uploads/commit.json';

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
        value: function save_upload_token(callback, err, result, request) {
            if (err) {
                console.log('Error here', err);
                return callback(err, result, request);
            }

            this.token_info = result;

            callback(null, result, request);
        }
    }, {
        key: 'create_file',
        value: function create_file(callback) {
            var _this = this;

            if (!this.base_url) {
                return _dns2.default.resolve4(this.token_info.upload_server_uri, function (err, result) {
                    if (err) {
                        return callback(err);
                    }

                    var params = { upload_token: _this.token_info.upload_token };

                    //TODO: make it random
                    _this.upload_ip = result[0];
                    _this.base_url = 'http://' + result[0] + '/gupload/';

                    _this.create_file(callback);
                });
            }

            var params = {
                ext: this.metadata.file_ext,
                file_size: this.metadata.file_size,
                upload_token: this.token_info.upload_token,
                slice_length: this.slice_size
            };

            _cuddle2.default.post.to(this.base_url + 'create_file').send(params).then(callback);
        }
    }, {
        key: 'upload',
        value: function upload(callback) {
            var _this2 = this;

            var start = function start() {
                _this2.get_upload_token(create_file);
            };

            var create_file = function create_file(err, result, request) {
                if (err) {
                    return callback(err);
                }

                if (_this2.video_id_callback) {
                    _this2.video_id_callback(result);
                }

                _this2.create_file(create_slice);
            };

            var create_slice = function create_slice(err, result) {
                if (err) {
                    console.log('Error creating file');
                    return callback(err);
                }

                _this2.new_slice(upload_slice);
            };

            var upload_slice = function upload_slice(err, result, args, request) {
                if (err) {
                    console.log('Error creating new slice');
                    return callback(err);
                }

                _this2.upload_slice(result, function (err, result) {
                    if (err) {
                        console.log('Error uploading slice');
                        console.log(err);
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
            };

            start();
        }
    }, {
        key: 'new_slice',
        value: function new_slice(callback) {
            var _this3 = this;

            _cuddle2.default.get.to(this.base_url + 'new_slice').send({ upload_token: this.token_info.upload_token }).then(function (err, result, request) {
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

            var buffer = undefined;
            var _fd = undefined;

            var start = function start() {
                if (typeof upload_meta === 'string') {
                    upload_meta = JSON.parse(upload_meta);
                }

                buffer = new Buffer(upload_meta.length);

                _fs2.default.open(_this4.metadata.filepath, 'r', read_file);
            };

            var read_file = function read_file(err, fd) {
                _fd = fd;
                _fs2.default.read(fd, buffer, 0, upload_meta.length, upload_meta.offset, call_api);
            };

            var call_api = function call_api(err, bytesRead) {
                if (err) {
                    return callback(err);
                }

                var params = {
                    upload_token: _this4.token_info.upload_token,
                    slice_task_id: upload_meta.slice_task_id,
                    offset: upload_meta.offset,
                    length: upload_meta.length,
                    hash: _this4.hash(buffer.toString('binary'))
                };

                (0, _request2.default)({
                    url: _this4.base_url + 'upload_slice',
                    qs: params,
                    method: 'POST',
                    body: buffer,
                    headers: {
                        'Accept': 'application/json'
                    }
                }, process_slice);
            };

            var process_slice = function process_slice(err, response, body) {
                if (err) {
                    return callback(err);
                }

                if (typeof body === 'string') {
                    body = JSON.parse(body);
                }

                _fs2.default.close(_fd);

                if (body.slice_task_id != 0) {
                    upload_meta.offset = body.offset;
                    upload_meta.length = body.length;
                    upload_meta.slice_task_id = body.slice_task_id;

                    return _this4.upload_slice(upload_meta, callback);
                }

                callback(null, body);
            };

            start();
        }
    }, {
        key: 'check',
        value: function check(callback) {
            var _this5 = this;

            var params = { upload_token: this.token_info.upload_token };

            _cuddle2.default.get.to(this.base_url + 'check').send(params).then(function (err, result) {
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
                        default:
                            _this5.progress_callback(result);
                            setTimeout(function () {
                                _this5.check(callback);
                            }, 1000);
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