/** project imports */
const {REDIS_KEYS} = require('../model/redis_keys');
const {Repository} = require('./repository');
const {VirtualHost} = require('../model/virtual_host');
const {LOGGER} = require('../service/logger_service');

class RedisRepository extends Repository {

    /**
     * @constructor
     * @param {RedisClient} client
     */
    constructor(client) {
        super();
        this._client = client;
        this._buffer = [];

        this._client.on('ready', () => {
            this.flushBuffer();
        });
    }

    /**
     * @inheritDoc
     */
    loadVirtualHosts() {
        return new Promise(resolve => {
            this._client.hgetall(REDIS_KEYS.HOSTS, (err, hosts) => {

                if (!err) {

                    const result = [];

                    for (const host of Object.values(hosts)) {
                        const vHost = VirtualHost.fromRedis(host);
                        if (vHost) {
                            result.push(vHost);
                        }
                    }

                    resolve(result);
                }
            });
        });
    }

    /**
     * @inheritDoc
     */
    saveVirtualHost(virtualHost) {
        if (this._client.connected) {
            try {
                this._client.hset(REDIS_KEYS.HOSTS, virtualHost.key(), JSON.stringify(virtualHost.toJSON()));
            } catch (e) {
                LOGGER.error("Error storing virtual host", virtualHost);
            }

            this.flushBuffer();

        } else {
            this._buffer.push(virtualHost);
        }

        return true;
    }


    flushBuffer() {

        while (this._buffer.length > 0) {
            const virtualHost = this._buffer.shift();
            try {
                this._client.hset(REDIS_KEYS.HOSTS, virtualHost.key(), JSON.stringify(virtualHost.toJSON()));
            } catch (e) {
                LOGGER.error("Error storing virtual host", virtualHost);
            }
        }
    }

    /**
     *
     * @inheritDoc
     */
    saveResponseStatus(record) {

        this._client.multi([
            ['hget', REDIS_KEYS.STATS, record.latencyKey()],
            ['hget', REDIS_KEYS.STATS, record.totalNumberOfRequestKey()]
        ]).exec((err, keys) => {

            const average = Number(keys[0] || 0);
            const total = Number(keys[1] || 0);

            const newAverage = Math.trunc(((average * total) + record.timing) / (total + 1));

            this._client.multi([
                ['hset', REDIS_KEYS.STATS, record.latencyKey(), newAverage],
                ['hset', REDIS_KEYS.STATS, record.lastRequestDateKey(), record.date.getTime()],
                ['HINCRBY', REDIS_KEYS.STATS, record.statusCounterKey(), 1],
                ['HINCRBY', REDIS_KEYS.STATS, record.totalNumberOfRequestKey(), 1]
            ]).exec();

        });
    }

    /**
     *
     * @inheritDoc
     */
    loadStats() {
        return new Promise(resolve => {
            this._client.hgetall('stats', (err, result) => {

                if (err) {
                    LOGGER.warn("Could not get stats", err);
                    resolve([]);
                } else {
                    resolve(result);
                }
            });

        });
    }

    /**
     *
     * @inheritDoc
     */
    removeVirtualHost(host) {
        this._client.hdel('hosts', host, (err) => {
            if (err) {
                LOGGER.warn('Could not remove virtual host')
            }
        });
    }
}


module.exports = {RedisRepository};