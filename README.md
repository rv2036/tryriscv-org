# tryriscv.org

面向 RISC-V 选型的公开情报站：把分散在厂商官网、数据手册与公开资料里的 **MCU、IP 核、解决方案与 AI 算力**整理成可筛选、可对比、可追溯来源的结构化数据。

- 线上站点：<https://tryriscv.org/>
- MCU 选型：<https://tryriscv.org/mcu/>
- 反馈与需求：[GitHub Issues](https://github.com/rv2036/tryriscv-org/issues)

## 现在有什么

| 模块 | 内容 | 入口 |
| --- | --- | --- |
| MCU | 9 家厂商、73 款 RISC-V MCU / 无线 SoC，按厂商、IP 品牌、归属地、主频、SRAM、Flash、动态/休眠/待机功耗、外设、ADC、封装、电压、温度、生态筛选，最多 4 款并排对比 | `/mcu/` |
| IP | 23 个 RISC-V CPU IP：平头哥玄铁、芯来、赛昉、SiFive、晶心、蜂鸟、香山，按品牌、归属地、位宽、特性、授权与成熟度筛选 | `/ip/` |
| 解决方案 | IoT 产教融合、电池传感、BLE、Wi-Fi、电机控制、工业边缘 6 个方案包，含推荐器件、取舍与一键筛选 | `/solutions/` |
| AI 算力 | 13 条 NPU IP / AI SoC 记录，标注 RISC-V 与 ARM 对照；后续扩展模型/软件版本匹配成熟度 | `/ai/` |
| 生态图谱 | 国内外联盟、工具链、RTOS、开发板与社区入口 | `/ecosystem/` |

首页提供四个大入口（选 MCU / 选 IP / 选解决方案 / 选 AI 算力）与一个【我想选】按钮，直达 GitHub Issue 表单。

## 本地开发

依赖：Hugo **0.169.0 extended**、Python 3.10+、PyYAML。

```bash
git clone https://github.com/rv2036/tryriscv-org
cd tryriscv-org

python3 -m pip install --user pyyaml
python3 scripts/normalize.py        # 校验 data/ 并生成 data/mcus.yaml、static/data/*.json

hugo server --buildDrafts           # http://localhost:1313
# 或只构建
hugo --minify --gc
```

没有系统 Hugo 时，可把官方 `hugo_extended_0.169.0_linux-amd64` 解压到任意目录，用绝对路径执行。

构建顺序很重要：**先 normalize，再 hugo**。Hugo 读取的是 normalize 生成的 `data/mcus.yaml`、`data/ips.yaml`、`data/ais.yaml`；`data/mcu/*.yaml` 才是人工/AI 维护的事实来源。

## 数据流水线

```text
厂商官网 / 数据手册 / 官方 SDK
        │  人工或 AI 抓取（保留 URL 与置信度）
        ▼
data/mcu/<vendor>.yaml        ← 唯一事实来源
data/ip.yaml  data/ai.yaml
        │  python3 scripts/normalize.py
        │  ├─ 校验必填字段、ID 唯一、数值范围、URL
        │  ├─ 统一字段别名（max_freq_mhz → freq 等）
        │  └─ 生成 data/mcus.yaml + static/data/mcus.json / mcus.csv
        ▼
hugo --minify
        ▼
public/ → GitHub Pages
```

`static/data/mcus.json`、`mcus.csv` 也是公开数据接口，可用于二次分析。

### 数据规则

- **不编造数字**：未公开的字段写 `null`，页面显示“—”，不估算。
- **每条记录必须有 `sources`**（实际打开过的官方 URL）与 `confidence`（high/medium/low）。
- 功耗注明测试条件；由 mA@MHz 换算的 µA/MHz 在 `power.note` 里说明。
- 同一型号只在一条记录中出现；封装变体最多保留 2–4 个代表型号。
- 价格只写公开可核验的批量参考价，并注明渠道与日期；没有就留空。

字段定义见 [`research/SCHEMA.md`](research/SCHEMA.md)。

## 目录结构

```text
.
├── content/                 # 页面内容（Hugo content adapter 生成 MCU/IP 详情页）
│   ├── mcu/_content.gotmpl
│   └── ip/_content.gotmpl
├── data/
│   ├── mcu/*.yaml           # 事实来源：按厂商分文件
│   ├── mcus.yaml            # 生成物：合并 + 规范化（勿手改）
│   ├── ip.yaml / ips.yaml
│   ├── ai.yaml / ais.yaml
│   ├── solutions.yaml
│   ├── ecosystem.yaml
│   └── site.yaml
├── layouts/                 # Hugo 模板（baseof、首页、筛选页、详情页）
├── assets/css|js            # 无外部依赖的样式与前端筛选/对比逻辑
├── static/data/             # 生成物：前端 JSON / CSV
├── scripts/normalize.py     # 校验 + 生成
├── scripts/check_links.py   # 来源链接巡检
├── research/                # 原始调研 YAML 与字段说明
├── docs/DAILY-UPDATE.md     # 每日更新手册
├── skills/                  # 可复用更新技能（同步到 .dsh/skills）
└── .github/workflows/hugo.yml
```

## 部署

1. 仓库 Settings → Pages → Source 选择 **GitHub Actions**；
2. 自定义域名 `tryriscv.org` 已通过 `static/CNAME` 声明，DNS 指向 GitHub Pages；
3. push 到 `main` 触发 `.github/workflows/hugo.yml`：安装 Python/Hugo → 校验数据 → 构建 → 上传 → 部署。

## 每日更新

见 [`docs/DAILY-UPDATE.md`](docs/DAILY-UPDATE.md) 与 [`skills/tryriscv-daily-update/SKILL.md`](skills/tryriscv-daily-update/SKILL.md)。核心命令：

```bash
python3 scripts/normalize.py
python3 scripts/check_links.py
hugo --minify --gc
```

## 贡献

- 数据纠错：用 [数据错误报告](https://github.com/rv2036/tryriscv-org/issues/new?template=data-error.yml) 表单，带上型号与来源；
- 推荐器件：[新器件](https://github.com/rv2036/tryriscv-org/issues/new?template=new-device.yml)；
- 选型需求：[我想选](https://github.com/rv2036/tryriscv-org/issues/new?template=selection-request.yml)；
- 代码/数据 PR：先跑 `normalize.py` 与 `hugo`，确保 CI 通过。

## 免责声明

本站数据由 AI 从公开网络自动抓取、整理与生成，可能存在错误、遗漏或版本滞后。选型与量产前请以厂商最新数据手册为准。本站不接受厂商付费排名，与各厂商无隶属关系。

## 许可

- 代码：MIT
- 整理后的数据：CC BY 4.0（转载注明来源并链接回 <https://tryriscv.org/>）
