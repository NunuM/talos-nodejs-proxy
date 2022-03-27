/** node packages */
const fs = require('fs');
const zlib = require('zlib');
const http = require('http');
const https = require('https');
const http2 = require('http2');
const pathJS = require('path');
const {pipeline} = require('stream');
const {HTTP2_HEADER_AUTHORITY} = http2.constants;

/** package imports */
const Accepts = require('accepts');

/** project imports */
const {manager, repository} = require('./src/app/bootstrap');
const {LOGGER, _, handler} = require('./src/service/logger_service');
const {VirtualHost} = require('./src/model/virtual_host');
const {UpstreamHost} = require('./src/model/upstream_host');
const {Config} = require('./src/app/config');


const PORT = Config.serverPort();
const HTTPS_PORT = Config.serverHttpsPort();
const ADMIN_PORT = Config.serverAdminUIPort();

const STIMEOUT = Config.socketInactivityTimeout();


console.log(`
  _____     _             ____                      
 |_   _|_ _| | ___  ___  |  _ \\ _ __ _____  ___   _ 
   | |/ _\` | |/ _ \\/ __| | |_) | '__/ _ \\ \\/ / | | |
   | | (_| | | (_) \\__ \\ |  __/| | | (_) >  <| |_| |
   |_|\\__,_|_|\\___/|___/ |_|   |_|  \\___/_/\\_\\\\__, |
                                              |___/ 
`);

const DEFAULT_NEXT = function () {
};

const proxyHandler = (proxyRequest, proxyResponse) => {

    const start = new Date();

    handler(proxyRequest, proxyResponse, DEFAULT_NEXT);

    let clientHeader = '';

    if (proxyRequest.httpVersion === '2.0') {
        clientHeader = proxyRequest.headers[HTTP2_HEADER_AUTHORITY];
    } else {
        clientHeader = (proxyRequest.headers['host'] || '').trim().toLowerCase()
    }

    manager
        .resolveVirtualHost(clientHeader)
        .then((virtualHost) => {
            if (virtualHost) {

                const abortSignal = new AbortController();
                const server = virtualHost.nextUpstream();

                if (server) {

                    const options = {
                        hostname: server.host,
                        port: server.port,
                        path: proxyRequest.url,
                        method: proxyRequest.method,
                        headers: Object.entries(proxyRequest.headers)
                            .reduce((acc, [k, v]) => {
                                if (k.startsWith(':')) {
                                    return acc;
                                }
                                acc[k] = v;
                                return acc;
                            }, {}),
                        timeout: STIMEOUT,
                        signal: abortSignal.signal
                    };

                    const accepts = Accepts(proxyRequest);

                    let virtualHostRequest = (server.isHTTPS ? https : http).request(options, (virtualHostResponse) => {

                        if (virtualHostResponse.headers["content-encoding"] || accepts.type("text/event-stream")) {

                            if (proxyRequest.httpVersion === '2.0') {
                                delete virtualHostResponse.headers['connection'];
                            }

                            proxyResponse.writeHead(virtualHostResponse.statusCode, virtualHostResponse.headers);

                            if ((virtualHostResponse.headers["content-type"] || '').startsWith("text/event-stream")) {
                                proxyRequest.socket.setTimeout(2147483647);
                                proxyRequest.socket.on('close', () => {
                                    virtualHostRequest.end();
                                });
                                proxyResponse.flushHeaders();
                            }

                            virtualHostResponse.pipe(proxyResponse);

                        } else {

                            const onEncodingError = (err) => {
                                if (err) {
                                    proxyResponse.end();
                                    LOGGER.error('An error occurred:', err);
                                }
                            };

                            proxyResponse.setHeader('Vary', 'Accept-Encoding');


                            if (accepts.encoding('deflate')) {

                                virtualHostResponse.headers['Content-Encoding'] = 'deflate';

                                delete virtualHostResponse.headers['content-length'];

                                proxyResponse.writeHead(virtualHostResponse.statusCode, virtualHostResponse.headers);

                                pipeline(virtualHostResponse, zlib.createDeflate(), proxyResponse, onEncodingError);

                            } else if (accepts.encoding('gzip')) {

                                virtualHostResponse.headers['Content-Encoding'] = 'gzip';

                                delete virtualHostResponse.headers['content-length'];

                                proxyResponse.writeHead(virtualHostResponse.statusCode, virtualHostResponse.headers);


                                pipeline(virtualHostResponse, zlib.createGzip(), proxyResponse, onEncodingError);

                            } else if (accepts.encoding('br')) {

                                virtualHostResponse.headers['Content-Encoding'] = 'br';

                                delete virtualHostResponse.headers['content-length'];

                                proxyResponse.writeHead(virtualHostResponse.statusCode, virtualHostResponse.headers);

                                pipeline(virtualHostResponse, zlib.createBrotliCompress(), proxyResponse, onEncodingError);

                            } else {
                                proxyResponse.writeHead(virtualHostResponse.statusCode, virtualHostResponse.headers);

                                virtualHostResponse.pipe(proxyResponse);
                            }
                        }

                    });

                    proxyRequest.pipe(virtualHostRequest);

                    virtualHostRequest.on('error', (e) => {
                        if (e.code === 'ABORT_ERR') {
                            return;
                        }

                        LOGGER.error("problem with request", clientHeader, server, e);
                        proxyResponse.writeHead(503);
                        proxyResponse.end();
                    });

                    virtualHostRequest.on('timeout', () => {
                        LOGGER.info("Timeout");
                        proxyResponse.writeHead(588, 'Bad Request');
                        proxyResponse.end();
                    });

                    proxyRequest.on('close', () => {
                        abortSignal.abort();
                    });

                    proxyResponse.on('finish', () => {
                        const responseTiming = new Date() - start;
                        manager.requestServed(proxyResponse.statusCode, responseTiming, clientHeader);
                    });

                } else {
                    LOGGER.error('Not upstream host available', clientHeader, virtualHost);
                    proxyResponse.writeHead(503);
                    proxyResponse.end();
                }

            } else {
                proxyResponse.end();
            }
        })
        .catch((error) => {
            LOGGER.error("Error resolving host", clientHeader, error);
            proxyResponse.end();
        });

};


