# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-06-18

### Added

- 聊天页面新增消息头像，区分用户和助手消息
- 设置中新增消息气泡样式选项，支持多种风格
- 配色方案新增"跟随系统"选项，自动适配操作系统主题

### Changed

- 优化导航栏视觉效果
- 优化消息操作按钮交互，悬停时显示
- 优化输入框提交按钮样式，输入为空时自动禁用
- 侧边栏改进：支持手动折叠切换，优化按钮交互体验
- 优化搜索和新建会话按钮布局
- 优化设置界面控件交互体验
- 会话页标题栏新增会话菜单，支持重命名和删除
- 替换 Markdown 渲染引擎为 markstream-vue，优化流式渲染体验
- 替换代码高亮方案为 Shiki，提升代码块渲染质量

### Fixed

- 修复缓存清除后主题设置丢失的问题
- 修复会话菜单显示和交互问题
- 修复端口占用时程序异常退出的问题
- 修复输入框内容缓存问题
- 修复设置按钮点击区域问题
- 修复侧边栏折叠状态的细节问题
- 修复消息生成过程中切换会话后状态不同步的问题
- 修复以水平线开头的消息内容无法渲染的问题
- 修复会话页面顶部消息边框被遮挡的问题
- 修复折叠侧边栏会话菜单点击后弹出层自动关闭的问题
- 修复重命名和删除弹窗中按钮缺少鼠标指针效果的问题

## [Unreleased]
