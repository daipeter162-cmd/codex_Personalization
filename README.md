# Codex 个性化启动动画

复刻 `refer/personalization.mp4`：Codex 启动时黑屏 → 左侧打字代码 + 右侧霓虹线稿与脸部网格 + 光带/流星 → 从脸部向外显现全彩原图 → 淡入主界面，图片留作半透明背景。

不修改 Codex 安装包：`launch.js` 用 `--remote-debugging-port` 启动 Codex，通过 DevTools 协议把 `src/splash.js` 和 `src/background.css` 注入主窗口。

## 使用
1. 换图：替换 `assets/character.png`（或改 `config.json` 的 `imagePath`）
2. 双击桌面 **Codex Splash**（`install-shortcut.ps1` 创建），或运行 `node launch.js`
3. 启动前须彻底退出 Codex（含托盘）；若已在运行，`node launch.js --force` 会强制关闭后重启
4. 动画中按 Esc / 回车 / 点击可跳过

## config.json
| 字段 | 说明 |
|---|---|
| `splash` | `false` 只要背景不要动画 |
| `duration` | 动画总时长 ms |
| `meshCenter` / `meshRadius` | 脸部网格位置（相对图片宽高的比例）和半径；换图后要调 |
| `bgOpacity` | 主界面背景图不透明度 |
| `bgPosition` | 背景图 `background-position` |
| `surfaceAlpha` | 聊天区底色不透明度（越大文字越清楚） |

## 调效果
`preview.html` 需要通过 http 打开（file:// 下 canvas 读不了像素）：
```bash
npx --yes http-server@14.1.1 -p 8765 -c-1
```
然后访问 http://localhost:8765/preview.html

## 说明
- 启动器在 Codex 运行期间常驻（隐藏），保证 Ctrl+R 刷新后背景仍在；Codex 退出时自动结束。日志在 `launch.log`
- 调试端口只监听 127.0.0.1，但本机其他程序都能连上去控制 Codex，不需要时用原图标启动即可
- 依赖 Codex 的 DOM 结构（`main[data-app-shell-main-surface="default"]`、`.sidebar-navigation`），Codex 更新后背景样式可能需要调整
