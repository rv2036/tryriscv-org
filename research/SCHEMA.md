# MCU research output schema (v1)

Write UTF-8 YAML, top-level **list** of parts. Use only public, official information
(vendor product page, official datasheet/TRM, official distributor). Never invent numbers.
If a value is not published, use `null` (do not guess). Every part MUST carry `sources`.

```yaml
- id: wch-ch32v003f4p6          # lowercase, vendor-prefix + part number, unique
  name: CH32V003F4P6            # marketing part number
  family: CH32V003              # series/family
  vendor: 沁恒微电子             # Chinese vendor name
  vendor_en: WCH
  vendor_country: CN            # CN | TW | US | EU | JP | other
  ip_vendor: 沁恒自研            # IP brand, see below
  ip_country: CN                # country/region of the IP owner
  core: QingKe V2A              # core name
  isa: RV32EC                   # e.g. RV32IMAC, RV32IMAFDC, RV64GC
  bits: 32
  max_freq_mhz: 48
  sram_kb: 2
  flash_kb: 16
  psram_kb: null
  otp_kb: null
  cache_kb: null
  voltage_min: 1.8
  voltage_max: 5.5
  power:
    run_ua_mhz: null            # active current, µA/MHz, typical
    sleep_ua: null              # sleep/deep-sleep current, µA, typical
    standby_ua: null            # standby/shutdown, µA
    wakeup_us: null
    note: "数据手册典型值，条件 3.3V/25°C"
  peripherals:                  # counts of instances; omit key if 0/unknown
    uart: 1
    spi: 1
    i2c: 1
    can: 0
    usb_fs: 0
    usb_hs: 0
    eth: 0
    ble: 0
    wifi: 0
    adc_ch: 8
    adc_bits: 10
    dac_ch: 0
    pwm_ch: 0
    i2s: 0
    sdio: 0
    lcd: 0                     # segment LCD or RGB LCD controller
    cam: 0
    iso7816: 0
    opamp: 0
    comp: 0
    touch: 0
    dma_ch: 0
    other: "8-bit ADC, 2 x comparator"
  packages: [TSSOP20, QFN20]
  temp_min: -40
  temp_max: 85
  security: [AES, TRNG]         # AES | SHA | TRNG | CRC | secure-boot | TEE | ISO7816
  debug: [SWD]                  # SWD | JTAG | cJTAG | WCH-Link | ...
  ecosystem: [RT-Thread, FreeRTOS, Arduino]
  status: 量产                   # 量产 | 送样 | 预告 | 停产
  release_year: 2023
  price_cny: 0.35               # 1k qty, optional, null if unknown
  price_note: "立创商城 2025-01 含税"
  links:
    product: "https://..."
    datasheet: "https://..."
    toolchain: "https://..."    # optional SDK/IDE page
  tags: [低成本, 小封装, 5V容忍]
  notes: "同系列还有 CH32V003J4M6(SOP8) 等封装变体"
  sources: ["https://...", "https://..."]
  confidence: high              # high (official datasheet) | medium (official page only) | low (distributor/secondary)
  updated: 2026-11-04
```

Rules:
- One entry per *base part number* (not every package). Prefer 2–4 representative
  variants per family that differ in memory/package/peripherals. Do not exceed ~30 per file.
- `peripherals` keys must be numbers (instance counts), not booleans. For radios (ble/wifi)
  use 1 when integrated.
- `power.run_ua_mhz` = active current in µA per MHz. If datasheet gives mA at a given
  frequency (e.g. 5.5mA @ 48MHz), convert (573 uA/MHz) and say so in `power.note`.
- `isa` must reflect the actual core: e.g. RV32EC (no multiply), RV32IMAC, RV32IMAFC.
- `ip_vendor` for in-house cores: `沁恒自研`, `兆易创新自研（Bumblebee）`, `乐鑫自研`,
  `平头哥玄铁`, `芯来 Nuclei`, `赛昉 Dubhe`, `SiFive`, `晶心 Andes`, `ARM` (rare).
- `links.datasheet` must be a direct PDF or official document page that you actually opened.
- Mark `confidence: low` if key numbers came from a secondary source.
- Do not copy marketing fluff; numbers only, with conditions in `power.note` / `notes`.
