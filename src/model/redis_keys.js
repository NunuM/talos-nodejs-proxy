/**
 * @enum
 * @readonly
 * @type {{HOSTS: string, STATS: string}}
 */
const REDIS_KEYS = {
    HOSTS: 'hosts',
    STATS: 'stats'
};

Object.seal(REDIS_KEYS);

module.exports = {REDIS_KEYS};