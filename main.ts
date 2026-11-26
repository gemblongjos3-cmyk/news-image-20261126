// make.fun · news-image-20261126 — entry image copier (v1)
//
// Reads entry.png (a JPEG despite the .png extension) sitting next to this
// script, checks that it is a well-formed JPEG — SOI (FF D8) at the start and
// EOI (FF D9) at the end — and writes the bytes, unchanged, into the output
// directory. The output directory is MAKEFUN_OUTPUT_DIR if set, otherwise
// /output. It is created if missing.
//
// Standard library only. Run directly: node main.ts

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOI = [0xff, 0xd8];
const EOI = [0xff, 0xd9];

function fail(message: string): never {
  process.stderr.write(`main.ts: error: ${message}\n`);
  process.exit(1);
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

  const startsWithSoi = bytes[0] === SOI[0] && bytes[1] === SOI[1];
  const endsWithEoi =
    bytes[bytes.length - 2] === EOI[0] && bytes[bytes.length - 1] === EOI[1];

  if (!startsWithSoi) {
    fail(
      `${sourcePath} does not start with a JPEG SOI marker (FF D8); ` +
        `got ${bytes.subarray(0, 2).toString("hex")}`
    );
  }
  if (!endsWithEoi) {
    fail(
      `${sourcePath} does not end with a JPEG EOI marker (FF D9); ` +
        `got ${bytes.subarray(-2).toString("hex")}`
    );
  }

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

  process.stdout.write(`wrote ${targetPath} (${bytes.length} bytes)\n`);
  process.exit(0);
}

main();
