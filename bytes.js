const bitPony = require('bitpony');
const constants = require('./constants');
const tools = require('./tools')

class bytes {
    static read(buff, offset) {//binary object notation
        let buffer = new Buffer(buff, 'hex');
        let startoffset = offset || 0;
        let unserializePrimitive = function (stream, offset, version) {

            let item = {};
            let res = stream.uint8(offset);
            item.type = res.result;
            offset = res.offset;

            if (version >= constants.VERSION_VERSIONCONTROL) {
                res = stream.uint8(offset);
                item.mod = res.result;
                offset = res.offset;
            }

            res = stream.string(offset);
            item.key = tools.decodeUtf8(res.result.toString());
            offset = res.offset;
            if (item.type === constants.NUMBER || item.type === constants.BOOL)
                res = stream.var_int(offset);
            else//str
                res = stream.string(offset);

            if (item.type === constants.NULL)
                item.value = null;
            else if (item.type === constants.BOOL)
                item.value = !!res.result;
            else if (item.type === constants.NUMBER)
                item.value = res.result;
            else if (item.type === constants.FLOAT)
                item.value = parseFloat(res.result);
            else if (item.type === constants.FUNCTION) {
                item.value = new Function("return " + tools.decodeUtf8(res.result.toString()))()
            } else {
                item.value = tools.decodeUtf8(res.result.toString());
            }
            offset = res.offset;

            return {
                offset: offset,
                result: item
            };
        }

        let unserializeArray = function (stream, offset, version) {

            let item = { value: [], count: 0 };

            let res = stream.uint8(offset);
            item.type = res.result;
            offset = res.offset;

            if (version >= constants.VERSION_VERSIONCONTROL) {
                res = stream.uint8(offset);
                item.mod = res.result;
                offset = res.offset;
            }

            res = stream.string(offset);
            item.key = tools.decodeUtf8((res.result.toString()));
            offset = res.offset;

            res = stream.var_int(offset);
            item.count = res.result;
            offset = res.offset;

            for (let i = 0; i < item.count; i++) {

                let type = stream.uint8(offset);

                offset = type.offset;
                if (type.result === constants.OBJECT) {
                    res = unserializeObject(stream, offset - 1, version);
                } else if (type.result === constants.ARRAY) {
                    res = unserializeArray(stream, offset - 1, version);
                } else {
                    res = unserializePrimitive(stream, offset - 1, version);
                }

                offset = res.offset;
                item.value.push(res.result.value);//keys is null
            }

            return {
                offset: offset,
                result: item
            };
        }

        let unserializeObject = function (stream, offset, version) {
            let item = { value: {}, count: 0 };

            let res = stream.uint8(offset);//vc flag
            item.type = res.result;
            offset = res.offset;

            if (version >= constants.VERSION_VERSIONCONTROL) {
                res = stream.uint8(offset);
                item.mod = res.result;
                offset = res.offset;
            }

            res = stream.string(offset);
            item.key = tools.decodeUtf8(res.result.toString());
            offset = res.offset;

            res = stream.var_int(offset);
            item.count = res.result;
            offset = res.offset;

            for (let i = 0; i < item.count; i++) {

                let type = stream.uint8(offset);
                offset = type.offset;
                if (type.result === constants.OBJECT) {
                    res = unserializeObject(stream, offset - 1, version);
                } else if (type.result === constants.ARRAY) {
                    res = unserializeArray(stream, offset - 1, version);
                } else {
                    res = unserializePrimitive(stream, offset - 1, version);
                }

                offset = res.offset;
                item.value[res.result.key] = res.result.value;
            }

            return {
                offset: offset,
                result: item
            };
        }


        let res = {};
        let vchash = false;
        let sign, version;
        let stream = new bitPony.reader(buffer);
        res = stream.uint16(startoffset);
        version = res.result;
        offset = res.offset;

        res = stream.uint32(offset);
        sign = res.result;
        offset = res.offset;

        if (version >= constants.VERSION_VERSIONCONTROL) {
            res = stream.uint32(offset);
            vchash = res.result;
            offset = res.offset;
        }

        let offsetWithoutSign = res.offset;

        //another rule for another version can be here...
        //we read version control bytes but dont use it in this package, see more: binon package
        let r = unserializeObject(stream, res.offset, version);
        res = {};
        res.result = r.result.value;
        res['length'] = r.offset - startoffset;
        res['raw'] = buffer.slice(startoffset, r.offset);
        res['offset'] = r.offset;
        res['vchash'] = vchash;

        let mysign = parseInt(bitPony.tool.sha256(bitPony.tool.sha256(buffer.slice(offsetWithoutSign, res.offset))).slice(0, 4).toString('hex'), 16);
        if (mysign != sign)
            throw new Error('bon package is not valid');

        return res;

    }
    static write(object) {
        let version = constants.VERSION;//default version with vc bytes

        let stream = new bitPony.writer(new Buffer(""));

        let serializePrimitive = function (stream, type, key, val, version) {

            stream.uint8(type, true);
            if (version >= constants.VERSION_VERSIONCONTROL)
                stream.uint8(constants.APPEND, true);
            stream.string(new Buffer(tools.encodeUtf8(key)), true)
            if (type == constants.NULL) {
                stream.var_int(0, true);
            } else if (type == constants.NUMBER || type == constants.BOOL) {
                stream.var_int(val, true);
            } else {

                if (val.toString() != "") {
                    stream.string(new Buffer(tools.encodeUtf8(val.toString() || "")), true)
                } else {
                    stream.uint8(0, true)
                }
            }

        }

        let serializeArray = function (stream, key, arr, version, sort) {

            stream.uint8(constants.ARRAY, true);
            if (version >= constants.VERSION_VERSIONCONTROL)
                stream.uint8(constants.APPEND, true);
            stream.string(new Buffer(tools.encodeUtf8(key)), true);
            stream.var_int(arr.length, true);

            if (sort)
                arr.sort(function (a, b) {
                    return a > b;
                });

            for (let i in arr) {
                let t = constants.STRING;
                if (arr[i] instanceof Function) {
                    t = constants.FUNCTION;
                } else if (arr[i] instanceof Array) {
                    serializeArray(stream, "", arr[i], version, sort);
                    continue;
                } else if (arr[i] instanceof Object) {
                    serializeObject(stream, "", arr[i], version, sort);
                    continue;
                } else if (arr[i] == null) {
                    t = constants.NULL;
                    arr[i] = 0;
                } else if (arr[i] === true) {
                    t = constants.BOOL;
                    arr[i] = 1;
                } else if (arr[i] === false) {
                    t = constants.BOOL;
                    arr[i] = 0;
                } else if (arr[i] !== "" && /^\d+$/.test(arr[i]) && isFinite(arr[i]))
                    t = constants.NUMBER;

                serializePrimitive(stream, t, "", arr[i], version);

            }

        }

        let serializeObject = function (stream, key, obj, version, sort) {

            if (obj == null || typeof obj == 'undefined')
                obj = {};

            let keys = Object.keys(obj);
            stream.uint8(constants.OBJECT, true);
            if (version >= constants.VERSION_VERSIONCONTROL)
                stream.uint8(constants.APPEND, true);
            stream.string(new Buffer(tools.encodeUtf8("" + key)), true);
            stream.var_int(keys.length, true);

            if (sort)
                keys.sort(function (a, b) {
                    return a > b;
                });

            for (let i in keys) {
                let o = obj[keys[i]];
                let t = constants.STRING;//functions and others

                if (o instanceof Function) {
                    t = constants.FUNCTION;
                } else if (o instanceof Array) {
                    t = constants.ARRAY;
                    serializeArray(stream, keys[i], o, version, sort);
                    continue;
                } else if (o instanceof Object) {
                    t = constants.OBJECT;
                    serializeObject(stream, keys[i], o, version, sort);
                    continue;
                } else if (o == null) {
                    t = constants.NULL;
                    o = 0;
                } else if (o === true) {
                    o = 1;
                    t = constants.BOOL;
                } else if (o === false) {
                    o = 0;
                    t = constants.BOOL;
                } else if (o !== "" && /^\d+$/.test(o) && isFinite(o) && (typeof o != 'string')) {
                    t = constants.NUMBER;
                }

                //for numbers and string
                serializePrimitive(stream, t, keys[i], o, version);

            }
        }

        serializeObject(stream, "", object, version);
        let buff = stream.getBuffer();
        let sign = bitPony.tool.sha256(bitPony.tool.sha256(buff))
        let stream2 = new bitPony.writer(new Buffer(""));

        stream2.uint16(version, true)//version
        stream2.uint32(parseInt(sign.slice(0, 4).toString('hex'), 16), true);//digest
        if (version >= constants.VERSION_VERSIONCONTROL) {
            stream2.uint32("0x00000000", true);//write for version control use writeVC
        }

        let res = Buffer.concat([
            stream2.getBuffer(),
            buff
        ]);

        return {
            result: res,
            length: res.length
        }

    }
    static getSign(object) {
        let buffer = this.write(object);
        let stream = new bitPony.reader(new Buffer(buffer.result, 'hex'));

        let res = stream.uint16(0);
        return stream.uint32(res.offset).raw;
    }

}

module.exports = bytes;