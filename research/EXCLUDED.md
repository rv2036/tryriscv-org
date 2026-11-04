# 已排除的非 RISC-V 器件 / Excluded non-RISC-V parts

本文件记录**曾被误收或容易被误认为 RISC-V** 的型号，避免后续更新再次写入。

## 联盛德 Winner Micro W800 / W801 / W806

- **结论：不是 RISC-V，已从 MCU 数据中移除。**
- 官方 W800 规格书只写 “32 位 XT804 处理器”，未声明 RISC-V。
- XT804 即玄铁 E804；平头哥玄铁产品目录把 E804 归在“基于 C-SKY 架构 玄铁 8 系列”，与 E902/E906/C906 等 RISC-V 核分开。
- 官方 W800 SDK 与 W806 SDK 均使用 `csky-elfabiv2` 工具链，而不是 RISC-V GCC。
- 参考：
  - W800 规格书（V3.1）：http://doc.winnermicro.net/download/soc_pdf/w800/chip_specification.pdf
  - W800 SDK 文档中的 `csky-elfabiv2-tools` 安装说明
  - 玄铁 E804 产品页：https://www.xrvm.cn/product/xuantie/E804

## 其他不纳入的架构

- **Fortior FU68xx**：8051 + ME 双核，不是 RISC-V（仅 FU75xx 为 RISC-V）。
- **GigaDevice GD32F / GD32E 等 ARM 系列**：Cortex-M，不要与 GD32V 混淆。
- **芯昇 CM32M101A / CM32M10xA**：Cortex-M4。
- **国民技术 N32 系列**：Cortex-M4/M7。
- **航顺 HK32 系列**：ARM 为主，未找到可核验的量产 RISC-V 型号。
- **芯海科技**：官方口径暂无 RISC-V 芯片。
- **联盛德 W600**：Cortex-M3。

> 如果厂商后续发布真正的 RISC-V 型号，请附官方数据手册与工具链证明后再收录。
