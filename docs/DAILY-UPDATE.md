# 每日更新手册

目标：每天用 30–60 分钟，让数据保持“可查、可核、可复现”，而不是追求一次性收录所有型号。

## 0. 准备

```bash
cd tryriscv-org
git pull --ff-only
python3 -m pip install --user pyyaml
# Hugo 0.169.0 extended；没有系统安装时使用 ../tools/hugo
```

先跑一遍基线，确认仓库是干净的：

```bash
python3 scripts/normalize.py --check
python3 scripts/check_i18n.py
hugo --minify --gc
```

## 1. 今天查什么（按优先级）

1. **厂商新品 / 新系列**：沁恒、兆易创新、乐鑫、博流、爱普特、先楫、泰凌微、芯昇的“新闻 / 新产品”页；
2. **已有型号的参数变更**：数据手册修订号、Flash/SRAM 容量、功耗典型值、封装增减；
3. **失效链接**：`python3 scripts/check_links.py` 报告中 404/域名失效的条目；
4. **社区纠错 issue**：带 `[数据纠错]` / `[新器件]` 标题的 issue；
5. **价格**：仅在官方或公开渠道有可核验批量价时更新，并写明日期与渠道。

不要为了“今天有更新”而编造参数。没有新信息时，只更新已核验条目的 `updated` 日期也可以。

## 2. 新增一条 MCU

1. 打开厂商官方产品页与数据手册（PDF 优先）；
2. 在 `data/mcu/<vendor>.yaml` 追加一条，字段照 `research/SCHEMA.md`：
   - 必填：`id`、`name`、`vendor`、`core`、`isa`、`max_freq_mhz`、`sram_kb`、`flash_kb`、`status`；
   - 功耗：`power.run_ua_mhz` / `sleep_ua` / `standby_ua` / `note`（写测试条件）；
   - 外设：数字实例数；`other` 写字符串；
   - `links.product`、`links.datasheet` 必须是实际打开的官方链接；
   - `sources` 至少 2 条（产品页 + 数据手册），`confidence: high`；
   - `updated: YYYY-MM-DD`。
3. 同一系列只加 2–4 个代表封装/容量，不要把所有封装都铺开；
4. 不确定的字段写 `null`，并在 `notes` 说明“未公开”。

字段别名（normalize 会自动转换，但推荐直接写规范名）：

| 调研常用名 | 规范名 |
| --- | --- |
| `max_freq_mhz` | `freq` |
| `sram_kb` / `flash_kb` | `sram` / `flash` |
| `release_year` | `year` |

## 3. 新增一个厂商

1. 新建 `data/mcu/<vendor>.yaml`（顶层是列表）；
2. 厂商中文名写常用简称，不要写完整法定名；完整名放 `notes` 或 `vendor_en`；
3. 若厂商有多个 IP 来源，按具体型号分别填写 `ip_vendor` / `ip_country`；
4. 厂商名录由 MCU 数据自动汇总；英文展示依赖 `vendor_en`。若新增首页预设或修改 `data/site.yaml`，同步 `data/en|ru|ja/site.yaml`。

## 4. 多语言与主题

站点有 `zh`（默认，根路径）、`en`、`ru`、`ja` 四个语言：

- 页面内容在 `content/<lang>/`；每种语言都有独立的 `mcu/`、`ip/` 目录和 `_content.gotmpl`，详情页由同一个 `hugo.Data.mcus` / `hugo.Data.ips` 生成。
- UI 文案在 `i18n/<lang>.yaml`。**新增一个 UI 键必须同时加到四个文件**，然后运行：
  ```bash
  python3 scripts/check_i18n.py
  ```
- 首页预设、方案包、生态列表的展示文案在 `data/<lang>/{site,solutions,ecosystem}.yaml`；更新中文源后，同步这三个翻译层。
- 动态 query 链接（如 `/mcu/?freq=...`）必须用 `safeURL` 输出，否则 minifier 会把 `=` 与 `&` 转成 `%3d` / `%26`。
- 主题切换由 `assets/js/site.js` + `data-theme` 属性实现；改动 CSS 时在明暗两种主题、390px/1440px 下都截图检查。
- 数据备注（MCU/IP 的 `notes`、`pipeline` 等）保留中文原文；非中文页面用 `detail_source_zh_note` 标注。

