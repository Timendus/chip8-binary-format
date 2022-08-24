/**
 * Encoder
 **/

function pack({ properties, bytecode, verbose }) {
  resetErrors();

  const [bytecodeTable, bytecodeData] = encodeBytecode(bytecode);
  const [propertiesTable, propertiesData] = encodeProperties(properties);

  const file = [
    header(),
    ...[...bytecodeTable, ...propertiesTable].sort(bySize),
    ...[...bytecodeData, ...propertiesData].sort(bySize)
  ];
  file.forEach(entry =>
    entry.encoded = entry.encode(file)
  );

  if ( verbose )
    console.log(file);

  assertNoErrors();

  // The reduce is a complicated way to do file.map(e => e.encoded).flat()
  // We need it because we have Uint8Arrays in the mix, which don't like flat
  return Uint8Array.from(file.reduce((a, e) => [...a, ...e.encoded], []));
}

function header() {
  return {
    name: 'header',
    size: 6,
    encode: file => [
      ...MAGIC_NUMBER,
      VERSION_NUMBER,
      ...intToBytes(addressOf('bytecodeTable', file, 1, false) || 0, 1),
      ...intToBytes(addressOf('propertiesTable', file, 1, false) || 0, 1)
    ]
  };
}

function encodeBytecode(bytecode) {
  if ( !bytecode || bytecode.length == 0 )
    return [[], []];

  return [
    [{
      name: 'bytecodeTable',
      size: bytecode.reduce((a, b) => a + b.platforms.length, 0) * 5 + 1,
      encode: file => [
        ...bytecode.map((b, i) =>
          b.platforms.map(p => [
            map(PLATFORM, p),
            ...intToBytes(addressOf(`bytecode${i}`, file), 2),
            ...intToBytes(sizeOf(`bytecode${i}`, file), 2)
          ])
        ).flat(2),
        PLATFORM.termination
      ]
    }],
    bytecode.map((b, i) => ({
      name: `bytecode${i}`,
      size: b.bytecode.length,
      encode: () => b.bytecode
    }))
  ];
}

function encodeProperties(properties) {
  properties = validProperties(properties);
  if ( Object.keys(properties).length == 0 )
    return [[], []];

  const propsTable = [];
  const data = [];

  Object.keys(properties).forEach(key => {
    // Interpret every property as a list
    if ( typeof properties[key].forEach != 'function' || key == 'colours' ) properties[key] = [properties[key]];
    // Expect a single value, except for these properties:
    if ( !['author', 'authors', 'url', 'urls'].includes(key) )
      assert(properties[key].length == 1, `Having more than one value for ${key} is not valid in CBF.`);

    // Encode and add each property to the properties table
    properties[key].forEach((p, i) => {
      const prop = encodeProperty(key, p);
      data.push({
        name: `${key}${i}`,
        size: prop.length,
        encode: () => prop
      });
      propsTable.push(file => [
        PROPERTY[key],
        ...intToBytes(addressOf(`${key}${i}`, file), 2)
      ]);
    });
  });

  return [
    [{
      name: 'propertiesTable',
      size: propsTable.length * 3 + 1,
      encode: file => [
        ...propsTable.map(p => p(file)).flat(),
        PROPERTY.termination
      ]
    }],
    data
  ];
}

function validProperties(properties) {
  if ( !properties ) return {};
  return Object.keys(properties)
               .filter(prop => Object.keys(PROPERTY).includes(prop))
               .reduce((a, prop) => {
                 a[prop] = properties[prop];
                 return a;
               }, {});
}

function addressOf(name, file, bytes=2, strict=true) {
  let address = 0;
  let i;
  for ( i = 0; i < file.length && file[i].name != name; i++ )
    address += file[i].size;
  if ( strict ) assert(i != file.length, `Could not find '${name}' in the file`);
  if ( i == file.length ) return 0;
  assert(typeof address == 'number' && address >= 0, `Expecting a positive number for the address of '${name}'`);
  assert(address < Math.pow(2, 8*bytes), `Can't fit address of '${name}' in ${bytes} byte(s)`);
  return address;
}

function sizeOf(name, file, bytes=2) {
  const size = file.find(f => f.name == name).size;
  assert(typeof size == 'number' && size >= 0, `Expecting a positive number for the size of '${name}'`);
  assert(size < Math.pow(2, 8*bytes), `Can't fit size of '${name}' in ${bytes} byte(s)`);
  return size;
}

