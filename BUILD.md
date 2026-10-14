# 构建说明

## 源码结构
- `src/`：App 前端源码（HTML/JS/CSS），v2.6.3 版本
- `build/build.py`：打包脚本

## 构建方法
1. 准备基础包 `rikka-v1.4.5.apk`（WebView 壳）
2. 把 `src/` 内容放到 `assets/` 目录
3. 运行 `python3 build/build.py`（需配置 `BASE_APK`、`KEY_PEM`、`CERT_PEM` 路径）
4. 输出签名好的 APK

## 说明
- 打包方式：解包基础 APK → 替换 assets → 重建 Manifest 字符串池 → 重新签名
- 签名证书需自行准备（`keystore/` 目录）
- 字典数据文件（`dict/`）较大，未包含在仓库中，需自行准备
