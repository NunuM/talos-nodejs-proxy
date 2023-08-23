import http from "http";
import {GatewayHostService} from "../src/service/gateway-host-service";
import {UpstreamHost} from "../src/model/upstream-host";
import {VirtualHost} from "../src/model/virtual-host";
import {LoadBalancerType} from "../src/load_balancer/load-balancer-type";
import {ProxyService} from "../src/service/proxy-service";
import {TimeUnit} from "pluto-http-client";
import util from "util";
import * as fs from "fs";
import path from "path";
import https from "https";
import http2 from "http2";

const backoff = util.promisify(setTimeout);


describe('Proxy test', () => {

    const localServers: any[] = [];

    beforeAll((done) => {

        const server = http.createServer((req, res) => {
            res.writeHead(200, {'proto': 'http'});
            res.write('HTTP test');
            res.end();
        }).listen(9777, () => {
            console.log("start HTTP []:9777");
            done();
        });

        localServers.push(server);
    });

    beforeAll((done) => {
        const server = https.createServer({
            key: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost-privkey.pem')),
            cert: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost-cert.pem'))
        }, (req, res) => {

            res.writeHead(201, {'proto': 'https'});
            res.write('HTTPs test');
            res.end();
        }).listen(9778, () => {
            console.log("start HTTPs []:9778");
            done()
        });

        localServers.push(server);
    });

    beforeAll((done) => {
        const http2SecureServer = http2.createSecureServer({
            key: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost-privkey.pem')),
            cert: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost-cert.pem'))
        }, (req, res) => {

            res.writeHead(202, {'proto': 'http2'});
            res.write('HTTP2 test');
            res.end();

        }).listen(9779, () => {
            console.log("start HTTP2 []:9779");
            done()
        });

        localServers.push(http2SecureServer);
    });

    afterAll(() => {
        localServers.forEach((s) => {
            s.close();
        });
    });

    test('test HTTP -> HTTP', (done) => {

        const upstreamHost1 = new UpstreamHost('127.0.0.1', 9777, true, false, false, true);

        const virtualHost = new VirtualHost('test.com', 'test', LoadBalancerType.RoundRobin, [upstreamHost1]);

        const gatewayHostService = new GatewayHostService();
        gatewayHostService.addGatewayHost(virtualHost);

        const proxyService = new ProxyService(gatewayHostService);

        proxyService.httpProxy(9999, {});

        proxyService.serve();

        backoff(2000).then(() => {

            try {
                const req = http.request({
                    method: 'GET',
                    host: '127.0.0.1',
                    port: 9999,
                    path: '/',
                    headers: {
                        host: virtualHost.domain
                    }
                }, (response) => {

                    const chunks: any[] = [];

                    expect(response.statusCode).toBe(200);
                    expect(response.headers['proto']).toBeDefined();
                    expect(response.headers['proto']).toBe('http');

                    response.on('data', (chunk) => {
                        chunks.push(chunk);
                    });

                    response.once('end', () => {

                        const payload = Buffer.concat(chunks).toString('utf8');

                        expect(payload).toBe('HTTP test');

                        proxyService.stop().then(done);
                    });

                    response.on('error', (error) => {
                        proxyService.stop().then(() => done(error));
                    });
                });

                req.once('error', (error) => {
                    proxyService.stop().then(() => done(error));
                });

                req.once('connect', () => {
                    console.log("connected");
                });

                req.end();
            } catch (error) {
                proxyService.stop().then(() => done(error));
            }

        });
    }, 1 * TimeUnit.Minutes);

    test('test HTTP -> HTTPs', (done) => {

        const upstreamHost1 = new UpstreamHost('127.0.0.1', 9778, true, true, false, false);

        const virtualHost = new VirtualHost('test.com', 'test', LoadBalancerType.FirstFree, [upstreamHost1]);

        const gatewayHostService = new GatewayHostService();
        gatewayHostService.addGatewayHost(virtualHost);

        const proxyService = new ProxyService(gatewayHostService);

        proxyService.httpProxy(9999, {});

        proxyService.serve();

        backoff(2000).then(() => {

            try {
                const req = http.request({
                    method: 'GET',
                    host: '127.0.0.1',
                    port: 9999,
                    path: '/',
                    headers: {
                        host: virtualHost.domain
                    }
                }, (response) => {

                    const chunks: any[] = [];

                    expect(response.statusCode).toBe(201);
                    expect(response.headers['proto']).toBeDefined();
                    expect(response.headers['proto']).toBe('https');

                    response.on('data', (chunk) => {
                        chunks.push(chunk);
                    });

                    response.once('end', () => {

                        const payload = Buffer.concat(chunks).toString('utf8');

                        expect(payload).toBe('HTTPs test');

                        proxyService.stop().then(done);
                    });

                    response.on('error', (error) => {
                        proxyService.stop().then(() => done(error));
                    });
                });

                req.once('error', (error) => {
                    proxyService.stop().then(() => done(error));
                });

                req.once('connect', () => {
                    console.log("connected");
                });

                req.end();
            } catch (error) {
                proxyService.stop().then(() => done(error));
            }

        });
    }, 1 * TimeUnit.Minutes);

    test('test HTTP -> HTTP2', (done) => {

        const upstreamHost1 = new UpstreamHost('127.0.0.1', 9779, true, false, true, false);

        const virtualHost = new VirtualHost('test.com', 'test', LoadBalancerType.FirstFree, [upstreamHost1]);

        const gatewayHostService = new GatewayHostService();
        gatewayHostService.addGatewayHost(virtualHost);

        const proxyService = new ProxyService(gatewayHostService);

        proxyService.httpProxy(9999, {});

        proxyService.serve();

        backoff(5000).then(() => {

            try {
                const req = http.request({
                    method: 'GET',
                    host: '127.0.0.1',
                    port: 9999,
                    path: '/',
                    headers: {
                        host: virtualHost.domain
                    }
                }, (response) => {

                    const chunks: any[] = [];

                    expect(response.statusCode).toBe(202);
                    expect(response.headers['proto']).toBeDefined();
                    expect(response.headers['proto']).toBe('http2');

                    response.on('data', (chunk) => {
                        chunks.push(chunk);
                    });

                    response.once('end', () => {

                        const payload = Buffer.concat(chunks).toString('utf8');

                        expect(payload).toBe('HTTP2 test');

                        proxyService.stop().then(done);
                    });

                    response.on('error', (error) => {
                        proxyService.stop().then(() => done(error));
                    });
                });

                req.once('error', (error) => {
                    proxyService.stop().then(() => done(error));
                });

                req.once('connect', () => {
                    console.log("connected");
                });

                req.end();
            } catch (error) {
                proxyService.stop().then(() => done(error));
            }

        });
    }, 1 * TimeUnit.Minutes);

    test('test HTTPs -> HTTP', (done) => {

        const upstreamHost1 = new UpstreamHost('127.0.0.1', 9777, true, false, false, true);

        const virtualHost = new VirtualHost('test.com', 'test', LoadBalancerType.RoundRobin, [upstreamHost1]);

        const gatewayHostService = new GatewayHostService();
        gatewayHostService.addGatewayHost(virtualHost);

        const proxyService = new ProxyService(gatewayHostService);

        proxyService.httpsProxy(9999, {
            key: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost-privkey.pem')),
            cert: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost-cert.pem'))
        });

        proxyService.serve();

        backoff(2000).then(() => {

            try {
                const req = https.request({
                    method: 'GET',
                    host: '127.0.0.1',
                    port: 9999,
                    path: '/',
                    headers: {
                        host: virtualHost.domain
                    },
                    rejectUnauthorized: false
                }, (response) => {

                    const chunks: any[] = [];

                    expect(response.statusCode).toBe(200);
                    expect(response.headers['proto']).toBeDefined();
                    expect(response.headers['proto']).toBe('http');

                    response.on('data', (chunk) => {
                        chunks.push(chunk);
                    });

                    response.once('end', () => {

                        const payload = Buffer.concat(chunks).toString('utf8');

                        expect(payload).toBe('HTTP test');

                        proxyService.stop().then(done);
                    });

                    response.on('error', (error) => {
                        proxyService.stop().then(() => done(error));
                    });
                });

                req.once('error', (error) => {
                    proxyService.stop().then(() => done(error));
                });

                req.once('connect', () => {
                    console.log("connected");
                });

                req.end();
            } catch (error) {
                proxyService.stop().then(() => done(error));
            }

        });
    }, 1 * TimeUnit.Minutes);

    test('test HTTPs -> HTTPs', (done) => {

        const upstreamHost1 = new UpstreamHost('127.0.0.1', 9778, true, true, false, false);

        const virtualHost = new VirtualHost('test.com', 'test', LoadBalancerType.FirstFree, [upstreamHost1]);

        const gatewayHostService = new GatewayHostService();
        gatewayHostService.addGatewayHost(virtualHost);

        const proxyService = new ProxyService(gatewayHostService);

        proxyService.httpsProxy(9999, {
            key: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost-privkey.pem')),
            cert: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost-cert.pem'))
        });

        proxyService.serve();

        backoff(2000).then(() => {

            try {
                const req = https.request({
                    method: 'GET',
                    host: '127.0.0.1',
                    port: 9999,
                    path: '/',
                    headers: {
                        host: virtualHost.domain
                    },
                    rejectUnauthorized: false
                }, (response) => {

                    const chunks: any[] = [];

                    expect(response.statusCode).toBe(201);
                    expect(response.headers['proto']).toBeDefined();
                    expect(response.headers['proto']).toBe('https');

                    response.on('data', (chunk) => {
                        chunks.push(chunk);
                    });

                    response.once('end', () => {

                        const payload = Buffer.concat(chunks).toString('utf8');

                        expect(payload).toBe('HTTPs test');

                        proxyService.stop().then(done);
                    });

                    response.on('error', (error) => {
                        proxyService.stop().then(() => done(error));
                    });
                });

                req.once('error', (error) => {
                    proxyService.stop().then(() => done(error));
                });

                req.once('connect', () => {
                    console.log("connected");
                });

                req.end();
            } catch (error) {
                proxyService.stop().then(() => done(error));
            }

        });
    }, 1 * TimeUnit.Minutes);

    test('test HTTPs -> HTTP2', (done) => {

        const upstreamHost1 = new UpstreamHost('127.0.0.1', 9779, true, false, true, false);

        const virtualHost = new VirtualHost('test.com', 'test', LoadBalancerType.FirstFree, [upstreamHost1]);

        const gatewayHostService = new GatewayHostService();
        gatewayHostService.addGatewayHost(virtualHost);

        const proxyService = new ProxyService(gatewayHostService);

        proxyService.httpsProxy(9999, {
            key: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost-privkey.pem')),
            cert: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost-cert.pem'))
        });

        proxyService.serve();

        backoff(5000).then(() => {

            try {
                const req = https.request({
                    method: 'GET',
                    host: '127.0.0.1',
                    port: 9999,
                    path: '/',
                    headers: {
                        host: virtualHost.domain
                    },
                    rejectUnauthorized: false
                }, (response) => {

                    const chunks: any[] = [];

                    expect(response.statusCode).toBe(202);
                    expect(response.headers['proto']).toBeDefined();
                    expect(response.headers['proto']).toBe('http2');

                    response.on('data', (chunk) => {
                        chunks.push(chunk);
                    });

                    response.once('end', () => {

                        const payload = Buffer.concat(chunks).toString('utf8');

                        expect(payload).toBe('HTTP2 test');

                        proxyService.stop().then(done);
                    });

                    response.on('error', (error) => {
                        proxyService.stop().then(() => done(error));
                    });
                });

                req.once('error', (error) => {
                    proxyService.stop().then(() => done(error));
                });

                req.once('connect', () => {
                    console.log("connected");
                });

                req.end();
            } catch (error) {
                proxyService.stop().then(() => done(error));
            }

        });
    }, 1 * TimeUnit.Minutes);

    test('test HTTP2 -> HTTP', (done) => {

        const upstreamHost1 = new UpstreamHost('127.0.0.1', 9777, true, false, false, true);

        const virtualHost = new VirtualHost('test.com', 'test', LoadBalancerType.RoundRobin, [upstreamHost1]);

        const gatewayHostService = new GatewayHostService();
        gatewayHostService.addGatewayHost(virtualHost);

        const proxyService = new ProxyService(gatewayHostService);

        proxyService.http2Proxy(9999, {
            key: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost-privkey.pem')),
            cert: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost-cert.pem'))
        });

        proxyService.serve();

        backoff(2000).then(() => {
            try {

                http2.connect(new URL('https://127.0.0.1:9999'), {
                    rejectUnauthorized: false,
                }, (client) => {

                    const request = client.request(
                        {
                            [http2.constants.HTTP2_HEADER_PATH]: '/',
                            [http2.constants.HTTP2_HEADER_HOST]: virtualHost.domain
                        }
                    );

                    request.on('response', (headers, flags) => {

                        expect(headers[":status"]).toBe(200);
                        expect(headers['proto']).toBeDefined();
                        expect(headers['proto']).toBe('http');

                        const chunks: any[] = [];

                        request.on('data', (chunk) => {
                            chunks.push(chunk);
                        });

                        request.once('end', () => {

                            const payload = Buffer.concat(chunks).toString('utf8');

                            expect(payload).toBe('HTTP test');

                            client.close(() => {
                                proxyService.stop().then(done);
                            });
                        });
                    });

                    request.on('error', (error) => {
                        proxyService.stop().then(() => done(error));
                    });

                    request.end();
                });

            } catch (error) {
                proxyService.stop().then(() => done(error));
            }

        });
    }, 1 * TimeUnit.Minutes);

    test('test HTTP2 -> HTTPs', (done) => {

        const upstreamHost1 = new UpstreamHost('127.0.0.1', 9778, true, true, false, false);

        const virtualHost = new VirtualHost('test.com', 'test', LoadBalancerType.RoundRobin, [upstreamHost1]);

        const gatewayHostService = new GatewayHostService();
        gatewayHostService.addGatewayHost(virtualHost);

        const proxyService = new ProxyService(gatewayHostService);

        proxyService.http2Proxy(9999, {
            key: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost-privkey.pem')),
            cert: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost-cert.pem'))
        });

        proxyService.serve();

        backoff(2000).then(() => {
            try {

                http2.connect(new URL('https://127.0.0.1:9999'), {
                    rejectUnauthorized: false,
                }, (client) => {

                    const request = client.request(
                        {
                            [http2.constants.HTTP2_HEADER_PATH]: '/',
                            [http2.constants.HTTP2_HEADER_HOST]: virtualHost.domain
                        }
                    );

                    request.on('response', (headers, flags) => {

                        expect(headers[":status"]).toBe(201);
                        expect(headers['proto']).toBeDefined();
                        expect(headers['proto']).toBe('https');

                        const chunks: any[] = [];

                        request.on('data', (chunk) => {
                            chunks.push(chunk);
                        });

                        request.once('end', () => {

                            const payload = Buffer.concat(chunks).toString('utf8');

                            expect(payload).toBe('HTTPs test');

                            client.close(() => {
                                proxyService.stop().then(done);
                            });
                        });
                    });

                    request.on('error', (error) => {
                        proxyService.stop().then(() => done(error));
                    });

                    request.end();
                });

            } catch (error) {
                proxyService.stop().then(() => done(error));
            }

        });
    }, 1 * TimeUnit.Minutes);

    test('test HTTP2 -> HTTP2', (done) => {

        const upstreamHost1 = new UpstreamHost('127.0.0.1', 9779, true, false, true, false);

        const virtualHost = new VirtualHost('test.com', 'test', LoadBalancerType.RoundRobin, [upstreamHost1]);

        const gatewayHostService = new GatewayHostService();
        gatewayHostService.addGatewayHost(virtualHost);

        const proxyService = new ProxyService(gatewayHostService);

        proxyService.http2Proxy(9999, {
            key: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost-privkey.pem')),
            cert: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost-cert.pem'))
        });

        proxyService.serve();

        backoff(2000).then(() => {
            try {

                const session = http2.connect(new URL('https://127.0.0.1:9999'), {
                    rejectUnauthorized: false,
                }, (client) => {

                    const request = client.request(
                        {
                            [http2.constants.HTTP2_HEADER_PATH]: '/',
                            [http2.constants.HTTP2_HEADER_HOST]: virtualHost.domain
                        }
                    );

                    request.on('response', (headers, flags) => {

                        expect(headers[":status"]).toBe(202);
                        expect(headers['proto']).toBeDefined();
                        expect(headers['proto']).toBe('http2');

                        const chunks: any[] = [];

                        request.on('data', (chunk) => {
                            chunks.push(chunk);
                        });

                        request.once('end', () => {

                            const payload = Buffer.concat(chunks).toString('utf8');

                            expect(payload).toBe('HTTP2 test');

                            session.close(() => {
                                proxyService.stop().then(done);
                            });
                        });
                    });

                    request.on('error', (error) => {
                        session.close(()=> {
                            proxyService.stop().then(() => done(error));
                        });
                    });

                    request.end();
                });

            } catch (error) {
                proxyService.stop().then(() => done(error));
            }

        });
    }, 1 * TimeUnit.Minutes);
});
