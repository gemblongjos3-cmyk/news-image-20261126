// make.fun · news-image-20261126 — entry image validator and copier (v2)
//
// Reads entry.png (a JPEG despite the .png extension) sitting next to this
// script, walks its marker segments to confirm the file is structurally a
// complete JPEG, reads the frame dimensions out of the SOF segment and requires
// exactly 1024x1024, then writes the bytes unchanged into the output directory.
// The output directory is MAKEFUN_OUTPUT_DIR if set, otherwise /output. It is
// created if missing.
//
// JPEG structure this relies on:
//   * The file starts with SOI (FF D8) and ends with EOI (FF D9).
//   * Segments are introduced by a marker: FF followed by a non-zero,
//     non-FF code byte. Any number of FF fill bytes may precede the code.
//   * Most segments carry a 2-byte big-endian length that includes those two
//     length bytes. RSTn (FF D0-D7), TEM (FF 01), SOI and EOI are standalone
//     and carry no length.
//   * SOS (FF DA) begins the entropy-coded scan data; after it the FF bytes are
//     byte-stuffing rather than markers, so the walk stops there.
//   * SOF0 (FF C0, baseline) and SOF2 (FF C2, progressive) hold, after the
//     length and a 1-byte precision, the frame height then width as 2-byte
//     big-endian values.
//
// Standard library only. Run directly: node main.ts

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOI = 0xffd8;
const EOI = 0xffd9;
const SOS = 0xffda;
const TEM = 0xff01;
const SOF0 = 0xffc0;
const SOF2 = 0xffc2;
const REQUIRED_SIZE = 1024;

/** Markers that stand alone, without a 2-byte length field. */
function isStandalone(marker: number): boolean {
  return (
    marker === TEM ||
    marker === SOI ||
    marker === EOI ||
    (marker >= 0xffd0 && marker <= 0xffd7) // RST0..RST7
  );
}

function fail(message: string): never {
  process.stderr.write(`main.ts: error: ${message}\n`);
  process.exit(1);
}

interface Frame {
  marker: number;
  width: number;
  height: number;
}

/**
 * Walk the marker segments between SOI and SOS. Returns the frame header found
 * along the way, or throws with a description of the structural problem.
 */
function walkMarkers(bytes: Buffer): Frame {
  const lastIndex = bytes.length - 1;
  let frame: Frame | undefined;
  let offset = 2; // just past SOI

  while (true) {
    // A marker must be introduced by FF, allowing FF fill bytes before the code.
    if (offset > lastIndex) {
      throw new Error("file ended before the SOS marker");
    }
    if (bytes[offset] !== 0xff) {
      throw new Error(
        `expected a marker at offset ${offset}, found byte 0x${bytes[offset]
          .toString(16)
          .padStart(2, "0")}`
      );
    }
    while (offset <= lastIndex && bytes[offset] === 0xff) {
      offset++;
    }
    if (offset > lastIndex) {
      throw new Error("file ended inside a marker prefix");
    }

    const code = bytes[offset];
    const marker = 0xff00 | code;
    offset++;

    if (marker === SOS) {
      return frame ?? fail("no SOF0 or SOF2 frame header before SOS");
    }

    if (isStandalone(marker)) {
      if (marker === EOI) {
        throw new Error("reached EOI before any SOS marker");
      }
      continue; // e.g. RSTn or TEM between segments: no payload to skip
    }

    if (offset + 2 > bytes.length) {
      throw new Error(
        `segment 0x${marker.toString(16)} at offset ${offset - 2} is truncated`
      );
    }
    const length = bytes.readUInt16BE(offset);
    if (length < 2) {
      throw new Error(
        `segment 0x${marker.toString(16)} at offset ${offset - 2} has invalid ` +
          `length ${length} (must be at least 2)`
      );
    }
    const segmentEnd = offset + length;
    if (segmentEnd > bytes.length) {
      throw new Error(
        `segment 0x${marker.toString(16)} at offset ${offset - 2} runs past the ` +
          `end of the file (${length} bytes declared, ${bytes.length - offset} left)`
      );
    }

    if ((marker === SOF0 || marker === SOF2) && frame === undefined) {
      // length(2) precision(1) height(2) width(2) => need 7 bytes minimum
      if (length < 7) {
        throw new Error(
          `SOF segment 0x${marker.toString(16)} at offset ${offset - 2} is too ` +
            `short (${length} bytes) to hold a frame header`
        );
      }
      frame = {
        marker,
        height: bytes.readUInt16BE(offset + 3),
        width: bytes.readUInt16BE(offset + 5),
      };
    }

    offset = segmentEnd;
  }
}

function main(): void {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const sourcePath = join(scriptDir, "entry.png");
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  const targetPath = join(outputDir, "entry.png");

  let bytes: Buffer;
  try {
    bytes = readFileSync(sourcePath);
  } catch (err) {
    fail(`cannot read ${sourcePath}: ${(err as Error).message}`);
  }

  if (bytes.length < 4) {
    fail(`${sourcePath} is too small to be a JPEG (${bytes.length} bytes)`);
  }

  const startMarker = bytes.readUInt16BE(0);
  if (startMarker !== SOI) {
    fail(
      `${sourcePath} does not start with a JPEG SOI marker (FF D8); ` +
        `got ${startMarker.toString(16)}`
    );
  }

  const endMarker = bytes.readUInt16BE(bytes.length - 2);
  if (endMarker !== EOI) {
    fail(
      `${sourcePath} does not end with a JPEG EOI marker (FF D9); ` +
        `got ${endMarker.toString(16)}`
    );
  }

  let frame: Frame;
  try {
    frame = walkMarkers(bytes);
  } catch (err) {
    fail(`${sourcePath} is not a well-formed JPEG: ${(err as Error).message}`);
  }

  if (frame.width !== REQUIRED_SIZE || frame.height !== REQUIRED_SIZE) {
    fail(
      `${sourcePath} is ${frame.width}x${frame.height}, ` +
        `expected ${REQUIRED_SIZE}x${REQUIRED_SIZE}`
    );
  }

  const digest = createHash("sha256").update(bytes).digest("hex");

  try {
    mkdirSync(outputDir, { recursive: true });
  } catch (err) {
    fail(`cannot create output directory ${outputDir}: ${(err as Error).message}`);
  }

  try {
    writeFileSync(targetPath, bytes);
  } catch (err) {
    fail(`cannot write ${targetPath}: ${(err as Error).message}`);
  }

  process.stdout.write(
    `entry.png: ${frame.width}x${frame.height} jpeg, ${bytes.length} bytes, ` +
      `sha256 ${digest}\n`
  );
  process.exit(0);
}

main();
