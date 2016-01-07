'use strict';

import md5file from 'md5-file';
import request from 'request';
import cudl from 'cuddle';
import path from 'path';
import dns from 'dns';
import fs from 'fs';



export default class YoukuUploader {

    constructor (config, _metadata, _access_token) {
        this.UPLOAD_TOKEN_URL = 'https://openapi.youku.com/v2/uploads/create.json';
        this.UPLOAD_COMMIT_URL = 'https://openapi.youku.com/v2/uploads/commit.json';

        this.metadata = _metadata;
        this.client_id = config.client_id
        this.access_token = _access_token;
        this.filepath = this.metadata.filepath;
        this.client_secret = config.client_secret;
        this.slice_size = config.slice_size || 10240;


        this.metadata.file_md5 = md5file(this.metadata.filepath);
        this.metadata.file_size = fs.statSync(this.metadata.filepath).size;
        this.metadata.file_ext = path.extname(this.metadata.filepath).slice(1);
    }

    set_slice_size (size) {
        this.slice_size = size;
    }

    get_upload_token (callback) {
        this.metadata.client_id    = this.client_id;
        this.metadata.access_token = this.access_token;

        cudl.get
            .to(this.UPLOAD_TOKEN_URL)
            .send(this.metadata)
            .then(this.save_upload_token.bind(this, callback));
    }

    save_upload_token (callback, err, result, request) {
        if (err) {
            console.log('Error here', err);
            return callback(err, result, request);
        }

        this.token_info = result;

        callback(null, result, request);
    }

    create_file (callback) {


        if (!this.base_url) {
            return dns.resolve4(this.token_info.upload_server_uri, (err, result) => {
                if (err) {
                    return callback(err);
                }

                const params = {upload_token: this.token_info.upload_token};

                //TODO: make it random
                this.upload_ip = result[0];
                this.base_url = `http://${result[0]}/gupload/`;

                this.create_file(callback);
            });
        }

        const params = {
            ext:            this.metadata.file_ext,
            file_size:      this.metadata.file_size,
            upload_token:   this.token_info.upload_token,
            slice_length:   this.slice_size
        };

        cudl.post
            .to(this.base_url + 'create_file')
            .send(params)
            .then(callback);
    }

    upload (callback) {

        const start = () => {
            this.get_upload_token(create_file);
        };

        const create_file = (err, result, request) => {
            if (err) {
                return callback(err);
            }

            if (this.video_id_callback) {
                this.video_id_callback(result);
            }

            this.create_file(create_slice);
        };

        const create_slice = (err, result) => {
            if (err) {
                console.log('Error creating file');
                return callback(err);
            }

            this.new_slice(upload_slice);
        };

        const upload_slice = (err, result, args, request) => {
            if (err) {
                console.log('Error creating new slice');
                return callback(err);
            }

            this.upload_slice(result, (err, result) => {
                if (err) {
                    console.log('Error uploading slice');
                    console.log(err);
                    this.stop_checking = true;
                    return callback(err);
                }

                this.checker = setInterval(() => {
                    if (this.finished) {
                        this.commit(callback);
                        clearInterval(this.checker);
                    }
                }, 1000);
            });

            this.check((err, result) => {
                if (err) {
                    return callback(err);
                }

                this.uploader_ip = result.upload_server_ip;
                this.finished = result.finished;
            })
        };

        start();
    }

    new_slice (callback) {
        cudl.get
            .to(this.base_url + 'new_slice')
            .send({ upload_token: this.token_info.upload_token })
            .then((err, result, request) => {
                if (err) {
                    return callback(err);
                }

                this.slice_upload_meta = result;

                callback(err, result)
            });
    }

    upload_slice (upload_meta, callback) {
        let buffer;
        let _fd;

        const start = () => {
            if (typeof upload_meta === 'string') {
                upload_meta = JSON.parse(upload_meta);
            }

            buffer = new Buffer(upload_meta.length);

            fs.open(this.metadata.filepath, 'r', read_file);
        };

        const read_file = (err, fd) => {
            _fd = fd;
            fs.read(fd, buffer, 0, upload_meta.length, upload_meta.offset, call_api);
        };

        const call_api = (err, bytesRead) => {
            if (err) {
                return callback(err);
            }

            const params = {
                upload_token: this.token_info.upload_token,
                slice_task_id: upload_meta.slice_task_id,
                offset: upload_meta.offset,
                length: upload_meta.length,
                hash: this.hash(buffer.toString('binary'))
            };

            request({
                    url: this.base_url + 'upload_slice',
                    qs: params,
                    method: 'POST',
                    body: buffer,
                    headers: {
                        'Accept': 'application/json'
                    }
                },
                process_slice
            );
        };

        const process_slice = (err, response, body) => {
            if (err) {
                return callback(err);
            }

            if (typeof body === 'string') {
                body = JSON.parse(body);
            }

            fs.close(_fd);

            if (body.slice_task_id != 0) {
                upload_meta.offset = body.offset;
                upload_meta.length = body.length;
                upload_meta.slice_task_id = body.slice_task_id;

                return this.upload_slice(upload_meta, callback);
            }

            callback(null, body);
        };

        start();
    }

    check (callback) {
        const params = {upload_token: this.token_info.upload_token};

        cudl.get
            .to(this.base_url + 'check')
            .send(params)
            .then((err, result) => {
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
                            this.progress_callback(result);
                            setTimeout(() => {
                                this.check(callback);
                            }, 1000);
                    }
                }
            });
    }

    commit (callback) {
        const params = {
            access_token: this.access_token,
            client_id:    this.client_id,
            upload_token: this.token_info.upload_token,
            upload_server_ip: this.uploader_ip
        };

        cudl.get
            .to(this.UPLOAD_COMMIT_URL)
            .send(params)
            .then(callback);
    }

    on_video_id (callback) {
        this.video_id_callback = callback;
    }

    on_progress (callback) {
        this.progress_callback = callback;
    }

    hash (string, algo) {
        return require('crypto')
            .createHash(algo || 'md5')
            .update('' + string, 'ascii')
            .digest('hex');
    }
}