// Sort function
function bySize(a, b) {
  return a.size - b.size;
}

// Take a property and encode it into its binary form.
function encodeProperty(key, value) {
  switch(key) {
    case 'name':
    case 'description':
    case 'author':
    case 'authors':
    case 'url':
    case 'urls':
    case 'toolVanity':
      return stringProperty(value);
    case 'cyclesPerFrame':
      return integerProperty(value, 3);
    case 'releaseDate':
      if ( typeof value == 'object' ) value = +value/1000;
      return integerProperty(value, 4);
    case 'image':
      if ( value.hasOwnProperty('width') && value.hasOwnProperty('height') && value.hasOwnProperty('planes') ) {
        return [
          ...integerProperty(value.planes, 1),
          ...integerProperty(value.width, 1),
          ...integerProperty(value.height, 1),
          ...value.data
        ];
      } else {
        return value;
      }
    case 'keys':
      const bytes = [Object.keys(value).length];
      for ( const key of Object.keys(value) ) {
        bytes.push(KEY[key]);
        bytes.push(value[key]);
      }
      return bytes;
    case 'colours':
      return [value.length, ...value.flat()];
    case 'screenOrientation':
      return [map(SCREEN_ORIENTATION, value)];
    case 'fontData':
      return [
        ...intToBytes(value.address, 2),
        ...intToBytes(value.data.length, 1),
        ...value.data
      ];
    default:
      assert(false, `Don't know how to encode property '${key}'. This shouldn't happen.`)
      return [];
  }
}

// Encode a string into its binary form. If it can't be encoded, add errors.
function stringProperty(str) {
  if ( !assert(typeof str == 'string', `Value should be a string: '${str}'`) ) return [];
  const stringBytes = strToBytes(str);
  stringBytes.push(0);
  return stringBytes;
}

// Encode an integer into its binary form. If it can't be encoded, add errors.
function integerProperty(value, bytes) {
  if ( !assert(typeof value == 'number', `Value should be a number: '${value}'`) ) return [];
  return intToBytes(value, bytes);
}

// Take a string and encode it into an array representing the ascii values of
// the string.
function strToBytes(str) {
  return str.split('').map(c => c.charCodeAt(0) & 0xFF);
}

// Take an integer value and convert it to `bytes` number of bytes
function intToBytes(value, bytes) {
  const result = [];
  for ( let i = bytes - 1; i >= 0; i-- ) {
    result.push(value >> (i*8) & 0xFF);
  }
  return result;
}

// Check to see if `item` is in `list`, either as numeric value or as textual
// value. If so, return its numeric value. Otherwise, add an error.
function map(list, item) {
  if ( Object.values(list).includes(item) ) return item;
  if ( Object.keys(list).includes(item) ) return list[item];
  if ( Object.values(list).includes(+item) ) return +item;
  if ( Object.keys(list).includes(+item) ) return list[+item];
  assert(false, `Mapping error: '${item}' is not a valid value`);
}

/**
 * Decoder
 **/

function unpack(binary) {
  binary = new Uint8Array(binary);

  resetErrors();
  assert(binary.slice(0, 3).every((v,i)=> v === MAGIC_NUMBER[i]), 'File should be valid CHIP-8 binary format');
  assert(binary[3] == VERSION_NUMBER, 'File should have a compatible version number')
  assert(binary.length >= 6, 'File should be complete');
  assertNoErrors();

  const properties = decodeProperties(binary);
  const bytecode = decodeBytecode(binary);
  assertNoErrors();

  return { properties, bytecode };
}

function decodeBytecode(binary) {
  if ( binary[4] == 0 ) return [];
  const bytecode = {};
  let i;
  for ( i = binary[4]; i < binary.length && binary[i] != PLATFORM.termination; i += 5 ) {
    const type = binary[i];
    if ( !assert(Object.values(PLATFORM).includes(type), `Platform type '${type}' is not a valid type`) ) return [];
    const typeName = Object.keys(PLATFORM).find(key => PLATFORM[key] == type);
    const where = [
      bytesToInt([binary[i+1], binary[i+2]]),  // Pointer
      bytesToInt([binary[i+3], binary[i+4]])   // Size
    ];
    bytecode[JSON.stringify(where)] ||= {
      platforms: [],
      platformNames: [],
      bytecode: binary.slice(where[0], where[0] + where[1])
    };
    bytecode[JSON.stringify(where)].platforms.push(type);
    bytecode[JSON.stringify(where)].platformNames.push(typeName);
  }
  assert(i < binary.length, 'Ran out of the file trying to load the bytecode table');
  return Object.values(bytecode);
}

