/**
 * External API
 **/

function pack({ properties, bytecode }) {
  const errors = [];
  const binary = join(
    MAGIC_NUMBER,
    map(PLATFORMS, properties.platform || 0, errors),
    0, 0,
    makeProperties(properties, errors)
  );

  assert(errors.length == 0, errors);
  assert(binary.length <= 0xFFFF, ['Size of header and data segment should fit in 16 bits']);

  binary[4] = binary.length >> 8 & 0xFF;  // Set pointer to bytecode in header
  binary[5] = binary.length & 0xFF;
  return join(binary, bytecode);
}

function unpack(binary) {
  binary = new Uint8Array(binary);

  assert(binary.slice(0, 3).every((v,i)=> v === MAGIC_NUMBER[i]), ['File should be valid CHIP-8 binary format']);
  assert(binary.length >= 7, ['File should be complete']);

  return {
    properties: {
      platform: binary[3],
      platformName: Object.keys(PLATFORMS).find(key => PLATFORMS[key] == binary[3]),
      ...readProperties(binary)
    },
    bytecode: binary.slice(binary[4] << 8 | binary[5], binary.length)
  };
}

/**
 * Internal helper functions
 **/

// Get all the properties referenced in the properties table of this binary and
// decode them to a JavaScript object.
function readProperties(binary) {
  let type;
  let offset = 6;
  const properties = {};
  do {
    type = binary[offset];
    const pointer = binary[offset+1] << 8 | binary[offset+2];
    offset += 3;

    switch(type) {
      case PROPERTIES.name:
        properties['name'] = bytesToStr(binary.slice(pointer + 1, pointer + 1 + binary[pointer]));
        break;
      case PROPERTIES.description:
        properties['description'] = bytesToStr(binary.slice(pointer + 1, pointer + 1 + binary[pointer]));
        break;
      case PROPERTIES.author:
        properties['authors'] = properties['authors'] || [];
        properties['authors'].push(bytesToStr(binary.slice(pointer + 1, pointer + 1 + binary[pointer])));
        break;
      case PROPERTIES.url:
        properties['urls'] = properties['urls'] || [];
        properties['urls'].push(bytesToStr(binary.slice(pointer + 1, pointer + 1 + binary[pointer])));
        break;
      case PROPERTIES.cyclesPerFrame:
        properties['cyclesPerFrame'] = bytesToInt(binary.slice(pointer, pointer + 3));
        break;
      case PROPERTIES.releaseDate:
        properties['releaseDate'] = new Date(bytesToInt(binary.slice(pointer, pointer + 4)) * 1000);
        break;
      case PROPERTIES.image:
        const planes = binary[pointer];
        const width = binary[pointer+1];
        const height = binary[pointer+2];
        properties['image'] = {
          planes, width, height,
          data: binary.slice(pointer+3, pointer+3+planes*width*height)
        };
        break;
    }
  } while ( type != PROPERTIES.termination )
  return properties;
}

