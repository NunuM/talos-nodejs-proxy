/** node imports */
const path = require('path');

/** package imports */
const log4js = require('log4js');

/** project imports */
const {Config} = require('../app/config');


log4js.configure({
    appenders: {
        console: {
            type: 'console',
            layout: {
                type: 'pattern',
                pattern: Config.loggingFormat(),
            }
        },
        file: {
            type: 'file',
            filename: path.join(Config.accessLogLoggerDirectory(), 'access.log'),
            layout: {
                type: 'pattern',
                pattern: '%m'
            }
        },
        email: {
            type: '@log4js-node/smtp',
            SMTP: {
                "host": Config.email().smtp,
                "port": 25
            },
            recipients: Config.email().recipients,
            subject: Config.email().subject,
            sender: 'proxy@talos.sh'
        },
        'just-errors': {type: 'logLevelFilter', appender: 'email', level: 'error'}
    },
    categories: {
        proxy: {appenders: ['file'], level: Config.loggingLevel()},
        default: {appenders: ['console', 'just-errors'], level: Config.loggingLevel()}
    }
});

/**
 * @readonly
 * @type {Logger}
 */
const LOGGER = log4js.getLogger();

/**
 * @readonly
 * @type {Logger}
 */
const ACCESS_LOG = log4js.getLogger('proxy');

const handler = log4js.connectLogger(ACCESS_LOG, {
    level: 'auto',
    format: (req, res, format) => format(Config.logAccessFormat() + ' ' + req.headers['host'])
});

module.exports = {
    LOGGER, ACCESS_LOG, handler
};