#!/usr/bin/env python3
"""Validate that all locale files match the Chinese source key set and placeholders."""
from __future__ import annotations

import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    sys.exit("PyYAML is required: pip install pyyaml")

ROOT = Path(__file__).resolve().parent.parent
I18N = ROOT / "i18n"
LANGS = ["zh", "en", "ru", "ja"]
TOKEN_RE = re.compile(r"\{\{[^}]+\}\}|\{[a-zA-Z_]+\}|%[vsd]")


def load(lang: str) -> dict:
    path = I18N / f"{lang}.yaml"
    if not path.exists():
        print(f"missing locale file: {path}", file=sys.stderr)
        sys.exit(1)
    with path.open(encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}
    if not isinstance(data, dict):
        print(f"{path}: top level must be a mapping", file=sys.stderr)
        sys.exit(1)
    return data


def main() -> int:
    zh = load("zh")
    failed = False
    for lang in LANGS[1:]:
        data = load(lang)
        missing = sorted(set(zh) - set(data))
        extra = sorted(set(data) - set(zh))
        bad_tokens = []
        for key, source in zh.items():
            if key not in data:
                continue
            a = sorted(TOKEN_RE.findall(str(source)))
            b = sorted(TOKEN_RE.findall(str(data[key])))
            if a != b:
                bad_tokens.append((key, a, b))
        print(f"{lang}: {len(data)} keys; missing={len(missing)} extra={len(extra)} token-mismatch={len(bad_tokens)}")
        if missing:
            print("  missing:", ", ".join(missing[:12]))
        if extra:
            print("  extra:", ", ".join(extra[:12]))
        for key, a, b in bad_tokens[:8]:
            print(f"  token mismatch {key}: zh={a} {lang}={b}")
        if missing or extra or bad_tokens:
            failed = True
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
