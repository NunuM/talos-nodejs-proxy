/** node imports */
const fs = require('fs');
const path = require('path');

/** package imports */
let config = {};

try {
    config = require(process.env.TLP_CONF_FILE || path.join(__dirname, '..', '..', 'config'));
} catch (e) {
    console.error("Cannot read config file", e);
}

/*********************
 *  APP settings
 *
 */
const SERVER_PORT = process.env.TLP_SERVER_PORT || config.serverPort || 8000;

const SERVER_ADMIN_PORT = process.env.TLP_SERVER_ADMIN_PORT || config.serverAdminUIPort || 7777;

const SERVER_ADMIN_PASSWORD = process.env.TLP_SERVER_ADMIN_PASSWORD || config.serverAdminPassword || 'cm9vdDpyb290';

const APP_REPOSITORY = process.env.TLP_APP_REPOSITORY || config.repository || 'memory';

const REDIS_CONNECTION_STRING = process.env.TLP_REDIS_CONNECTION_STRING || config.redisConnectionString || '';

const SERVER_HTTPS_PORT = process.env.TLP_SERVER_HTTPS_PORT || config.serverHttpsPort || 8081;

const SSL_KEY = process.env.TLP_SSL_KEY || config.sslKey;

const SSL_CERT = process.env.TLP_SSL_KEY || config.sslCert;

const WITH_HTTP = process.env.TLP_WITH_HTTP || config.withHttp;

const WITH_HTTPS = process.env.TLP_WITH_HTTPS || config.withHttps;

const WITH_HTTP2 = process.env.TLP_WITH_HTTP2 || config.withHttp2;

const SOCKET_TIMEOUT = process.env.TLP_SOCKET_TIMEOUT || config.socketTimeout || 30000;

/*********************
 *  Email settings
 *
 */
const SMTP_SERVER = process.env.TLP_SMTP_SERVER || config.smtpServer || '';

const ERROR_EMAIL_RECIPIENTS = process.env.TLP_ERROR_EMAIL_RECIPIENTS || config.errorEmailRecipients || '';

let ERROR_EMAIL_TEMPLATE;

try {
    ERROR_EMAIL_TEMPLATE = fs.readFileSync(process.env.ERROR_EMAIL_TEMPLATE || config.errorEmailTemplateFile).toString();
} catch (e) {
    ERROR_EMAIL_TEMPLATE = null;
}


/*********************
 *  Log settings
 *
 */
const LOG_DIRECTORY = process.env.TLP_LOG_DIRECTORY || config.logDirectory || path.join(__dirname, '..', '..');

const LOG_LEVEL = process.env.TLP_LOG_LEVEL || config.logLevel || 'info';

const LOG_ACCESS_FORMAT = process.env.TLP_LOG_ACCESS_FORMAT || config.logAccessFormat || ':remote-addr - ":method :url HTTP/:http-version" :status :content-length ":referrer" ":user-agent" :response-time';

const LOG_FORMAT = process.env.TLP_LOG_FORMAT || config.loggingFormat || '%[[%d]%] %[[%p]%] %[[%c]%] - %m';

/**
 * @class
 */
class Config {

    /**
     * Redis connect string
     * @link {https://www.iana.org/assignments/uri-schemes/prov/redis}
     * @return {string}
     */
    static redisConnectionString() {
        return REDIS_CONNECTION_STRING;
    }

    /**
     * Proxy server port
     *
     * @return {number}
     */
    static serverPort() {
        return SERVER_PORT;
    }

    /**
     * Start server for HTTP
     *
     * @return {boolean}
     */
    static withHttp() {
        return !!(WITH_HTTP);
    }


    /**
     * Start server for HTTPS
     *
     * @return {boolean}
     */
    static withHttps() {
        return !!WITH_HTTPS
    }

    /**
     * Start sever for HTTP2
     * @return {boolean}
     */
    static withHttp2() {
        return !!WITH_HTTP2;
    }

    /**
     * HTTPS port
     *
     * @return {number}
     */
    static serverHttpsPort() {
        return SERVER_HTTPS_PORT;
    }

    /**
     * Get SSL key
     *
     * @return {Buffer}
     * @throws {Error} if key does not exists
     */
    static sslKey() {
        return fs.readFileSync(SSL_KEY, {encoding: 'utf8'});
    }

    /**
     * Get SSL cert
     *
     * @return {Buffer}
     * @throws {Error} if cert does not exists
     */
    static sslCert() {
        return fs.readFileSync(SSL_CERT, {encoding: 'utf8'});
    }

    /**
     * Proxy server admin port
     *
     * @return {number}
     */
    static serverAdminUIPort() {
        return SERVER_ADMIN_PORT;
    }

    /**
     * Repository to be used as persistence layer
     *
     * @return {string}
     */
    static repository() {
        return APP_REPOSITORY;
    }

    /**
     * Password in base64
     * @return {string}
     */
    static serverAdminPassword() {
        return SERVER_ADMIN_PASSWORD;
    }

    /**
     * Directory for access log
     * @return {string}
     */
    static accessLogLoggerDirectory() {
        return LOG_DIRECTORY
    }

    /**
     * Log level
     *
     * @return {string}
     */
    static loggingLevel() {
        return LOG_LEVEL;
    }

    /**
     * Access log format
     *
     * @return {string}
     */
    static logAccessFormat() {
        return LOG_ACCESS_FORMAT;
    }

    /**
     * Log format
     *
     * @return {string}
     */
    static loggingFormat() {
        return LOG_FORMAT;
    }

    /**
     * Socket Timeout
     * @return {number}
     */
    static socketInactivityTimeout() {
        return SOCKET_TIMEOUT;
    }

    /**
     * Email connection settings
     *
     * @return {{smtp: string | string, recipients: string[], subject: string}}
     */
    static email() {
        return {
            smtp: SMTP_SERVER,
            recipients: ERROR_EMAIL_RECIPIENTS.split(','),
            subject: ' Proxy - Error Log',
        }
    }

    /**
     *
     * @return {string|null}
     */
    static emailHtmlTemplate() {
        return ERROR_EMAIL_TEMPLATE;
    }
}

module.exports = {Config};
