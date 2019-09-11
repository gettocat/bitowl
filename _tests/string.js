const str = require('../string');

let diffString = function (item, sourceItem) {

    let arr = [];
    let flag = "";

    let maxlength = item.length > sourceItem.length ? item.length : sourceItem.length;


    let leftIndex = 0;
    for (let i = 0; i < maxlength; i++ , leftIndex++) {

        if (sourceItem[leftIndex] == item[i]) {
            continue;
        }

        if (item[i] != sourceItem[leftIndex]) {
            let sequence = "", delsequence = "";
            let stopLitera = sourceItem[leftIndex];
            let stopLiteraRight = item[i];
            let stopIndex = 0;
            let startIndex = i;
            let startIndexLeft = leftIndex;
            let flag = "";

            for (let k = i, leftIndexK = leftIndex; k < maxlength; k++ , leftIndexK++) {

                console.log(sourceItem[leftIndexK], item[k]);
                /*if (sourceItem[leftIndexK] === item[k]) {
                    stopIndex = leftIndexK;
                    flag = "U";
                    break;
                }*/

                if (item[k] && item[k] !== stopLitera) {
                    sequence += item[k];
                }

                if (sourceItem[leftIndexK] && sourceItem[leftIndexK] !== stopLiteraRight) {
                    delsequence += sourceItem[leftIndexK];
                }

                if (sourceItem[leftIndexK] != stopLiteraRight && item[k] != stopLitera)
                    continue;

                if (sourceItem[leftIndexK] === stopLiteraRight) {
                    stopIndex = leftIndexK;
                    flag = "D";
                    sequence = delsequence;
                    break;
                }

                if (item[k] === stopLitera) {
                    stopIndex = k;
                    flag = "A";
                    break;
                }
            }

            if (flag == 'A')
                i = stopIndex;
            else if (flag == 'D')
                leftIndex = stopIndex;

            arr.push({
                flag: flag,
                sequence: sequence,
                start: flag == 'D' ? startIndex : startIndexLeft,
                stop: stopIndex
            });

        }

    }


    return arr
}

let diffString2 = function (item, sourceItem) {

    let arr = [];
    let maxlength = item.length > sourceItem.length ? item.length : sourceItem.length;

    for (let i = 0, startJ = 0; i < maxlength; i++ , startJ++) {
        let makeBreak = 0;
        let seq2 = [];

        for (let j = startJ; j < maxlength; j++) {

            if (item[j] == sourceItem[i] && !seq2.length) {
                makeBreak = 1;
                break;
            }

            if (item[j] != sourceItem[i] && item[j]) {
                seq2.push(item[j]);
                continue;
            }

            if (item[j] == sourceItem[i]) {
                arr.push({
                    flag: "A",
                    sequence: seq2.join(""),
                    start: i,
                    length: seq2.length
                });

                startJ = j;
                makeBreak = 1;
                break;
            }

        }

    }

    let item2 = item;
    for (let m in arr) {
        let part1 = item2.slice(0, arr[m].start);
        let part2 = item2.slice(arr[m].start + arr[m].length);
        item2 = part1 + "" + part2;
    }

    for (let i = 0, startJ = 0; i < maxlength; i++ , startJ++) {
        let makeBreak = 0;
        let seq = [];
        for (let j = startJ; j < maxlength; j++) {
            if (item2[i] == sourceItem[j] && !seq.length) {
                makeBreak = 1;
                break;
            }

            if (item2[i] != sourceItem[j] && sourceItem[j]) {
                seq.push(sourceItem[j]);
                continue;
            }

            if (item2[i] == sourceItem[j]) {
                arr.push({
                    flag: "D",
                    sequence: seq.join(""),
                    start: i,
                    length: seq.length
                });

                startJ = j;
                makeBreak = 1;
                break;
            }

        }

        if (makeBreak)
            continue;
    }

    let item3 = item2;
    for (let m in arr) {
        if (arr[m].flag != 'D')
            continue;
        let part1 = item2.slice(0, arr[m].start);
        let part2 = item2.slice(arr[m].start);
        item3 = part1 + "" + arr[m].sequence + "" + part2;
    }

    let start = 0;
    let seq = [];
    for (let i = 0; i < maxlength; i++) {

        if (item3[i] != sourceItem[i] && item3[i] && sourceItem[i]) {
            if (!start)
                start = i;
            seq.push(item3[i]);
            continue;
        }

        if (item3[i] == sourceItem[i] && seq.length) {
            arr.push({
                flag: "U",
                sequence: seq.join(""),
                start: start,
                length: seq.length
            });
            start = 0;
            seq = [];
        }


    }

    return arr;

}

function applyDiff(diff, string) {
    let diffs = {};
    for (let i in diff) {
        diffs[diff[i].start] = diff[i];
    }

    let str = "";
    for (let i = 0; i < string.length; i++) {
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
                i += diffs[i].length - 1;
                continue;
            }
        }

        str += string[i];
    }

    return str;
}

console.log('add text diff', JSON.stringify(str.createDiff("ABCasdMEF21`S", "ABCEFS")) === JSON.stringify([{ flag: 'A', sequence: 'asdM', start: 3, length: 4 },
{ flag: 'A', sequence: '21`', start: 9, length: 3 }]));//add text

console.log('remove text diff', JSON.stringify(str.createDiff("ABCEFS", "ABCED123FghjS")) === JSON.stringify([{ flag: 'D', sequence: 'D123', start: 4, length: 4 },
{ flag: 'D', sequence: 'ghj', start: 9, length: 3 }]));//remove text

console.log('add + rem diff', JSON.stringify(str.createDiff('12dsfsd04sdgb56789', '12045tyu6799')) === JSON.stringify([{ flag: 'A', sequence: 'dsfsd', start: 2, length: 5 },
{ flag: 'U', sequence: 'sdgb', start: 9, length: 4 },
{ flag: 'A', sequence: '5', start: 13, length: 1 },
{ flag: 'U', sequence: '8', start: 16, length: 1 }]));//add + remove


console.log('update diff', JSON.stringify(str.createDiff('12045rrs6789', '12045mvd6789')) === JSON.stringify([{ flag: 'U', sequence: 'rrs', start: 5, length: 3 }]));//update field

console.log('another update diff', JSON.stringify(str.createDiff('12045rrs96789', '12045mvd6789')) === JSON.stringify([{ flag: 'U', sequence: 'rrs', start: 5, length: 3 },
{ flag: 'A', sequence: '9', start: 8, length: 1 }]));//update field


console.log('apply diff(add+rem+update)', a = str.applyDiff([{ flag: 'A', sequence: 'dsfsd', start: 2, length: 5 },
{ flag: 'U', sequence: 'sdgb', start: 9, length: 4 },
{ flag: 'A', sequence: '5', start: 13, length: 1 },
{ flag: 'U', sequence: '8', start: 16, length: 1 }], "12045tyu6799") == '12dsfsd04sdgb56789');
