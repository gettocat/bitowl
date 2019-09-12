//binary object notation
let bytes = require('./bytes');
let vc = require('./vc');
const bitPony = require("bitpony");
const constants = require('./constants');
const strings = require('./string');

class bitowl {
    constructor(data) {
        if (data instanceof Buffer || typeof data == 'string') {
            this.buffer = new Buffer(data, 'hex');
            this.type = 'bytes';
            this.unpack();
        } else {

            if (data.__source_sign) {//diff
                this.diff = data;
                this.type = 'diff';
            } else {//data
                this.data = data;
                this.type = 'data';
            }

        }
    }
    applyDiff(sourceObject, output) {
        if (this.type != 'diff')
            return false;

        if (!output)
            output = 'object';

        let diff = vc.applyDiff(this.diff, sourceObject);
        if (output == 'object')
            return diff;
        else {
            return vc.pack(diff);
        }
    }
    createDiff(object, output) {//if this object is diff - we create diff from diff, another methods - skip this type.
        if (!output)
            output = 'object';

        if (this.type == 'diff') {
            let source = vc.applyDiff(this.diff, {});
            let dat = vc.createDiff(object, source);
            if (output == 'hex' || output == 'buffer')
                return bitowl.pack(dat);
            else
                return dat;
        }

        return this.createDiffAsSource(object, output);
    }
    createDiffAsSource(target, output) {//create diff where this object is source, and we send target object
        let type = this.type;
        if (type == 'buffer') {
            this.unpack();
            if (this.diff)
                type = 'diff';
            else
                type = 'data';
        }


        if (type == 'data') {
            let dat = vc.createDiff(target, this.data);
            if (output == 'hex' || output == 'buffer')
                return bitowl.pack(dat);
            else
                return dat;
        }

        if (type == 'diff') {
            let sign = bytes.getSign(this.data).toString('hex');
            if (sign == this.diff.__source_sign) {
                if (output == 'hex' || output == 'buffer')
                    return bitowl.pack(this.diff);
                else
                    return this.diff;//its right diff.
            }

            return false;
        }
    }
    createDiffAsTarget(source, output) {//create diff where this object is target object, and we send source object
        let type = this.type;
        if (type == 'buffer') {
            this.unpack();
            if (this.diff)
                type = 'diff';
            else
                type = 'data';
        }


        if (type == 'data') {
            let dat = vc.createDiff(this.data, source);
            if (output == 'hex' || output == 'buffer')
                return bitowl.pack(dat);
            else
                return dat;
        }

        if (type == 'diff') {

            let sign = bytes.getSign(source).toString('hex');
            if (sign == this.diff.__source_sign) {
                if (output == 'hex' || output == 'buffer')
                    return bitowl.pack(this.diff);
                else
                    return this.diff;//its right diff.
            }

            return false;
        }
    }
    unpack() {
        if (this.type !== 'bytes' && (this.data || this.diff))
            return this.data || this.diff;

        let result;
        let dat = bitowl.unpack(this.buffer);
        if (dat.version >= constants.VERSION_VERSIONCONTROL) {//diff
            if (!this.diff)
                result = this.diff = dat.value;
            else
                result = this.diff;
        } else {//data
            if (!this.data)
                result = this.data = bytes.read(this.buffer);
            else
                result = this.data;
        }

        return result;
    }
    pack() {
        if (this.type === 'bytes' || this.buffer)
            return this.buffer;

        let buff;
        if (this.type == 'diff') {
            if (!this.buffer)
                buff = this.buffer = bitowl.pack(this.diff);
            else
                buff = this.buffer;
        } else {//data
            if (!this.buffer)
                buff = this.buffer = bitowl.pack(this.data);
            else
                buff = this.buffer;
        }

        return buff;
    }
    getData() {
        return this.data;
    }
    getDiff() {
        return this.diff;
    }
    getContent() {
        this.unpack();
        if (this.type == 'diff')
            return this.diff;
        if (this.type == 'data')
            return this.data;
    }
    getType() {
        return this.type;
    }
    getBuffer() {
        if (this.type == 'bytes')
            return this.buffer;
        return this.pack();
    }
}

