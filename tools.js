const crypto = require('crypto');

let tools = {
    
}

tools.encodeUtf8 = function (str) {
    return unescape(encodeURIComponent(str));
}

tools.decodeUtf8 = function (str) {
    return decodeURIComponent(escape(str));
}

tools.sha256 = function (message, output) {
    if (!output)
        output = '';
    return crypto.createHash('sha256').update(message).digest(output);
}

module.exports = tools;
