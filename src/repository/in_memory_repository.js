const {Repository} = require('./repository');

/**
 * @class
 */
class InMemoryRepository extends Repository {


    loadStats() {
        return new Promise(resolve => resolve([]));
    }

    loadVirtualHosts() {
        return new Promise(resolve => resolve([]));
    }

    removeVirtualHost(host) {
    }

    saveResponseStatus(record) {
    }

    saveVirtualHost(virtualHost) {
        return true;
    }
}


module.exports = {InMemoryRepository};