---
title: "参与贡献"
linkTitle: "参与贡献"
description: "提交错误报告、补充型号、贡献实测数据，或参与每日数据更新。"
---

## 三种最快的参与方式

<div class="cards cards--3">
  <a class="mini-card" href="https://github.com/rv2036/tryriscv-org/issues/new?template=data-error.yml" target="_blank" rel="noopener">
    <strong>报告数据错误</strong>
    <span>参数不对、链接失效、型号写错——带上型号与正确来源即可。</span>
  </a>
  <a class="mini-card" href="https://github.com/rv2036/tryriscv-org/issues/new?template=new-device.yml" target="_blank" rel="noopener">
    <strong>推荐新器件</strong>
    <span>厂商官网、数据手册链接、关键参数，一条 issue 就够。</span>
  </a>
  <a class="mini-card" href="https://github.com/rv2036/tryriscv-org/issues/new?template=selection-request.yml" target="_blank" rel="noopener">
    <strong>提交选型需求</strong>
    <span>告诉我们场景、主频、内存、外设与功耗约束，我们会给出候选清单。</span>
  </a>
</div>

## 数据如何维护

事实来源只有一个：`data/mcu/*.yaml`。流程是：

```text
厂商官网 / 数据手册
        │  人工或 AI 抓取
        ▼
data/mcu/<vendor>.yaml   ← 唯一事实来源（含 sources / confidence）
        │  python3 scripts/normalize.py
        ▼
static/data/mcus.json    ← 前端筛选与对比使用
        │  hugo --minify
        ▼
GitHub Pages
```

`normalize.py` 会校验必填字段、ID 唯一性、数值范围与链接格式，并生成筛选页使用的 JSON。CI 在部署前强制执行校验。

## 贡献一条数据

1. Fork 仓库并新建分支；
2. 在 `data/mcu/<vendor>.yaml` 里按 `research/SCHEMA.md` 的字段追加记录；
3. 至少给出一个官方来源链接，填写 `confidence`；
4. 本地运行 `python3 scripts/normalize.py --check` 与 `hugo --minify`；
5. 提交 PR，说明数据来源与抓取日期。

## 每日更新

仓库附带可复用的更新技能（skill）与检查脚本：重新抓取厂商新品、复核失效链接、生成变更摘要。维护者按 `docs/DAILY-UPDATE.md` 执行即可。
