/** project imports */
const {VirtualHost} = require('../model/virtual_host');
const {UpstreamHost} = require('../model/upstream_host');
const {VirtualHostService} = require('../service/virtual_host_service');
const {HealthCheckService} = require('../service/health_check_service');
const {LB_TYPES} = require('../load_balancer/lb_enum');
const {InMemoryRepository} = require('../repository/in_memory_repository');
const {Config} = require('./config');

const manager = new VirtualHostService();

let repository;

if(Config.repository() === 'redis') {

    /**
     * @type {RedisClient}
     */
    const redis = require('../service/redis_client');
    const {RedisRepository} = require('../repository/redis_repository');

    repository = new RedisRepository(redis);

    /**
     * @listens VirtualHostService#host
     */
    manager.on('host', (vHost) => {
        repository.saveVirtualHost(vHost);
    });

    /**
     * @listens VirtualHostService#delete
     */
    manager.on('delete', (host) => {
        repository.removeVirtualHost(host);
    });

    redis.once('ready', () => {
        repository
            .loadVirtualHosts()
            .then((vHosts) => {
                vHosts.forEach((v) => manager.addVirtualHost(v));
            });
    });

    let subscriber = redis.duplicate();

    subscriber.on('message', (channel, message) => {

        const newHost = VirtualHost.fromRedis(message);
        manager.addVirtualHost(newHost);
    });

    subscriber.subscribe("hosts");

} else {
    repository = new InMemoryRepository();
}

/**
 * @listens VirtualHostService#stats
 */
manager.on('stats', (record) => {
    repository.saveResponseStatus(record);
});

const health = new HealthCheckService(manager);
health.startHealthCheck().finally();

module.exports = {manager, repository};