function decodeProperties(binary) {
  if ( binary[5] == 0 ) return {};
  const properties = {};
  let i;
  for ( i = binary[5]; i < binary.length && binary[i] != PROPERTY.termination; i += 3 ) {
    const type = binary[i];
    if ( !assert(Object.values(PROPERTY).includes(type), `Property type '${type}' is not a valid type`) ) return properties;
    const typeName = Object.keys(PROPERTY).find(key => PROPERTY[key] == type);
    const pointer = bytesToInt([binary[i+1], binary[i+2]]);
    if ( [PROPERTY.author, PROPERTY.url].includes(type) ) {
      properties[typeName] ||= [];
      properties[typeName].push(decodeProperty(binary, type, pointer));
    } else {
      properties[typeName] = decodeProperty(binary, type, pointer);
    }
  }
  assert(i < binary.length, 'Ran out of the file trying to load the properties table');
  return properties;
}

function decodeProperty(binary, type, pointer) {
  switch(type) {
    case PROPERTY.name:
    case PROPERTY.description:
    case PROPERTY.author:
    case PROPERTY.url:
    case PROPERTY.toolVanity:
      return bytesToStr(binary.slice(pointer, pointer + findLength(binary, pointer)));
    case PROPERTY.cyclesPerFrame:
      return bytesToInt(binary.slice(pointer, pointer + 3));
    case PROPERTY.releaseDate:
      return new Date(bytesToInt(binary.slice(pointer, pointer + 4)) * 1000);
    case PROPERTY.image:
      const planes = binary[pointer];
      const width = binary[pointer+1];
      const height = binary[pointer+2];
      return {
        planes, width, height,
        data: binary.slice(pointer+3, pointer+3+planes*width*height)
      };
    case PROPERTY.keys:
      const keys = {};
      for ( let i = 0; i < binary[pointer]; i++ )
        keys[Object.keys(KEY).find(key => KEY[key] == binary[pointer+1+i*2])] = binary[pointer+1+i*2+1];
      return keys;
    case PROPERTY.colours:
      const colours = [];
      for ( let i = 0; i < binary[pointer]; i++ )
        colours.push([binary[pointer+(3*i)+1], binary[pointer+(3*i)+2], binary[pointer+(3*i)+3]])
      return colours;
    case PROPERTY.screenOrientation:
      return Object.keys(SCREEN_ORIENTATION).find(key => SCREEN_ORIENTATION[key] == binary[pointer]);
    case PROPERTY.fontData:
      return {
        address: bytesToInt(binary.slice(pointer, pointer+2)),
        data: binary.slice(pointer+3, pointer+3+binary[pointer+2])
      };
    default:
      assert(false, `Don't know how to decode property type '${type}'`);
  }
}

// Take an array of ascii values and convert back to a string
function bytesToStr(bytes) {
  return String.fromCharCode(...bytes);
}

function findLength(binary, offset) {
  return binary.slice(offset).indexOf(0);
}

// Take an array of bytes and convert it into an integer
function bytesToInt(bytes) {
  return bytes.reduce((a, v, i) => v << 8*(bytes.length-1-i) | a, 0);
}

/**
 * Error handling
 **/

let errors;

function resetErrors() {
  errors = [];
}

function assert(assertion, message) {
  return assertion || !errors.push(message);
}

function assertNoErrors() {
  if ( errors.length > 0 ) throw errors;
}

/**
 * Static values and lookup tables
 **/

MAGIC_NUMBER = strToBytes('CBF');
VERSION_NUMBER = 0;