bitowl.getType = function (buffer) {
    if (buffer instanceof Buffer || typeof buffer == 'string')
        return bitPony.uint8.read(buffer);
    else
        return buffer.__source_sign != undefined ? constants.VERSION_VERSIONCONTROL : constants.VERSION;
}

bitowl.applyDiff = function (diff, source) {

    let diff_ = diff;
    if (diff instanceof Buffer || typeof diff == 'string')
        diff_ = bitowl.unpack(diff).value;

    let source_ = source;
    if (source instanceof Buffer || typeof source == 'string')
        source_ = bitowl.unpack(source).value;


    let version = bitowl.getType(diff_);
    if (version < constants.VERSION_VERSIONCONTROL) {
        throw new Error('Apply can only diff object');
    }

    return vc.applyDiff(diff_, source_);
}

bitowl.createDiff = function (target, source) {

    let target_ = target;
    if (target instanceof Buffer || typeof target == 'string')
        target_ = bitowl.unpack(target).value;

    let source_ = source;
    if (source instanceof Buffer || typeof source == 'string')
        source_ = bitowl.unpack(source).value;

    let version = bitowl.getType(source_);
    if (version >= constants.VERSION_VERSIONCONTROL) {
        let source__ = vc.applyDiff(source_, {});
        return vc.createDiff(target_, source__);
    } else {
        return vc.createDiff(target_, source_);
    }
}

bitowl.unpack = function (buffer) {
    let dat = {}, type;
    let version = bitowl.getType(buffer);
    if (version >= constants.VERSION_VERSIONCONTROL) {//diff
        dat = vc.read(buffer);
        type = 'diff';
    } else {//data
        dat = bytes.read(buffer);
        type = 'data';
    }

    return { version: version, type: type, value: dat.result };
}

bitowl.pack = function (obj, type) {
    if (!type)
        type = bitowl.getType(obj);

    if (type >= constants.VERSION_VERSIONCONTROL) {
        buff = vc.write(obj);
    } else {//data
        buff = bytes.write(obj);
    }

    return buff.result;
}

bitowl.string = {
    create: function (string, sourcestring, output) {
        let diff = strings.createDiff(string, sourcestring);
        if (output == 'hex' || output == 'buffer')
            return bitowl.string.pack(diff);
        return diff;
    },
    apply(diff, string) {
        if (typeof diff == 'string' || diff instanceof Buffer)
            diff = bitowl.string.unpack(diff);
        return strings.applyDiff(diff, string);
    },
    pack: function (strdiff) {
        return new Buffer(strings.pack(strdiff), 'hex');
    },
    unpack: function (buff) {
        return strings.unpack(buff);
    },
}

bitowl.diff = {
    apply(diff, obj) {
        if (typeof diff == 'string' || diff instanceof Buffer)
            diff = bitowl.diff.unpack(diff);
        return vc.applyDiff(diff, obj);
    },
    toData(diff, output) {
        if (typeof diff == 'string' || diff instanceof Buffer)
            diff = bitowl.diff.unpack(diff);

        let d = vc.getDataFromDiff(diff);
        if (output == 'hex' || output == 'buffer')
            return bitowl.diff.pack(d);
        return d;
    },
    create: function (object, sourceobject, output) {
        let diff = vc.createDiff(object, sourceobject);
        if (output == 'hex' || output == 'buffer')
            return bitowl.diff.pack(diff);
        return diff;
    },
    pack: function (diff) {
        return vc.write(diff).result;
    },
    unpack: function (buffer, offset) {
        return vc.read(buffer, offset || 0).result;
    },
}

bitowl.data = {
    pack: function (object) {
        return bytes.write(object).result;
    },
    unpack: function (buffer, offset) {
        return bytes.read(buffer, offset || 0).result;
    },
    getSign(object) {
        return bytes.getSign(object);
    }
}

module.exports = bitowl;
