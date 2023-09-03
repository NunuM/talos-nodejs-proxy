import http from "http";
import {Config} from "../app/config";
import {ADMIN_LOGGER} from "./logger-service";
import {Buffer} from "buffer";
import {HttpHeaders} from "pluto-http-client";
import fs from "fs";
import path from "path";
import {MiddlewareList} from "../middleware/middleware-registry";
import virtualHostScheme from './../app/scema/virtual-host.schema.json';
import apiGatewayScheme from './../app/scema/api-gateway.scheme.json';
import {Validator} from 'jsonschema'
import {VirtualHost} from "../model/virtual-host";
import {ApiGateway} from "../model/api-gateway";
import {Repository} from "../repository/repository";
import {EventEmitter} from "events";
import {GatewaysTypes} from "../model/gateway";
import util from "util";

type RouteHandler = (req: http.IncomingMessage, res: http.ServerResponse) => void;

const adminAPIConfig = Config.administration();

export class AdminApiService extends EventEmitter {

    private static readonly BASE_API = '/api/v1';

    private readonly _routes: Map<string, Map<string, RouteHandler>>;
    private readonly _repository: Repository;

    constructor(repository: Repository) {
        super();
        this._repository = repository;
        this._routes = new Map<string, Map<string, RouteHandler>>([
            ['GET', new Map<string, RouteHandler>()],
            ['POST', new Map<string, RouteHandler>()],
            ['PUT', new Map<string, RouteHandler>()],
            ['DELETE', new Map<string, RouteHandler>()]
        ]);

        this._routes.get('GET')?.set('/', this.index);
        this._routes.get('GET')?.set('/assets/plus.svg', this.assets);

        this.addRoute('GET', 'gateway', this.listGateways);
        this.addRoute('GET', 'middleware', this.listMiddlewares);

        this.addRoute('POST', 'virtualhost', this.addVirtualHost);
        this.addRoute('PUT', 'virtualhost/:name', this.updateVirtualHost);
        this.addRoute('DELETE', 'virtualhost/:name', this.deleteGateway);

        this.addRoute('POST', 'api-gateway', this.addAPIGateway);
        this.addRoute('PUT', 'api-gateway/:name', this.updateAPIGateway);
        this.addRoute('DELETE', 'api-gateway/:name', this.deleteGateway);

        this.addRoute('GET', 'stats', this.listStats);

        this.start();
    }

    addRoute(method: string, route: string, handler: RouteHandler) {
        this._routes.get(method)?.set([AdminApiService.BASE_API, route].join('/'), handler);
    }

    private start() {
        http.createServer((req, res) => {

            if (!AdminApiService.authenticate(req, res)) {
                return;
            }

            const routesByMethod = this._routes.get(req.method || '');

            if (!routesByMethod) {
                res.writeHead(404);
                res.end();
                return;
            }

            const path = req.url || '/';

            let handler = routesByMethod.get(path);

            if (!handler) {

                const pathParts = path.split('/');

                for (let route of routesByMethod.keys()) {

                    const routeParts = route.split('/');

                    if (pathParts.length != routeParts.length) {
                        continue;
                    }

                    let i = 0;
                    const params: { [key: string]: string } = {};
                    for (i = 0; i < routeParts.length; i++) {
                        if (routeParts[i].startsWith(':')) {
                            params[routeParts[i]] = pathParts[i];
                        } else if (routeParts[i] != pathParts[i]) {
                            break;
                        }
                    }

                    if (i == routeParts.length) {
                        handler = routesByMethod.get(route);
                        // @ts-ignore
                        req.params = params;
                        break;
                    }
                }

                if (!handler) {
                    res.writeHead(404);
                    res.end();
                    return;
                }
            }

            const chunks: any[] = [];


            req.on("data", (chunk) => {
                chunks.push(chunk);
            });

            req.on("end", () => {
                // @ts-ignore
                req.body = Buffer.concat(chunks).toString('utf8');
                // @ts-ignore
                handler.call(this, req, res);
            });

        }).listen(adminAPIConfig.port, adminAPIConfig.bindOnlyLocalhost ? '127.0.0.1' : undefined, () => {
            ADMIN_LOGGER.info("Admin API started at: http://localhost:" + adminAPIConfig.port);
        });
    }

    listGateways(req: http.IncomingMessage, res: http.ServerResponse) {

        this._repository.loadGateways()
            .then((gateways) => {

                const types = gateways.reduce((acc: any, gateway) => {

                    const toJSON = gateway.toJSON();

                    if (toJSON.type in acc) {
                        acc[toJSON.type].push(gateway);
                    } else {
                        acc[toJSON.type] = [gateway];
                    }

                    return acc;
                }, {[GatewaysTypes.VirtualHost]: [], [GatewaysTypes.ApiGateway]: []});

                for (let type of Object.keys(types)) {
                    types[type] = types[type].sort((a: any, b: any) => a.domain.localeCompare(b.domain));
                }

                this.reply(res, 200, types);

            }).catch((error) => {

            ADMIN_LOGGER.error("Error loading gateways from repository", error);

            this.reply(res, 500, {error});
        });
    }

