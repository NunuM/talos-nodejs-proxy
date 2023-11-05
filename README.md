# EchoGate Proxy

This is a reverse proxy server that allows you to configure virtual hosts and their upstream servers. It uses a JSON configuration file based on the provided schema to define routing rules and settings for each virtual host. Below, you'll find instructions on how to set up and use this reverse proxy.

## Layer 7 (L7) Routing with Virtual Hosts and API Gateway

### Overview

This reverse proxy server provides powerful Layer 7 (L7) routing capabilities based on virtual hosts and API gateway routes. It allows you to configure how incoming HTTP requests are routed to the appropriate upstream servers based on the requested hostname and path.

### Features

#### 1. Virtual Host Routing

Virtual host routing is a core feature of this reverse proxy. It enables you to define multiple virtual hosts, each associated with its own set of upstream servers. When a request is received, the proxy examines the Host header to determine which virtual host should handle the request.

For example, if you have two virtual hosts configured:

* talos.sh with upstream servers A, B, and C.
* amenn.sh with upstream server D.

When a request comes in with the Host header set to talos.sh, the proxy will route the request to one of the servers A, B, or C based on your chosen load balancing algorithm (e.g., Round Robin). If the Host header is amenn.sh, the request will be routed to server D.

#### 2. API Gateway Route-based Routing

In addition to virtual hosts, this reverse proxy supports API gateway route-based routing. You can define custom routing rules based on the request path using regular expressions. For example:

* Route requests matching /api/[0-5]{1}/* to upstream server X.
* Route requests matching /api/users/* to upstream server Y.

This allows you to fine-tune how different API endpoints are handled by specifying the appropriate upstream servers.

#### 3. SSL Termination and Encryption

The reverse proxy supports various SSL/TLS configurations:

* HTTP to HTTP: For unencrypted HTTP traffic.
* HTTPS to HTTPS: For encrypted HTTP traffic with SSL/TLS termination.
* HTTP2 to HTTP2: For unencrypted HTTP/2 traffic.
* HTTPS to HTTP, HTTPS, HTTP2: Handling encrypted traffic and forwarding it as needed.
* HTTP2 to HTTP, HTTPS, HTTP2: Handling HTTP/2 traffic and forwarding it as needed.

You can configure SSL certificates and key paths to secure your connections, and the proxy will handle the encryption and decryption transparently.

### Comparison to Other Software

When compared to other similar software like Kong, this reverse proxy provides a lightweight and highly configurable solution for L7 routing. Here's how it stacks up:

#### Advantages of this Reverse Proxy

* Simplicity: The reverse proxy is designed with simplicity in mind, making it easy to configure and deploy.
* Configurability: The JSON-based configuration file allows you to define complex routing rules, virtual hosts, and API gateway routes with precision.
* SSL/TLS Handling: It seamlessly handles SSL/TLS encryption and termination, supporting various encryption scenarios.
* Lightweight: The reverse proxy is lightweight, making it suitable for smaller-scale applications and microservices.

## Installation

```bash
git clone https://github.com/NunuM/talos-nodejs-proxy my-proxy
cd my-proxy
npm i
npm start
```

## Configuration

The reverse proxy is highly configurable using a JSON configuration file that follows the provided schema. Here's a sample configuration for your use case:

````json
{
  "appId": "your-app-id",
  "numberOfWorkers": 0,
  "proxy": {
    "globalMiddlewares": [
      {
        "type": "AccessLoggingMiddleware",
        "args": {}
      }
    ],
    "servers": [
      {
        "port": 8888,
        "protocol": "http2",
        "options": {
          "key": "path/to/ssl/key.pem",
          "cert": "path/to/ssl/cert.pem",
          "rejectUnauthorized": false
        }
      },
      {
        "port": 8889,
        "protocol": "http",
        "options": {
          "requestTimeout": 1800000
        }
      }
    ]
  },
  "administration": {
    "port": 8080,
    "bindOnlyLocalhost": true,
    "authenticator": {
      "type": "basic",
      "username": "admin",
      "password": "password"
    }
  },
  "repository": {
    "type": "file",
    "filePath": "path/to/config/file.json"
  },
  "logging": {
    "proxy": {
      "level": "info"
    },
    "accessLog": {
      "level": "info",
      "logDirectory": "path/to/access/logs",
      "format": "combined"
    },
    "admin": {
      "level": "info"
    },
    "worker": {
      "level": "info"
    }
  }
}

````

Replace **"your-app-id"** with a unique identifier for your application. Make sure to adjust file paths, ports, and other settings according to your environment and requirements.

If you want to visualize the access log with this current config using goacccess

```bash
./goaccess access.log --log-format='%d %t GMT %h - "%r" %s - %R "%u" %L %v' --date-format='%a, %d %b %Y' --time-format='%H:%M:%S'
```
