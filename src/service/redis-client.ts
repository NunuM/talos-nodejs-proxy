import * as redis from 'redis';
import {RedisClientType} from 'redis';
import {Config} from "../app/config";
import {LOGGER} from "./logger-service";

/** package imports */

/**
 *
 * @type {RedisClient}
 */
export const client: RedisClientType = redis.createClient({
    url: Config.redisConnectionString(),
});

client.connect()
    .finally(() => {
        LOGGER.debug("connected");
    });

client.on('error', (error) => {
    LOGGER.error('Redis client error', error);
});

