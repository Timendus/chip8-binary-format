# CHIP-8 binary format (`.c8b` files)

CHIP-8 binary format is a file format for CHIP-8 programs that can hold multiple
ROMs, interpreter settings and other meta-data. This library allows you to
create and parse CBF files.

The [file format specification can be found here](https://github.com/Timendus/chip8-binary-format/blob/main/CHIP-8%20binary%20format.md).

This project is under development, and the file format will probably undergo
changes in the future. This library will then follow those changes. Please be
aware that those changes may break API compatibility in the future.

This README is equally under development, I'm sorry for the limited
documentation 😉

## Installation instructions

Install using NPM:

```bash
npm install --save chip8-binary-format
```

Import the library:

```javascript
const cbf = require('chip8-binary-format');
```

## Quick'n'Dirty getting started guide

If you're just trying to load your first CHIP-8 program from a CBF file, do
something like this:

```javascript
const cbf = require('chip8-binary-format');

let program;
try {
  program = cbf.unpack(file); // file is an array-like object with the binary contents of a CBF file
} catch(e) {
  throw 'Could not parse the file because:\n  * ' + e.join('\n  * ');
}

const binary = program.bytecode.filter(b =>
  b.platforms.includes(cbf.PLATFORM['CHIP-8'])
)
if ( binary.length == 0 )
  throw 'No bytecode present in the file that supports regular CHIP-8';

console.log(`Running program '${program.properties.name || 'Unknown program'}' by ${(program.properties.authors || ['Unknown author']).join(' & ')}`);
startInterpreter(binary[0].bytecode);
```

## Decoding files

Give the library an array-like object with the binary contents of a CBF file:

```javascript
cbf.unpack(file);
```

This will return an object that contains properties (meta-data about the program
and the way it likes to be run) and bytecode (the actual CHIP-8 binaries that
are found in the file, and which platforms they are intended for).

Note that the `unpack` function may throw an error if the file can't be decoded.

An example of the returned object:

```javascript
{
  properties: {
    name: "CHIP-8 Test Suite",
    authors: ["Timendus"],
    urls: ["https://github.com/Timendus/chip8-test-suite"],
    description: "A single ROM image containing six distinct tests that will aid you in developing your own CHIP-8, SCHIP or XO-CHIP interpreter (or \"emulator\")",
    keys: {
      "up": 14,
      "down": 15,
      "a": 10,
      "b": 10
    }
  },
  bytecode: [
    {
      platforms: [1,44,45,52],
      platformNames: ["CHIP-8","SUPER-CHIP 1.0","SUPER-CHIP 1.1","XO-CHIP"],
      bytecode: Uint8Array(...)
    }
  ]
}
```

Where you see the Uint8Array is where you find the bytecode that a CHIP-8
interpreter actually interprets. Note that CBF files may contain multiple of
these bytecodes, each with a list of platforms (CHIP-8 variants or 'dialects')
that can run them.

## Encoding files

You can give the library a data-structure similar to the above to create a CBF
file:

```javascript
cbf.pack({
  properties: {
    name: "My First CBF File",
    description: "CBF is now my favourite container format for CHIP-8 ROMs!",
    screenOrientation: 'upside down',
    cyclesPerFrame: 100
  },
  bytecode: [
    {
      platforms: [cbf.PLATFORM['CHIP-8']],
      bytecode: Uint8Array(...)
    }
  ]
});
```

This will return a `Uint8Array` containing the newly created CBF file's binary
contents. Note that the `pack` function may throw an error if the input isn't
formatted correctly.
