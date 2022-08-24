const cbf = require('../parser.js');

const bytecode = [
  {
    platforms: [
      cbf.PLATFORM['CHIP-8'],
      cbf.PLATFORM['SUPER-CHIP 1.0'],
      cbf.PLATFORM['SUPER-CHIP 1.1']
    ],
    platformNames: [
      'CHIP-8',
      'SUPER-CHIP 1.0',
      'SUPER-CHIP 1.1'
    ],
    bytecode: new Uint8Array([
      0x00, 0xe0, 0xa2, 0x2a, 0x60, 0x0c, 0x61, 0x08, 0xd0, 0x1f, 0x70, 0x09,
      0xa2, 0x39, 0xd0, 0x1f, 0xa2, 0x48, 0x70, 0x08, 0xd0, 0x1f, 0x70, 0x04,
      0xa2, 0x57, 0xd0, 0x1f, 0x70, 0x08, 0xa2, 0x66, 0xd0, 0x1f, 0x70, 0x08,
      0xa2, 0x75, 0xd0, 0x1f, 0x12, 0x28, 0xff, 0x00, 0xff, 0x00, 0x3c, 0x00,
      0x3c, 0x00, 0x3c, 0x00, 0x3c, 0x00, 0xff, 0x00, 0xff, 0xff, 0x00, 0xff,
      0x00, 0x38, 0x00, 0x3f, 0x00, 0x3f, 0x00, 0x38, 0x00, 0xff, 0x00, 0xff,
      0x80, 0x00, 0xe0, 0x00, 0xe0, 0x00, 0x80, 0x00, 0x80, 0x00, 0xe0, 0x00,
      0xe0, 0x00, 0x80, 0xf8, 0x00, 0xfc, 0x00, 0x3e, 0x00, 0x3f, 0x00, 0x3b,
      0x00, 0x39, 0x00, 0xf8, 0x00, 0xf8, 0x03, 0x00, 0x07, 0x00, 0x0f, 0x00,
      0xbf, 0x00, 0xfb, 0x00, 0xf3, 0x00, 0xe3, 0x00, 0x43, 0xe0, 0x00, 0xe0,
      0x00, 0x80, 0x00, 0x80, 0x00, 0x80, 0x00, 0x80, 0x00, 0xe0, 0x00, 0xe0
    ])
  }
];

function version() { return [0]; }
function address(addr) { return value(addr, 2); }
function size(size) { return value(size, 2); }
function tablePointer(addr) { return value(addr, 1); }
function bytecodeTable(addr) {
  return [
    cbf.PLATFORM['CHIP-8'],         ...address(addr), ...size(bytecode[0].bytecode.length),
    cbf.PLATFORM['SUPER-CHIP 1.0'], ...address(addr), ...size(bytecode[0].bytecode.length),
    cbf.PLATFORM['SUPER-CHIP 1.1'], ...address(addr), ...size(bytecode[0].bytecode.length),
    cbf.PLATFORM.termination
  ];
}

function strToBytes(str) {
  return new Uint8Array(str.split('').map(c => c.charCodeAt(0) & 0xFF));
}

function value(val, numBytes) {
  const bytes = [];
  for ( let i = numBytes - 1; i >= 0; i-- )
    bytes.push(val >> i*8 & 0xFF);
  return bytes;
}

function expectMapping({ description, binary, properties, roms, verbose }) {
  describe(description, () => {
    test('packing', () => {
      if (verbose) console.log('Packing this', properties, 'into this', binary);
      expect(cbf.pack({ bytecode: roms || bytecode, properties })).toEqual(binary);
    });
    test('unpacking', () => {
      if (verbose) console.log('Unpacking this', binary, 'as this', properties);
      const unpacked = cbf.unpack(binary);
      if (verbose) console.log('with this result', unpacked);
      expect(unpacked.properties).toMatchObject(properties);
      expect(unpacked.bytecode).toEqual(roms || bytecode);
    });
  });
}

describe('end to end', () => {

  const properties = {
    name: 'IBM test rom',
    description: 'This ROM is a rite of passage for any CHIP-8 developer'
  };

  test('if we pack and then unpack, we get the same result', () => {
    const binary = cbf.pack({ properties, bytecode });
    const unpacked = cbf.unpack(binary);
    const binary2 = cbf.pack(unpacked);

    expect(unpacked.bytecode).toEqual(bytecode);
    expect(unpacked.properties).toEqual(properties);
    expect(binary).toEqual(binary2);
  });

});

