class Repository {

    /**
     * @abstract
     * @param {VirtualHost} virtualHost
     * @return boolean
     */
    saveVirtualHost(virtualHost) {
        throw new Error('Must be implemented');
    }

    /**
     * @abstract
     * @return {Promise<Array<VirtualHost>>}
     */
    loadVirtualHosts() {
        throw new Error('Must be implemented');
    }

    /**
     * @abstract
     * @param {ResponseStats} record
     */
    saveResponseStatus(record) {
        throw new Error('Must be implemented');
    }

    /**
     * @abstract
     * @return {Promise<Array<string>>}
     */
    loadStats() {
        throw new Error('Must be implemented');
    }

    /**
     * @abstract
     * @param {string} host
     */
    removeVirtualHost(host) {
        throw new Error('Must be implemented');
    }

}

module.exports = {Repository};