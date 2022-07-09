# CHIP-8 binary format

_A file format for CHIP-8 ROMs that can hold interpreter settings and other
meta-data._

**This project is under development, and this spec is not yet finished. It will
probably undergo changes in the future.**

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

  * Variable size file header, consisting of:
    * Bytes 0-2: [A magic number](#bytes-0-2-magic-number) to indicate that the file is in
      fact a CBF file
    * Byte 3: [A platform indicator](#byte-3-platform), containing the primary
      platform the ROM is intended for
    * Bytes 4 and 5: A pointer to [the start of the bytecode
      segment](#bytes-4-5-pointer-to-bytecode-segment)
    * Byte 6 and on: [A table](#byte-6-and-on-properties-table) with pointers to optional
      properties
  * [Data segment](#data-segment) that holds the properties, if any are present
  * Bytecode segment that holds the actual CHIP-8 binary

This is the absolute minimum content that the header can have:

```python
# Magic header
0x43 0x42 0x46
# Target platform, here CHIP-8
0x00
# Pointer to bytecode segment
0x00 0x07
# Empty properties table
0x00

# CHIP-8 binary data starting from here...
0xe0 0x00 0x0a 0x60 0x0a 0xa2 0x06 0xd0
0x08 0x12 0x80 0x82 0x8a 0xf2 0x8a 0x8a
```

As you can see, to implement CHIP-8 binary format in your interpreter, you only
really need to parse the first six bytes. Everything else is totally optional to
implement. You can add support for items from the properties table at any time
if you have a need for them.

When using CHIP-8 binary format to pack your CHIP-8 ROMs, likewise you only need
to add this minimal header to your file, specifying the target platform your ROM
was intended for. If you want, you can add more information to the file as you
see fit.

## Header

### Bytes 0-2: Magic number

To easily recognize that this is a CHIP-8 binary format file, the file starts
with the characters 'CBF' in ASCII:

```
0x43 0x42 0x46
```

### Byte 3: Platform

The next byte of the header indicates the platform that the ROM targets: one of
the values from the list below.

The list is in semi-chronological order, the differences between the platforms
are [documented here](https://chip-8.github.io/extensions). The most common ones
are highlighted in **bold**.

* `0x00` - **CHIP-8**
* `0x01` - CHIP-8 1/2
* `0x02` - CHIP-8I
* `0x03` - CHIP-8 II aka. Keyboard Kontrol
* `0x04` - CHIP-8III
* `0x05` - Two-page display for CHIP-8
* `0x06` - CHIP-8C
* `0x07` - CHIP-10
* `0x08` - CHIP-8 modification for saving and restoring variables
* `0x09` - Improved CHIP-8 modification for saving and restoring variables
* `0x0A` - CHIP-8 modification with relative branching
* `0x0B` - Another CHIP-8 modification with relative branching
* `0x0C` - CHIP-8 modification with fast, single-dot DXYN
* `0x0D` - CHIP-8 with I/O port driver routine
* `0x0E` - CHIP-8 8-bit multiply and divide
* `0x0F` - HI-RES CHIP-8 (four-page display)
* `0x10` - HI-RES CHIP-8 with I/O
* `0x11` - HI-RES CHIP-8 with page switching
* `0x12` - CHIP-8E
* `0x13` - CHIP-8 with improved BNNN
* `0x14` - CHIP-8 scrolling routine
* `0x15` - CHIP-8X
* `0x16` - Two-page display for CHIP-8X
* `0x17` - Hi-res CHIP-8X
* `0x18` - CHIP-8Y
* `0x19` - CHIP-8 “Copy to Screen”
* `0x1A` - CHIP-BETA
* `0x1B` - CHIP-8M
* `0x1C` - Multiple Nim interpreter
* `0x1D` - Double Array Modification
* `0x1E` - CHIP-8 for DREAM 6800 (CHIPOS)
* `0x1F` - CHIP-8 with logical operators for DREAM 6800 (CHIPOSLO)
* `0x20` - CHIP-8 for DREAM 6800 with joystick
* `0x21` - 2K CHIPOS for DREAM 6800
* `0x22` - CHIP-8 for ETI-660
* `0x23` - CHIP-8 with color support for ETI-660
* `0x24` - CHIP-8 for ETI-660 with high resolution
* `0x25` - CHIP-8 for COSMAC ELF
* `0x26` - CHIP-VDU / CHIP-8 for the ACE VDU
* `0x27` - CHIP-8 AE (ACE Extended)
* `0x28` - Dreamcards Extended CHIP-8 V2.0
* `0x29` - Amiga CHIP-8 interpreter
* `0x2A` - CHIP-48
* `0x2B` - **SUPER-CHIP 1.0**
* `0x2C` - **SUPER-CHIP 1.1**
* `0x2D` - GCHIP
* `0x2E` - SCHIP Compatibility (SCHPC) and GCHIP Compatibility (GCHPC)
* `0x2F` - VIP2K CHIP-8
* `0x30` - SUPER-CHIP with scroll up
* `0x31` - chip8run
* `0x32` - Mega-Chip
* `0x33` - **XO-CHIP**
* `0x34` - Octo
* `0x35` - CHIP-8 Classic / Color

Obviously, your interpreter does not need to support all of these platforms. The
platform indicator byte gives you a simple way to either reject a file as not
supported or configure your interpreter in the correct way to run the file.

Note however, that you may want to check if the file contains a [compatibility
configuration](#0x0a-compatibility-configuration) before rejecting the file
entirely.

### Bytes 4-5: Pointer to bytecode segment

The next two bytes are the offset within the file to where the actual CHIP-8
bytecode starts, counted from the start of the file. Interpreters are expected
to load everything from this pointer to the end of the file into CHIP-8 memory,
generally at address 0x200 (depending on platform).

The offset is saved as big endian, just like CHIP-8 uses itself. Since this is a
two-byte number, the CBF header plus the property data segment can be no larger
than 65534 bytes.

### Byte 6 and on: Properties table

After the pointer to the bytecode segment, the properties table starts. It
contains **at least** the termination item, but can contain one of each of the
types of properties below. Some property types may occur more than once.

Every item in the properties table (except the termination item) is three bytes
long. The first byte of an item indicates the type, the next two bytes are a
pointer to the place in the data segment where the information can be found. The
pointers are big endian numbers indicating the distance from the start of the
file.

#### Example of a properties table

```python
# Properties table
0x02  0x00 0x10   # Program name can be found at offset 0x10
0x04  0x00 0x24   # Author name can be found at offset 0x24
0x0A  0x00 0x36   # Compatibility configuration can be found at offset 0x36
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
* `0x0A` - Pointer to [compatibility configuration](#0x0a-compatibility-configuration)
* `0x0B` - Pointer to [screen orientation](#0x0b-screen-orientation)
* `0x0C` - Pointer to [font data](#0x0c-font-data)
* `0x0D - 0x7F` - Range reserved for future community standardisation
* `0x80 - 0xFF` - Range free for personal use of your interpreter specific needs

## Data segment

After the header, the data segment starts, where the data resides for each of
the properties present in the properties table. There does not have to be any
particular order in which these data structures are laid out in memory, nor any
padding or alignment, since the properties table gives us direct pointers to the
start of each data structure.

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

An ASCII string containing the name of the program, starting with a length byte.

#### Example

```python
0x0E                                # Read 14 bytes
0x53 0x70 0x61 0x63 0x65 0x20 0x49  # "Space Invaders"
0x6e 0x76 0x61 0x64 0x65 0x72 0x73
```

### `0x03` Program description

An ASCII string containing a description of the program, starting with a length
byte.

#### Example

```python
0x29                                # Read 41 bytes
0x41 0x20 0x67 0x61 0x6d 0x65 0x20  # "A game for two, each controlling a paddle"
0x66 0x6f 0x72 0x20 0x74 0x77 0x6f
0x2c 0x20 0x65 0x61 0x63 0x68 0x20
0x63 0x6f 0x6e 0x74 0x72 0x6f 0x6c
0x6c 0x69 0x6e 0x67 0x20 0x61 0x20
0x70 0x61 0x64 0x64 0x6c 0x65
```

### `0x04` Program author

An ASCII string containing the name of the author of the program, starting with
a length byte. Note that this type may occur more than once in the properties
table, in which case multiple of these structures can be present in the data
segment.

#### Example

```python
0x11                                # Read 17 bytes
0x4a 0x6f 0x73 0x65 0x70 0x68 0x20  # "Joseph Weisbecker"
0x57 0x65 0x69 0x73 0x62 0x65 0x63
0x6b 0x65 0x72
```

### `0x05` Program URL

An ASCII string containing a URL, linking to more information about the program,
starting with a length byte. Note that this type may occur more than once in the
properties table, in which case multiple of these structures can be present in the
data segment.

#### Example

```python
0x15                                # Read 21 bytes
0x68 0x74 0x74 0x70 0x3a 0x2f 0x2f  # "http://www.google.com"
0x77 0x77 0x77 0x2e 0x67 0x6f 0x6f
0x67 0x6c 0x65 0x2e 0x63 0x6f 0x6d
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
significant nibble can be used to indicate that the key maps to the second
keypad. Some platforms support an actual full size keyboard or other inputs with
keys. This use has not been specified yet.

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

### `0x0A` Compatibility configuration

A list of platforms that this ROM is also compatible with, starting with a
length byte.

Often a program was written for one platform, for example SUPER-CHIP 1.1, but it
runs equally well on other platforms, for example CHIP-8 or XO-CHIP, because
care was taken by the developer to not use any of the platform specific quirks.
This compatibility list allows the developer to specify which other platforms
the ROM can also run on without issues.

If the interpreter does not implement the primary [platform](#byte-3-platform)
that the header indicates the ROM was developed for, the interpreter can check
this list for other ways to still run this ROM.

There is no need to repeat the primary platform in this list.

#### Example

```python
0x02  # Read two compatible platforms
0x00  # CHIP-8
0x33  # XO-CHIP
```

### `0x0B` Screen orientation

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

### `0x0C` Font data

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

### `0x0D` Tool vanity

TODO
