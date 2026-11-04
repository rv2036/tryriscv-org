#!/usr/bin/env python3
"""Validate the tryriscv.org dataset and build the JSON/CSV used by the site.

Source of truth: data/mcu/*.yaml, data/ip.yaml, data/ai.yaml
Outputs:        static/data/mcus.json, mcus.csv, ips.json, ais.json, meta.json

Usage:
    python3 scripts/normalize.py            # validate + write outputs
    python3 scripts/normalize.py --check    # validate only, non-zero on error
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    sys.exit("PyYAML is required: pip install pyyaml")

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = ROOT / "static" / "data"

ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,63}$")
STATUSES = {"量产", "送样", "预告", "停产"}
CONFIDENCE = {"high", "medium", "low"}
COUNTRIES = {"CN", "TW", "US", "EU", "JP", "other"}
PERIPHERAL_KEYS = {
    "uart", "spi", "i2c", "can", "usb_fs", "usb_hs", "eth", "ble", "wifi",
    "adc_ch", "adc_bits", "dac_ch", "pwm_ch", "i2s", "sdio", "lcd", "cam",
    "iso7816", "opamp", "comp", "touch", "dma_ch", "other",
}
VENDOR_DISPLAY = {
    "深圳市爱普特微电子有限公司": "爱普特微电子",
    "上海先楫半导体科技有限公司": "先楫半导体",
    "北京联盛德微电子有限责任公司": "联盛德",
    "泰凌微电子（上海）股份有限公司": "泰凌微",
    "芯昇科技有限公司（中移芯昇）": "芯昇科技",
    "乐鑫信息科技": "乐鑫科技",
}
ALIASES = {
    "max_freq_mhz": "freq",
    "sram_kb": "sram",
    "flash_kb": "flash",
    "psram_kb": "psram",
    "otp_kb": "otp",
    "cache_kb": "cache",
    "release_year": "year",
}
REQUIRED_MCU = ["id", "name", "vendor", "core", "isa", "freq", "sram", "flash", "status"]
REQUIRED_IP = ["id", "name", "vendor", "bits", "isa", "license", "maturity"]
REQUIRED_AI = ["id", "name", "vendor", "type", "country"]

errors: list[str] = []
warnings: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


def load_yaml(path: Path):
    try:
        with path.open(encoding="utf-8") as fh:
            return yaml.safe_load(fh)
    except Exception as exc:  # noqa: BLE001
        err(f"{path.relative_to(ROOT)}: YAML 解析失败: {exc}")
        return None


def as_number(value, field: str, where: str, lo=None, hi=None):
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        err(f"{where}: {field} 必须是数字，当前为 {value!r}")
        return None
    if lo is not None and value < lo:
        err(f"{where}: {field}={value} 小于下限 {lo}")
    if hi is not None and value > hi:
        err(f"{where}: {field}={value} 大于上限 {hi}")
    return value


def is_url(value) -> bool:
    return isinstance(value, str) and value.startswith(("http://", "https://"))


def check_links(links, where: str) -> dict:
    out = {}
    if links is None:
        return out
    if not isinstance(links, dict):
        err(f"{where}: links 必须是映射")
        return out
    for key in ("product", "datasheet", "toolchain"):
        val = links.get(key)
        if val is None:
            continue
        if not is_url(val):
            err(f"{where}: links.{key} 不是合法 URL: {val!r}")
        else:
            out[key] = val
    return out


def check_sources(sources, where: str) -> list[str]:
    if not sources:
        err(f"{where}: 缺少 sources（至少一个官方来源 URL）")
        return []
    if not isinstance(sources, list):
        err(f"{where}: sources 必须是列表")
        return []
    clean = []
    for src in sources:
        if not is_url(src):
            err(f"{where}: source 不是合法 URL: {src!r}")
        else:
            clean.append(src)
    return clean


def normalize_mcu(raw: dict, where: str, seen: set[str]) -> dict | None:
    if not isinstance(raw, dict):
        err(f"{where}: 记录必须是映射")
        return None
    raw = dict(raw)
    for src, dst in ALIASES.items():
        if dst not in raw and raw.get(src) is not None:
            raw[dst] = raw[src]
    for field in REQUIRED_MCU:
        if raw.get(field) in (None, ""):
            err(f"{where}: 缺少必填字段 {field}")

    mcu_id = str(raw.get("id", ""))
    if not ID_RE.match(mcu_id):
        err(f"{where}: id 只能是小写字母、数字与连字符: {mcu_id!r}")
    if mcu_id in seen:
        err(f"{where}: id 重复: {mcu_id}")
    seen.add(mcu_id)

    name = str(raw.get("name", "")).strip()
    if not name:
        err(f"{where}: name 为空")

    freq = as_number(raw.get("freq"), "freq", where, 0.1, 5000)
    sram = as_number(raw.get("sram"), "sram", where, 0, 65536)
    flash = as_number(raw.get("flash"), "flash", where, 0, 65536)
    vmin = as_number(raw.get("voltage_min"), "voltage_min", where, 0.5, 6)
    vmax = as_number(raw.get("voltage_max"), "voltage_max", where, 0.5, 6)
    tmin = as_number(raw.get("temp_min"), "temp_min", where, -60, 200)
    tmax = as_number(raw.get("temp_max"), "temp_max", where, -60, 200)
    if vmin is not None and vmax is not None and vmin > vmax:
        err(f"{where}: voltage_min > voltage_max")
    if tmin is not None and tmax is not None and tmin > tmax:
        err(f"{where}: temp_min > temp_max")

    status = raw.get("status")
    if status not in STATUSES:
        err(f"{where}: status 必须是 {sorted(STATUSES)} 之一，当前 {status!r}")
    conf = raw.get("confidence", "medium")
    if conf not in CONFIDENCE:
        err(f"{where}: confidence 必须是 high/medium/low")
    bits = raw.get("bits", 32)
    if bits not in (32, 64):
        err(f"{where}: bits 只能是 32 或 64")

    peripherals = raw.get("peripherals") or {}
    if not isinstance(peripherals, dict):
        err(f"{where}: peripherals 必须是映射")
        peripherals = {}
    for key, val in peripherals.items():
        if key not in PERIPHERAL_KEYS:
            warn(f"{where}: 未知外设字段 {key}")
        if key == "other":
            if not isinstance(val, str):
                err(f"{where}: peripherals.other 必须是字符串")
            continue
        if isinstance(val, bool) or not isinstance(val, (int, float)):
            err(f"{where}: peripherals.{key} 必须是数字（实例数）")
        elif key != "adc_bits" and val < 0:
            err(f"{where}: peripherals.{key} 不能为负")

    power_raw = raw.get("power") or {}
    if not isinstance(power_raw, dict):
        err(f"{where}: power 必须是映射")
        power_raw = {}
    power = {
        "run": as_number(power_raw.get("run_ua_mhz"), "power.run_ua_mhz", where, 0, 100000),
        "sleep": as_number(power_raw.get("sleep_ua"), "power.sleep_ua", where, 0, 1000000),
        "standby": as_number(power_raw.get("standby_ua"), "power.standby_ua", where, 0, 1000000),
        "wakeup": as_number(power_raw.get("wakeup_us"), "power.wakeup_us", where, 0, 10000000),
        "note": str(power_raw.get("note") or "").strip(),
    }
    if power["run"] is None and power["sleep"] is None:
        warn(f"{where}: 没有动态/休眠功耗数据（筛选时会被排除）")
    if not is_url(raw.get("links", {}).get("datasheet") if isinstance(raw.get("links"), dict) else None):
        warn(f"{where}: 缺少官方数据手册链接")

    packages = raw.get("packages") or []
    if not isinstance(packages, list):
        err(f"{where}: packages 必须是列表")
        packages = []

    vendor = str(raw.get("vendor") or "").strip()
    vendor = VENDOR_DISPLAY.get(vendor, vendor)
    out = {
        "id": mcu_id,
        "name": name,
        "family": str(raw.get("family") or ""),
        "vendor": vendor,
        "vendor_en": str(raw.get("vendor_en") or "").strip(),
        "vendor_country": raw.get("vendor_country", "CN"),
        "ip_vendor": str(raw.get("ip_vendor") or "").strip(),
        "ip_country": raw.get("ip_country", "CN"),
        "core": str(raw.get("core") or "").strip(),
        "isa": str(raw.get("isa") or "").strip(),
        "bits": bits,
        "freq": freq,
        "sram": sram,
        "flash": flash,
        "psram": as_number(raw.get("psram"), "psram", where, 0, 65536),
        "otp": as_number(raw.get("otp"), "otp", where, 0, 65536),
        "cache": as_number(raw.get("cache"), "cache", where, 0, 65536),
        "voltage_min": vmin,
        "voltage_max": vmax,
        "power": power,
        "peripherals": {k: v for k, v in peripherals.items()},
        "packages": [str(p) for p in packages],
        "temp_min": tmin,
        "temp_max": tmax,
        "security": [str(x) for x in (raw.get("security") or [])],
        "debug": [str(x) for x in (raw.get("debug") or [])],
        "ecosystem": [str(x) for x in (raw.get("ecosystem") or [])],
        "status": status,
        "year": as_number(raw.get("year"), "year", where, 2000, 2035),
        "price_cny": as_number(raw.get("price_cny"), "price_cny", where, 0, 100000),
        "price_note": str(raw.get("price_note") or "").strip(),
        "links": check_links(raw.get("links"), where),
        "tags": [str(x) for x in (raw.get("tags") or [])],
        "notes": str(raw.get("notes") or "").strip(),
        "sources": check_sources(raw.get("sources"), where),
        "confidence": conf,
        "updated": to_date_string(raw.get("updated")) or "",
    }
    if not out["updated"]:
        warn(f"{where}: 缺少 updated 日期")
    out["voltage"] = [vmin, vmax]
    out["url"] = f"/mcu/{mcu_id}/"
    return out


def to_date_string(value) -> str | None:
    if isinstance(value, (dt.date, dt.datetime)):
        return value.isoformat()[:10]
    if isinstance(value, str):
        return value.strip()[:10]
    return None


def normalize_ip(raw: dict, where: str, seen: set[str]) -> dict | None:
    if not isinstance(raw, dict):
        err(f"{where}: 记录必须是映射")
        return None
    for field in REQUIRED_IP:
        if raw.get(field) in (None, ""):
            err(f"{where}: 缺少必填字段 {field}")
    ip_id = str(raw.get("id", ""))
    if not ID_RE.match(ip_id):
        err(f"{where}: id 非法: {ip_id!r}")
    if ip_id in seen:
        err(f"{where}: id 重复: {ip_id}")
    seen.add(ip_id)
    bits = raw.get("bits")
    if bits not in (32, 64):
        err(f"{where}: bits 只能是 32 或 64")
    freq = as_number(raw.get("freq"), "freq", where, 1, 5000)
    if freq is None:
        warn(f"{where}: 未公开最高频率（freq=null）")
    out = {
        "id": ip_id,
        "name": str(raw.get("name") or "").strip(),
        "vendor": str(raw.get("vendor") or "").strip(),
        "vendor_en": str(raw.get("vendor_en") or "").strip(),
        "country": raw.get("country", "CN"),
        "family": str(raw.get("family") or ""),
        "bits": bits,
        "isa": str(raw.get("isa") or ""),
        "freq": freq,
        "pipeline": str(raw.get("pipeline") or ""),
        "features": [str(x) for x in (raw.get("features") or [])],
        "license": str(raw.get("license") or ""),
        "maturity": str(raw.get("maturity") or ""),
        "coremark_mhz": as_number(raw.get("coremark_mhz"), "coremark_mhz", where, 0, 20),
        "silicon": [str(x) for x in (raw.get("silicon") or [])],
        "toolchain": [str(x) for x in (raw.get("toolchain") or [])],
        "os": [str(x) for x in (raw.get("os") or [])],
        "links": check_links(raw.get("links"), where),
        "sources": check_sources(raw.get("sources"), where),
        "notes": str(raw.get("notes") or "").strip(),
        "updated": to_date_string(raw.get("updated")) or "",
    }
    out["url"] = f"/ip/{ip_id}/"
    return out


def normalize_ai(raw: dict, where: str, seen: set[str]) -> dict | None:
    if not isinstance(raw, dict):
        err(f"{where}: 记录必须是映射")
        return None
    for field in REQUIRED_AI:
        if raw.get(field) in (None, ""):
            err(f"{where}: 缺少必填字段 {field}")
    aid = str(raw.get("id", ""))
    if not ID_RE.match(aid):
        err(f"{where}: id 非法: {aid!r}")
    if aid in seen:
        err(f"{where}: id 重复: {aid}")
    seen.add(aid)
    out = dict(raw)
    out["id"] = aid
    out["tops"] = as_number(raw.get("tops"), "tops", where, 0, 100000)
    out["sources"] = check_sources(raw.get("sources"), where)
    out["url"] = f"/ai/#{aid}"
    out["updated"] = to_date_string(raw.get("updated")) or ""
    return out


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"), default=str)
        fh.write("\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="validate only")
    args = parser.parse_args()

    mcu_files = sorted((DATA / "mcu").glob("*.yaml"))
    if not mcu_files:
        err("data/mcu/ 下没有 YAML 数据文件")

    mcus: list[dict] = []
    seen_mcu: set[str] = set()
    for path in mcu_files:
        rel = path.relative_to(ROOT)
        payload = load_yaml(path)
        if payload is None:
            continue
        if not isinstance(payload, list):
            err(f"{rel}: 顶层必须是列表")
            continue
        for idx, raw in enumerate(payload):
            mcu = normalize_mcu(raw, f"{rel}[{idx}]", seen_mcu)
            if mcu:
                mcus.append(mcu)

    ips: list[dict] = []
    seen_ip: set[str] = set()
    ip_path = DATA / "ip.yaml"
    if ip_path.exists():
        payload = load_yaml(ip_path) or []
        if not isinstance(payload, list):
            err("data/ip.yaml: 顶层必须是列表")
        else:
            for idx, raw in enumerate(payload):
                ip = normalize_ip(raw, f"data/ip.yaml[{idx}]", seen_ip)
                if ip:
                    ips.append(ip)
    else:
        warn("data/ip.yaml 不存在")

    ais: list[dict] = []
    seen_ai: set[str] = set()
    ai_path = DATA / "ai.yaml"
    if ai_path.exists():
        payload = load_yaml(ai_path) or []
        if not isinstance(payload, list):
            err("data/ai.yaml: 顶层必须是列表")
        else:
            for idx, raw in enumerate(payload):
                ai = normalize_ai(raw, f"data/ai.yaml[{idx}]", seen_ai)
                if ai:
                    ais.append(ai)
    else:
        warn("data/ai.yaml 不存在")

    ip_mcu_counts: dict[str, int] = {}
    for m in mcus:
        ip_mcu_counts[m["ip_vendor"]] = ip_mcu_counts.get(m["ip_vendor"], 0) + 1
    for ip in ips:
        ip["brand_mcu_count"] = ip_mcu_counts.get(ip["vendor"], 0)

    mcus.sort(key=lambda x: (x["vendor"], x["name"]))
    ips.sort(key=lambda x: (x["vendor"], x["name"]))
    ais.sort(key=lambda x: (x["vendor"], x["name"]))

    vendors = sorted({m["vendor"] for m in mcus})
    today = dt.date.today().isoformat()

    print(f"MCU: {len(mcus)} 条 / {len(vendors)} 家厂商")
    print(f"IP : {len(ips)} 条")
    print(f"AI : {len(ais)} 条")

    if warnings:
        print(f"\n警告 {len(warnings)} 条：")
        for w in warnings[:40]:
            print("  ! " + w)
        if len(warnings) > 40:
            print(f"  … 其余 {len(warnings) - 40} 条省略")
    if errors:
        print(f"\n错误 {len(errors)} 条：", file=sys.stderr)
        for e in errors:
            print("  x " + e, file=sys.stderr)
        return 1

    if args.check:
        print("\n校验通过（未写入输出）。")
        return 0

    meta = {
        "generated": today,
        "mcu_count": len(mcus),
        "vendor_count": len(vendors),
        "ip_count": len(ips),
        "ai_count": len(ais),
        "vendors": vendors,
        "warnings": len(warnings),
    }
    import yaml as _yaml

    def write_yaml(path: Path, payload, title: str) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as fh:
            fh.write(f"# AUTO-GENERATED by scripts/normalize.py from {title} — do not edit.\n")
            _yaml.safe_dump(payload, fh, allow_unicode=True, sort_keys=False, width=1000, default_flow_style=False)

    write_yaml(DATA / "mcus.yaml", mcus, "data/mcu/*.yaml")
    write_yaml(DATA / "ips.yaml", ips, "data/ip.yaml")
    write_yaml(DATA / "ais.yaml", ais, "data/ai.yaml")
    write_json(OUT / "mcus.json", {"generated": today, "count": len(mcus), "vendors": vendors, "parts": mcus})
    write_json(OUT / "ips.json", {"generated": today, "count": len(ips), "parts": ips})
    write_json(OUT / "ais.json", {"generated": today, "count": len(ais), "parts": ais})
    write_json(OUT / "meta.json", meta)

    fields = [
        "id", "name", "family", "vendor", "vendor_en", "ip_vendor", "core", "isa", "bits",
        "freq", "sram", "flash", "psram", "voltage_min", "voltage_max",
        "power_run", "power_sleep", "uart", "spi", "i2c", "can", "usb_fs", "eth", "ble", "wifi",
        "adc_bits", "packages", "temp_min", "temp_max", "ecosystem", "status", "year",
        "price_cny", "links_product", "links_datasheet", "confidence", "updated",
    ]
    with (OUT / "mcus.csv").open("w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        for m in mcus:
            row = {k: m.get(k) for k in fields}
            row["power_run"] = m["power"].get("run")
            row["power_sleep"] = m["power"].get("sleep")
            row["adc_bits"] = m["peripherals"].get("adc_bits")
            row["packages"] = " / ".join(m["packages"])
            row["ecosystem"] = " / ".join(m["ecosystem"])
            row["links_product"] = m["links"].get("product", "")
            row["links_datasheet"] = m["links"].get("datasheet", "")
            writer.writerow({k: ("" if v is None else v) for k, v in row.items()})

    print(f"\n已写入 static/data/ 与 data/mcus.yaml、data/ips.yaml、data/ais.yaml（生成日期 {today}）。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
