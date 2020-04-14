const {Repository} = require('./repository');

/**
 * @class
 */
class InMemoryRepository extends Repository {

    /**
     * @constructor
     */
    constructor() {
        super();
        this._stats = new Map();
    }


    /**
     *
     * @inheritDoc
     */
    loadStats() {
        return Promise.resolve(Array.from(this._stats.entries()).reduce((main, [key, value]) => ({
            ...main,
            [key]: value
        }), {}));
    }

    /**
     *
     * @inheritDoc
     */
    loadVirtualHosts() {
        return Promise.resolve([]);
    }

    /**
     *
     * @inheritDoc
     */
    removeVirtualHost(host) {
    }

    /**
     *
     * @inheritDoc
     */
    saveResponseStatus(record) {

        const latency = this._stats.get(record.latencyKey()) || 0;

        const totalRequests = this._stats.get(record.totalNumberOfRequestKey()) || 0;

        const average = Number(latency);
        const total = Number(totalRequests);

        const newAverage = Math.trunc(((average * total) + record.timing) / (total + 1));

        this._stats.set(record.latencyKey(), newAverage);
        this._stats.set(record.lastRequestDateKey(), record.date.getTime());


        this._stats.set(record.statusCounterKey(), (this._stats.get(record.statusCounterKey()) || 0) + 1);
        this._stats.set(record.totalNumberOfRequestKey(), totalRequests + 1);
    }

    /**
     *
     * @inheritDoc
     */
    saveVirtualHost(virtualHost) {
        return true;
    }
}


module.exports = {InMemoryRepository};