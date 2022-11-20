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
   * Be simple enough for old/embedded/offline systems to load and parse
   * Keep the total file size minimal

## Super quick high-level intro to the CBF file structure

A CBF file basically consists of a four byte header followed by an arbitrary
number of segments. Each segment has a one-byte type and a 32-bit size, followed
by the contents of the segment. The structure of those contents is defined by
the segment type.

Or to be more specific:

  * A four byte file header, consisting of:
    * Bytes 0-2: [A magic number](#bytes-0-2-magic-number) to indicate that the file is in
      fact a CBF file
    * Byte 3: [The file format version](#byte-3-cbf-format-version)
  * Several [data segments](#data-segment), consisting of:
    * Byte 0: The segment type
    * Bytes 1-4: The size of the segment contents
    * Bytes 5-(size+5): The segment contents

To parse CHIP-8 binary format in your interpreter, you first compare the four
byte header, which tells you if the file is compatible with your parser. Then
you loop over all the segments until you reach the end of the file. You only
have to bother with segments whose types your parser actually supports.

This is the absolute minimum content that a file with an actual program in it
can have:

```python
## Define ASCII output for strings and set constants

:stringmode ascii "CBFHIP-8" { :byte CHAR }

:const VERSION 0
:const SEGMENT_TYPE_BYTECODE 0
:const SEGMENT_TYPE_PLATFORM 1

## Header

ascii "CBF"           # "Magic number"
VERSION               # CBF file version number

## Data segment one

SEGMENT_TYPE_PLATFORM # Start of new segment, defining a compatible platform
0x00 0x00 0x00 0x06   # Segment size (32 bits)

ascii "CHIP-8"        # Platform identifier for CHIP-8 support

## Data segment two

SEGMENT_TYPE_BYTECODE # Start of new segment, defining a bytecode binary
0x00 0x00 0x00 0x10   # Segment size (32 bits)

0xe0 0x00 0x0a 0x60   # CHIP-8 bytecode data (contents of the old '.ch8' files)
0x0a 0xa2 0x06 0xd0
0x08 0x12 0x80 0x82
0x8a 0xf2 0x8a 0x8a
```

You can use the platform type segments to see if your interpreter supports the
requested platform type. If so, you can load the following bytecode segment and
start execution. Note that there may be multiple bytecodes in a file and the one
or more platform type segments before the bytecode apply.

There can be a ton of other segment types in a file that you can add support for
at any time, if you have a need for them. But it's also perfectly safe and
perfectly valid to just ignore those.

# Detailed specifications

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

If you encounter an unsupported version number, you are supposed to abort
parsing the file and inform the user that the version of the supplied CBF file
can't be parsed.

## Segments

TODO: short intro

There does not have to be any particular order in which these data structures
are laid out in memory, nor any padding or alignment. We have the segment sizes,
so we can just loop over them all.

Note however that all segments apply to the next bytecode segment, unless
something with the most significant bit..?

### Byte 0: Segment type

This byte defines what kind of data is in this segment, and thus how that data
should be interpreted. The segment type can have one of the following values:

* `0x00` - Next bytecode
* `0x00` - Next program
* `0x00` - [Bytecode](#0x00-bytecode)
* `0x01` - [Supported platform](#0x01-supported-platform) (may occur more than once)
* `0x02` - [Desired execution speed](#0x02-desired-execution-speed)
* `0x03` - [Program name](#0x03-program-name)
* `0x04` - [Description](#0x04-program-description)
* `0x05` - [Author](#0x05-program-author) (may occur more than once)
* `0x06` - [URL](#0x06-program-url) (may occur more than once)
* `0x07` - [Release date](#0x07-program-release-date)
* `0x08` - [License information](#0x08-license-information)
* `0x09` - [Cover art](#0x09-cover-art)
* `0x0A` - [Key input configuration](#0x0a-key-input-configuration)
* `0x0B` - [Display colours](#0x0b-colour-configuration)
* `0x0C` - [Display orientation](#0x0c-screen-orientation)
* `0x0D` - [Font data](#0x0d-font-data)
* `0x0E` - [Tool vanity](#0x0e-tool-vanity)
* `0x0F - 0x7F` - Range reserved for future community standardisation
* `0x80 - 0xFF` - Range free for personal use of your interpreter specific needs

### Bytes 1-4: Segment size

These bytes form a 32-bit integer specifying the size of the rest of the segment
(so excluding this five byte segment header).

```python
0x00 0x01 0xC8 0x7B   # example size
```

### Bytes 5-N: Segment contents

We call the rest of the segment the segment contents, and those are defined in
the next section.

## Segment contents definitions

### `0x00` - Bytecode

Bytecode segments in the file are simply that: the raw, unmodified, uncompressed
bytecode that a variant of a CHIP-8 interpreter can run. These segments are
basically the contents of the old `.ch8` files.

### `0x01` - Supported platform

The contents of this segment are to be interpreted as an ASCII string. The value
of which can be one from the following list:

* `CHIP-8`
* `CHIP-10`
* `CHIP-48`
* `SUPER-CHIP 1.0`
* `SUPER-CHIP 1.1`
* `MEGACHIP`
* `XO-CHIP`

This list is in semi-chronological order, the differences between the platforms
are [documented here](https://chip-8.github.io/extensions). If you have ROMs for
a CHIP-8-like platform that is not in this list, please file an issue on this
repository.

If multiple platform segments are present, applying to a single bytecode
segment, then that bytecode is expected to run properly on all mentioned
platforms. So if a single platform is mentioned that your interpreter is able to
run, you should be able to run that bytecode.

For future-proofing: If you encounter a value that is not in this list, please
regard it as an unknown unsupported platform and not as a parse error.

### `0x02` Desired execution speed

The desired speed at which the interpreter runs the ROM, in "cycles per frame".

60Hz is considered "the right framerate", so a desired execution speed of 15
cycles per frame would be equal to 900 instructions per second, or a CPU clock
speed of 900Hz. A speed of zero cycles per frame indicates "unlimited speed",
and may be run as fast as possible.

The execution speed is defined in 32-bits.

#### Examples

```python
0x00 0x00 0x00 0x0F  # 15 cycles per frame (900Hz)
```

```python
0x00 0x03 0x0D 0x40  # 200.000 cycles per frame (12Mhz)
```

### `0x03` Program name

An ASCII string containing the name of the program.

#### Example

```python
0x53 0x70 0x61 0x63 0x65 0x20 0x49  # "Space Invaders"
0x6e 0x76 0x61 0x64 0x65 0x72 0x73
```

### `0x04` Program description

An ASCII text containing a description of the program. The text is formatted as
[Markdown](https://www.markdownguide.org/basic-syntax/), and may be presented as
either formatted Markdown or plain text to the user. Embedded HTML in the
Markdown is not supported and should not be parsed as HTML.

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
```

### `0x05` Program author

An ASCII string containing the name of the author of the program. Note that this
segment type may occur more than once.

#### Example

```python
0x4a 0x6f 0x73 0x65 0x70 0x68 0x20  # "Joseph Weisbecker"
0x57 0x65 0x69 0x73 0x62 0x65 0x63
0x6b 0x65 0x72
```

### `0x06` Program URL

An ASCII string containing a URL, linking to more information about the program.
Note that this segment type may occur more than once.

#### Example

```python
0x68 0x74 0x74 0x70 0x3a 0x2f 0x2f  # "http://www.google.com"
0x77 0x77 0x77 0x2e 0x67 0x6f 0x6f
0x67 0x6c 0x65 0x2e 0x63 0x6f 0x6d
```

### `0x07` Program release date

TODO: redo this

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

### `0x08` - License information

An ASCII string describing the copyright license that applies to this program.
Preferably an [SPDX license expression](https://spdx.org/licenses/), but free
form text is also allowed.

#### Example

```python
0x4c 0x47 0x50 0x4c 0x2d 0x32 0x2e  # "LGPL-2.1-only OR MIT"
0x31 0x2d 0x6f 0x6e 0x6c 0x79 0x20
0x4f 0x52 0x20 0x4d 0x49 0x54
```

### `0x09` Cover art

TODO: reconsider this

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

### `0x0A` Key input configuration

A data structure to specify which keys the ROM uses, and how they map to the
hexadecimal CHIP-8 keypad.

The structure is a list of items. Each entry is two bytes long, where the first
byte indicates a key on the host system and the second byte the CHIP-8 key that
it maps onto.

These are valid values for the first byte:

* `0x00` - Up
* `0x01` - Down
* `0x02` - Left
* `0x03` - Right
* `0x04` - A
* `0x05` - B
* `0x06` - X
* `0x07` - Y

The values may be used in any order and can be used multiple times to have the
given button trigger multiple CHIP-8 keys.

Some platforms support two hexadecimal keypads, in which case the most
significant nibble of the second byte can be used instead of the least
significant nibble to indicate that the key maps to the second keypad.

Some platforms support an actual full size keyboard or other inputs with keys.
This use has not been specified yet.

#### Example

```python
0x00 0x05  # Press 5 for up
0x01 0x08  # Press 8 for down
0x02 0x07  # Press 7 for left
0x03 0x09  # Press 9 for right
0x04 0x06  # Press 6 for A
```

### `0x0B` Display colours

The colours to be used by the interpreter. Especially useful for XO-CHIP ROMs.

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
0x15 0x64 0x11  # Dark green for the value 0
0x9a 0xf6 0x95  # Light green for the value 1
```

```python
# For an XO-CHIP program that uses four colours in two planes, with the
# 'default' Octo colour scheme:
0x99 0x66 0x00  # 'Background' colour for 0 in plane 0 and 0 in plane 1   (00)
0xFF 0x66 0x00  # 'Foreground 2' colour for 0 in plane 0 and 1 in plane 1 (01)
0xFF 0xCC 0x00  # 'Foreground 1' colour for 1 in plane 0 and 0 in plane 1 (10)
0x66 0x22 0x00  # 'Blended' colour for 1 in plane 0 and 1 in plane 1      (11)
```

### `0x0C` Display orientation

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

### `0x0D` Font data

TODO: Maybe leave this out for now

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

### `0x0E` Tool vanity

An ASCII string where tooling can leave a vanity text. Please don't pollute the
other fields with nonsense 😄

#### Example

```python
0x46 0x69 0x6c 0x65 0x20 0x63 0x72  # "File created by AwesomeChip2000"
0x65 0x61 0x74 0x65 0x64 0x20 0x62
0x79 0x20 0x41 0x77 0x65 0x73 0x6f
0x6d 0x65 0x43 0x68 0x69 0x70 0x32
0x30 0x30 0x30
```
