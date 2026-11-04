---
name: tryriscv-daily-update
description: Use when updating tryriscv.org, the RISC-V MCU/IP/AI selection directory — daily data refresh, adding or fixing a part/vendor/IP, regenerating filters and detail pages, validating links, rebuilding the Hugo site, and preparing a local commit. Also use when a user asks to refresh or extend the tryriscv MCU database.
---

# tryriscv.org daily update

Repository: `tryriscv-org/` under the current workspace (GitHub: `rv2036/tryriscv-org`).
The site is a Hugo static site on GitHub Pages; data is YAML, filters are client-side.
**Never push** unless the user explicitly asks. Commit locally only.

## Read first

1. `tryriscv-org/docs/DAILY-UPDATE.md` — full checklist.
2. `tryriscv-org/research/SCHEMA.md` — field definitions.
3. `tryriscv-org/data/mcu/*.yaml` — source of truth, one file per vendor group.

## Environment

```bash
cd tryriscv-org
python3 -m pip install --user pyyaml        # if missing
# Hugo 0.169.0 extended: prefer `hugo`; otherwise use ../tools/hugo (already downloaded in this workspace)
```

Data flow: `data/mcu/*.yaml` + `data/ip.yaml` + `data/ai.yaml`
→ `python3 scripts/normalize.py` → `data/mcus.yaml` / `data/ips.yaml` / `data/ais.yaml`
+ `static/data/*.json|csv` → `hugo --minify` → `public/`.

**Always run normalize before Hugo.** Templates read `hugo.Data.mcus` / `hugo.Data.ips` / `hugo.Data.ais`,
not the per-vendor map; do not change that without testing.

## Languages and theme

The site is multilingual: `zh` at `/`, `en` at `/en/`, `ru` at `/ru/`, `ja` at `/ja/`.

- UI strings live in `i18n/<lang>.yaml`; every key must exist in all four files and keep
  the same `{n}`, `{{ .x }}`, `%v` placeholders. Run `python3 scripts/check_i18n.py` after any UI edit.
- Page prose lives in `content/<lang>/`; MCU/IP detail pages are generated per language by
  `content/<lang>/mcu|ip/_content.gotmpl` from the same global data.
- Home presets, solution packages and ecosystem display text have translation layers in
  `data/<lang>/{site,solutions,ecosystem}.yaml`. When you change the Chinese source, sync all three.
- Data notes/pipeline strings stay in Chinese; non-Chinese pages label them with
  `detail_source_zh_note` rather than machine-translating them.
- Dynamic query links must use `safeURL` (otherwise `=`/`&` become `%3d`/`%26`).
  Template internal links use `relLangURL`; JS detail links go through `urlFor()`.
- Theme is a `data-theme` attribute on `<html>`, initialized by an inline script and toggled by
  `assets/js/site.js`. New components must use CSS variables (`--surface`, `--ink`, `--line`, ...);
  check light/dark and 390/320px mobile after CSS changes.

## Daily loop (30–60 min)

### 1. Baseline

```bash
python3 scripts/normalize.py --check
python3 scripts/check_i18n.py
python3 scripts/check_links.py --limit 40    # full run later
```

### 2. Find changes

Check in this order, official pages only:

- vendor “news / new products” pages: 沁恒 WCH, 兆易创新 GigaDevice, 乐鑫 Espressif, 博流 Bouffalo,
  爱普特 APT, 先楫 HPMicro, 联盛德 Winner Micro, 泰凌微 Telink, 芯昇 CMIOT;
- datasheet revisions for rows already in the dataset;
- open GitHub issues labelled `[数据纠错]` / `[新器件]` (title prefix);
- broken links from `reports/latest-link-check.md`.

If nothing new is verifiable, update only `updated` dates of entries whose pages you actually re-checked.
Do not invent a change to look busy.

### 3. Add or edit a part

Edit the vendor file, following `research/SCHEMA.md`. Minimal shape:

```yaml
- id: wch-ch32v006k8u7             # lowercase vendor-part, unique
  name: CH32V006K8U7
  family: CH32V006
  vendor: 沁恒微电子                  # short display name, not full legal name
  vendor_en: WCH
  vendor_country: CN
  ip_vendor: 沁恒自研
  ip_country: CN
  core: QingKe V2C
  isa: RV32EmC
  bits: 32
  max_freq_mhz: 48
  sram_kb: 8
  flash_kb: 62
  voltage_min: 1.8
  voltage_max: 5.5
  power: {run_ua_mhz: 73, sleep_ua: null, standby_ua: null, note: "3.3V/25°C，外设关"}
  peripherals: {uart: 2, spi: 1, i2c: 1, adc_ch: 10, adc_bits: 12, pwm_ch: 6, dma_ch: 4}
  packages: [QFN32, TSSOP20]
  temp_min: -40
  temp_max: 105
  security: [TRNG]
  debug: [SWD]
  ecosystem: [RT-Thread, Zephyr]
  status: 量产
  release_year: 2025
  price_cny: null
  links: {product: "https://...", datasheet: "https://...pdf"}
  tags: [低功耗, 小封装]
  notes: ""
  sources: ["https://...", "https://...pdf"]
  confidence: high
  updated: 2026-11-04
```

