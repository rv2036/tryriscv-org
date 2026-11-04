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
hugo --minify --gc
```

## 1. 今天查什么（按优先级）

1. **厂商新品 / 新系列**：沁恒、兆易创新、乐鑫、博流、爱普特、先楫、联盛德、泰凌微、芯昇的“新闻 / 新产品”页；
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
4. 在 `data/site.yaml` 的厂商名录（如需要）与 `layouts/ecosystem/list.html` 的展示逻辑会自动读取，无需改模板。

## 4. 更新 IP / AI / 方案

- **IP**：`data/ip.yaml`。必填 `id/name/vendor/bits/isa/freq/license/maturity`；`features` 从 FPU、DSP、Vector、MMU、MPU、多核、AI、乱序、实时 中选；`freq` 注明随工艺变化。
- **AI**：`data/ai.yaml`。必填 `id/name/vendor/type/country`；`tops` 只写公开的 INT8 峰值，没有就 `null`；没有 benchmark 不要编造成熟度分数。
- **方案**：`data/solutions.yaml`。`recommended` 必须使用真实 MCU `id`；`query` 是 `/mcu/` 的筛选参数，更新后点开验证。

## 5. 校验与构建

```bash
python3 scripts/normalize.py          # 失败会列出文件[index]与原因
python3 scripts/check_links.py        # 输出 reports/latest-link-check.md
hugo --minify --gc
```

检查清单：

- [ ] `normalize.py` 无 error；warning 中“没有功耗数据”是否可接受；
- [ ] 新增/修改的详情页 200，标题、关键参数、来源正确；
- [ ] 筛选页能筛到新条目，URL 参数可复现；
- [ ] 移动端 390px 宽度下筛选抽屉与卡片正常；
- [ ] 页尾免责声明与 issue 链接存在；
- [ ] `data/mcus.yaml`、`static/data/*.json`、`mcus.csv` 已随源数据重新生成。

## 6. 更新快照日期

- `hugo.toml` → `[params] updated = "YYYY-MM-DD"`
- `data/site.yaml` 无需改（页面统计由数据计算）
- 首页/页尾/关于页会读取该日期。

## 7. 提交

```bash
git add data scripts static content layouts assets hugo.toml
git commit -m "data: add CH32V006K8U7 and refresh power figures"
```

- 一次提交只做一类变更（新增器件 / 修参数 / 模板），便于回滚；
- 不要提交 `public/`、`.hugo_build.lock`；
- 除非用户明确要求，**不要 push**；push 到 `main` 会触发 GitHub Pages 部署。

## 8. 常见坑

- **ID 重复**：不同厂商文件里用了同一个 `id`，normalize 会报错；ID 用 `vendor-part` 前缀。
- **功耗单位**：数据手册给 mA@MHz 时换算成 µA/MHz，并在 `power.note` 保留原始条件。
- **无片内 Flash**：写 `flash_kb: 0`，在 `notes` 说明外挂方式；页面会显示“无”。
- **IP 归属地**：自研写厂商简称（如“沁恒自研”），授权核写“平头哥玄铁 / 芯来 Nuclei / SiFive / 晶心 Andes”，不要把公司归属地当成 IP 归属地。
- **厂商名**：用简称；完整法定名会导致筛选器出现超长选项。
- **日期**：`updated` 用 `YYYY-MM-DD`，YAML 不加引号也可以，normalize 会统一。
- **Hugo 数据可用性**：模板必须读 `hugo.Data.mcus` / `hugo.Data.ips` / `hugo.Data.ais`（normalize 生成的合并文件），不要直接读 `hugo.Data.mcu`（分文件 map，元素类型会导致模板报错）。
