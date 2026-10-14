# notion-enhancer/desktop

Customise the all-in-one productivity workspace Notion.

[read the docs online](https://notion-enhancer.github.io/)

## 生成浏览器扩展

需要 Node.js 18 或更新版本。在项目根目录运行：

```powershell
npm run build
```

也可以使用 `npm run build:browser` 或 `node scripts/build-browser-extension.mjs`。构建只使用 Node.js 内置模块，无需先安装 npm 依赖，也无需 Bash、zip 或联网下载。

- `dist/extension/`：在 Chrome / Edge 的扩展管理页面开启开发者模式，选择“加载解压缩的扩展程序”并加载此目录。
- `dist/notion-enhancer-0.11.1.zip`：用于分发或解压后加载，ZIP 根目录包含 `manifest.json`。

修改 `src/` 后重新构建，再重新加载浏览器扩展并刷新 Notion。每次构建会重新生成 `dist/extension/`。

## 已迁移功能

使用当前仓库的新版菜单和配置结构，已接入此前项目的以下功能：

- official mermaid：Mermaid 12.1.0 本地依赖、CSP nonce 注入、Rspack 模块接管、已缓存模块恢复和 mindmap 布局回退；开关接入新版 profile。
- Line Numbers：修复末行计数、减少行数后残留、文本节点编辑、折行高度与宽度变化；保留新版 `numberSingleLines` 和 `decorationStyle` 选项。
- 域名与路由：支持 `notion.so`、`notion.site`、`app.notion.com` 及对应子域名，移除旧版页面路径和登录缓存标记的限制。
- 菜单：侧栏结构变化时使用备用挂载位置，侧栏重新创建后恢复入口，更新检查不阻塞入口；扩展设置中的“选项”可打开独立菜单。
- 后台：支持上述域名的标签页导航、重新加载及自定义脚本注册；userScripts API 不可用时仍可使用其他插件。

在菜单中完成首次确认，然后启用 **official mermaid** 和 **Line Numbers**。切换 Mermaid 后刷新 Notion。旧版 `profiles/currentprofile` 配置不会自动转换；旧主题和 Stylus 样式仍需按新版结构适配。

## 验证

```powershell
npm run verify
npm test
npm run test:browser
```

浏览器测试需要 Node.js 22 或更新版本，默认使用 Windows 上的 Edge 和独立临时 profile。其他浏览器可分别运行 `node scripts/test-browser.cjs <浏览器路径>` 和 `node scripts/test-mermaid-browser.cjs <浏览器路径>`。测试不访问已登录的 Notion 工作区，实际页面仍需手动确认。
