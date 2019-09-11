const bitPony = require('bitpony');
const constants = require('./constants');
const strings = require("./string");
const bytes = require('./bytes');
const tools = require('./tools')

class vc {
    static createDiff(object, sourceobject) {

        let diff = {};

        let primitive = function (item, sourceItem) {

            if (item === sourceItem) {
                return false;
            }

            if (item && !sourceItem) {
                return {
                    flag: 'A',
                    value: item
                }
            }

            if (!item && sourceItem) {
                return {
                    flag: 'D',
                    value: ''
                }
            }

            if (item && sourceItem && sourceItem != item)
                if (typeof item == 'string' || typeof item == 'function') {
                    let diffString = strings.createDiff(typeof item == 'function' ? item.toString() : item, typeof sourceItem == 'function' ? sourceItem.toString() : sourceItem);

                    if (diffString.length == 0)
                        return false;
                    return {
                        flag: 'U',
                        type: constants.DIFFSTRING,
                        value: strings.pack(diffString)
                    }
                } else {
                    return {
                        flag: 'U',
                        value: item
                    }
                }
        }

        let getInfo = function (obj, sourceobj) {

            if (obj === undefined && sourceobj === undefined)
                return false;

            let diff = {};

            if ((typeof obj === 'array' || typeof obj === 'object') || (typeof sourceobj === 'array' || typeof sourceobj === 'object')) {
                let o = [];

                o = Object.keys(sourceobj || {});
                let keys = Object.keys(obj || {}).concat(o);

                for (let i in keys) {
                    let a;
                    if ((obj && typeof obj[keys[i]] === 'string') || (sourceobj && typeof sourceobj[keys[i]] === 'string')) {
                        a = primitive((obj && typeof obj[keys[i]] == 'string') ? obj[keys[i]] : "", (sourceobj && typeof sourceobj[keys[i]] == 'string') ? sourceobj[keys[i]] : "");
                    } else
                        a = getInfo(obj ? obj[keys[i]] : obj, sourceobj ? sourceobj[keys[i]] : sourceobj);
                    if (a)
                        diff[keys[i]] = a;
                    else
                        diff[keys[i]] = {};

                    if ((obj == undefined || obj[keys[i]] === undefined) && sourceobj[keys[i]] !== undefined)
                        diff[keys[i]] = { flag: 'D', value: '' };

                }
            } else {
                let m = primitive(obj, sourceobj);
                if (m)
                    diff = { flag: m.flag, value: m.value };

                if (sourceobj !== undefined && obj === undefined)
                    diff = { flag: 'D', value: '' }
            }

            return diff;
        }

        let res = getInfo(object, sourceobject);
        res.__source_sign = bytes.getSign(sourceobject).toString('hex');
        return res;
    }
    static applyDiff(diff, object) {
        let isArray = function (obj) {
            if (!obj || obj === undefined)
                return false;

            let keys = Object.keys(obj);

            let num = 1;
            for (let k in keys) {
                if (parseInt(keys[k]) != keys[k])
                    num = 0;
            }

            return num > 0;
        }

        let plain = function (key_diff, obj) {
            let o = {};

            if (typeof key_diff.value === 'string' && key_diff.flag == 'U') {
                o = strings.applyDiff(key_diff.value, obj);
            } else if (typeof key_diff.value === 'string' && key_diff.flag == 'A') {
                o = key_diff.value;
            } else if (typeof key_diff.value !== 'string' && (key_diff.flag == 'U' || key_diff.flag == 'A')) {
                o = key_diff.value;
            } else if (key_diff.flag == 'D') {
                o = Number.MAX_SAFE_INTEGER;
            } else if (key_diff.flag == 'A') {
                o = key_diff.value;
            } else if (typeof key_diff == 'object' && Object.keys(key_diff).length <= 0)
                o = obj;

            return o;
        }

        let apply = function (diff, obj) {
            let o = {};
            //console.log(diff, obj)
            if (diff.flag || (typeof diff == 'object' && Object.keys(diff).length == 0) || typeof diff.value === 'string') {
                o = plain(diff, obj);
            } else if ((diff.flag || typeof diff == 'object')) {

                if (isArray(diff))
                    o = [];

                for (let i in diff) {
                    let v = apply(diff[i], obj ? obj[i] : obj);
                    if (v === Number.MAX_SAFE_INTEGER)
                        continue;
                    o[i] = v
                }
            }

            return o;
        }

        let d = diff;
        delete d.__source_sign;
        return apply(d, object || {});

    }
    static getDataFromDiff(diff) {
        let applyDiffPrimitive = function (obj) {
            let o;

            if (typeof obj.value === 'string' && obj.flag == 'U') {
                o = strings.applyDiff(obj.value, "");
            } else if (typeof obj.value === 'string' && obj.flag == 'A') {
                o = obj.value;
            }

            if (typeof obj.value !== 'string' && (obj.flag == 'U' || obj.flag == 'A' || !obj.flag)) {
                if (!obj.value && !obj.flag)
                    o = null;
                else
                    o = obj.value;
            }

            if (obj.flag == 'D') {
                o = null;
            }

            return o;
        }

        let applyKey = function (obj) {
            let o;

            if (typeof obj == 'object')
                o = {};
            if (typeof obj == 'array')
                o = [];

            if ((typeof obj == 'object' || typeof obj == 'array') && !obj.flag && Object.keys(obj).length > 0) {
                //append flag
                for (let k in obj) {
                    if (obj[k].flag == 'D')
                        continue;
                    o[k] = applyKey(obj[k]);
                }

            } else {
                o = applyDiffPrimitive(obj);
            }

            return o;
        }

        delete diff.__source_sign;
        return applyKey(diff);
    }
    static read(buffer, offset) {
        let startoffset = offset || 0;
        let unserializePrimitive = function (stream, offset, version) {

            let item = {};
            let res = stream.uint8(offset);
            item.type = res.result;
            offset = res.offset;

            if (version >= constants.VERSION_VERSIONCONTROL) {
                res = stream.uint8(offset);
                item.flag = constants.getFlagChar(res.result);
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
                item.flag = constants.getFlagChar(res.result);
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
                item.flag = constants.getFlagChar(res.result);
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
        res['length'] = offset - startoffset;
        res['raw'] = buffer.slice(startoffset, offset);
        res['offset'] = r.offset;
        res['__source_sign'] = vchash;

        let mysign = parseInt(bitPony.tool.sha256(bitPony.tool.sha256(buffer.slice(offsetWithoutSign, res.offset))).slice(0, 4).toString('hex'), 16);
        if (mysign != sign)
            throw new Error('bon package is not valid');

        return res;
    }
    static write(diff) {
        let version = constants.VERSION_VERSIONCONTROL;//default version with vc bytes

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

        let source_sign = diff.__source_sign;
        delete diff.__source_sign;
        serializeObject(stream, "", diff, version);
        let buff = stream.getBuffer();
        let sign = tools.sha256(tools.sha256(buff))
        let stream2 = new bitPony.writer(new Buffer(""));

        stream2.uint16(version, true)//version
        stream2.uint32(parseInt(sign.slice(0, 4).toString('hex'), 16), true);//digest
        if (version >= constants.VERSION_VERSIONCONTROL) {
            stream2.uint32(source_sign || 0, true);//write for version control use writeVC
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
}

module.exports = vc;