expectMapping({
  description: 'empty file',

  binary: new Uint8Array([
    ...strToBytes('CBF'),
    version(),
    ...tablePointer(0), // No bytecode table
    ...tablePointer(0), // No properties table
  ]),

  properties: {},
  roms: []
});

expectMapping({
  description: 'name',

  binary: new Uint8Array([
    // Header
    ...strToBytes('CBF'),
    ...version(),
    ...tablePointer(10),
    ...tablePointer(6),
    // Tables
    cbf.PROPERTY.name, ...address(26),
    cbf.PROPERTY.termination,
    ...bytecodeTable(31),
    // Data
    ...strToBytes('Test'), 0,
    ...bytecode[0].bytecode
  ]),

  properties: {
    name: 'Test'
  }
})

expectMapping({
  description: 'description',

  binary: new Uint8Array([
    // Header
    ...strToBytes('CBF'),
    ...version(),
    ...tablePointer(10),
    ...tablePointer(6),
    // Tables
    cbf.PROPERTY.description, ...address(26),
    cbf.PROPERTY.termination,
    ...bytecodeTable(43),
    // Data
    ...strToBytes('Description here'), 0,
    ...bytecode[0].bytecode
  ]),

  properties: {
    description: 'Description here'
  }
});

describe('author, authors', () => {

  const file = new Uint8Array([
    // Header
    ...strToBytes('CBF'),
    ...version(),
    ...tablePointer(10),
    ...tablePointer(6),
    // Tables
    cbf.PROPERTY.author, ...address(26),
    cbf.PROPERTY.termination,
    ...bytecodeTable(35),
    // Data
    ...strToBytes('Timendus'), 0,
    ...bytecode[0].bytecode
  ]);

  const multipleFile = new Uint8Array([
    // Header
    ...strToBytes('CBF'),
    ...version(),
    ...tablePointer(13),
    ...tablePointer(6),
    // Tables
    cbf.PROPERTY.author, ...address(29),
    cbf.PROPERTY.author, ...address(38),
    cbf.PROPERTY.termination,
    ...bytecodeTable(56),
    // Data
    ...strToBytes('Timendus'), 0,
    ...strToBytes('Joseph Weisbecker'), 0,
    ...bytecode[0].bytecode
  ]);

  test('packing with a single author', () => {
    expect(cbf.pack({ bytecode, properties: {
      author: 'Timendus'
    }})).toEqual(file);
    expect(cbf.pack({ bytecode, properties: {
      author: ['Timendus']
    }})).toEqual(file);
    expect(cbf.pack({ bytecode, properties: {
      authors: 'Timendus'
    }})).toEqual(file);
    expect(cbf.pack({ bytecode, properties: {
      authors: ['Timendus']
    }})).toEqual(file);
  });

  test('packing with multiple authors', () => {
    expect(cbf.pack({ bytecode, properties: {
      author: ['Timendus', 'Joseph Weisbecker']
    }})).toEqual(multipleFile);
    expect(cbf.pack({ bytecode, properties: {
      authors: ['Timendus', 'Joseph Weisbecker']
    }})).toEqual(multipleFile);
  });

  test('unpacking with a single author', () => {
    const unpacked = cbf.unpack(file);
    expect(unpacked.properties).toMatchObject({
      authors: ['Timendus']
    });
    expect(unpacked.bytecode).toEqual(bytecode);
  });

  test('unpacking with multiple authors', () => {
    const unpacked = cbf.unpack(multipleFile);
    expect(unpacked.properties).toMatchObject({
      authors: ['Timendus', 'Joseph Weisbecker']
    });
    expect(unpacked.bytecode).toEqual(bytecode);
  });

});

