import {Repository} from "./repository";
import {ResponseStats} from "../model/response-stats";
import {VirtualHost} from "../model/virtual-host";
import {ApiGateway} from "../model/api-gateway";
import {Gateway} from "../model/gateway";

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
        return Promise.resolve(this._hosts.delete(host));
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
        return Promise.resolve(true);
    }

    /**
     * @inheritDoc
     */
    private saveApiGateway(apiGateway: ApiGateway): Promise<boolean> {
        this._apisGetaways.set(apiGateway.domain, apiGateway);
        return Promise.resolve(true);
    }

    /**
     * @inheritDoc
     */
    private removeApiGateway(apiGateway: string): Promise<boolean> {
        return Promise.resolve(this._apisGetaways.delete(apiGateway));
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


module.exports = {InMemoryRepository};
