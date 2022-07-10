const parser = require('../parser.js');

const bytecode = new Uint8Array([
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
]);

function strToBytes(str) {
  return new Uint8Array(str.split('').map(c => c.charCodeAt(0) & 0xFF));
}
function address(addr) {
  return value(addr, 2);
}
function value(val, numBytes) {
  const bytes = [];
  for ( let i = numBytes - 1; i >= 0; i-- )
    bytes.push(val >> i*8 & 0xFF);
  return bytes;
}

describe('end to end', () => {

  const properties = {
    platform: 0,
    platformName: 'CHIP-8',
    name: 'IBM test rom',
    description: 'This ROM is a rite of passage for any CHIP-8 developer'
  };

  test('if we pack and then unpack, we get the same result', () => {
    const binary = parser.pack({ properties, bytecode });
    const unpacked = parser.unpack(binary);
    const binary2 = parser.pack(unpacked);

    expect(unpacked.bytecode).toEqual(bytecode);
    expect(unpacked.properties).toEqual(properties);
    expect(binary).toEqual(binary2);
  });

});

describe('header, name and general structure', () => {

  const emptyFile = new Uint8Array([
    ...strToBytes('CBF'),
    parser.PLATFORMS['CHIP-8'],
    ...address(7),
    0
  ]);

  const contentFile = new Uint8Array([
    ...strToBytes('CBF'),
    parser.PLATFORMS['XO-CHIP'],
    ...address(15),
    parser.PROPERTIES.name, ...address(10),
    0,
    4, ...strToBytes('Test'),
    ...bytecode
  ]);

  test('pack empty file', () => {
    expect(parser.pack({
      properties: {},
      bytecode: []
    })).toEqual(emptyFile);
  });

  test('pack file with contents', () => {
    expect(parser.pack({ bytecode, properties: {
      platform: 'XO-CHIP',
      name: 'Test'
    }})).toEqual(contentFile);
  });

  test('unpack empty file', () => {
    const unpacked = parser.unpack(emptyFile);
    expect(unpacked.properties).toEqual({
      platform: 0,
      platformName: 'CHIP-8'
    });
    expect(unpacked.bytecode).toEqual(new Uint8Array(0));
  });

  test('unpack file with contents', () => {
    const unpacked = parser.unpack(contentFile);
    expect(unpacked.properties).toEqual({
      platform: parser.PLATFORMS['XO-CHIP'],
      platformName: 'XO-CHIP',
      name: 'Test'
    });
    expect(unpacked.bytecode).toEqual(bytecode);
  });

});

describe('description', () => {

  const file = new Uint8Array([
    ...strToBytes('CBF'),
    parser.PLATFORMS['CHIP-8'],
    ...address(27),
    parser.PROPERTIES.description, ...address(10),
    0,
    16, ...strToBytes('Description here'),
    ...bytecode
  ]);

  test('packing', () => {
    expect(parser.pack({ bytecode, properties: {
      description: 'Description here'
    }})).toEqual(file);
  });

  test('unpacking', () => {
    const unpacked = parser.unpack(file);
    expect(unpacked.properties).toMatchObject({
      description: 'Description here'
    });
    expect(unpacked.bytecode).toEqual(bytecode);
  });

});

describe('author, authors', () => {

  const file = new Uint8Array([
    ...strToBytes('CBF'),
    parser.PLATFORMS['CHIP-8'],
    ...address(10 + 9),
    parser.PROPERTIES.author, ...address(10),
    0,
    8, ...strToBytes('Timendus'),
    ...bytecode
  ]);

  const multipleFile = new Uint8Array([
    ...strToBytes('CBF'),
    parser.PLATFORMS['CHIP-8'],
    ...address(13 + 9 + 18),
    parser.PROPERTIES.author, ...address(13),
    parser.PROPERTIES.author, ...address(22),
    0,
    8, ...strToBytes('Timendus'),
    17, ...strToBytes('Joseph Weisbecker'),
    ...bytecode
  ]);

  test('packing with a single author', () => {
    expect(parser.pack({ bytecode, properties: {
      author: 'Timendus'
    }})).toEqual(file);
    expect(parser.pack({ bytecode, properties: {
      author: ['Timendus']
    }})).toEqual(file);
    expect(parser.pack({ bytecode, properties: {
      authors: 'Timendus'
    }})).toEqual(file);
    expect(parser.pack({ bytecode, properties: {
      authors: ['Timendus']
    }})).toEqual(file);
  });

  test('packing with multiple authors', () => {
    expect(parser.pack({ bytecode, properties: {
      author: ['Timendus', 'Joseph Weisbecker']
    }})).toEqual(multipleFile);
    expect(parser.pack({ bytecode, properties: {
      authors: ['Timendus', 'Joseph Weisbecker']
    }})).toEqual(multipleFile);
  });

  test('unpacking with a single author', () => {
    const unpacked = parser.unpack(file);
    expect(unpacked.properties).toMatchObject({
      authors: ['Timendus']
    });
    expect(unpacked.bytecode).toEqual(bytecode);
  });

  test('unpacking with multiple authors', () => {
    const unpacked = parser.unpack(multipleFile);
    expect(unpacked.properties).toMatchObject({
      authors: ['Timendus', 'Joseph Weisbecker']
    });
    expect(unpacked.bytecode).toEqual(bytecode);
  });

});