describe('url, urls', () => {

  const file = new Uint8Array([
    // Header
    ...strToBytes('CBF'),
    ...version(),
    ...tablePointer(10),
    ...tablePointer(6),
    // Tables
    cbf.PROPERTY.url, ...address(26),
    cbf.PROPERTY.termination,
    ...bytecodeTable(74),
    // Data
    ...strToBytes('https://github.com/Timendus/chip8-binary-format'), 0,
    ...bytecode[0].bytecode
  ]);

  const multipleFile = new Uint8Array([
    // Header
    ...strToBytes('CBF'),
    ...version(),
    ...tablePointer(13),
    ...tablePointer(6),
    // Tables
    cbf.PROPERTY.url, ...address(29),
    cbf.PROPERTY.url, ...address(77),
    cbf.PROPERTY.termination,
    ...bytecodeTable(125),
    // Data
    ...strToBytes('https://github.com/Timendus/chip8-binary-format'), 0,
    ...strToBytes('https://timendus.github.io/chip8-binary-format/'), 0,
    ...bytecode[0].bytecode
  ]);

  test('packing with a single url', () => {
    expect(cbf.pack({ bytecode, properties: {
      url: 'https://github.com/Timendus/chip8-binary-format'
    }})).toEqual(file);
    expect(cbf.pack({ bytecode, properties: {
      url: ['https://github.com/Timendus/chip8-binary-format']
    }})).toEqual(file);
    expect(cbf.pack({ bytecode, properties: {
      urls: 'https://github.com/Timendus/chip8-binary-format'
    }})).toEqual(file);
    expect(cbf.pack({ bytecode, properties: {
      urls: ['https://github.com/Timendus/chip8-binary-format']
    }})).toEqual(file);
  });

  test('packing with multiple urls', () => {
    expect(cbf.pack({ bytecode, properties: {
      url: [
        'https://github.com/Timendus/chip8-binary-format',
        'https://timendus.github.io/chip8-binary-format/'
      ]
    }})).toEqual(multipleFile);
    expect(cbf.pack({ bytecode, properties: {
      urls: [
        'https://github.com/Timendus/chip8-binary-format',
        'https://timendus.github.io/chip8-binary-format/'
      ]
    }})).toEqual(multipleFile);
  });

  test('unpacking with a single url', () => {
    const unpacked = cbf.unpack(file);
    expect(unpacked.properties).toMatchObject({
      urls: ['https://github.com/Timendus/chip8-binary-format']
    });
    expect(unpacked.bytecode).toEqual(bytecode);
  });

  test('unpacking with multiple urls', () => {
    const unpacked = cbf.unpack(multipleFile);
    expect(unpacked.properties).toMatchObject({
      urls: [
        'https://github.com/Timendus/chip8-binary-format',
        'https://timendus.github.io/chip8-binary-format/'
      ]
    });
    expect(unpacked.bytecode).toEqual(bytecode);
  });

});

expectMapping({
  description: 'cyclesPerFrame',

  binary: new Uint8Array([
    // Header
    ...strToBytes('CBF'),
    ...version(),
    ...tablePointer(10),
    ...tablePointer(6),
    // Tables
    cbf.PROPERTY.cyclesPerFrame, ...address(26),
    cbf.PROPERTY.termination,
    ...bytecodeTable(29),
    // Data
    ...value(200000, 3),
    ...bytecode[0].bytecode
  ]),

  properties: {
    cyclesPerFrame: 200000
  }
});

describe('releaseDate', () => {

  const date = new Date('2022-07-09 14:43:00');

  const file = new Uint8Array([
    // Header
    ...strToBytes('CBF'),
    ...version(),
    ...tablePointer(10),
    ...tablePointer(6),
    // Tables
    cbf.PROPERTY.releaseDate, ...address(26),
    cbf.PROPERTY.termination,
    ...bytecodeTable(30),
    // Data
    ...value(+date/1000, 4),
    ...bytecode[0].bytecode
  ]);

  test('packing', () => {
    expect(cbf.pack({ bytecode, properties: {
      releaseDate: date
    }})).toEqual(file);
  });

  test('unpacking', () => {
    const unpacked = cbf.unpack(file);
    expect(unpacked.properties).toMatchObject({
      releaseDate: date
    });
    expect(unpacked.bytecode).toEqual(bytecode);
  });

});

