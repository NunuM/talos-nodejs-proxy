import {GatewayHostService} from "../service/gateway-host-service";
import {Config} from "./config";
import {RedisClientType} from "redis";
import {Repository} from "../repository/repository";
import {Gateway} from "../model/gateway";
import {InMemoryRepository} from "../repository/in-memory-repository";
import {ResponseStats} from "../model/response-stats";

/** project imports */


export const manager: GatewayHostService = new GatewayHostService();

export let repository: Repository;

if(Config.repository() === 'redis') {

    /**
     * @type {RedisClient}
     */
    const redis: RedisClientType = require('../service/redis-client');
    const {RedisRepository} = require('../repository/redis-repository');

    repository = new RedisRepository(redis);

    manager.on('gateway', (gateway: Gateway) => {
        repository.saveGateway(gateway).finally();
    });

    manager.on('delete', (gateway: Gateway) => {
        repository.removeGateway(gateway).finally();
    });

    redis.once('ready', () => {
        repository
            .loadGateways()
            .then((gateway) => {
                gateway.forEach((g) => manager.addGatewayHost(g));
            });
    });

} else {
    repository = new InMemoryRepository();
}

/**
 * @listens VirtualHostService#stats
 */
manager.on('stats', (record: ResponseStats) => {
    repository.saveResponseStatus(record).finally();
});
