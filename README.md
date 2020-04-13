### Talos HTTP Proxy

This proxy forwards HTTP requests based on the host header to the user-defined upstreams. One host can have multiple 
upstreams.

#### Features
* GUI to add/edit/remove virtual hosts and correspondents upstreams (hot reload)
* GUI to define load balancing policy
* GUI with authentication
* Health checking to upstreams.
* Persistence in memory or redis
* Collect stats: latency,total requests, status
* Configuration via config file and/or env vars


#### GUI

![alt text](https://i.ibb.co/N72vdDq/Screenshot-2020-04-13-at-23-31-08.png)