Rules:

- One row per base part; 2–4 package/memory variants per family, not every order code.
- `null` for unpublished values. Never estimate.
- `power.run_ua_mhz`: convert mA@MHz to µA/MHz and explain the condition in `power.note`.
- `flash_kb: 0` means no internal flash (state the external memory in `notes`); display shows “无”.
- `sources` must be URLs actually opened; `confidence` = high (datasheet) / medium (official page) / low (secondary).
- Vendor display names must be short; normalize has a `VENDOR_DISPLAY` map for known long legal names.
- Aliases accepted by normalize: `max_freq_mhz/sram_kb/flash_kb/psram_kb/otp_kb/cache_kb/release_year`
  → `freq/sram/flash/.../year`.

### 4. IP / AI / solutions (when in scope)

- `data/ip.yaml`: required `id,name,vendor,bits,isa,freq,license,maturity`; `features` from
  FPU/DSP/Vector/MMU/MPU/多核/AI/乱序/实时. Frequencies depend on process — say so in `notes`.
- `data/ai.yaml`: required `id,name,vendor,type,country`; `tops` only public INT8 peak; no invented maturity scores.
- `data/solutions.yaml`: `recommended` must be existing MCU ids; `query` must open a non-empty `/mcu/` filter.

### 5. Validate

```bash
python3 scripts/normalize.py
python3 scripts/check_i18n.py
python3 scripts/check_links.py
hugo --minify --gc
```

Gates:

- normalize: 0 errors. Review warnings: missing power is acceptable only when the vendor really does not publish it.
- new/changed detail page returns 200 and shows the right power/voltage/sources;
- `/mcu/` filters can find the part; URL state reproduces it; compare works with 2–4 parts;
- mobile 390px and 320px: filter drawer, cards, language select, theme toggle;
- all four languages: home, /mcu/, /ip/, /ai/, /solutions/, one detail page; language select goes to the translated URL;
- light and dark themes: tables, filters, solution cards, detail pages;
- disclaimer + issue links still render at the bottom of every page;
- `static/data/mcus.json` and `mcus.csv` regenerated with the new record.

Quick browser check if Playwright is available in `/tmp/pw`:

```bash
cd /tmp/pw && env -u LD_PRELOAD PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers node shot.js
```

### 6. Snapshot date

If the dataset changed materially, update `[params] updated` in `hugo.toml` (YYYY-MM-DD).
The header/footer/disclaimer read this value.

### 7. Commit

```bash
git status --short
git add data/mcu data/*.yaml data/mcus.yaml data/ips.yaml data/ais.yaml \
        static/data content layouts assets hugo.toml docs skills
git commit -m "data: add CH32V006K8U7; refresh WCH power figures"
```

One commit = one kind of change. Do not add `public/` or `.hugo_build.lock`.
Report: parts added/changed, vendors touched, validation results, link-check summary, commit hash.
Do not push unless asked; pushing `main` deploys the live site.

## Known pitfalls

- Duplicate `id` across vendor files → normalize error. Use `<vendor>-<part>`.
- Hugo data typing: iterating `hugo.Data.mcu` (map of files) and then ranging the inner list yields
  `interface{}` items and breaks `.field` access. Always use the generated flat lists.
- The filter scrim must stay `display:none` outside mobile, otherwise it becomes a grid item and
  pushes the catalog sideways.
- `site.Params.tagline` must exist in `hugo.toml`; it is not read from `data/site.yaml`.
- Prices: leave `null` if only marketplace/agent quotes; never present a stale price as current.
- Keep Chinese vendor names short; long legal names blow up the facet list.

## Useful one-liners

```bash
# count parts per vendor
python3 -c "import json,collections;d=json.load(open('static/data/mcus.json'));print(collections.Counter(p['vendor'] for p in d['parts']))"

# find rows without power data
python3 -c "import json;d=json.load(open('static/data/mcus.json'));print([p['id'] for p in d['parts'] if not p['power']['run'] and not p['power']['sleep']])"

# check a filtered URL returns rows (open in browser)
# http://localhost:8765/mcu/?freq=64-128&has_power=1&sort=run-asc
```
