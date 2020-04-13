const {LoadBalancer} = require('./load_balancer');

/**
 * @class
 */
class RoundRobinLB extends LoadBalancer {

    /**
     * @constructor
     */
    constructor() {
        super();
        this._currentIdx = 0;
        this._iterator = (array) => {

            return {
                next: () => {

                    if (this._currentIdx === array.length) {
                        this._currentIdx = 0;
                    }

                    return this._currentIdx < array.length ? {
                        value: array[this._currentIdx++],
                        done: false
                    } : {done: true};
                }
            }
        };
    }

    /**
     *
     * @inheritDoc
     */
    nextHost(upstreams) {

        if (upstreams.length <= 1) {
            return upstreams.find((h) => h.isOnline);
        }

        let upstream;
        let previous;

        const iterator = this._iterator(upstreams);

        if (this._currentIdx === 0) {

            previous = upstreams[upstreams.length - 1];

        } else {

            previous = upstreams[this._currentIdx - 1];

        }

        do {

            upstream = iterator.next().value;

            if (upstream.isOnline) {
                return upstream;
            }

        } while (upstream != previous);


        return previous.isOnline ? previous : null;
    }
}

module.exports = {RoundRobinLB};