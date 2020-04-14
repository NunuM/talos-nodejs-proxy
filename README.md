### Talos HTTP Proxy

This proxy forwards HTTP requests based on the host header to the user-defined upstreams. One host can have multiple 
upstreams. This proxy is being used on [Talos Fog Computing platform](https://talos.sh)

![Reverse Proxy](https://www.cloudflare.com/img/learning/cdn/glossary/reverse-proxy/reverse-proxy-flow.svg)
source: [cloudflare](https://www.cloudflare.com/learning/cdn/glossary/reverse-proxy/)

#### Use Case

I have the domain test.com. The DNS A record resolves to the machine that has this proxy running, and then, the proxy forwards the request to my other machine(s).

#### Features
* GUI to add/edit/remove virtual hosts and correspondents upstreams (hot reload)
* GUI to define load balancing policy
* GUI with authentication
* Regex alike matches with '*' character, eg: *.test.com
* Health checking to upstreams.
* Persistence in memory or redis
* Collect stats: latency,total requests, status
* Configuration via config file and/or env vars


#### Installation

```bash
git clone https://github.com/NunuM/talos-nodejs-proxy my-proxy
cd my-proxy
npm i
npm start
```


#### GUI

![Talos Proxy admin panel](https://i.ibb.co/N72vdDq/Screenshot-2020-04-13-at-23-31-08.png)
