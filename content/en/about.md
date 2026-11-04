---
title: "About This Site"
linkTitle: "About"
description: "tryriscv.org's goals, data methodology, coverage, roadmap, and neutrality policy."
---

## Why tryriscv.org

The number of RISC-V devices has grown quickly over the past three years, but the information is fragmented: vendor sites describe "typical applications", datasheets list "electrical characteristics", distributors quote "pricing", and the community shares "lessons learned the hard way". For a team that has to choose parts, **what is missing is not more documents but a table you can filter, compare, and trace back to its sources**.

tryriscv.org turns public information into structured data so that a real requirement — "around 100 MHz, low power, 64 KB of memory, needs BLE" — narrows down in minutes to a handful of parts worth prototyping.

## Where the data comes from

- Vendor product pages, datasheets, reference manuals, and selection guides;
- Official vendor repositories on GitHub, SDK documentation, and toolchain pages;
- Public alliance, community, and distributor material (used for cross-checking only).

Every record keeps `sources` and `confidence` fields. Parameters that are not published are left as `null` rather than guessed; µA/MHz figures derived from mA values state their conditions in the power notes.

## Current coverage

- **MCU**: WCH, GigaDevice, Espressif, Bouffalo Lab, APT, CMiot, HPMicro, Winner Micro, Telink, and more as data is added;
- **IP**: T-Head XuanTie, Nuclei, StarFive Dubhe, SiFive, Andes, and others;
- **Solutions**: IoT industry-education, low-power sensing, BLE, Wi-Fi, motor control, industrial control;
- **AI compute**: preview; hardware and toolchain information for NPU IP and AI SoCs.

## Roadmap

1. Complete power, package, and pricing data for Chinese RISC-V MCUs, with a quarterly review process;
2. Add a maturity matrix for IP / AI-component / model / software-version matching;
3. Add community measurements (power, boot time, RTOS ports, model inference) and reproducible benchmarks;
4. Add reference schematics, BOMs, and lab suggestions to the solution packages.

## Neutrality and corrections

This site does not accept paid vendor rankings. The default order combines data completeness, low power, and cost, and you can switch it freely. If you find a wrong parameter, a dead link, or a missing part, open an issue on [GitHub](https://github.com/rv2036/tryriscv-org/issues) with the part number in the title.

## License

The code is released under the MIT license; the curated data is released under CC BY 4.0. When you republish it, credit the source and link back to this page.