PLATFORM = {
  'termination':                                                      0x00,
  'CHIP-8':                                                           0x01,
  'CHIP-8 1/2':                                                       0x02,
  'CHIP-8I':                                                          0x03,
  'CHIP-8 II aka. Keyboard Kontrol':                                  0x04,
  'CHIP-8III':                                                        0x05,
  'Two-page display for CHIP-8':                                      0x06,
  'CHIP-8C':                                                          0x07,
  'CHIP-10':                                                          0x08,
  'CHIP-8 modification for saving and restoring variables':           0x09,
  'Improved CHIP-8 modification for saving and restoring variables':  0x0A,
  'CHIP-8 modification with relative branching':                      0x0B,
  'Another CHIP-8 modification with relative branching':              0x0C,
  'CHIP-8 modification with fast, single-dot DXYN':                   0x0D,
  'CHIP-8 with I/O port driver routine':                              0x0E,
  'CHIP-8 8-bit multiply and divide':                                 0x0F,
  'HI-RES CHIP-8 (four-page display)':                                0x10,
  'HI-RES CHIP-8 with I/O':                                           0x11,
  'HI-RES CHIP-8 with page switching':                                0x12,
  'CHIP-8E':                                                          0x13,
  'CHIP-8 with improved BNNN':                                        0x14,
  'CHIP-8 scrolling routine':                                         0x15,
  'CHIP-8X':                                                          0x16,
  'Two-page display for CHIP-8X':                                     0x17,
  'Hi-res CHIP-8X':                                                   0x18,
  'CHIP-8Y':                                                          0x19,
  'CHIP-8 “Copy to Screen”':                                          0x1A,
  'CHIP-BETA':                                                        0x1B,
  'CHIP-8M':                                                          0x1C,
  'Multiple Nim interpreter':                                         0x1D,
  'Double Array Modification':                                        0x1E,
  'CHIP-8 for DREAM 6800 (CHIPOS)':                                   0x1F,
  'CHIP-8 with logical operators for DREAM 6800 (CHIPOSLO)':          0x20,
  'CHIP-8 for DREAM 6800 with joystick':                              0x21,
  '2K CHIPOS for DREAM 6800':                                         0x22,
  'CHIP-8 for ETI-660':                                               0x23,
  'CHIP-8 with color support for ETI-660':                            0x24,
  'CHIP-8 for ETI-660 with high resolution':                          0x25,
  'CHIP-8 for COSMAC ELF':                                            0x26,
  'CHIP-VDU / CHIP-8 for the ACE VDU':                                0x27,
  'CHIP-8 AE (ACE Extended)':                                         0x28,
  'Dreamcards Extended CHIP-8 V2.0':                                  0x29,
  'Amiga CHIP-8 interpreter':                                         0x2A,
  'CHIP-48':                                                          0x2B,
  'SUPER-CHIP 1.0':                                                   0x2C,
  'SUPER-CHIP 1.1':                                                   0x2D,
  'GCHIP':                                                            0x2E,
  'SCHIP Compatibility (SCHPC) and GCHIP Compatibility (GCHPC)':      0x2F,
  'VIP2K CHIP-8':                                                     0x30,
  'SUPER-CHIP with scroll up':                                        0x31,
  'chip8run':                                                         0x32,
  'Mega-Chip':                                                        0x33,
  'XO-CHIP':                                                          0x34,
  'Octo':                                                             0x35,
  'CHIP-8 Classic / Color':                                           0x36,
};

PROPERTY = {
  'termination':        0x00,
  'cyclesPerFrame':     0x01,
  'name':               0x02,
  'description':        0x03,
  'authors':            0x04,
  'author':             0x04,
  'urls':               0x05,
  'url':                0x05,
  'releaseDate':        0x06,
  'image':              0x07,
  'keys':               0x08,
  'colours':            0x09,
  'screenOrientation':  0x0B,
  'fontData':           0x0C,
  'toolVanity':         0x0D,
  'licenseInformation': 0x0E
};

KEY = {
  'up':     0x00,
  'down':   0x01,
  'left':   0x02,
  'right':  0x03,
  'a':      0x04,
  'b':      0x05
}

SCREEN_ORIENTATION = {
  'normal':         0x00,  // Display is on its feet, top is up
  'left side up':   0x01,  // Display is put on its right side, left side is up
  'right side up':  0x02,  // Display is put on its left side, right side is up
  'upside down':    0x03,  // Display is upside down, bottom is up
}

/**
 * External interface
 **/

module.exports = {
  pack,
  unpack,
  PLATFORM,
  PROPERTY,
  KEY,
  SCREEN_ORIENTATION
};
