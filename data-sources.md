# 天球数据来源记录

本版本使用两类公开数据。第一类是 HYG Stellar Database v4.1，下载自其 GitHub 公开归档中的 `hyg/CURRENT/hygdata_v41.csv`。数据包含 HR 编号、赤经 `ra`、赤纬 `dec`、视星等 `mag`、颜色指数 `ci`、恒星名称等字段；本项目筛选视星等不超过 6.35 的恒星，并额外保留星座连线引用到的节点。HYG 项目说明其数据使用 CC BY-SA 4.0 授权。

第二类是 Marc van der Sluys 的 ConstellationLines v1.3，来自 Zenodo DOI 10.5281/zenodo.10397192。该数据覆盖 88 个星座，使用 Bright Star Catalogue 编号描述“星座棍棒图”连线；`ConstellationLines.csv` 的字段为星座缩写、节点数量和 BSC 编号序列，项目文件说明使用 CC BY 4.0 授权。本项目将 BSC 编号与 HYG 中的 HR 编号关联后绘制星座线。

实现上，赤经/赤纬被转换为单位球面的三维方向向量；鼠标拖动改变天球 yaw/pitch，使用角距离视场投影映射到全屏 canvas，因此不会出现二维平移时的图片边缘。页面显示数据来源版本、星点数量和星座数量，作为观测界面的透明说明。

## 参考来源

1. HYG Database: https://github.com/astronexus/HYG-Database
2. HYG current data directory: https://github.com/astronexus/HYG-Database/tree/main/hyg/CURRENT
3. ConstellationLines v1.3: https://zenodo.org/doi/10.5281/zenodo.10397192
4. IAU constellations reference: https://iauarchive.eso.org/public/themes/constellations/
