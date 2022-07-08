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

describe('header and general structure', () => {

  const emptyFile = new Uint8Array([
    ...strToBytes('CBF'),
    parser.PLATFORMS['CHIP-8'],
    0, 7,
    0
  ]);

  const contentFile = new Uint8Array([
    ...strToBytes('CBF'),
    parser.PLATFORMS['XO-CHIP'],
    0, 15,
    2, 0, 10,
    0,
    4, ...strToBytes('Test'),
    ...bytecode
  ]);

  test('build empty file', () => {
    const binary = parser.pack({ properties: {}, bytecode: [] });
    expect(binary).toEqual(emptyFile);
  });

  test('build file with contents', () => {
    const binary = parser.pack({ bytecode, properties: {
      platform: 'XO-CHIP',
      name: 'Test'
    }});
    expect(binary).toEqual(contentFile);
  });

  test('read empty file', () => {
    const unpacked = parser.unpack(emptyFile);
    expect(unpacked.properties).toEqual({
      platform: 0,
      platformName: 'CHIP-8'
    });
    expect(unpacked.bytecode).toEqual(new Uint8Array(0));
  });

  test('read file with contents', () => {
    const unpacked = parser.unpack(contentFile);
    expect(unpacked.properties).toEqual({
      platform: parser.PLATFORMS['XO-CHIP'],
      platformName: 'XO-CHIP',
      name: 'Test'
    });
    expect(unpacked.bytecode).toEqual(bytecode);
  });

});