describe('url, urls', () => {

  const file = new Uint8Array([
    ...strToBytes('CBF'),
    parser.PLATFORMS['CHIP-8'],
    ...address(10 + 48),
    parser.PROPERTIES.url, ...address(10),
    0,
    47, ...strToBytes('https://github.com/Timendus/chip8-binary-format'),
    ...bytecode
  ]);

  const multipleFile = new Uint8Array([
    ...strToBytes('CBF'),
    parser.PLATFORMS['CHIP-8'],
    ...address(13 + 48 + 48),
    parser.PROPERTIES.url, ...address(13),
    parser.PROPERTIES.url, ...address(61),
    0,
    47, ...strToBytes('https://github.com/Timendus/chip8-binary-format'),
    47, ...strToBytes('https://timendus.github.io/chip8-binary-format/'),
    ...bytecode
  ]);

  test('packing with a single url', () => {
    expect(parser.pack({ bytecode, properties: {
      url: 'https://github.com/Timendus/chip8-binary-format'
    }})).toEqual(file);
    expect(parser.pack({ bytecode, properties: {
      url: ['https://github.com/Timendus/chip8-binary-format']
    }})).toEqual(file);
    expect(parser.pack({ bytecode, properties: {
      urls: 'https://github.com/Timendus/chip8-binary-format'
    }})).toEqual(file);
    expect(parser.pack({ bytecode, properties: {
      urls: ['https://github.com/Timendus/chip8-binary-format']
    }})).toEqual(file);
  });

  test('packing with multiple urls', () => {
    expect(parser.pack({ bytecode, properties: {
      url: [
        'https://github.com/Timendus/chip8-binary-format',
        'https://timendus.github.io/chip8-binary-format/'
      ]
    }})).toEqual(multipleFile);
    expect(parser.pack({ bytecode, properties: {
      urls: [
        'https://github.com/Timendus/chip8-binary-format',
        'https://timendus.github.io/chip8-binary-format/'
      ]
    }})).toEqual(multipleFile);
  });

  test('unpacking with a single url', () => {
    const unpacked = parser.unpack(file);
    expect(unpacked.properties).toMatchObject({
      urls: ['https://github.com/Timendus/chip8-binary-format']
    });
    expect(unpacked.bytecode).toEqual(bytecode);
  });

  test('unpacking with multiple urls', () => {
    const unpacked = parser.unpack(multipleFile);
    expect(unpacked.properties).toMatchObject({
      urls: [
        'https://github.com/Timendus/chip8-binary-format',
        'https://timendus.github.io/chip8-binary-format/'
      ]
    });
    expect(unpacked.bytecode).toEqual(bytecode);
  });

});

describe('cyclesPerFrame', () => {

  const file = new Uint8Array([
    ...strToBytes('CBF'),
    parser.PLATFORMS['CHIP-8'],
    ...address(10 + 3),
    parser.PROPERTIES.cyclesPerFrame, ...address(10),
    0,
    ...value(200000, 3),
    ...bytecode
  ]);

  test('packing', () => {
    expect(parser.pack({ bytecode, properties: {
      cyclesPerFrame: 200000
    }})).toEqual(file);
  });

  test('unpacking', () => {
    const unpacked = parser.unpack(file);
    expect(unpacked.properties).toMatchObject({
      cyclesPerFrame: 200000
    });
    expect(unpacked.bytecode).toEqual(bytecode);
  });

});

describe('releaseDate', () => {

  const date = new Date('2022-07-09 14:43:00');

  const file = new Uint8Array([
    ...strToBytes('CBF'),
    parser.PLATFORMS['CHIP-8'],
    ...address(10 + 4),
    parser.PROPERTIES.releaseDate, ...address(10),
    0,
    ...value(+date/1000, 4),
    ...bytecode
  ]);

  test('packing', () => {
    expect(parser.pack({ bytecode, properties: {
      releaseDate: date
    }})).toEqual(file);
  });

  test('unpacking', () => {
    const unpacked = parser.unpack(file);
    expect(unpacked.properties).toMatchObject({
      releaseDate: date
    });
    expect(unpacked.bytecode).toEqual(bytecode);
  });

});

