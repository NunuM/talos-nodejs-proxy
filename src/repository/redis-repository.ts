/** project imports */
import {Repository} from "./repository";
import {VirtualHost} from "../model/virtual-host";
import {RedisKeys} from "../model/redis-keys";
import {ResponseStats} from "../model/response-stats";
import * as redis from "redis";
import {RedisClientType} from "redis";
import {LOGGER} from "../service/logger-service";
import {ApiGateway} from "../model/api-gateway";
import {Gateway} from "../model/gateway";

/**
 * @class
 * @extends {Repository}
 */
export class RedisRepository implements Repository {

    private _client: RedisClientType;
    private _buffer: any[];

    /**
     * @constructor
     * @param {string} connectionString
     */
    constructor(connectionString: string) {
        this._client = redis.createClient({
            url: connectionString,
        });
        this._buffer = [];

        this._client.on('ready', () => {
            this.flushBuffer().finally();
        });
    }

    /**
     * @inheritDoc
     */
    connect(): Promise<void> {
        return this._client.connect();
    }

    /**
     * @inheritDoc
     */
    getGatewayById(domain: string): Promise<Gateway | undefined> {
        return Promise.all([
            this._client.hGet(RedisKeys.APIS, domain),
            this._client.hGet(RedisKeys.HOSTS, domain)
        ]).then((results) => {
            if (results[0]) {
                return ApiGateway.fromJSONString(results[0]);
            } else if (results[1]) {
                return VirtualHost.fromJSONString(results[1]);
            } else {
                return undefined;
            }
        });
    }

    /**
     * @inheritDoc
     */
    existsGateway(domain: string): Promise<boolean> {
        return Promise.all([
            this._client.hExists(RedisKeys.APIS, domain),
            this._client.hExists(RedisKeys.HOSTS, domain)
        ]).then((results) => {
            return results[0] || results[1];
        });
    }

    /**
     * @inheritDoc
     */
    async loadVirtualHosts(): Promise<VirtualHost[]> {
        return await this._client.hGetAll(RedisKeys.HOSTS)
            .then((hosts) => {

                const result: VirtualHost[] = [];

                for (let host of Object.values(hosts)) {
                    if (host) {
                        const fromJSONString = VirtualHost.fromJSONString(host);
                        if (fromJSONString) {
                            result.push(fromJSONString);
                        }
                    }
                }

                return result;
            });
    }

    /**
     * @inheritDoc
     */
    async saveVirtualHost(virtualHost: VirtualHost): Promise<boolean> {
        if (this._client.isReady) {
            try {
                await this._client.hSet(RedisKeys.HOSTS, virtualHost.id(), JSON.stringify(virtualHost.toJSON()));
            } catch (e) {
                LOGGER.error("Error storing virtual host", virtualHost);
            }

            await this.flushBuffer();

        } else {
            this._buffer.push(virtualHost);
        }

        return true;
    }


    private async flushBuffer(): Promise<void> {
        while (this._buffer.length > 0) {
            const virtualHost = this._buffer.shift();
            try {
                await this._client.hSet(RedisKeys.HOSTS, virtualHost.key(), JSON.stringify(virtualHost.toJSON()));
            } catch (e) {
                LOGGER.error("Error storing virtual host", virtualHost);
            }
        }
    }

    /**
     * @inheritDoc
     */
    saveResponseStatus(record: ResponseStats): Promise<boolean> {
        return this._client.multi()
            .hGet(RedisKeys.STATS, record.latencyKey())
            .hGet(RedisKeys.STATS, record.totalNumberOfRequestKey())
            .exec()
            .then((keys) => {

                const average = Number(keys[0] || 0);
                const total = Number(keys[1] || 0);

                const newAverage = Math.trunc(((average * total) + record.timing) / (total + 1));

                return this._client
                    .multi()
                    .hSet(RedisKeys.STATS, record.latencyKey(), newAverage)
                    .hSet(RedisKeys.STATS, record.lastRequestDateKey(), record.date.getTime())
                    .hIncrBy(RedisKeys.STATS, record.statusCounterKey(), 1)
                    .hIncrBy(RedisKeys.STATS, record.totalNumberOfRequestKey(), 1)
                    .exec();
            })
            .then(() => true);
    }

    /**
     * @inheritDoc
     */
    loadStats(): Promise<{ [key: string]: number | string }> {
        return this._client.hGetAll('stats');
    }

    /**
     * @inheritDoc
     */
    removeVirtualHost(host: string): Promise<boolean> {
        return this._client.hDel(RedisKeys.HOSTS, host)
            .then(() => {
                return true;
            });
    }

    /**
     * @inheritDoc
     */
    async loadApiGateways(): Promise<ApiGateway[]> {
        return await this._client.hGetAll(RedisKeys.APIS)
            .then((hosts) => {

                const result: ApiGateway[] = [];

                for (let host of Object.values(hosts)) {
                    if (host) {
                        const fromJSONString = ApiGateway.fromJSONString(host);
                        if (fromJSONString) {
                            result.push(fromJSONString);
                        }
                    }
                }

                return result;
            });
    }

    async removeApiGateway(apiGateway: string): Promise<boolean> {
        return this._client.hDel(RedisKeys.APIS, apiGateway)
            .then(() => {
                return true;
            });
    }

    async saveApiGateway(apiGateway: ApiGateway): Promise<boolean> {
        if (this._client.isReady) {
            try {
                await this._client.hSet(RedisKeys.APIS, apiGateway.id(), JSON.stringify(apiGateway.toJSON()));
            } catch (e) {
                LOGGER.error("Error storing api gateway host", apiGateway);
            }

            await this.flushBuffer();

        } else {
            this._buffer.push(apiGateway);
        }

        return true;
    }

    /**
     * @inheritDoc
     */
    async loadGateways(): Promise<Gateway[]> {

        const apiGateways = await this.loadApiGateways();
        const virtualHosts = await this.loadVirtualHosts();

        return Array<Gateway>(...apiGateways).concat(...virtualHosts);
    }

    /**
     * @inheritDoc
     */
    removeGateway(gateway: Gateway): Promise<boolean> {
        if (gateway instanceof VirtualHost) {
            return this.removeVirtualHost(gateway.domain);
        } else {
            return this.removeApiGateway(gateway.domain);
        }
    }

    /**
     * @inheritDoc
     */
    saveGateway(gateway: Gateway): Promise<boolean> {
        if (gateway instanceof VirtualHost) {
            return this.saveVirtualHost(gateway);
        } else if (gateway instanceof ApiGateway) {
            return this.saveApiGateway(gateway);
        } else {
            return Promise.resolve(false);
        }
    }
}
