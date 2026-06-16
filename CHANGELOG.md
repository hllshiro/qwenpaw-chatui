# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- 聊天页面新增消息头像，用户消息显示用户图标，助手消息显示品牌图标，头像带有圆形边框和内边距
- 设置中新增用户消息样式和助手消息样式选项（设置 > 外观 > 主题），支持实体、轮廓、柔和、软边、无边框五种气泡风格

### Changed

- 完善 AGENTS.md 指令文件，补充遗漏的命令、环境变量和架构说明，帮助 AI 助手更准确地理解项目
- 提取 BrandIcon 组件，统一品牌图标显示逻辑（支持图片和图标两种形式）
- 优化导航栏背景透明度，提升视觉效果
- 聊天消息操作按钮（复制等）现在默认隐藏，鼠标悬停时显示，减少视觉干扰
- 统一聊天输入框提交按钮样式，按钮右对齐显示
- 提取 ChatInput 组件，统一首页和聊天页的输入框逻辑，减少重复代码

- 简化打包脚本，移除跨平台 Node.js 下载逻辑，改为使用当前环境的 Node.js 进行打包
- 合并 `package:linux` 和 `package:win` 命令为统一的 `package` 命令，自动检测当前平台
- `.env` 文件变为可选：启动时如果文件不存在则使用代码中的默认配置

### Fixed

- 修复清除浏览器缓存后主题设置（明暗模式）丢失的问题
- 修复侧边栏会话列表中操作菜单（重命名、删除）无法显示和触发的问题
- 修复服务端口被占用时程序静默退出的问题，现在会显示错误信息并正常退出
- 修复输入框内容无法正确缓存的问题，刷新页面后输入内容不再丢失
- 修复展开状态设置按钮点击区域过小的问题，现在整行可点击

### Removed

- 将 `docs/superpowers` 目录从版本控制中移除（本地文件保留）
