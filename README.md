### Talos HTTP Proxy

This proxy forwards HTTP requests based on the host header to the user-defined upstreams. One host can have multiple 
upstreams. Currently supports (per upstream):
 
 * HTTP -> HTTP
 * HTTP -> HTTPS
 * HTTPS -> HTTP
 * HTTPS -> HTTPS
 
This proxy is being used on [Talos Fog Computing platform](https://talos.sh)

![Reverse Proxy](https://www.cloudflare.com/img/learning/cdn/glossary/reverse-proxy/reverse-proxy-flow.svg)
source: [cloudflare](https://www.cloudflare.com/learning/cdn/glossary/reverse-proxy/)

#### Use Case

I have the domain test.com. The DNS A record resolves to the machine that has this proxy running, and then, the proxy forwards the request to my other machine(s).

#### Features
* GUI to add/edit/remove virtual hosts and correspondents upstreams (hot reload)
* GUI to define load balancing policy
* GUI with authentication
* Regex alike matches with '*' character, eg: *.test.com
* Upstreams Health Check.
* Persistence in memory or redis
* Collect stats: latency,total requests, status per virtual host
* Configuration via config file and/or env vars


#### Installation

```bash
git clone https://github.com/NunuM/talos-nodejs-proxy my-proxy
cd my-proxy
npm i
npm start
```

#### Configuration

config.json. You can point a new file by defining the env var *TLP_CONF_FILE*.

```json
{
  "appId": "proxy",
  "smtpServer": "smtp.nunum.me",
  "errorEmailRecipients": "proxy@talos.sh",
  "errorEmailTemplateFile" : "./template/email.html",
  "logDirectory": "./",
  "logAccessFormat": ":remote-addr - \":method :url HTTP/:http-version\" :status :content-length \":referrer\" \":user-agent\" :response-time",
  "loggingFormat": "%[%[[%p]%] %[[%c]%] - %m",
  "logLevel": "info",
  "withHttp": true,
  "withHttps": true,
  "serverPort": 8000,
  "serverHttpsPort": 8001,
  "sslKey": "./ssl/key3.pem",
  "sslCert": "./ssl/cert3.pem",
  "serverAdminUIPort": 7777,
  "serverAdminPassword": "cm9vdDpyb290",
  "repository": "memory",
  "redisConnectionString": "[redis[s]:]//[[user][:password@]][host][:port][/db-number][?db=db-number[&password=bar[&option=value]]]"
}
```

All of the above can e overwritten if the correspondent env var is defined.

[Basic Authentication:](https://en.wikipedia.org/wiki/Basic_access_authentication)

* The *serverAdminPassword* is base64 of root:root


If you want to visualize the access log with this current config using goacccess

```bash
./goaccess access.log --log-format='%d %t GMT %h - "%r" %s - %R "%u" %L %v' --date-format='%a, %d %b %Y' --time-format='%H:%M:%S'
```

#### GUI

default user:root

default password:root

![Talos Proxy admin panel](https://i.ibb.co/N72vdDq/Screenshot-2020-04-13-at-23-31-08.png)

### 0.0.5

* Add text stream support 

### 0.0.4

* add content-encoding
