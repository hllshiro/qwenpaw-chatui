# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- 聊天页面新增消息头像，用户消息显示用户图标，助手消息显示品牌图标，头像带有圆形边框和内边距
- 设置中新增用户消息样式和助手消息样式选项（设置 > 外观 > 主题），支持实体、轮廓、柔和、软边、无边框五种气泡风格

### Changed

- 优化导航栏背景透明度，提升视觉效果
- 聊天消息操作按钮（复制等）现在默认隐藏，鼠标悬停时显示，减少视觉干扰
- 统一聊天输入框提交按钮样式，按钮右对齐显示
- 侧边栏改进：支持手动折叠切换，按钮增加悬停提示和手型光标
- 调整搜索和新建会话按钮的顺序，布局更合理

### Fixed

- 修复清除浏览器缓存后主题设置（明暗模式）丢失的问题
- 修复会话菜单的显示和交互问题（包括无法显示、触发和偶尔闪烁的问题）
- 修复服务端口被占用时程序静默退出的问题，现在会显示错误信息并正常退出
- 修复输入框内容无法正确缓存的问题，刷新页面后输入内容不再丢失
- 修复展开状态设置按钮点击区域过小的问题，现在整行可点击
- 修复侧边栏折叠状态下的对齐、按钮选中状态等细节问题
