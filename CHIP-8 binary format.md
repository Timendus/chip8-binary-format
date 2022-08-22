# CHIP-8 binary format

_A file format for CHIP-8 programs that can hold multiple ROMs, interpreter
settings and other meta-data._

**Be warned: This spec may undergo changes while it is at version zero. Feel
free to implement it, but don't be surprised when things change until we
release the first official format: version one.**

Over the years there have been countless extensions to CHIP-8; adding colour,
input devices, more advanced sound capabilities or just errors in the
interpretation. This has introduced the challenge that an interpreter needs to
know more about a ROM than just its bytecode to be able to run it.

However, over the years we have continued to use the exact same plain binary
files that only hold the bytecode, and supplied the interpreter with meta-data
about the ROM manually or in some interpreter-specific form of secondary file.
This has confused many newcomers to the scene, who often rightfully expect that
just any `.ch8` file should conform to the original CHIP-8 spec.

To solve this issue, we have specified this CHIP-8 binary format. It is a file
format that can contain both the bytecode and the meta-data that an interpreter
needs to be able to run the ROM.

Additionally, we have chosen to allow this file format to hold information about
the ROM that an interpreter or archiving service can use to present the ROM to
its users. We have done this because many CHIP-8 games are not really
self-explanatory, requiring some specific instructions for the user, and because
these games have decades of history to preserve. For example, it's often very
hard to even find out who the author of a game was. We think this is a shame,
and have sought to solve it by binding the information to the bytecode.

We have chosen the file extension `.c8b` (short for CHIP-8 binary) for this
format.

## Design considerations

1. Be simple to parse for interpreter developers
   * Have a simple structure where much is optional (so you can 'opt in as you
     go')
   * Be easy to distinguish from regular `.ch8` files (different extension, easy
     to recognise header)
2. Be easy to use and useful for ROM developers / archivers
   * Allow to share (historical) information about the program and the author
   * Allow to specify the developer's preferences (compatible platforms, colour
     schemes, key input schemes)
3. "Fit" with the whole '70s vibe
   * Be simple enough for old/embedded systems to load and parse
   * Hold just enough information in relatively few bytes

