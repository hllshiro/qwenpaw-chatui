import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, chmodSync, copyFileSync, cpSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
const APP_VERSION = pkg.version

const PLATFORM_MAP = {
  linux: {
    nodeBinary: 'node',
    startScripts: [
      {
        name: 'start.sh',
        content: `#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$DIR/.env" ]; then
  exec "$DIR/node" --env-file="$DIR/.env" "$DIR/.output/server/index.mjs"
else
  exec "$DIR/node" "$DIR/.output/server/index.mjs"
fi
`,
        executable: true,
      },
    ],
  },
  win32: {
    nodeBinary: 'node.exe',
    startScripts: [
      {
        name: 'start.cmd',
        content: `@echo off
cd /d "%~dp0"
if exist .env (
  node --env-file=.env .output\\server\\index.mjs
) else (
  node .output\\server\\index.mjs
)
`,
        executable: false,
      },
    ],
  },
}

const PLATFORM = process.platform
const config = PLATFORM_MAP[PLATFORM]
if (!config) {
  console.error(`不支持的平台: ${PLATFORM}`)
  process.exit(1)
}

const platformLabel = PLATFORM === 'win32' ? 'win' : 'linux'
const outName = `star-agent-chatui-v${APP_VERSION}-${platformLabel}-x64`
const distDir = join(ROOT, 'dist', outName)

async function main() {
  // 检查 Node.js 版本，--env-file 参数需要 20.6.0+
  const nodeVersion = process.version
  const versionMatch = nodeVersion.match(/^v(\d+)\.(\d+)\.(\d+)/)
  if (versionMatch) {
    const major = parseInt(versionMatch[1], 10)
    const minor = parseInt(versionMatch[2], 10)
    const patch = parseInt(versionMatch[3], 10)
    if (major < 20 || (major === 20 && minor < 6)) {
      console.error(`错误: Node.js 版本过低 (当前: ${nodeVersion})`)
      console.error('--env-file 参数需要 Node.js 20.6.0 或更高版本')
      console.error('请升级 Node.js 后重试')
      process.exit(1)
    }
  } else {
    console.warn(`警告: 无法解析 Node.js 版本: ${nodeVersion}，跳过版本检查`)
  }

  console.log(`\n=== 打包 ${outName} ===\n`)

  // 1. 执行 build
  console.log('执行 pnpm build ...')
  execSync('pnpm build', { cwd: ROOT, stdio: 'inherit' })

  // 2. 清理并创建分发目录
  rmSync(distDir, { recursive: true, force: true })
  mkdirSync(distDir, { recursive: true })

  // 3. 复制 Node.js 二进制
  const destBinary = join(distDir, config.nodeBinary)
  copyFileSync(process.execPath, destBinary)
  if (PLATFORM !== 'win32') {
    chmodSync(destBinary, 0o755)
  }
  console.log(`已复制 Node.js: ${config.nodeBinary}`)

  // 4. 复制 .output 目录
  const outputSrc = join(ROOT, '.output')
  const outputDest = join(distDir, '.output')
  cpSync(outputSrc, outputDest, { recursive: true })
  console.log('已复制 .output/')

  // 5. 复制 .env.example
  const envExample = join(ROOT, '.env.example')
  if (existsSync(envExample)) {
    copyFileSync(envExample, join(distDir, '.env.example'))
    console.log('已复制 .env.example')
  }

  // 6. 创建启动脚本
  for (const script of config.startScripts) {
    const scriptPath = join(distDir, script.name)
    writeFileSync(scriptPath, script.content)
    if (script.executable) {
      chmodSync(scriptPath, 0o755)
    }
    console.log(`已创建启动脚本: ${script.name}`)
  }

  // 7. 打包
  const archiveDir = join(ROOT, 'dist')
  const archivePath = join(archiveDir, `${outName}.tar.gz`)
  execSync(`tar -czf "${archivePath}" -C "${archiveDir}" "${outName}"`, { stdio: 'inherit' })
  console.log(`\n打包完成: dist/${outName}.tar.gz`)
}

main().catch((err) => {
  console.error('打包失败:', err.message)
  process.exit(1)
})
