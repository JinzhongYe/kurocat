# 星星小医生 / Star Doctor

这个 Fork 新增独立角色 `star-doctor`。键盘场景保留黄色星星帽、橙色圆脸、红脸颊、白大褂和听诊器，双手可以独立敲键和操作鼠标。带医疗箱的完整原始插画仍保存在素材目录。

## 下载和使用

1. 打开此仓库的 **Releases** 下载最新的 Star Doctor 预览版；Actions 成功运行的 **KuroCat-Star-Doctor-Windows-x64** 也包含构建结果。
2. 安装版文件名以 `setup.exe` 结尾；便携版解压后运行 `KuroCat.exe`。
3. 先退出正在运行的旧版 KuroCat。安装到原目录会更新原安装；使用便携版无需覆盖原目录。
4. 右键角色，在“角色外观”中选择“星星小医生”。系统托盘菜单也提供这个角色。

本版本复用原版配置目录、单实例锁和 MCP 端口，因此两个版本不要同时运行。

## 支持的行为

- 使用透明 PNG 的 2D 完整形象，并自动避开 3D 猫形渲染。
- 复用猫咪的 65/108 键盘、双向键帽、鼠标、按键高亮与气泡。
- 复用同一套左右手分配、长按停留、弹性移动和鼠标跟随，手臂为白袖黄手。
- 复用猫咪的眨眼、目光跟随、睡眠、唤醒、摸头、好奇、生气和任务完成表情，隐私模式闭眼并遮眼。
- 保留拖动、缩放、点击穿透、隐私模式、任务状态气泡和 OBS 透明源。
- MCP 可通过 `switch_cat` 的 `{"id":"star-doctor"}` 切换角色。

角色使用 2D 身体素材和独立绘制的活动手臂、眼睛，没有 3D 模型。医生没有尾巴或猫耳，相关几何动作不添加到医生造型上；原本交给尾巴的按键由双手处理。尾巴、项圈和耳机控件对这个角色不适用。

如果继续使用现有 Codex Hook 或 MCP 配置，需要把可执行文件路径指向此版本的 `KuroCat.exe`；指向原安装目录仍会调用原版。

## 分享和开发

可以分享下载的压缩包和本仓库链接，保留仓库的 MIT 许可证。角色图片位于 `src/assets/star-doctor.png`，由用户提供的参考图生成；参考原图未打包。

本 Fork 的更新检查只查询 `JinzhongYe/kurocat`，避免上游安装包覆盖新增角色。

前端验证：`npm ci`、`node --test tests/starDoctor.test.mjs tests/starDoctorActions.test.mjs`、`npm run build`。
Windows 可执行文件由 GitHub Actions 配置 Rust 后构建。浏览器中可用 `/obs.html?breed=star-doctor&mode=3d` 检查自动降级到 2D 的角色显示。
