---
title: "Contribute"
linkTitle: "Contribute"
description: "Report errors, suggest parts, contribute measured data, or help with the daily data update."
---

## Three fastest ways to help

<div class="cards cards--3">
  <a class="mini-card" href="https://github.com/rv2036/tryriscv-org/issues/new?template=data-error.yml" target="_blank" rel="noopener">
    <strong>Report a data error</strong>
    <span>A wrong parameter, a dead link, a mistyped part number — just include the part and a correct source.</span>
  </a>
  <a class="mini-card" href="https://github.com/rv2036/tryriscv-org/issues/new?template=new-device.yml" target="_blank" rel="noopener">
    <strong>Suggest a new part</strong>
    <span>The vendor page, the datasheet link, and key parameters — one issue is enough.</span>
  </a>
  <a class="mini-card" href="https://github.com/rv2036/tryriscv-org/issues/new?template=selection-request.yml" target="_blank" rel="noopener">
    <strong>Submit a selection request</strong>
    <span>Tell us the scenario, clock speed, memory, peripherals, and power constraints; we will come back with a candidate list.</span>
  </a>
</div>

## How the data is maintained

There is exactly one source of truth: `data/mcu/*.yaml`. The pipeline is:

```text
Vendor website / datasheet
        │  manual or AI extraction
        ▼
data/mcu/<vendor>.yaml   ← single source of truth (with sources / confidence)
        │  python3 scripts/normalize.py
        ▼
static/data/mcus.json    ← consumed by the front-end filters and comparison
        │  hugo --minify
        ▼
GitHub Pages
```

`normalize.py` validates required fields, ID uniqueness, numeric ranges, and link formats, then generates the JSON used by the filter pages. CI enforces the checks before deployment.

## Contributing one record

1. Fork the repository and create a branch;
2. Add a record to `data/mcu/<vendor>.yaml` using the fields described in `research/SCHEMA.md`;
3. Provide at least one official source link and fill in `confidence`;
4. Run `python3 scripts/normalize.py --check` and `hugo --minify` locally;
5. Open a pull request describing the data source and the date it was captured.

## Daily updates

The repository ships a reusable update skill and check scripts: re-crawl new vendor parts, recheck dead links, and generate a change summary. Maintainers follow `docs/DAILY-UPDATE.md`.
