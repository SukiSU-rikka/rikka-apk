# 构建说明

## 源码结构
- `src/`：网页层源码（HTML/JS/CSS + 题库 exam-bank.json），与 v3.2.x 安装包 `assets/` 里的同名文件一一对应。
  大数据文件（`dict/`、`aozora-*`、`reading-dictionary.json`、`study-*.json`、`vendor/`、`icons/`）没有放进仓库，直接沿用上一版安装包里的。
- `native/glass/`：原生液态玻璃底栏（`cn.hanayomi.glass`）的 Java 源码；`native/smali-patch/`：MainActivity 的一行挂接补丁。
- `build/repack.py`：增量打包脚本（在上一版 APK 上替换文件，输出未签名、已对齐的 APK）。
- `build/build.py`：早期（v2.x）的全量打包脚本，仅供参考。

## 增量构建（v3.2.3 起的做法）
1. **只改了网页层**：直接用 `repack.py` 替换 `assets/` 里改动的文件。
2. **改了底栏 Java**：
   - `javac --release 8 -cp android.jar -d out native/glass/*.java`（android.jar 用 API 33 及以上）
   - 把改动的类转成 dex（d8 或 dx，`--min-api 26`），`baksmali` 出 smali
   - 用 `baksmali` 拆开上一版的 `classes.dex`，替换 `cn/hanayomi/glass/` 下对应的 smali，再 `smali a --api 21` 汇编回 `classes.dex`（**替换**，不是追加；`classes2.dex` 不动）
3. 打包：
   ```
   python3 build/repack.py rikka-v3.2.2.apk rikka-v3.2.3-unsigned.apk --web src --file exam-check.js exam.js exam-mock.js exam-real.js index.html --dex classes.dex --code 119 --name 3.2.3
   ```
   - 清单只原位改 versionCode 和等长的 versionName，**不加任何属性**，其余条目原样拷贝。
4. 签名（必须用同一个 `rikka.p12`，v1+v2+v3 全开）：
   ```
   apksigner sign --ks rikka.p12 --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out rikka-v3.2.3.apk rikka-v3.2.3-unsigned.apk
   ```
   ```
   apksigner verify --verbose --print-certs rikka-v3.2.3.apk
   ```
   证书指纹应以 `6ef40d7c` 开头。签名后不要再改动 APK。
