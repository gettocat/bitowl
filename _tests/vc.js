const vc = require('../vc.js');

/*
console.log(vc.createDiff(
    {
        f: 123,
        a: 2,
        b: 'ost123',
        c: false,
        d: [1, 2, 8, 3, 4, 7, 6, 7],
        e: { obj: 1, val: 3, key2: 'test' },
    },
    {
        a: 1,
        b: 'test',
        c: true,
        d: [1, 2, 3, 4, 5, 6, 7],
        e: { obj: 1, val: 2, key: 'test' },
        m: 'asd'
    }
));
/*
console.log(vc.createDiff(
    {
        f: 123,
        a: 2,
        b: 'ost123',
        c: false,
        d: [1, 2, 8, 3, 4, 7, 6, 7],
        e: { obj: 1, val: 3, key2: 'test' },
    },
    {
        f: 123,
        a: 2,
        b: 'ost123',
        c: false,
        d: [1, 2, 8, 3, 4, 7, 6, 7],
        e: { obj: 1, val: 3, key2: 'test' },
    }
));*/


console.log(vc.getDataFromDiff({
    f: { flag: 'A', value: 123 },
    a: { flag: 'U', value: 2 },
    b: { flag: 'U', value: '02000002026f7301010303313233' },
    c: { flag: 'D', value: '' },
    d:
    {
        '0': {},
        '1': {},
        '2': { flag: 'U', value: 8 },
        '3': { flag: 'U', value: 3 },
        '4': { flag: 'U', value: 4 },
        '5': { flag: 'U', value: 7 },
        '6': { flag: 'U', value: 6 },
        '7': { flag: 'A', value: 7 }
    },
    e:
    {
        obj: {},
        val: { flag: 'U', value: 3 },
        key2: { flag: 'A', value: 'test' },
        key: { flag: 'D', value: '' }
    },
    m: { flag: 'D', value: '' }
}, {}));

/*{
    a: 1,
    b: 'test',
    c: true,
    d: [1, 2, 3, 4, 5, 6, 7],
    e: { obj: 1, val: 2, key: 'test' },
    m: 'asd'
}*/
