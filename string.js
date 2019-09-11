const bitPony = require('bitpony');
const constants = require('./constants');
const tools = require('./tools')

class str {

    static Levenshtein1(S2, S1) {
        let m = S1.length, n = S2.length;
        let D = [];
        let P = [];

        for (let i = 0; i <= m; i++) {
            if (!D[i])
                D[i] = [];
            D[i][0] = i;
            if (!P[i])
                P[i] = [];
            P[i][0] = 'D';
        }
        for (let i = 0; i <= n; i++) {
            D[0][i] = i;
            P[0][i] = 'A';
        }

        for (let i = 1; i <= m; i++)
            for (let j = 1; j <= n; j++) {
                let cost = (S1[(i - 1)] != S2[(j - 1)]) ? 1 : 0;
                if (D[i][j - 1] < D[i - 1][j] && D[i][j - 1] < D[i - 1][j - 1] + cost) {

                    D[i][j] = D[i][j - 1] + 1;
                    P[i][j] = 'A';
                }
                else if (D[i - 1][j] < D[i - 1][j - 1] + cost) {

                    D[i][j] = D[i - 1][j] + 1;
                    P[i][j] = 'D';
                }
                else {

                    D[i][j] = D[i - 1][j - 1] + cost;
                    P[i][j] = (cost == 1) ? 'U' : 'M';
                }
            }

        let route = "";
        let i = m, j = n;
        do {
            let c = P[i][j];
            route += c;
            if (c == 'U' || c == 'M') {
                i--;
                j--;
            }
            else if (c == 'D') {
                i--;
            }
            else {
                j--;
            }
        } while ((i != 0) || (j != 0));

        return route.split("").reverse().join("");
    }

    static applyRoute(route, target, source) {

        let arr = [];
        let prev = '', start = 0, flag = '', seq = [];
        for (let i = 0; i <= route.length; i++) {

            if (!prev || (prev == route[i])) {//start
                seq.push(route[i] == 'D' ? source[i] : target[i]);
                if (!flag) {
                    start = i;
                    flag = route[i];
                }
                prev = route[i];
                continue;
            }

            if (prev != route[i] && flag) {
                if (flag != 'M')
                    arr.push({
                        flag: flag,
                        sequence: seq.join(""),
                        start: start,
                        length: seq.length
                    });
                seq = [];
                start = 0;
                flag = '';
                prev = route[i];
                i--;
                continue;
            }

            if (prev != route[i] && !flag) {
                if (route[i] != 'M')
                    arr.push({
                        flag: route[i],
                        sequence: route[i] == 'D' ? source[i] : target[i],
                        start: i,
                        length: 1
                    });
                prev = route[i];
                continue;
            }

        }

        return arr;

    }

    static createDiff(item, sourceItem) {

        let route = this.Levenshtein1(item, sourceItem);
        return this.applyRoute(route, item, sourceItem);

    }

    static applyDiff(diff, string) {

        if (typeof diff == 'string') {
            diff = this.unpack(diff);
        }

        let diffs = {}, max = -1, offs = 0;
        for (let i in diff) {
            diffs[diff[i].start - offs] = diff[i];

            if (diff[i].flag == 'D') {
                offs -= diff[i].length;
            }

            if (diff[i].flag == 'A') {
                offs += diff[i].length;
            }

            if (diff[i].start > max)
                max = diff[i].start + offs;
        }

        let str = "", offset = 0;
        let maxlength = string.length > max ? string.length : (max + 1);
        for (let i = 0; i <= maxlength; i++) {
            if (diffs[i]) {
                
                if (diffs[i].flag == 'A') {
                    str += diffs[i].sequence;
                }

                if (diffs[i].flag == 'U') {
                    str += diffs[i].sequence;
                    i += diffs[i].length - 1;
                    continue;
                }

                if (diffs[i].flag == 'D') {
                    offset += diffs[i].length;
                    i += diffs[i].length - 1;
                    continue;
                }
            }

            if (string[i] != undefined)
                str += string[i];
        }

        return str;
    }

    static pack(changes) {
        //vector_diffstr = var_int(cnt)|uint8(mod)|var_int(from)|var_int(length)|var_str(str)
        let stream = new bitPony.writer(new Buffer(""));
        if (changes.length == 0)
            return "";

        stream.var_int(changes.length, true);
        for (let i in changes) {
            let mod;
            if (changes[i].flag == 'A')
                mod = constants.APPEND;
            if (changes[i].flag == 'D')
                mod = constants.DELETE;
            if (changes[i].flag == 'U')
                mod = constants.UPDATE;
            stream.uint8(mod, true);
            stream.var_int(changes[i].start, true);
            stream.var_int(changes[i].length, true);
            stream.string(tools.encodeUtf8(changes[i].sequence), true);
        }

        return stream.getBuffer().toString("hex");
    }
    static unpack(buffer) {

        let stream = new bitPony.reader(new Buffer(buffer, 'hex'));

        let offset = 0;
        let res = stream.var_int(offset);
        let cnt = res.result;
        offset = res.offset;

        let arr = [];
        for (let i = 0; i < cnt; i++) {

            let d = {};
            res = stream.uint8(offset);
            if (res.result == constants.DELETE)
                d.flag = 'D';

            if (res.result == constants.APPEND)
                d.flag = 'A';

            if (res.result == constants.UPDATE)
                d.flag = 'U';

            offset = res.offset;

            res = stream.var_int(offset);
            offset = res.offset;
            d.start = res.result;


            res = stream.var_int(offset);
            offset = res.offset;
            d.length = res.result;

            res = stream.string(offset);
            offset = res.offset;
            d.sequence = tools.decodeUtf8(res.result.toString());

            arr.push(d);
        }

        return arr;

    }

}

module.exports = str;