    listMiddlewares(req: http.IncomingMessage, res: http.ServerResponse) {
        this.reply(res, 200, MiddlewareList);
    }

    addVirtualHost(req: http.IncomingMessage, res: http.ServerResponse) {

        try {

            //@ts-ignore
            const body = JSON.parse(req.body);

            const validator = new Validator();

            const validation = validator.validate(body, virtualHostScheme);

            if (!validation.valid) {

                this.reply(res, 400, {error: validation.toString()});
                return;
            }

            const virtualHost = VirtualHost.fromJSONObject(body);

            if (virtualHost) {
                this._repository
                    .existsGateway(virtualHost.domain)
                    .then((exists) => {
                        if (exists) {

                            this.reply(res, 409, {error: 'Gateway already exists'});

                        } else {
                            return this._repository.saveGateway(virtualHost)
                                .then((saved) => {
                                    if (saved) {

                                        this.emit('gateway', virtualHost);

                                        this.reply(res, 200, virtualHost.toJSON());

                                    } else {
                                        return Promise.reject('Gateway was not saved with success');
                                    }
                                })
                        }
                    })
                    .catch((error) => {

                        ADMIN_LOGGER.error("Error while persisting virtual hosts", body, error);

                        this.reply(res, 500, {error});
                    });
            } else {

                ADMIN_LOGGER.error("Virtual hosts from json object return undefined", body);

                this.reply(res, 500, {error: 'Unknown error'});
            }

        } catch (e) {
            //@ts-ignore
            ADMIN_LOGGER.error("Error adding virtual host due to the JSON deserialization", req.body, e);
            this.reply(res, 400);
        }
    }

    updateVirtualHost(req: http.IncomingMessage, res: http.ServerResponse) {

        // @ts-ignore
        const domain = req.params[':name'];


        this._repository.existsGateway(domain)
            .then((exists) => {
                if (!exists) {
                    res.writeHead(404).end();
                    return;
                } else {

                    try {
                        //@ts-ignore
                        const body = JSON.parse(req.body);

                        const validator = new Validator();

                        const validation = validator.validate(body, virtualHostScheme);

                        if (!validation.valid) {

                            this.reply(res, 400, {error: validation.toString()})
                            return;
                        }

                        const virtualHost = VirtualHost.fromJSONObject(body);

                        if (virtualHost) {

                            this._repository.saveGateway(virtualHost)
                                .then((saved) => {

                                    if (saved) {

                                        this.emit('gateway', virtualHost);

                                        this.reply(res, 200, virtualHost.toJSON());
                                    } else {

                                        ADMIN_LOGGER.error("Persisting virtual hosts returned false", body);

                                        this.reply(res, 500, {error: 'Unknown error'});
                                    }

                                })
                                .catch((error) => {
                                    ADMIN_LOGGER.error("Error persisting virtual hosts", body, error);

                                    this.reply(res, 500, {error});
                                });
                        } else {

                            ADMIN_LOGGER.error("Virtual hosts from json object return undefined", body);

                            this.reply(res, 500, {error: 'Unknown error'});
                        }
                    } catch (e) {
                        //@ts-ignore
                        ADMIN_LOGGER.error("Error adding virtual host due to the JSON deserialization", req.body, e);
                        this.reply(res, 400);
                    }
                }
            })
    }

    deleteGateway(req: http.IncomingMessage, res: http.ServerResponse) {
        // @ts-ignore
        const domain = req.params[':name'];

        this._repository
            .getGatewayById(domain)
            .then((gateway) => {

                if (gateway) {
                    this._repository.removeGateway(gateway)
                        .then((deleted) => {
                            if (deleted) {

                                this.emit('removed', gateway);

                                this.reply(res, 200);
                            } else {

                                ADMIN_LOGGER.error("Removing gateway from persistence not concluded", gateway);

                                this.reply(res, 500, {error: 'Unknown error'});
                            }
                        })
                        .catch((error) => {
                            ADMIN_LOGGER.error("Error removing gateway from persistence", gateway, error);
                            this.reply(res, 500, {error});
                        });
                } else {
                    this.reply(res, 404);
                }
            })
            .catch((error) => {
                ADMIN_LOGGER.error("Error getting gateway:", domain, error);

                this.reply(res, 500, {error});
            });
    }


