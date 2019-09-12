# bitowl
You can send any message with owl, bitowl!
Compact communication protocol with version control and data verify.

# Methods

```js
let bitowl = require('bitowl');

```

There is a three sub modules:
- `bitowl.string`
- `bitowl.data`
- `bitowl.diff`

## Data

### pack

```js
let buffer = bitowl.data.pack(object);
```

### unpack

```js
let json = bitowl.data.unpack(bufferOrHex);
```

## String

### pack

```js
let buffer = bitowl.string.pack(object);
```

### unpack

```js
let json = bitowl.string.unpack(bufferOrHex);
```

### create diff

Create stringdiff object difference between string and sourcestring, output can be buffer or empty, by default return json 
 
```js
let json = bitowl.string.create(string, sourcestring, output);
```

### apply diff

Apply diff to string and return new string. Diff can be hex, buffer or json

```js
let str = bitowl.string.apply(diff, string);
```

## Diff

### pack

```js
let buffer = bitowl.diff.pack(object);
```

### unpack

Offset define where in buffer starts diff. By default offset is 0. 

```js
let json = bitowl.diff.unpack(bufferOrHex, offset);
```

### create Diff

Create diff object difference between object and sourceobject, output can be buffer or empty, by default return json 
 
```js
let json = bitowl.diff.create(object, sourceobject, output);
```

### apply Diff

Apply diff to sourceobject and return new object. Diff can be hex, buffer or json

```js
let obj = bitowl.diff.apply(diff, sourceobject);
```

### toData

This method apply diff to a empty object. It create object from diff. Warning! Can not convert diffstring to a string, so string fields is not apply to object.

Diff can be hex, buffer or json. Return json by default, if output == 'buffer' - return buffer.

```js
let obj = bitowl.diff.toData(diff, output);
```

## BitOwl

### get Type

Return byte of version from buffer, hex string or json object of diff. From buffer and hex string read first byte,
from json object read field __source_sign (if exist - is diff, else - data). Can return 0x7f and bigger if diff, and smaller when - data.

```js
let versionByte = bitowl.getType(bufferOrJson); 
```

### pack

Pack object into buffer. Type can be `>= 0x7f` for diff and smaller for data. If type is not defined, use auto define.

```js
let buffer = bitowl.pack(object, type); 
```

### unpack

Unpack buffer to object. Returned object: 

```js
{
    version: 0x1,//version of message, 0x7f and bigger for diff, and smaller for data.
    type: 'data', //can be data of diff, based on version byte
    value: unpacked_json_object
}
```

```js
let d = bitowl.unpack(buffer); 
```

### create Diff

Create diff object difference between object and sourceobject.  If version of sourceobject >= 0x7f (diff object), create object from diff (toData method) and makes diff between diffs. Object and sourceobject can be buffer, string, object
 
```js
let json = bitowl.createDiff(object, sourceobject); 
```

### apply Diff

Apply diff to sourceobject and return new object. If diff object have wrong version, throw Error exception. Diff and sourceobject can be buffer, string, object

```js
let obj = bitowl.applyDiff(diff, sourceobject);
```

# Hex Formats

All types based on bit sequences, var_str, var_int and other is used from library [bitPony](https://github.com/gettocat/bitPony/wiki) 

## Data

Data format is different for each version. Now exist 2 versions: `0x1` - data object and `0x7f` - diff object

for version `< 0x7f`:
```
version(2 bytes, uint16) | payloadsign (4 bytes, uint32) | payload
```

for version `>= 0x7f`
```
version(2 bytes, uint16) | payloadsign (4 bytes, uint32) | sourcedatasign (4 bytes, uint32) | payload
```

- version can be 0x1 for data, and 0x7f for diff. Version can be upgraded in future, so check version must be not with equal operation:  `ver >= 0x7f` and `ver < 0x7f`. 
- Sign its first 4 bytes from double sha256 bytes of payload
- sourcedatasign is sign of original source data for diff
- payload is primitive, `byte-object` 

### Primitive

All primitive have this structure:

for `version < 0x7f` (data):
item:
```
type (uint8) | key (var_str) | value
```

vector:
```
type (uint8) | key(var_str) | value count(var_int) | value1, value2, ... valueN
```

For `version >= 0x7f` (diff):
item:
```
type (uint8) | version control flag (uint8) | key (var_str) | value
```

vector:
```
type (uint8) | version control flag (uint8) | key(var_str) | value count(var_int) | value1, value2, ... valueN
```

### Primitive byte-object

Type: `0x5`
```
data type(1 byte, uint8) | key (var_str) | primitive count(var_int) |  primitive1, primitive2,....primitiveN
```

### Primitive byte-array

Type: `0x6`
For array key everytime is empty.

```
data type(1 byte, uint8) | key (var_str) | primitive count(var_int) |  primitive1, primitive2,....primitiveN
```

### NULL-type

Type: `0x0`
```
data type(1 byte, uint8) | key (var_str) | 0(uint8)
```

### Boolean

Type: `0x1`
```
data type(1 byte, uint8) | key (var_str) | value(uint8)
```

### Integer

Type: `0x2`
```
data type(1 byte, uint8) | key (var_str) | value(var_int)
```

### Float

Type: `0x3`
```
data type(1 byte, uint8) | key (var_str) | value(var_str)
```

### String

Type: `0x4` 
```
data type(1 byte, uint8) | key (var_str) | value(var_str)
```

### Function

Type: `0x7` 
```
data type(1 byte, uint8) | key (var_str) | value(var_str)
```

## Types

### Stringdiff

Stringdiff data is contain information about difference between str1 and str2, for example:
str1: test12345
str2: tost54312
diff in json format:

Diff string is hex format for json array like this:
```js
[ 
    { flag: 'A', sequence: 'a', start: 0, length: 1 },
    { flag: 'U', sequence: 'o', start: 2, length: 1 },
    { flag: 'U', sequence: '54', start: 5, length: 2 },
    { flag: 'U', sequence: '12', start: 8, length: 2 },
    { flag: 'D', sequence: '44', start: 10, length: 3 } 
]
```

converted to:
```
050000010161010201016f010502023534010802023132ff0a03023434
```

Format is:

```
count of items (var_int) | strdiff items
```

format strdiff of hex is:

```
flag(uint8) | start (var_int) | length (var_int) | sequence (var_str)
```

- flag is modifier of change, can be `0x0` (A, APPEND), `0x1` (U, UPDATE), `0xff` (D, DELETE)
- start - start of change in string
- length - length of sequence
- sequence - change string

String diff hex is vector of strdiff

### Diff

```
version(2 bytes, uint16) | payloadsign (4 bytes, uint32) | sourcedatasign (4 bytes, uint32) | payload
```

- version can be 0x1 for data, and 0x7f for diff. Version can be upgraded in future, so check version must be not with equal operation:  `ver >= 0x7f` and `ver < 0x7f`. 
- Sign its first 4 bytes from double sha256 bytes of payload
- sourcedatasign is sign of original source data for diff
- payload is primitive, `byte-object` 

primitive:
```
type (uint8) | version control flag (uint8) | key (var_str) | value
```

vector:
```
type (uint8) | version control flag (uint8) | key(var_str) | primitive count(var_int) | primitive1, primitive2, ... primitiveN
```


