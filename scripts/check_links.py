#!/usr/bin/env python3
"""Check every public source / product / datasheet URL in the dataset.

Usage:
    python3 scripts/check_links.py                 # full check, writes report
    python3 scripts/check_links.py --limit 20      # quick sample
    python3 scripts/check_links.py --fail-on-broken

Run `normalize.py` first: this script reads the generated data/mcus.yaml,
data/ips.yaml and data/ais.yaml, which contain the normalized sources.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import datetime as dt
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    sys.exit("PyYAML is required: pip install pyyaml")

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
REPORTS = ROOT / "reports"
UA = "Mozilla/5.0 (compatible; tryriscv-link-check/1.0; +https://tryriscv.org/)"
TIMEOUT = 20


def collect() -> list[tuple[str, str]]:
    """Return (url, where) pairs, de-duplicated by URL."""
    seen: dict[str, str] = {}
    for fname in ("mcus.yaml", "ips.yaml", "ais.yaml"):
        path = DATA / fname
        if not path.exists():
            continue
        for item in yaml.safe_load(path.read_text(encoding="utf-8")) or []:
            label = item.get("id") or item.get("name") or "?"
            for url in item.get("sources") or []:
                if isinstance(url, str) and url.startswith(("http://", "https://")):
                    seen.setdefault(url, label)
            links = item.get("links") or {}
            if isinstance(links, dict):
                for key in ("product", "datasheet", "toolchain"):
                    url = links.get(key)
                    if isinstance(url, str) and url.startswith(("http://", "https://")):
                        seen.setdefault(url, f"{label} [{key}]")
    return sorted(seen.items())


def request(url: str, method: str, *, ranged: bool = False):
    headers = {"User-Agent": UA, "Accept": "*/*"}
    if ranged:
        headers["Range"] = "bytes=0-2047"
    req = urllib.request.Request(url, method=method, headers=headers)
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return urllib.request.urlopen(req, timeout=TIMEOUT, context=ctx)


def check_one(url: str) -> dict:
    result = {"url": url, "status": None, "final": url, "error": "", "kind": "ok"}
    for method in ("HEAD", "GET"):
        try:
            with request(url, method, ranged=(method == "GET")) as resp:
                result["status"] = resp.status
                result["final"] = resp.geturl()
                result["kind"] = "ok"
                return result
        except urllib.error.HTTPError as exc:
            result["status"] = exc.code
            if exc.code in (403, 405, 429, 501) and method == "HEAD":
                continue
            if exc.code in (403, 429):
                result["kind"] = "blocked"
                result["error"] = f"HTTP {exc.code}（可能是防火墙/WAF）"
            elif exc.code == 404 or exc.code == 410:
                result["kind"] = "broken"
                result["error"] = f"HTTP {exc.code}"
            else:
                result["kind"] = "broken"
                result["error"] = f"HTTP {exc.code}"
            return result
        except Exception as exc:  # noqa: BLE001
            result["error"] = f"{type(exc).__name__}: {exc}"
            if method == "HEAD":
                continue
            # 超时、TLS EOF、连接被重置等无法区分“失效”与“网络不可达”，单列
            result["kind"] = "blocked"
            return result
    if not result["error"]:
        result["error"] = "HEAD/GET 均失败"
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--fail-on-broken", action="store_true")
    parser.add_argument("--out", default=str(REPORTS / "latest-link-check.md"))
    args = parser.parse_args()

    targets = collect()
    if args.limit:
        targets = targets[: args.limit]
    if not targets:
        sys.exit("没有可检查的 URL：先运行 python3 scripts/normalize.py")

    print(f"检查 {len(targets)} 个 URL …")
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(check_one, url): url for url, _ in targets}
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())

    where = dict(targets)
    broken = [r for r in results if r["kind"] == "broken"]
    blocked = [r for r in results if r["kind"] == "blocked"]
    ok = [r for r in results if r["kind"] == "ok"]
    results.sort(key=lambda r: (r["kind"] != "broken", r["kind"] != "blocked", r["url"]))

    today = dt.date.today().isoformat()
    lines = [
        f"# 链接巡检报告 {today}",
        "",
        f"- 总 URL：{len(results)}",
        f"- 正常：{len(ok)}",
        f"- 失败：{len(broken)}",
        f"- 被拦截 / 不可达（403/429、TLS、超时等，可能不是失效）：{len(blocked)}",
        "",
    ]
    if broken:
        lines += ["## 失败链接", "", "| URL | 引用条目 | 状态 | 错误 |", "| --- | --- | --- | --- |"]
        lines += [f"| {r['url']} | {where.get(r['url'], '')} | {r['status'] or ''} | {r['error']} |" for r in broken]
        lines.append("")
    if blocked:
        lines += ["## 被拦截 / 不可达", "", "| URL | 引用条目 | 状态 | 错误 |", "| --- | --- | --- | --- |"]
        lines += [f"| {r['url']} | {where.get(r['url'], '')} | {r['status'] or ''} | {r['error']} |" for r in blocked]
        lines.append("")

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text("\n".join(lines), encoding="utf-8")

    print(f"正常 {len(ok)} / 失败 {len(broken)} / 被拦截 {len(blocked)}")
    print(f"报告：{Path(args.out).relative_to(ROOT)}")
    if broken:
        print("\n前 10 个失败：")
        for r in broken[:10]:
            print(f"  - {r['url']}  {r['error']}")
    if args.fail_on_broken and broken:
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
