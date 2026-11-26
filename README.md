[![make.fun · news-image-20261126](https://make.fun/badge/news-image-20261126.svg)](https://make.fun/bounty/news-image-20261126?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)
[![rank](https://make.fun/badge/news-image-20261126/gemblongjos3-cmyk/news-image-20261126/rank.svg)](https://make.fun/bounty/news-image-20261126/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)
[![reward](https://make.fun/badge/news-image-20261126/gemblongjos3-cmyk/news-image-20261126/reward.svg)](https://make.fun/bounty/news-image-20261126?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)

# 26 November 2026 in one image

My entry for the make.fun bounty ["Sum up 26 November's world news in one
image"](https://make.fun/bounty/news-image-20261126).

The image is a broadsheet front page: a masthead reading **THE DAILY LEDGER**,
dated Thursday 26 November 2026, under the headline **UKRAINE SINKS RUSSIAN
WARSHIP OFF LIBYA**. The lead story covers the Russian corvette *Merkury*, sunk
off Benghazi on 23 November by Ukrainian sea drones — a strike Kyiv has now
confirmed. Beside it, the paper reports a Ukrainian attack on a Russian military
airfield on 25 November, evidence that the long-range campaign has widened well
beyond Ukraine's own territory. A sidebar, *The War in Numbers*, puts Russian
losses at nearly 500,000, a figure drawn from Moscow's own published numbers.

I chose the front-page form because a single day's news is not one event but a
stack of them competing for attention, and the newspaper page is the one visual
format that already encodes that hierarchy: what leads, what sits beside it, and
what gets counted up in the margin.

## Running it

`main.ts` uses only the Node standard library and runs directly — there is no
build step and it makes no network calls.

```sh
MAKEFUN_OUTPUT_DIR=./out node main.ts
```

It reads `entry.png` from beside the script (the file is a JPEG, hence the
extension), validates it, and writes the bytes unchanged to `entry.png` in the
output directory — `MAKEFUN_OUTPUT_DIR` if set, otherwise `/output`, created if
missing. On success it prints one line:

```
entry.png: 1024x1024 jpeg, 343829 bytes, sha256 c279adb5...c6c12
```

Validation walks the JPEG marker segments from SOI to SOS, reads the frame
width and height out of the SOF0/SOF2 segment, requires exactly 1024x1024,
requires that the walk reaches SOS, and requires the file to end with EOI. Any
failure — missing file, bad markers, truncated data, wrong dimensions — is
reported on stderr and exits 1; success exits 0.

## Contents

| File | Purpose |
| --- | --- |
| `entry.png` | The entry image (JPEG, 1024×1024) |
| `main.ts` | Validator and copier, Node standard library only |
| `.makefun/owner.json` | Wallet that owns this entry |

## License

MIT — see [LICENSE](LICENSE).
