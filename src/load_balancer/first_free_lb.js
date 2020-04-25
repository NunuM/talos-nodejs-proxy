const {LoadBalancer} = require('./load_balancer');

/**
 * @class
 * @extends {LoadBalancer}
 */
class FirstFreeLB extends LoadBalancer {

    /**
     * @inheritDoc
     */
    nextHost(upstreams) {
        return upstreams.find((host) => host.isOnline);
    }
}

module.exports = {FirstFreeLB};