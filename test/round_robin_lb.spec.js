const assert = require('assert');
const {RoundRobinLB} = require('../src/load_balancer/round_robin_lb');
const {UpstreamHost} = require('../src/model/upstream_host');

describe('Test Round Robin', () => {

    it('Must be give true', () => {

        const rr = new RoundRobinLB();

        let upstreams = [];

        const u1 = new UpstreamHost('a',1);
        const u2 = new UpstreamHost('a',2);
        const u3 = new UpstreamHost('a',3);
        const u4 = new UpstreamHost('a',4);
        const u5 = new UpstreamHost('a',5);

        u2.isOnline = false;
        u4.isOnline = false;
        u5.isOnline = false;

        upstreams.push(u1);
        upstreams.push(u2);
        upstreams.push(u3);
        upstreams.push(u4);
        upstreams.push(u5);

        let result = rr.nextHost(upstreams);

        assert.strictEqual(result, u1, 'Must be the first from array');

        result = rr.nextHost(upstreams);

        assert.strictEqual(result, u3, 'Must be the first from array');

        u1.isOnline = false;

        result = rr.nextHost(upstreams);

        assert.strictEqual(result, u3, 'Must be the first from array');

        u3.isOnline = false;
        u1.isOnline = true;

        result = rr.nextHost(upstreams);
        assert.strictEqual(result, u1, 'Must be the first from array');

    });

});