if (Config.withHttp()) {

    /**
     * Proxy server
     * @type {Server}
     */
    const proxyServer = http.createServer(proxyHandler)
        .on('clientError', (err, socket) => {
            LOGGER.error("Client http", err);

            if (err.code === 'ECONNRESET' || !socket.writable) {
                return;
            }

            socket.end('HTTP/1.1 588 Bad Request\r\n\r\n');
        })
        .on('connection', (connection) => {
            LOGGER.info(`Receive new connection with remote IP: ${connection.remoteAddress}`);
        })
        .on('error', (e) => {
            LOGGER.error(`Occurred an error on proxy server: ${e.message}`);
            proxyServer.close();
        })
        .listen(PORT, () => {
            LOGGER.info(`HTTP Server is running at: ${PORT}`);
        });
}


if (Config.withHttps() || Config.withHttp2()) {

    /**
     * Proxy server
     * @type {Server}
     */
    try {

        let fn = https.createServer;

        const options = {
            key: Config.sslKey(),
            cert: Config.sslCert()
        };

        if (Config.withHttp2()) {
            fn = http2.createSecureServer;
            options.allowHTTP1 = true;
        }

        const httpsProxyServer = fn(options, proxyHandler)
            .on('clientError', (err, socket) => {

                if (err.code === 'ECONNRESET' || !socket.writable) {
                    return;
                }

                socket.end('HTTP/1.1 588 Bad Request\r\n\r\n');
            })
            .on('connection', (connection) => {
                LOGGER.info(`Receive new connection with remote IP: ${connection.remoteAddress}`);
            })
            .on('error', (e) => {
                LOGGER.error(`Occurred an error on proxy server: ${e.message}`);
                httpsProxyServer.close();
            })
            .listen(HTTPS_PORT, () => {
                LOGGER.info(`HTTPS Server is running at: ${HTTPS_PORT}`);
            });
    } catch (e) {
        LOGGER.error("error starting HTTPS server", e);
    }
}


http.createServer(
    (req, res) => {

        handler(req, res, DEFAULT_NEXT);

        if (req.headers.authorization
            && `Basic ${Config.serverAdminPassword()}` === req.headers.authorization) {

            const path = req.url || '/';

            if (path === '/' || path.startsWith('/index.html')) {

                res.writeHead(200, {
                    'content-type': 'text/html',
                    'Set-Cookie': 'password=' + Config.serverAdminPassword()
                });

                fs.createReadStream(pathJS.join(__dirname, "ui", "index.html")).pipe(res);

            } else if (path.startsWith('/api/vhost')) {

                if (req.method === 'PUT') {
                    let payload = '';
                    req.on('data', (chunk) => {
                        payload += chunk.toString();
                    });

                    req.on('end', () => {
                        try {
                            const newVHost = JSON.parse(payload);

                            LOGGER.info('Inserting vHost', newVHost);

                            manager.addVirtualHost(new VirtualHost(newVHost.host.trim().toLowerCase(),
                                newVHost.name.trim(),
                                Number(newVHost.lb),
                                newVHost.upstreamHosts
                                    .map((u) => new UpstreamHost(u.host, u.port, true, u.hasHttps))
                            ));

                            res.end();
                        } catch (e) {
                            res.writeHead(400);
                            res.end();
                        }
                    });
                } else if (req.method === 'DELETE') {

                    const parts = req.url.split('=');

                    if (parts.length >= 2) {
                        const host = parts[1];
                        LOGGER.info('Deleting host', host);
                        manager.removeVirtualHostByKey(host);
                        res.end();
                    } else {
                        res.writeHead(400);
                        res.end();
                    }

                } else {
                    res.writeHead(200, {'content-type': 'application/json'});

                    res.end(JSON.stringify(manager.virtualHosts().map(e => e.toJSON())));
                }

            } else if (path.startsWith('/api/stats')) {

                repository
                    .loadStats()
                    .then((result) => {
                        res.writeHead(200, {'content-type': 'application/json'});
                        res.end(JSON.stringify(result));
                    })
                    .catch((err) => {
                        res.writeHead(500);
                        res.end();
                    })

            } else {
                res.writeHead(404);
                res.end();
            }
        } else {

            res.writeHead(401, {'WWW-Authenticate': 'Basic realm="User Visible Realm", charset="UTF-8"'});
            res.end();

        }
    })
    .listen(ADMIN_PORT, () => {
        LOGGER.info(`Admin WebUI is running at: ${ADMIN_PORT}`);
    });