// Take a JavaScript object with properties and encode them into their binary
// form. If some properties can't be encoded, add errors.
function makeProperties(props, errors) {
  // Convert all the properties to the correct data structures
  let table = [];
  const data = [];
  Object.keys(PROPERTIES).forEach(k => {
    if ( !props.hasOwnProperty(k) || props[k] == undefined || props[k] == '' ) return;
    switch(k) {
      case 'name':
      case 'description':
        table.push(PROPERTIES[k]);
        data.push(stringProperty(props[k], k, errors));
        break;
      case 'author':
      case 'authors':
      case 'url':
      case 'urls':
        if ( typeof props[k] != 'object' ) props[k] = [props[k]];
        props[k].forEach(value => {
          table.push(PROPERTIES[k]);
          data.push(stringProperty(value, k, errors));
        });
        break;
      case 'cyclesPerFrame':
        table.push(PROPERTIES.cyclesPerFrame);
        data.push(integerProperty(props[k], 3, errors));
        break;
      case 'releaseDate':
        table.push(PROPERTIES.releaseDate);
        if ( typeof props[k] == 'object' ) props[k] = +props[k]/1000;
        data.push(integerProperty(props[k], 4, errors));
        break;
      case 'image':
        table.push(PROPERTIES.image);
        if ( props[k].hasOwnProperty('width') && props[k].hasOwnProperty('height') && props[k].hasOwnProperty('planes') ) {
          data.push([
            ...integerProperty(props[k].planes, 1, errors),
            ...integerProperty(props[k].width, 1, errors),
            ...integerProperty(props[k].height, 1, errors),
            ...props[k].data
          ]);
        } else {
          data.push(props[k]);
        }
        break;
    }
  });

  // Set addresses in the properties table
  let offset = MAGIC_NUMBER.length + 1 + 2 + table.length * 3 + 1;
  table = table.map((prop, i) => {
    const entry = [prop, offset >> 8 & 0xFF, offset & 0xFF];
    offset += data[i].length;
    return entry;
  });
  table.push(PROPERTIES.termination);

  return join(table.flat(), data.flat());
}

// Encode a string into its binary form. If it can't be encoded, add errors.
function stringProperty(str, prop, errors) {
  if ( !assert(typeof str == 'string', `Value should be a string: ${str}`, errors) ) return [];
  if ( !assert(str.length <= 255, `Length of ${prop} should be at most 255 characters`, errors) ) return [];

  const stringBytes = str.split('').map(c => c.charCodeAt(0) & 0xFF);
  stringBytes.unshift(stringBytes.length);
  return stringBytes;
}

// Encode an integer into its binary form. If it can't be encoded, add errors.
function integerProperty(value, bytes, errors) {
  if ( !assert(typeof value == 'number', `Value should be a number: ${value}`, errors) ) return [];
  return intToBytes(value, bytes);
}

// Take a string and encode it into an array representing the ascii values of
// the string.
function strToBytes(str) {
  return str.split('').map(c => c.charCodeAt(0) & 0xFF);
}

// Take an array of ascii values and convert back to a string
function bytesToStr(bytes) {
  return String.fromCharCode(...bytes);
}

// Take an integer value and convert it to `bytes` number of bytes
function intToBytes(value, bytes) {
  const result = [];
  for ( let i = bytes - 1; i >= 0; i-- ) {
    result.push(value >> (i*8) & 0xFF);
  }
  return result;
}

// Take an array of bytes and convert it into an integer
function bytesToInt(bytes) {
  return bytes.reduce((a, v, i) => v << 8*(bytes.length-1-i) | a, 0);
}

// Return the concatenation of all parameters as a Uint8Array, also works when
// using Uint8Arrays as inputs.
function join(...arrays) {
  arrays = arrays.map(arr => typeof arr == 'number' ? [arr] : arr).filter(arr => arr);
  const length = arrays.map(arr => arr.length).reduce((l, a) => l + a, 0);
  const merged = new Uint8Array(length);
  let offset = 0;
  arrays.forEach(arr => {
    merged.set(arr, offset);
    offset += arr.length;
  });
  return merged;
}

// Check to see if `item` is in `list`, either as numeric value or as textual
// value. If so, return its numeric value. Otherwise, add an error.
function map(list, item, errors) {
  if ( Object.values(list).includes(item) ) return item;
  if ( Object.keys(list).includes(item) ) return list[item];
  if ( Object.values(list).includes(+item) ) return +item;
  if ( Object.keys(list).includes(+item) ) return list[+item];
  errors.push(`Mapping error: item ${item} is not a valid value`);
}

// Check that an assertion holds. Otherwise add message to errors array, or if
// no errors array is present, throw the message.
function assert(assertion, message, errors) {
  if ( assertion ) return true;
  if ( !errors ) throw message;
  errors.push(message);
  return false;
}

/**
 * Static values and lookup tables
 **/

MAGIC_NUMBER = strToBytes('CBF');

