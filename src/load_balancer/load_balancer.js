/**
 * @abstract
 * @class
 */
class LoadBalancer {

    /**
     * Retrieve next available host
     *
     * @abstract
     * @param {Array<UpstreamHost>} upstreams
     * @return {UpstreamHost|null}
     */
    nextHost(upstreams) {
        throw new Error('Must be implemented');
    }
}

module.exports = {LoadBalancer};