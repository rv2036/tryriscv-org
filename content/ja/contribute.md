---
title: "コントリビュート"
linkTitle: "コントリビュート"
description: "誤りの報告、型番の追加、実測データの提供、毎日のデータ更新への参加方法をまとめています。"
---

## 手軽に参加できる 3 つの方法

<div class="cards cards--3">
  <a class="mini-card" href="https://github.com/rv2036/tryriscv-org/issues/new?template=data-error.yml" target="_blank" rel="noopener">
    <strong>データの誤りを報告</strong>
    <span>パラメータの誤り、リンク切れ、型番の誤記。型番と正しい出典を添えるだけで十分です。</span>
  </a>
  <a class="mini-card" href="https://github.com/rv2036/tryriscv-org/issues/new?template=new-device.yml" target="_blank" rel="noopener">
    <strong>新しいデバイスを推薦</strong>
    <span>メーカー公式サイト、データシートへのリンク、主要パラメータ。issue 1 件で足ります。</span>
  </a>
  <a class="mini-card" href="https://github.com/rv2036/tryriscv-org/issues/new?template=selection-request.yml" target="_blank" rel="noopener">
    <strong>選定要件を投稿</strong>
    <span>用途、クロック、メモリ、ペリフェラル、消費電力の制約をお知らせください。候補リストをご提示します。</span>
  </a>
</div>

## データの保守方法

事実の出典は 1 つだけ、`data/mcu/*.yaml` です。流れは次のとおりです。

```text
メーカー公式サイト / データシート
        │  人手または AI で取得
        ▼
data/mcu/<vendor>.yaml   ← 唯一の事実源（sources / confidence を含む）
        │  python3 scripts/normalize.py
        ▼
static/data/mcus.json    ← フロントエンドの絞り込みと比較で使用
        │  hugo --minify
        ▼
GitHub Pages
```

`normalize.py` は必須フィールド、ID の一意性、数値範囲、リンク形式を検証し、絞り込みページで使う JSON を生成します。CI はデプロイ前に検証を必ず実行します。

## データを 1 件追加する

1. リポジトリを Fork してブランチを作成します。
2. `data/mcu/<vendor>.yaml` に、`research/SCHEMA.md` のフィールドに従ってレコードを追加します。
3. 公式の出典リンクを少なくとも 1 つ示し、`confidence` を記入します。
4. ローカルで `python3 scripts/normalize.py --check` と `hugo --minify` を実行します。
5. PR を送信し、データの出典と取得日を記載します。

## 毎日の更新

リポジトリには再利用可能な更新スキル（skill）と検査スクリプトが同梱されています。メーカーの新製品の再取得、リンク切れの再確認、変更サマリの生成を行います。メンテナは `docs/DAILY-UPDATE.md` に従って実行するだけです。