## 5. 更新 IP / AI / 方案

- **IP**：`data/ip.yaml`。必填 `id/name/vendor/bits/isa/freq/license/maturity`；`features` 从 FPU、DSP、Vector、MMU、MPU、多核、AI、乱序、实时 中选；`freq` 注明随工艺变化。
- **AI**：`data/ai.yaml`。必填 `id/name/vendor/type/country`；`tops` 只写公开的 INT8 峰值，没有就 `null`；没有 benchmark 不要编造成熟度分数。
- **方案**：`data/solutions.yaml`。`recommended` 必须使用真实 MCU `id`；`query` 是 `/mcu/` 的筛选参数，更新后点开验证。

## 6. 校验与构建

```bash
python3 scripts/normalize.py          # 失败会列出文件[index]与原因
python3 scripts/check_i18n.py         # 四种语言键集 / 占位符
python3 scripts/check_links.py        # 输出 reports/latest-link-check.md
hugo --minify --gc
```

检查清单：

- [ ] `normalize.py` 无 error；warning 中“没有功耗数据”是否可接受；
- [ ] 新增/修改的详情页 200，标题、关键参数、来源正确；
- [ ] 筛选页能筛到新条目，URL 参数可复现；
- [ ] 移动端 390px 与 320px 宽度下筛选抽屉、卡片、语言切换正常；
- [ ] 四个语言首页/筛选页/详情页均可打开，语言下拉指向对应翻译；
- [ ] 明暗两套主题下表格、筛选器、方案卡、详情页无白底白字/低对比；
- [ ] 页尾免责声明与 issue 链接存在；
- [ ] `data/mcus.yaml`、`static/data/*.json`、`mcus.csv` 已随源数据重新生成。

## 7. 更新快照日期

- `hugo.toml` → `[params] updated = "YYYY-MM-DD"`
- `data/site.yaml` 的统计由数据自动计算，无需手改；若修改预设/组织文案，同步 `data/en|ru|ja/site.yaml`
- 首页/页尾/关于页会读取该日期。

## 8. 提交

```bash
git add data scripts static content layouts assets hugo.toml
git commit -m "data: add CH32V006K8U7 and refresh power figures"
```

- 一次提交只做一类变更（新增器件 / 修参数 / 模板），便于回滚；
- 不要提交 `public/`、`.hugo_build.lock`；
- 除非用户明确要求，**不要 push**；push 到 `main` 会触发 GitHub Pages 部署。

## 9. 常见坑

- **ID 重复**：不同厂商文件里用了同一个 `id`，normalize 会报错；ID 用 `vendor-part` 前缀。
- **功耗单位**：数据手册给 mA@MHz 时换算成 µA/MHz，并在 `power.note` 保留原始条件。
- **无片内 Flash**：写 `flash_kb: 0`，在 `notes` 说明外挂方式；页面会显示“无”。
- **IP 归属地**：自研写厂商简称（如“沁恒自研”），授权核写“平头哥玄铁 / 芯来 Nuclei / SiFive / 晶心 Andes”，不要把公司归属地当成 IP 归属地。
- **厂商名**：用简称；完整法定名会导致筛选器出现超长选项。
- **日期**：`updated` 用 `YYYY-MM-DD`，YAML 不加引号也可以，normalize 会统一。
- **Hugo 数据可用性**：模板必须读 `hugo.Data.mcus` / `hugo.Data.ips` / `hugo.Data.ais`（normalize 生成的合并文件），不要直接读 `hugo.Data.mcu`（分文件 map，元素类型会导致模板报错）。
- **i18n 键集**：只改中文 `i18n/zh.yaml` 会让 en/ru/ja 回退成中文；`check_i18n.py` 会报 missing/extra/占位符不一致。
- **链接语言前缀**：模板内链用 `relLangURL`，JS 内链用 `urlFor()`（已按 `I18N.lang` 加前缀）；不要硬编码 `/mcu/`。
- **主题色**：新增组件时优先用 CSS 变量（`--surface`、`--ink`、`--line`），否则暗色模式会出现白底。
- **query 链接**：动态 query 一律 `safeURL`；静态 `/en/mcu/` 手写链接要带语言前缀。
