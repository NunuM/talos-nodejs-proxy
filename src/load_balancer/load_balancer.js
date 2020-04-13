class LoadBalancer {

    /**
     * @abstract
     * @param {Array<UpstreamHost>} upstreams
     * @return {UpstreamHost}
     */
    nextHost(upstreams) {
        throw new Error('Must be implemented');
    }
}

module.exports = {LoadBalancer};