    addAPIGateway(req: http.IncomingMessage, res: http.ServerResponse) {

        try {
            //@ts-ignore
            const body = JSON.parse(req.body);

            const validator = new Validator();

            const validation = validator.validate(body, apiGatewayScheme);

            if (!validation.valid) {
                res
                    .writeHead(400, {[HttpHeaders.CONTENT_TYPE]: 'application/json'})
                    .end(JSON.stringify({error: validation.toString()}));
                return;
            }

            const apiGateway = ApiGateway.fromJSONObject(body);

            if (apiGateway) {
                this._repository.existsGateway(apiGateway.domain)
                    .then((exists) => {
                        if (exists) {
                            this.reply(res, 409, {error: 'Gateway already exists'});
                        } else {
                            this._repository
                                .saveGateway(apiGateway)
                                .then((saved) => {
                                    if (saved) {
                                        this.emit('gateway', apiGateway);
                                        this.reply(res, 200, apiGateway.toJSON());
                                    } else {
                                        ADMIN_LOGGER.error("Persisting api gateway do not concluded", apiGateway);
                                        this.reply(res, 500, {error: 'Unknown error'});
                                    }
                                }).catch((error) => {

                                ADMIN_LOGGER.error("Error persisting api gateway", apiGateway, error);

                                this.reply(res, 500, {error});

                            });
                        }
                    });
            } else {
                this.reply(res, 500, {error: 'Api Gateway from Object returned undefined'});
            }
        } catch (e) {
            //@ts-ignore
            ADMIN_LOGGER.error("Error adding api gateway due to the JSON deserialization", req.body, e);
            res.writeHead(400).end();
        }
    }

    updateAPIGateway(req: http.IncomingMessage, res: http.ServerResponse) {

        // @ts-ignore
        const domain = req.params[':name'];


        this._repository.getGatewayById(domain)
            .then((gateway) => {

                if (gateway) {

                    try {
                        //@ts-ignore
                        const body = JSON.parse(req.body);

                        const validator = new Validator();

                        const validation = validator.validate(body, apiGatewayScheme);

                        if (!validation.valid) {
                            this.reply(res, 400, {error: validation.toString()});
                            return;
                        }

                        const api = ApiGateway.fromJSONString(JSON.stringify(body));

                        if (api) {

                            this._repository
                                .saveGateway(api)
                                .then((saved) => {
                                    if (saved) {
                                        this.emit('gateway', api);
                                        this.reply(res, 200, api.toJSON());
                                    } else {

                                        ADMIN_LOGGER.error("Persisting a updated version of Api gateway not concluded", api);

                                        this.reply(res, 500, {error: 'Unknown error'});
                                    }
                                })
                                .catch((error) => {

                                    ADMIN_LOGGER.error("Error persisting Api gateway", api, error);

                                    this.reply(res, 500, {error});
                                });
                        } else {

                            ADMIN_LOGGER.error("Updating Api gateway from object returned undefined");

                            this.reply(res, 500, {error: 'Unknown error'});
                        }
                    } catch (e) {
                        //@ts-ignore
                        ADMIN_LOGGER.error("Error adding api gateway due to the JSON deserialization", req.body, e);
                        this.reply(res, 400);
                    }
                } else {
                    this.reply(res, 404);
                }
            })
            .catch((error) => {
                ADMIN_LOGGER.error("Error getting gateway by domain", domain, error);
                this.reply(res, 500, {error});
            });
    }

    listStats(req: http.IncomingMessage, res: http.ServerResponse) {
        this._repository
            .loadStats()
            .then((stats) => {

                this.reply(res, 200, stats);

            })
            .catch((error) => {

                ADMIN_LOGGER.error("Error loading stats", error);

                this.reply(res, 500, {error});
            });
    }


    index(req: http.IncomingMessage, res: http.ServerResponse) {
        res.writeHead(200, {[HttpHeaders.CONTENT_TYPE]: 'text/html'});
        fs.createReadStream(path.join(process.cwd(), 'views', 'index.html')).pipe(res);
    }

    assets(req: http.IncomingMessage, res: http.ServerResponse) {

        const parts = (req.url || '').split('/');

        const assetName = parts[parts.length - 1];

        const asset = path.join(process.cwd(), 'views', 'assets');

        fs.readdir(asset, (err, entries) => {
            if (err) {
                res.writeHead(404).end();
                return;
            }
            if (entries.includes(assetName)) {
                res.writeHead(200, {[HttpHeaders.CONTENT_TYPE]: 'image/svg+xml'});
                fs.createReadStream(path.join(asset, assetName)).pipe(res);
            }
        });
    }

    private reply(res: http.ServerResponse, status: number, body?: any) {
        res.writeHead(status, {[HttpHeaders.CONTENT_TYPE]: 'application/json'})
            .end(JSON.stringify(body || {}));
    }

    private static authenticate(req: http.IncomingMessage, res: http.ServerResponse) {
        if (adminAPIConfig.authenticator.type === 'none') {
            return true;
        } else {
            const compareAuthHeaderWith = Buffer.from(
                util.format("%s:%s",
                    adminAPIConfig.authenticator.username,
                    adminAPIConfig.authenticator.password)
            ).toString('base64');

            const header = (req.headers['authorization'] || '').trim();

            if (`Basic ${compareAuthHeaderWith}` !== header) {

                res.writeHead(401, {'WWW-Authenticate': 'Basic realm="User Visible Realm", charset="UTF-8"'});
                res.end();

                return false;
            } else {
                return true;
            }
        }
    }
}
