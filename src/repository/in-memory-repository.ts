import {Repository} from "./repository";
import {ResponseStats} from "../model/response-stats";
import {VirtualHost} from "../model/virtual-host";
import {ApiGateway} from "../model/api-gateway";
import {Gateway, GatewaysTypes} from "../model/gateway";
import fs from "fs/promises";
import {Config} from "../app/config";
import {LOGGER} from "../service/logger-service";

/**
 * @class
 * @extends {Repository}
 */
export class InMemoryRepository implements Repository {

    private readonly _hosts: Map<string, VirtualHost>;
    private readonly _apisGetaways: Map<string, ApiGateway>;
    private _stats: Map<string, any>;

    /**
     * @constructor
     */
    constructor() {
        this._hosts = new Map<string, VirtualHost>();
        this._stats = new Map<string, any>;
        this._apisGetaways = new Map<string, ApiGateway>();
    }

    /**
     * @inheritDoc
     */
    async connect(): Promise<void> {

        const repository = Config.repository();

        if (repository.type === 'file') {

            try {
                await fs.access(repository.filePath);
            } catch (error) {
                //@ts-ignore
                if (error && error.code === 'ENOENT') {
                    try {
                        const toStore: { [key: string]: any[] } = {
                            [GatewaysTypes.ApiGateway]: [],
                            [GatewaysTypes.VirtualHost]: []
                        };
                        await fs.writeFile(repository.filePath, JSON.stringify(toStore), {encoding: 'utf8'});
                        return void 0;
                    } catch (e) {
                        LOGGER.error("Error creating default file repository", e);

                        throw e;
                    }
                } else {
                    throw error;
                }
            }

            try {

                const gateways = JSON.parse((await fs.readFile(repository.filePath)).toString('utf8'));

                for (let virtualHost of (gateways.virtualHost || [])) {
                    const vHost = VirtualHost.fromJSONObject(virtualHost);

                    if (vHost) {
                        this._hosts.set(vHost.id(), vHost);
                    } else {
                        LOGGER.warn("Error create virtual host instance:", virtualHost);
                    }
                }

                for (let apiGateway of (gateways.apiGateway || [])) {
                    const api = ApiGateway.fromJSONObject(apiGateway);

                    if (api) {
                        this._apisGetaways.set(api.id(), api);
                    } else {
                        LOGGER.warn("Error create API gateway instance:", apiGateway);
                    }
                }

            } catch (e) {
                LOGGER.error("Error loading gateways from file:", repository, ', error:', e);

                throw e;
            }

            return void 0;
        } else if (repository.type === 'memory') {
            return void 0;
        }


        throw new Error("Trying to initialize file repository with wrong type");
    }

    /**
     * @inheritDoc
     */
    getGatewayById(domain: string): Promise<Gateway | undefined> {
        if (this._hosts.has(domain)) {
            return Promise.resolve(this._hosts.get(domain));
        } else if (this._apisGetaways.has(domain)) {
            return Promise.resolve(this._apisGetaways.get(domain));
        } else {
            return Promise.resolve(undefined);
        }
    }

    /**
     * @inheritDoc
     */
    existsGateway(domain: string): Promise<boolean> {
        return Promise.resolve(this._hosts.has(domain) || this._apisGetaways.has(domain));
    }

    /**
     * @inheritDoc
     */
    loadStats(): Promise<{ [key: string]: any }> {
        const result: { [key: string]: any } = {};

        for (let [key, stats] of this._stats.entries()) {
            result[key] = stats;
        }

        return Promise.resolve(result);
    }

    /**
     * @inheritDoc
     */
    private loadVirtualHosts(): Promise<VirtualHost[]> {
        return Promise.resolve(Array(...this._hosts.values()));
    }

    /**
     * @inheritDoc
     */
    private loadApiGateways(): Promise<ApiGateway[]> {
        return Promise.resolve(Array(...this._apisGetaways.values()));
    };

    /**
     * @inheritDoc
     */
    private removeVirtualHost(host: string): Promise<boolean> {
        if (this._hosts.delete(host)) {
            return this.store();
        }

        return Promise.resolve(false);
    }

    /**
     * @inheritDoc
     */
    saveResponseStatus(record: ResponseStats): Promise<boolean> {

        const latency = this._stats.get(record.latencyKey()) || 0;

        const totalRequests = this._stats.get(record.totalNumberOfRequestKey()) || 0;

        const average = Number(latency);
        const total = Number(totalRequests);

        const newAverage = Math.trunc(((average * total) + record.timing) / (total + 1));

        this._stats.set(record.latencyKey(), newAverage);
        this._stats.set(record.lastRequestDateKey(), record.date.getTime());

        this._stats.set(record.statusCounterKey(), (this._stats.get(record.statusCounterKey()) || 0) + 1);
        this._stats.set(record.totalNumberOfRequestKey(), totalRequests + 1);

        return Promise.resolve(true);
    }

    /**
     * @inheritDoc
     */
    private saveVirtualHost(virtualHost: VirtualHost): Promise<boolean> {
        this._hosts.set(virtualHost.id(), virtualHost);
        return this.store();
    }

    /**
     * @inheritDoc
     */
    private saveApiGateway(apiGateway: ApiGateway): Promise<boolean> {
        this._apisGetaways.set(apiGateway.domain, apiGateway);
        return this.store();
    }

    /**
     * @inheritDoc
     */
    private removeApiGateway(apiGateway: string): Promise<boolean> {
        if (this._apisGetaways.delete(apiGateway)) {
            return this.store();
        }

        return Promise.resolve(false);
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

    private async store(): Promise<boolean> {

        const repository = Config.repository();

        if (repository.type === 'file') {

            const toStore: { [key: string]: any[] } = {[GatewaysTypes.ApiGateway]: [], [GatewaysTypes.VirtualHost]: []};

            for (let vHost of this._hosts.values()) {
                toStore[GatewaysTypes.VirtualHost].push(vHost.toJSON());
            }

            for (let api of this._apisGetaways.values()) {
                toStore[GatewaysTypes.ApiGateway].push(api.toJSON());
            }

            await fs.writeFile(repository.filePath, JSON.stringify(toStore), {encoding: 'utf8'});

            return true;
        } else {
            return repository.type === 'memory'
        }
    }
}


module.exports = {InMemoryRepository};
