import {RoundRobinLoadBalancer} from "../src/load_balancer/round-robin-load-balancer";
import {UpstreamHost} from "../src/model/upstream-host";


describe('Test Round Robin', () => {

    test('Must be give true', () => {

        const rr = new RoundRobinLoadBalancer();

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

        expect(result).toBe(u1);

        result = rr.nextHost(upstreams);

        expect(result).toBe(u3);

        u1.isOnline = false;

        result = rr.nextHost(upstreams);

        expect(result).toBe(u3);

        u3.isOnline = false;
        u1.isOnline = true;

        result = rr.nextHost(upstreams);
        expect(result).toBe(u1);
    });

});
