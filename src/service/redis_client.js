/** package imports */
const redis = require('redis');

/** project imports */
const {Config} = require('../app/config');
const {LOGGER} = require('../service/logger_service');

/**
 *
 * @type {RedisClient}
 */
const client = redis.createClient({
    url: Config.redisConnectionString(),
    retry_strategy: function (options) {
        if (options.error && options.error.code === "ECONNREFUSED") {
            // End reconnecting on a specific error and flush all commands with
            // a individual error
            return new Error("The server refused the connection");
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
            // End reconnecting after a specific timeout and flush all commands
            // with a individual error
            return new Error("Retry time exhausted");
        }
        if (options.attempt > 10) {
            // End reconnecting with built in error
            return undefined;
        }
        // reconnect after
        return Math.min(options.attempt * 100, 3000);
    },
});


client.on('error', (error) => {
    LOGGER.error('Redis client error', error);
});

module.exports = client;