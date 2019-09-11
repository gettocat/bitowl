const wire = require('../index');//old naming


console.log("======= STRING =======");
//strings
console.log('string update chars', wire.string.create("1234567890", "1234321890", 'buffer').toString('hex') === '0101040303353637');

console.log('string apply update', wire.string.apply("0101040303353637", "1234321890") == '1234567890');

console.log('string diff', JSON.stringify(wire.string.create("123test321555", "123eest3214555")) == JSON.stringify([{ flag: 'U', sequence: 't', start: 3, length: 1 },
{ flag: 'D', sequence: '4', start: 10, length: 1 }]));


console.log('output buffer + pack from strdiff', wire.string.create("123test321555", "123eest3214555", 'buffer').toString('hex') == wire.string.pack([{ flag: 'U', sequence: 't', start: 3, length: 1 },
{ flag: 'D', sequence: '4', start: 10, length: 1 }]).toString('hex'));

console.log('str diff unpack', JSON.stringify(wire.string.unpack('030003010174ff04010165ff09010134')) == JSON.stringify([{ flag: 'A', start: 3, length: 1, sequence: 't' },
{ flag: 'D', start: 4, length: 1, sequence: 'e' },
{ flag: 'D', start: 9, length: 1, sequence: '4' }]));

console.log('applyDiff', wire.string.apply("020103010174ff0a010134", "123eest3214555") === '123test321555');


let a = {
    id: 1,
    text: 'test 123',
    title: 'test entry',
    arr: [1, 2, 3, 4, 5],
    nested: {
        id: 2,
        text: 'texfsd',
    },
    arr_nested: [1, 2, { a: 1, b: 2, c: [1, 2, 3], d: null, e: '232' }, 5, 123, 'test']
};
let hex = wire.data.pack(a).toString('hex');


console.log("======= DATA =======");
let json = wire.data.unpack(hex);
console.log('data pack && unpack', JSON.stringify(a) === JSON.stringify(json));


console.log("======= DIFF =======");
//diff

let b = {
    id: 2,
    text: 'tost 22 3',//tost 2 3
    title: 'test 321entry',
    arr: [1, 2, 3, 5, 6],
    arr2: [6, 5, 4, 3, 3, 1],
    nested: {
        id: 3,
        text: 'tesfsd',
    },
    arr_nested: [1, 3, { b2: 1, b: 2, c: [], d: null, e: '232' }, 6, 123, 'test']
}

//pack, unpack, create, apply
let diff1 = wire.diff.create(b, a);
let diffzip = wire.diff.pack(diff1)
//console.log(JSON.stringify(diff1));
console.log('diff create check hard object', JSON.stringify(wire.diff.apply(diff1, a)) === JSON.stringify(b));
console.log('pack & unpack check', JSON.stringify(diff1) == JSON.stringify(wire.diff.unpack(diffzip)))

console.log("======= WIRE =======");
//wire

//same + createDiff (diff from diff);

let diff2 = wire.diff.create(b, a);
let diff1hex = wire.pack(diff2);

console.log('wire diff pack && unpack types[1]', wire.unpack(diff1hex).type === 'diff');
console.log('wire diff pack && unpack', JSON.stringify(wire.unpack(diff1hex).value) === JSON.stringify(diff1));

//create diff
let diff4 = wire.createDiff(a, b);
let diff5 = wire.createDiff(b, a);

let checkKey = function (arr) {
    if (arr === undefined || arr === null)
        return "";
    if (typeof arr === 'object' || typeof arr === 'array') {
        let keys = Object.keys(arr).sort(function (a, b) {
            return a > b;
        });
        let str = "";
        for (let i in keys) {
            str += keys[i] + "" + checkKey(arr[keys[i]]);
        }

        return str;
    } else {
        return "" + arr;
    }
}

diff1.__source_sign = diff5.__source_sign;
console.log('creating diff check', checkKey(diff5) === checkKey(diff1));//order after apply is different, so, JSON equaling is not guaranteed


//apply diff
let obj = wire.applyDiff(diff5, a);
console.log('apply obj after diff result', JSON.stringify(obj) === JSON.stringify(b));

//diff from diff

let c = {
    id: 3,
    text: 'test 431',//tost 2 3
    title: 'test',
    arr: [1, 2, 4, 5, 6],
    arr2: [6, 5, 2, 3, 3, 1],
    nested: {
        id: 5,
        text: 'test',
    },
    arr_nested: [2, 5, { b2: 1, b: 2, c: [1, 2, 3], d: 'test', e: '252' }, 6, 5555, 'test']
};

//let Diff20 = wire.createDiff(c, b);


//let doublediff = wire.createDiff(diff5, Diff20);
//console.log(JSON.stringify(doublediff));
