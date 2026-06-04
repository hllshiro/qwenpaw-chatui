# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- 简化打包脚本，移除跨平台 Node.js 下载逻辑，改为使用当前环境的 Node.js 进行打包
- 合并 `package:linux` 和 `package:win` 命令为统一的 `package` 命令，自动检测当前平台

### Removed

- 将 `docs/superpowers` 目录从版本控制中移除（本地文件保留）
