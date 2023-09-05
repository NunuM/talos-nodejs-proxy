import {Config} from "./config";
import {InMemoryRepository} from "../repository/in-memory-repository";
import {Repository} from "../repository/repository";

const repository = Config.repository();

export function getRepository(): Repository {
    if (repository.type === 'redis') {
        /**
         * @type {RedisClient}
         */
        const {RedisRepository} = require('../repository/redis-repository');

        return new RedisRepository(repository.redisConnectionString);

    } else {
        return new InMemoryRepository();
    }
}