## General structure

  * A six byte file header, consisting of:
    * Bytes 0-2: [A magic number](#bytes-0-2-magic-number) to indicate that the file is in
      fact a CBF file
    * Byte 3: [The file format version](#byte-3-cbf-format-version)
    * Byte 4: [A pointer to the bytecode table](#byte-4-pointer-to-bytecode-table)
    * Byte 5: [A pointer to the properties table](#byte-5-pointer-to-properties-table)
  * The variable size [table segment](#table-segment), holding the bytecode
    table and properties table
  * The variable size [data segment](#data-segment), that holds the properties
    (if any are present) and the bytecode (the actual CHIP-8 binary)

This is the absolute minimum content that a file can have:

```python
## Header

# Magic number
0x43 0x42 0x46
# Version number
0x00

# Pointer to bytecode table
0x06
# Pointer to properties table
0x00 # Zero means none present

## Tables

# Bytecode table with a single entry
0x01   0x00 0x0C   0x00 0x10   # CHIP-8 bytecode from 0x000C for 16 bytes
0x00   # End of bytecode table

## Data segment

# CHIP-8 bytecode data starting from here, at offset 0x000C
0xe0 0x00 0x0a 0x60 0x0a 0xa2 0x06 0xd0
0x08 0x12 0x80 0x82 0x8a 0xf2 0x8a 0x8a
```

As you can see, implementing CHIP-8 binary format in your interpreter is quite
simple. You parse the six byte header, which tells you if you can parse the file
and where to look for the bytecode table. Then you check out the bytecode table
to see if there is a bytecode in there for a platform that your interpreter
supports. Everything else is totally optional to implement. But there can be a
ton of things in the properties table that you can add support for at any time
if you have a need for them.

When using CHIP-8 binary format to pack your CHIP-8 ROMs, likewise you only need
to add this minimal structure to your file, specifying the target platform your
ROM was intended for. If you want, you can add more information to the file as
you see fit. The easiest way to convert your ROM to CBF it through the [web
based file converter](https://timendus.github.io/chip8-binary-format/) (which is
under construction as much as this spec 🙂).

## Header

### Bytes 0-2: Magic number

To easily recognize that this is a CHIP-8 binary format file, the file starts
with the characters 'CBF' in ASCII:

```python
0x43 0x42 0x46
```

### Byte 3: CBF format version

To allow future redesigns of this file format, the next byte contains an integer
specifying the version of the format used to store this file. It is currently at
version `0`, which is the "pre-release" version that may change at any time. We
will bind a fixed specification to a version starting from version 1.

```python
0x00
```

If you encounter an unsupported version number, you should treat it as an
unsupported file. The easiest way to do that is to combine it with the magic
number above, and check if the file starts with these bytes before proceeding to
parse it:

```python
0x43 0x42 0x46 0x00
```

### Byte 4: Pointer to bytecode table

The fifth byte is the offset from the start of the file to where the bytecode
table starts. If the value is zero, it should be interpreted as "this table
isn't present in the file".

### Byte 5: Pointer to properties table

The sixth byte is the offset from the start of the file to where the properties
table starts. If the value is zero, it should be interpreted as "this table
isn't present in the file".

## Table segment

The segment immediately after the header contains two fairly similar tables with
entries that point to other places in the file. These tables basically define
for the reader what else is in the file.

The table segment needs to come after the header, because the pointers to the
tables are only a single byte. The tables may be stored in the table segment in
any order, but it makes sense to put the longest one last because otherwise it
may not be possible to reference the smaller table by the single byte in the
header.

### Bytecode table

The bytecode table holds pointers to where the bytecode segments for particular
platforms are stored in the file, along with their sizes. Each entry in the
table represents one platform. Multiple entries may point to the same bytecode.

The bytecode table gives you a simple way to either reject a file as not
supported or configure your interpreter in the correct way to run the file. If
you find yourself in the luxury position that your interpreter can run several
different bytecodes that are found in the file, you can leave the choice of
which one to run up to the user.

An entry in the bytecode table is five bytes:

 * platform (1 byte, see list below)
 * offset from the start of the file (2 bytes)
 * size of the bytecode (2 bytes)

The table ends with a one byte item that is just the termination item.

Both the offset and the size are saved as big endian, just like CHIP-8 uses
itself. The offsets indicate the number of bytes from the start of the file.
Since these are 16-bit numbers, we can point to anything up to `0xFFFF` (65535)
bytes into the file, at an entry that can be a maximum of the same number of
bytes.

#### Example of a bytecode table

```python
# We have one binary for the original CHIP-8 interpreter
0x01   0x00 0x1D   0x0C 0x7A   # CHIP-8 bytecode from 0x001D for 0x0C7A (3194) bytes
# We have a version that's compatible with both versions of SCHIP
0x2C   0x0C 0x97   0x0D 0xE2   # SCHIP v1.0 bytecode from 0x0C97 for 0x0DE2 (3554) bytes
0x2D   0x0C 0x97   0x0D 0xE2   # SCHIP v1.1 bytecode from 0x0C97 for 0x0DE2 (3554) bytes
# And another version of the binary that makes use of XO-CHIP features
0x34   0x1A 0x79   0x62 0xB8   # XO-CHIP bytecode from 0x1A79 for 0x62B8 (25272) bytes
# End of bytecode table
0x00
```

#### Platforms

This list is in semi-chronological order, the differences between the platforms
are [documented here](https://chip-8.github.io/extensions). The most common ones
are highlighted in **bold**.

* `0x00` - Termination item, end of bytecode table
* `0x01` - **CHIP-8**
* `0x02` - CHIP-8 1/2
* `0x03` - CHIP-8I
* `0x04` - CHIP-8 II aka. Keyboard Kontrol
* `0x05` - CHIP-8III
* `0x06` - Two-page display for CHIP-8
* `0x07` - CHIP-8C
* `0x08` - CHIP-10
* `0x09` - CHIP-8 modification for saving and restoring variables
* `0x0A` - Improved CHIP-8 modification for saving and restoring variables
* `0x0B` - CHIP-8 modification with relative branching
* `0x0C` - Another CHIP-8 modification with relative branching
* `0x0D` - CHIP-8 modification with fast, single-dot DXYN
* `0x0E` - CHIP-8 with I/O port driver routine
* `0x0F` - CHIP-8 8-bit multiply and divide
* `0x10` - HI-RES CHIP-8 (four-page display)
* `0x11` - HI-RES CHIP-8 with I/O
* `0x12` - HI-RES CHIP-8 with page switching
* `0x13` - CHIP-8E
* `0x14` - CHIP-8 with improved BNNN
* `0x15` - CHIP-8 scrolling routine
* `0x16` - CHIP-8X
* `0x17` - Two-page display for CHIP-8X
* `0x18` - Hi-res CHIP-8X
* `0x19` - CHIP-8Y
* `0x1A` - CHIP-8 “Copy to Screen”
* `0x1B` - CHIP-BETA
* `0x1C` - CHIP-8M
* `0x1D` - Multiple Nim interpreter
* `0x1E` - Double Array Modification
* `0x1F` - CHIP-8 for DREAM 6800 (CHIPOS)
* `0x20` - CHIP-8 with logical operators for DREAM 6800 (CHIPOSLO)
* `0x21` - CHIP-8 for DREAM 6800 with joystick
* `0x22` - 2K CHIPOS for DREAM 6800
* `0x23` - CHIP-8 for ETI-660
* `0x24` - CHIP-8 with color support for ETI-660
* `0x25` - CHIP-8 for ETI-660 with high resolution
* `0x26` - CHIP-8 for COSMAC ELF
* `0x27` - CHIP-VDU / CHIP-8 for the ACE VDU
* `0x28` - CHIP-8 AE (ACE Extended)
* `0x29` - Dreamcards Extended CHIP-8 V2.0
* `0x2A` - Amiga CHIP-8 interpreter
* `0x2B` - CHIP-48
* `0x2C` - **SUPER-CHIP 1.0**
* `0x2D` - **SUPER-CHIP 1.1**
* `0x2E` - GCHIP
* `0x2F` - SCHIP Compatibility (SCHPC) and GCHIP Compatibility (GCHPC)
* `0x30` - VIP2K CHIP-8
* `0x31` - SUPER-CHIP with scroll up
* `0x32` - chip8run
* `0x33` - Mega-Chip
* `0x34` - **XO-CHIP**
* `0x35` - Octo
* `0x36` - CHIP-8 Classic / Color
* `0x37 - 0xEF` - Range reserved for future community standardisation
* `0xF0 - 0xFF` - Range free for personal use in your own interpreter

### Properties table

The properties table contains pointers to properties of the file. It can contain
one of each of the types of properties in the list below. Some property types
may occur more than once.

Every item in the properties table (except the termination item) is three bytes
long. The first byte of an item indicates the type, the next two bytes are a
pointer to the place in the data segment where the information can be found. The
pointers are big endian numbers indicating the distance from the start of the
file.

#### Example of a properties table

```python
# Properties table
0x02  0x00 0x36   # Program name can be found at offset 0x0036
0x04  0x00 0x45   # Author name can be found at offset 0x0045
0x0E  0x00 0x53   # License information can be found at offset 0x0053
0x00              # End of properties table
```

#### Property types

* `0x00` - Termination item, end of properties table
* `0x01` - Pointer to [desired execution speed](#0x01-desired-execution-speed)
* `0x02` - Pointer to [program name](#0x02-program-name)
* `0x03` - Pointer to [program description](#0x03-program-description)
* `0x04` - Pointer to [program author](#0x04-program-author) (may occur more
  than once)
* `0x05` - Pointer to [program URL](#0x05-program-url) (may occur more than
   once)
* `0x06` - Pointer to [program release date](#0x06-program-release-date)
* `0x07` - Pointer to [cover art](#0x07-cover-art)
* `0x08` - Pointer to [key input configuration](#0x08-key-input-configuration)
* `0x09` - Pointer to [colour configuration](#0x09-colour-configuration)
* `0x0B` - Pointer to [screen orientation](#0x0a-screen-orientation)
* `0x0C` - Pointer to [font data](#0x0b-font-data)
* `0x0D` - Pointer to [tool vanity](#0x0c-tool-vanity)
* `0x0E` - Pointer to [license information](#0x0d-license-information)
* `0x0F - 0x7F` - Range reserved for future community standardisation
* `0x80 - 0xFF` - Range free for personal use of your interpreter specific needs

## Data segment

After the table segment, the data segment starts, where the data resides for
each of the properties present in the properties table and all the bytecode in
the bytecode table.

There does not have to be any particular order in which these data structures
are laid out in memory, nor any padding or alignment, since the tables give us
direct pointers to the start of each data structure. However, when creating the
file, it makes sense to sort the segments by size, so the largest segment ends
up at the end. If there is more data to store than can be addressed in 16 bits,
this will increase the chance that all of that data can still be stored in one
CHIP-8 binary file.

### Bytecode

Bytecode segments in the file are simply that: the raw, unmodified, uncompressed
bytecode that a variant of a CHIP-8 interpreter can run. These segments are
basically the contents of the old `.ch8` files.

### `0x01` Desired execution speed

The desired speed at which the interpreter runs the ROM, in "cycles per frame".

60Hz is considered "the right framerate", so a desired execution speed of 15
cycles per frame would be equal to 900 instructions per second, or a CPU clock
speed of 900Hz. A speed of zero cycles per frame indicates "unlimited speed",
and may be run as fast as possible.

The execution speed is defined in three bytes, big endian.

#### Examples

```python
0x00 0x00 0x0F  # 15 cycles per frame (900Hz)
```

```python
0x03 0x0D 0x40  # 200.000 cycles per frame (12Mhz)
```

### `0x02` Program name

An ASCII string containing the name of the program, terminated by a zero.

#### Example

```python
0x53 0x70 0x61 0x63 0x65 0x20 0x49  # "Space Invaders"
0x6e 0x76 0x61 0x64 0x65 0x72 0x73
0x00                                # End of string
```

### `0x03` Program description

An ASCII text containing a description of the program, terminated by a zero. The
text is formatted as [Markdown](https://www.markdownguide.org/basic-syntax/),
and may be presented as either formatted Markdown or plain text to the user.
Embedded HTML in the Markdown is not supported and should not be parsed as HTML.

#### Example

```python
0x23 0x20 0x50 0x6f 0x6e 0x67 0x21 0x0a 0x0a  # "# Pong!
0x41 0x20 0x67 0x61 0x6d 0x65 0x20 0x66 0x6f  #
0x72 0x20 0x74 0x77 0x6f 0x2c 0x20 0x65 0x61  #  A game for two, each controlling a paddle. Features:
0x63 0x68 0x20 0x63 0x6f 0x6e 0x74 0x72 0x6f  #   * A Real Time bouncing ball
0x6c 0x6c 0x69 0x6e 0x67 0x20 0x61 0x20 0x70  #   * Score keeping"
0x61 0x64 0x64 0x6c 0x65 0x2e 0x20 0x46 0x65
0x61 0x74 0x75 0x72 0x65 0x73 0x3a 0x0a 0x20
0x2a 0x20 0x41 0x20 0x52 0x65 0x61 0x6c 0x20
0x54 0x69 0x6d 0x65 0x20 0x62 0x6f 0x75 0x6e
0x63 0x69 0x6e 0x67 0x20 0x62 0x61 0x6c 0x6c
0x0a 0x20 0x2a 0x20 0x53 0x63 0x6f 0x72 0x65
0x20 0x6b 0x65 0x65 0x70 0x69 0x6e 0x67
0x00                                          # End of string
```

### `0x04` Program author

An ASCII string containing the name of the author of the program, terminated by
a zero. Note that this type may occur more than once in the properties table, in
which case multiple of these structures can be present in the data segment.

#### Example

```python
0x4a 0x6f 0x73 0x65 0x70 0x68 0x20  # "Joseph Weisbecker"
0x57 0x65 0x69 0x73 0x62 0x65 0x63
0x6b 0x65 0x72
0x00                                # End of string
```

### `0x05` Program URL

An ASCII string containing a URL, linking to more information about the program,
terminated by a zero. Note that this type may occur more than once in the
properties table, in which case multiple of these structures can be present in
the data segment.

#### Example

```python
0x68 0x74 0x74 0x70 0x3a 0x2f 0x2f  # "http://www.google.com"
0x77 0x77 0x77 0x2e 0x67 0x6f 0x6f
0x67 0x6c 0x65 0x2e 0x63 0x6f 0x6d
0x00                                # End of string
```

### `0x06` Program release date

Four bytes representing a time and date in seconds since the Unix Epoch
(midnight on 1 Januari 1970).

If the time is midnight, the timestamp is considered to be referencing a date,
instead of a date and a time. If the day is the first of the month, the
timestamp is considered to be referencing a month. If the day is Januari 1st,
the timestamp is considered to be referencing a year.

#### Example

```python
0x62 0xC0 0xB2 0xC0   # 2 July 2022, 23:04:00
```

### `0x07` Cover art

A title image or other cover art of this program, that can be shown in a loading
screen or in a ROM gallery.

If a [colour configuration](#0x09-colour-configuration) has also been specified,
that is applied to the image.

In theory, a maximum resolution of 2040x255 pixels can be specified, in 1 to 255
planes. However, since the image data is an uncompressed bitmap and the maximum
header size is 65534, you can either have the maximum resolution or multiple
planes. For each additional plane, the maximum resolution goes down.

However, keep a '70s machine in mind when making these images. A reasonable
guideline is to have images at either 64x32 or 128x64 pixels. It's a good
practice to choose the same resolution as the ROM uses.

#### Example

```python
0x01  # Number of planes
0x02  # Width (in bytes)
0x10  # Height (in pixels)
0x80 0x00 0x80 0x50 0x80 0x50 0xE2 0x52  # planes x width x height bytes,
0x95 0x55 0x96 0x55 0x93 0x52 0x00 0x00  # containing the cover art image
0xFF 0xFF 0x00 0x00 0x3B 0x9E 0x42 0x50
0x43 0x9C 0x42 0x50 0x42 0x50 0x3B 0x90
```

### `0x08` Key input configuration

A data structure to specify which keys the ROM uses, and how they map to the
hexadecimal CHIP-8 keypad.

The structure is a list of items, preceded by a length byte. Each entry is two
bytes long, where the first byte indicates a key on the host system and the
second byte the CHIP-8 key that it maps onto.

These are valid values for the first byte:

* `0x00` - Up
* `0x01` - Down
* `0x02` - Left
* `0x03` - Right
* `0x04` - A
* `0x05` - B

The values may be used in any order and can be used multiple times to have the
given button trigger multiple CHIP-8 keys.

Some platforms support two hexadecimal keypads, in which case the most
significant nibble of the second byte can be used instead of the least
significant nibble to indicate that the key maps to the second keypad. Some
platforms support an actual full size keyboard or other inputs with keys. This
use has not been specified yet.

#### Example

```python
0x05       # Five items in the list
0x00 0x05  # Press 5 for up
0x01 0x08  # Press 8 for down
0x02 0x07  # Press 7 for left
0x03 0x09  # Press 9 for right
0x04 0x06  # Press 6 for A
```

### `0x09` Colour configuration

The colours to be used by the interpreter, starting with a byte representing the
number of colours to load. Especially useful for XO-CHIP ROMs.

Each colour is represented by three bytes: one for red value, one for green
value and one for blue value. The number of colours correlates with the number
of "planes" used by the ROM.

The colours are ordered by their binary values. So for a single plane (regular
monochrome CHIP-8) we get the colour for a reset bit (0) before the colour for a
set bit (1). For multiple planes, we take the bits from each plane to represent
a number, and order by that. So for example with two planes, we get the colour
for no bits set on either plane first (00), then the colour for only a bit set
on the last plane (01), then the colour for only a bit set on the first plane
(10) and finally the colour for the bits on both planes being set (11).

#### Examples

```python
# For a regular monochrome program that prefers a green colour scheme:
0x02            # Read 2 colours
0x15 0x64 0x11  # Dark green for the value 0
0x9a 0xf6 0x95  # Light green for the value 1
```

```python
# For an XO-CHIP program that uses four colours in two planes, with the
# 'default' Octo colour scheme:
0x04            # Read 4 colours
0x99 0x66 0x00  # 'Background' colour for 0 in plane 0 and 0 in plane 1   (00)
0xFF 0x66 0x00  # 'Foreground 2' colour for 0 in plane 0 and 1 in plane 1 (01)
0xFF 0xCC 0x00  # 'Foreground 1' colour for 1 in plane 0 and 0 in plane 1 (10)
0x66 0x22 0x00  # 'Blended' colour for 1 in plane 0 and 1 in plane 1      (11)
```

### `0x0A` Screen orientation

A single byte indicating the desired orientation of the display. Some games are
written with the premise that the display is "put on its side", so they can make
use of portrait mode.

* `0x00` - Display is on its feet, top is up
* `0x01` - Display is put on its right side, left side is up
* `0x02` - Display is put on its left side, right side is up
* `0x03` - Display is upside down, bottom is up

#### Example

```python
0x01  # Display is put on its right side, left side is up
```

### `0x0B` Font data

Binary data that represents a font, starting with the address to load the font
to and a length byte.

Some games depend on a specific version of a font to be present in the CHIP-8
interpreter. With this data structure, the font can be supplied with the ROM.

#### Example

```python
0x00 0x00                           # The address in CHIP-8 RAM to load the font to
0x50                                # The size of the font data
0x90 0xf0 0x90 0x90 0x60 0xf0 0x20  # The font data to load
0x20 0x70 0x20 0x10 0xf0 ....
```

### `0x0C` Tool vanity

An ASCII string where tooling can leave a vanity text, terminated by a zero.
Please don't pollute the other fields with nonsense 😄

#### Example

```python
0x46 0x69 0x6c 0x65 0x20 0x63 0x72  # "File created by AwesomeChip2000"
0x65 0x61 0x74 0x65 0x64 0x20 0x62
0x79 0x20 0x41 0x77 0x65 0x73 0x6f
0x6d 0x65 0x43 0x68 0x69 0x70 0x32
0x30 0x30 0x30
0x00                                # End of string
```

### `0x0D` - License information

An ASCII string describing the copyright license that applies to this program,
terminated by a zero. Preferably an [SPDX license
expression](https://spdx.org/licenses/), but free form text is also allowed.

#### Example

```python
0x4c 0x47 0x50 0x4c 0x2d 0x32 0x2e  # "LGPL-2.1-only OR MIT"
0x31 0x2d 0x6f 0x6e 0x6c 0x79 0x20
0x4f 0x52 0x20 0x4d 0x49 0x54
0x00                                # End of string
```
