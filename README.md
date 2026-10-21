# Codex 个性化启动动画

复刻 `refer/personalization.mp4`：Codex 启动时黑屏 → 左侧打字代码 + 右侧霓虹线稿与脸部网格 + 光带/流星 → 从脸部向外显现全彩原图 → 淡入主界面，图片留作半透明背景。

不修改 Codex 安装包：`launch.js` 用 `--remote-debugging-port` 启动 Codex，通过 DevTools 协议把 `src/splash.js` 和 `src/background.css` 注入主窗口。

## 使用
1. 双击桌面 **Codex Splash**（`install-shortcut.ps1` 创建），或运行 `node launch.js`
2. 启动前须彻底退出 Codex（含托盘）；若已在运行，`node launch.js --force` 会强制关闭后重启
3. 动画中按 Esc / 回车 / 点击可跳过

## 定制（不用改代码）
打开定制页 `customize.html`：
1. 选择或拖入图片
2. 在图片上点击脸的中心，用滑块或滚轮调网格半径
3. 调时长、线稿配色、光带颜色、打字代码，以及主界面背景的浓淡和位置
4. 点「播放预览」看完整动画；满意后「下载 config.json」
5. 用下载的文件覆盖项目根目录的 `config.json`，把图片复制到 `imagePath` 写的位置（默认 `assets/`）
6. 重启 Codex（用 Codex Splash 快捷方式）

定制页直接双击打开就能用。从项目目录用 http 打开时，会自动载入当前的 config.json 和图片：
```bash
npx --yes http-server@14.1.1 -p 8765 -c-1
```
然后访问 http://localhost:8765/customize.html

## config.json
| 字段 | 说明 |
|---|---|
| `imagePath` | 图片路径（相对项目根目录） |
| `splash` | `false` 只要背景不要动画 |
| `duration` | 动画总时长 ms，各阶段按比例缩放 |
| `meshCenter` / `meshRadius` | 脸部网格中心（相对图片宽高的比例）和半径（占图片宽度）；彩色原图也从这里开始显现 |
| `palette` | 霓虹线稿沿画面循环的颜色（hex 数组） |
| `arcColors` | 弧形光带颜色（hex 数组，几种颜色就几条光带） |
| `code` | 打字代码，每行一个字符串；`null` 用内置文本 |
| `bgOpacity` | 主界面背景图不透明度 |
| `bgPosition` | 背景图 `background-position` |
| `surfaceAlpha` | 聊天区底色不透明度（越大文字越清楚） |
| `debugPort` | 本机调试端口 |

`preview.html` 是早期的单独预览页，同样需要 http 打开（file:// 下 canvas 读不了相对路径图片的像素）。

## 说明
- 启动器在 Codex 运行期间常驻（隐藏），保证 Ctrl+R 刷新后背景仍在；Codex 退出时自动结束。日志在 `launch.log`
- 调试端口只监听 127.0.0.1，但本机其他程序都能连上去控制 Codex，不需要时用原图标启动即可
- 依赖 Codex 的 DOM 结构（`main[data-app-shell-main-surface="default"]`、`.sidebar-navigation`），Codex 更新后背景样式可能需要调整
