module.exports = {
    //types
    "NULL": 0x0,
    "BOOL": 0x1,
    "NUMBER": 0x2,
    "FLOAT": 0x3,
    "STRING": 0x4,
    "OBJECT": 0x5,
    "ARRAY": 0x6,
    "FUNCTION": 0x7,
    //versions
    "VERSION": 0x1,
    "VERSION_VERSIONCONTROL": 0x7f,
    //version control mods
    "APPEND": 0x0,
    "UPDATE": 0x1,
    "DELETE": 0xff,
    "DIFFSTRING": 0x8,
    getFlagChar: function (i) {
        if (i == 0x0)
            return 'A';
        if (i == 0x1)
            return 'U';
        if (i == 0xff)
            return 'D';
    }
}