const imageData = new Uint8Array([
  0x80, 0x00, 0x80, 0x50, 0x80, 0x50, 0xE2, 0x52,  // planes x width x height bytes,
  0x95, 0x55, 0x96, 0x55, 0x93, 0x52, 0x00, 0x00,  // containing the cover art image
  0xFF, 0xFF, 0x00, 0x00, 0x3B, 0x9E, 0x42, 0x50,
  0x43, 0x9C, 0x42, 0x50, 0x42, 0x50, 0x3B, 0x90
]);

expectMapping({
  description: 'image',

  binary: new Uint8Array([
    // Header
    ...strToBytes('CBF'),
    ...version(),
    ...tablePointer(10),
    ...tablePointer(6),
    // Tables
    cbf.PROPERTY.image, ...address(26),
    cbf.PROPERTY.termination,
    ...bytecodeTable(61),
    // Data
    0x01,  // Number of planes
    0x02,  // Width (in bytes)
    0x10,  // Height (in pixels)
    ...imageData,
    ...bytecode[0].bytecode
  ]),

  properties: {
    image: {
      width: 2,
      height: 16,
      planes: 1,
      data: imageData
    }
  }
});

const keymap = {
  'up': 5,
  'down': 8,
  'left': 7,
  'right': 9,
  'a': 6,
  'b': 4
};

expectMapping({
  description: 'keys',

  binary: new Uint8Array([
    // Header
    ...strToBytes('CBF'),
    ...version(),
    ...tablePointer(10),
    ...tablePointer(6),
    // Tables
    cbf.PROPERTY.keys, ...address(26),
    cbf.PROPERTY.termination,
    ...bytecodeTable(39),
    // Data
    Object.keys(keymap).length,
    ...Object.keys(keymap).map(key => [cbf.KEY[key], keymap[key]]).flat(),
    ...bytecode[0].bytecode
  ]),

  properties: {
    keys: keymap
  }
});

const colours = [
  [ 0x15, 0x64, 0x11 ],  // Dark green for the value 0
  [ 0x9a, 0xf6, 0x95 ]   // Light green for the value 1
];

expectMapping({
  description: 'colours',

  binary: new Uint8Array([
    // Header
    ...strToBytes('CBF'),
    ...version(),
    ...tablePointer(10),
    ...tablePointer(6),
    // Tables
    cbf.PROPERTY.colours, ...address(26),
    cbf.PROPERTY.termination,
    ...bytecodeTable(33),
    // Data
    colours.length,
    ...colours.flat(),
    ...bytecode[0].bytecode
  ]),

  properties: {
    colours: colours
  }
});

expectMapping({
  description: 'screen orientation',

  binary: new Uint8Array([
    // Header
    ...strToBytes('CBF'),
    ...version(),
    ...tablePointer(10),
    ...tablePointer(6),
    // Tables
    cbf.PROPERTY.screenOrientation, ...address(26),
    cbf.PROPERTY.termination,
    ...bytecodeTable(27),
    // Data
    cbf.SCREEN_ORIENTATION['left side up'],
    ...bytecode[0].bytecode
  ]),

  properties: {
    screenOrientation: 'left side up'
  }
});

const font = new Uint8Array([ 1, 2, 3, 4, 5 ]);

expectMapping({
  description: 'font data',

  binary: new Uint8Array([
    // Header
    ...strToBytes('CBF'),
    ...version(),
    ...tablePointer(10),
    ...tablePointer(6),
    // Tables
    cbf.PROPERTY.fontData, ...address(26),
    cbf.PROPERTY.termination,
    ...bytecodeTable(34),
    // Data
    0x01, 0x00,  // Load to address 0x100
    font.length,
    ...font,
    ...bytecode[0].bytecode
  ]),

  properties: {
    fontData: {
      address: 0x100,
      data: font
    }
  }
});

expectMapping({
  description: 'tool vanity',

  binary: new Uint8Array([
    // Header
    ...strToBytes('CBF'),
    ...version(),
    ...tablePointer(10),
    ...tablePointer(6),
    // Tables
    cbf.PROPERTY.toolVanity, ...address(26),
    cbf.PROPERTY.termination,
    ...bytecodeTable(58),
    // Data
    ...strToBytes('File created by AwesomeChip2000'), 0,
    ...bytecode[0].bytecode
  ]),

  properties: {
    toolVanity: 'File created by AwesomeChip2000'
  }
});