PLATFORMS = {
  'CHIP-8':                                                           0x00,
  'CHIP-8 1/2':                                                       0x01,
  'CHIP-8I':                                                          0x02,
  'CHIP-8 II aka. Keyboard Kontrol':                                  0x03,
  'CHIP-8III':                                                        0x04,
  'Two-page display for CHIP-8':                                      0x05,
  'CHIP-8C':                                                          0x06,
  'CHIP-10':                                                          0x07,
  'CHIP-8 modification for saving and restoring variables':           0x08,
  'Improved CHIP-8 modification for saving and restoring variables':  0x09,
  'CHIP-8 modification with relative branching':                      0x0A,
  'Another CHIP-8 modification with relative branching':              0x0B,
  'CHIP-8 modification with fast, single-dot DXYN':                   0x0C,
  'CHIP-8 with I/O port driver routine':                              0x0D,
  'CHIP-8 8-bit multiply and divide':                                 0x0E,
  'HI-RES CHIP-8 (four-page display)':                                0x0F,
  'HI-RES CHIP-8 with I/O':                                           0x10,
  'HI-RES CHIP-8 with page switching':                                0x11,
  'CHIP-8E':                                                          0x12,
  'CHIP-8 with improved BNNN':                                        0x13,
  'CHIP-8 scrolling routine':                                         0x14,
  'CHIP-8X':                                                          0x15,
  'Two-page display for CHIP-8X':                                     0x16,
  'Hi-res CHIP-8X':                                                   0x17,
  'CHIP-8Y':                                                          0x18,
  'CHIP-8 “Copy to Screen”':                                          0x19,
  'CHIP-BETA':                                                        0x1A,
  'CHIP-8M':                                                          0x1B,
  'Multiple Nim interpreter':                                         0x1C,
  'Double Array Modification':                                        0x1D,
  'CHIP-8 for DREAM 6800 (CHIPOS)':                                   0x1E,
  'CHIP-8 with logical operators for DREAM 6800 (CHIPOSLO)':          0x1F,
  'CHIP-8 for DREAM 6800 with joystick':                              0x20,
  '2K CHIPOS for DREAM 6800':                                         0x21,
  'CHIP-8 for ETI-660':                                               0x22,
  'CHIP-8 with color support for ETI-660':                            0x23,
  'CHIP-8 for ETI-660 with high resolution':                          0x24,
  'CHIP-8 for COSMAC ELF':                                            0x25,
  'CHIP-VDU / CHIP-8 for the ACE VDU':                                0x26,
  'CHIP-8 AE (ACE Extended)':                                         0x27,
  'Dreamcards Extended CHIP-8 V2.0':                                  0x28,
  'Amiga CHIP-8 interpreter':                                         0x29,
  'CHIP-48':                                                          0x2A,
  'SUPER-CHIP 1.0':                                                   0x2B,
  'SUPER-CHIP 1.1':                                                   0x2C,
  'GCHIP':                                                            0x2D,
  'SCHIP Compatibility (SCHPC) and GCHIP Compatibility (GCHPC)':      0x2E,
  'VIP2K CHIP-8':                                                     0x2F,
  'SUPER-CHIP with scroll up':                                        0x30,
  'chip8run':                                                         0x31,
  'Mega-Chip':                                                        0x32,
  'XO-CHIP':                                                          0x33,
  'Octo':                                                             0x34,
  'CHIP-8 Classic / Color':                                           0x35,
};

PROPERTIES = {
  'termination':        0x00,
  'cyclesPerFrame':     0x01,
  'name':               0x02,
  'description':        0x03,
  'author':             0x04,
  'authors':            0x04,
  'url':                0x05,
  'urls':               0x05,
  'releaseDate':        0x06,
  'image':              0x07,

  'keys':               0x08,
  'colours':            0x09,
  'compatibleWith':     0x0A,
  'screenOrientation':  0x0B,
  'fontData':           0x0C,
};

module.exports = {
  pack,
  unpack,
  PLATFORMS,
  PROPERTIES
};
