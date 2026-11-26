# 星星小医生 / Star Doctor

这个 Fork 新增独立角色 `star-doctor`，保留黄色星星帽、橙色圆脸、红脸颊、白大褂、听诊器和医疗箱。

## 下载和使用

1. 打开此仓库的 **Actions → Star Doctor Windows**，选择成功的运行记录。
2. 下载 **KuroCat-Star-Doctor-Windows-x64**，解压后找到 `KuroCat.exe`。
3. 先退出正在运行的原版 KuroCat，再启动解压后的程序；无需覆盖原安装目录。
4. 右键角色，在“角色外观”中选择“星星小医生”。系统托盘菜单也提供这个角色。

本版本复用原版配置目录、单实例锁和 MCP 端口，因此两个版本不要同时运行。原版程序保留不动，退出此版本后仍可启动原版。

## 支持的行为

- 使用透明 PNG 的 2D 完整形象，并自动避开 3D 猫形渲染。
- 呼吸、轻微摇摆、输入时上下弹动，以及休息、好奇、开心和错误标记。
- 保留拖动、缩放、点击穿透、隐私模式、任务状态气泡和 OBS 透明源。
- MCP 可通过 `switch_cat` 的 `{"id":"star-doctor"}` 切换角色。

首版使用一张全身插画，输入反馈是整体弹动，没有独立手臂敲键动画或 3D 模型。尾巴、项圈和耳机控件对这个角色不适用。

如果继续使用现有 Codex Hook 或 MCP 配置，需要把可执行文件路径指向此版本的 `KuroCat.exe`；指向原安装目录仍会调用原版。

## 分享和开发

可以分享下载的压缩包和本仓库链接，保留仓库的 MIT 许可证。角色图片位于 `src/assets/star-doctor.png`，由用户提供的参考图生成；参考原图未打包。

本 Fork 的更新检查只查询 `JinzhongYe/kurocat`，避免上游安装包覆盖新增角色。

前端验证：`npm ci`、`node --test tests/starDoctor.test.mjs`、`npm run build`。
Windows 可执行文件由 GitHub Actions 配置 Rust 后构建。浏览器中可用 `/obs.html?breed=star-doctor&mode=3d` 检查自动降级到 2D 的角色显示。