describe('image', () => {

  const imageData = new Uint8Array([
    0x80, 0x00, 0x80, 0x50, 0x80, 0x50, 0xE2, 0x52,  // planes x width x height bytes,
    0x95, 0x55, 0x96, 0x55, 0x93, 0x52, 0x00, 0x00,  // containing the cover art image
    0xFF, 0xFF, 0x00, 0x00, 0x3B, 0x9E, 0x42, 0x50,
    0x43, 0x9C, 0x42, 0x50, 0x42, 0x50, 0x3B, 0x90
  ]);

  const image = [
    0x01,  // Number of planes
    0x02,  // Width (in bytes)
    0x10,  // Height (in pixels)
    ...imageData
  ];

  const file = new Uint8Array([
    ...strToBytes('CBF'),
    parser.PLATFORMS['CHIP-8'],
    ...address(10 + 35),
    parser.PROPERTIES.image, ...address(10),
    0,
    ...image,
    ...bytecode
  ]);

  test('packing', () => {
    expect(parser.pack({ bytecode, properties: {
      image
    }})).toEqual(file);

    expect(parser.pack({ bytecode, properties: {
      image: {
        width: 2,
        height: 16,
        planes: 1,
        data: imageData
      }
    }})).toEqual(file);
  });

  test('unpacking', () => {
    const unpacked = parser.unpack(file);
    console.log(unpacked.properties);
    expect(unpacked.properties).toMatchObject({
      image: {
        width: 2,
        height: 16,
        planes: 1,
        data: imageData
      }
    });
    expect(unpacked.bytecode).toEqual(bytecode);
  });

});

describe('keys', () => {

  const keymap = {
    'up': 5,
    'down': 8,
    'left': 7,
    'right': 9,
    'a': 6,
    'b': 4
  };

  const file = new Uint8Array([
    ...strToBytes('CBF'),
    parser.PLATFORMS['CHIP-8'],
    ...address(10 + 13),
    parser.PROPERTIES.keys, ...address(10),
    0,
    Object.keys(keymap).length,
    ...Object.keys(keymap).map(key => [parser.KEYS[key], keymap[key]]).flat(),
    ...bytecode
  ]);

  test('packing', () => {
    expect(parser.pack({ bytecode, properties: {
      keys: keymap
    }})).toEqual(file);
  });

  test('unpacking', () => {
    const unpacked = parser.unpack(file);
    expect(unpacked.properties).toMatchObject({
      keys: keymap
    });
    expect(unpacked.bytecode).toEqual(bytecode);
  });

});

describe('colours', () => {

  const colours = [
    [ 0x15, 0x64, 0x11 ],  // Dark green for the value 0
    [ 0x9a, 0xf6, 0x95 ]   // Light green for the value 1
  ];

  const file = new Uint8Array([
    ...strToBytes('CBF'),
    parser.PLATFORMS['CHIP-8'],
    ...address(10 + 7),
    parser.PROPERTIES.colours, ...address(10),
    0,
    colours.length, ...colours.flat(),
    ...bytecode
  ]);

  test('packing', () => {
    expect(parser.pack({ bytecode, properties: {
      colours: colours
    }})).toEqual(file);
  });

  test('unpacking', () => {
    const unpacked = parser.unpack(file);
    expect(unpacked.properties).toMatchObject({
      colours: colours
    });
    expect(unpacked.bytecode).toEqual(bytecode);
  });

});

describe('compatibility', () => {

  const compatibility = [
    parser.PLATFORMS['XO-CHIP'],
    parser.PLATFORMS['CHIP-8 for ETI-660']
  ];

  const file = new Uint8Array([
    ...strToBytes('CBF'),
    parser.PLATFORMS['CHIP-8'],
    ...address(10 + 3),
    parser.PROPERTIES.compatibleWith, ...address(10),
    0,
    compatibility.length, ...compatibility,
    ...bytecode
  ]);

  test('packing', () => {
    expect(parser.pack({ bytecode, properties: {
      compatibleWith: compatibility
    }})).toEqual(file);
  });

  test('unpacking', () => {
    const unpacked = parser.unpack(file);
    expect(unpacked.properties).toMatchObject({
      compatibleWith: compatibility
    });
    expect(unpacked.bytecode).toEqual(bytecode);
  });

});

describe('screen orientation', () => {

  const file = new Uint8Array([
    ...strToBytes('CBF'),
    parser.PLATFORMS['CHIP-8'],
    ...address(10 + 1),
    parser.PROPERTIES.screenOrientation, ...address(10),
    parser.PROPERTIES.termination,
    parser.SCREEN_ORIENTATION.right,
    ...bytecode
  ]);

  test('packing', () => {
    expect(parser.pack({ bytecode, properties: {
      screenOrientation: 'right'
    }})).toEqual(file);
  });

  test('unpacking', () => {
    const unpacked = parser.unpack(file);
    expect(unpacked.properties).toMatchObject({
      screenOrientation: 'right'
    });
    expect(unpacked.bytecode).toEqual(bytecode);
  });

});

describe('font data', () => {

  const font = new Uint8Array([ 1, 2, 3, 4, 5 ]);

  const file = new Uint8Array([
    ...strToBytes('CBF'),
    parser.PLATFORMS['CHIP-8'],
    ...address(10 + 8),
    parser.PROPERTIES.fontData, ...address(10),
    parser.PROPERTIES.termination,
    0x01, 0x00,  // Load to address 0x100
    font.length, ...font,
    ...bytecode
  ]);

  test('packing', () => {
    expect(parser.pack({ bytecode, properties: {
      fontData: {
        address: 0x100,
        data: font
      }
    }})).toEqual(file);
  });

  test('unpacking', () => {
    const unpacked = parser.unpack(file);
    expect(unpacked.properties).toMatchObject({
      fontData: {
        address: 0x100,
        data: font
      }
    });
    expect(unpacked.bytecode).toEqual(bytecode);
  });

});
