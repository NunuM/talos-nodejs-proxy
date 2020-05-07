/**
 * Protocol enum
 *
 * @readonly
 * @enum
 * @type {{TCP: number, HTTP: number}}
 */
const PROTOCOL = {
    TCP: 0,
    HTTP: 1
};

Object.seal(PROTOCOL);

module.exports = {PROTOCOL};