import { execSync } from 'node:child_process'
import { createWriteStream, existsSync, mkdirSync, rmSync, chmodSync, copyFileSync, cpSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'
import { createGunzip } from 'node:zlib'
import { Readable } from 'node:stream'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const NODE_VERSION = process.env.NODE_VERSION || process.version.slice(1)
const NODE_DIST_URL = process.env.NODE_DIST_URL || 'https://nodejs.org/dist'
const PLATFORM = process.argv[2]

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
const APP_VERSION = pkg.version

if (!PLATFORM || !['linux', 'win'].includes(PLATFORM)) {
  console.error('用法: node scripts/package.mjs <linux|win>')
  process.exit(1)
}

const PLATFORM_CONFIG = {
  linux: {
    nodeUrl: `${NODE_DIST_URL}/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz`,
    nodeBinary: 'node',
    startScripts: [
      {
        name: 'start.sh',
        content: `#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/node" --env-file="$DIR/.env" "$DIR/.output/server/index.mjs"
`,
        executable: true,
      },
    ],
    isLocalMatch: () => process.platform === 'linux' && process.arch === 'x64',
  },
  win: {
    nodeUrl: `${NODE_DIST_URL}/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip`,
    nodeBinary: 'node.exe',
    startScripts: [
      {
        name: 'start.cmd',
        content: `@echo off
cd /d "%~dp0"
node --env-file=.env .output\\server\\index.mjs
`,
        executable: false,
      },
    ],
    isLocalMatch: () => process.platform === 'win32' && process.arch === 'x64',
  },
}

const config = PLATFORM_CONFIG[PLATFORM]
const outName = `star-agent-chatui-v${APP_VERSION}-${PLATFORM}-x64`
const distDir = join(ROOT, 'dist', outName)

async function downloadFile(url, dest) {
  console.log(`下载 ${url} ...`)
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`下载失败: ${res.status} ${res.statusText}`)
  const fileStream = createWriteStream(dest)
  await pipeline(Readable.fromWeb(res.body), fileStream)
  console.log(`下载完成: ${dest}`)
}

async function extractTarXz(archive, dest) {
  execSync(`tar -xJf "${archive}" -C "${dest}" --strip-components=1`, { stdio: 'inherit' })
}

async function extractZip(archive, dest) {
  execSync(`unzip -q -o "${archive}" -d "${dest}_tmp"`, { stdio: 'inherit' })
  const subdirs = execSync(`ls "${dest}_tmp"`, { encoding: 'utf-8' }).trim().split('\n')
  if (subdirs.length === 1) {
    execSync(`mv "${dest}_tmp/${subdirs[0]}"/* "${dest}/"`, { stdio: 'inherit' })
  } else {
    execSync(`mv "${dest}_tmp"/* "${dest}/"`, { stdio: 'inherit' })
  }
  rmSync(`${dest}_tmp`, { recursive: true, force: true })
}

async function getNodeBinary() {
  const nodeDir = join(ROOT, '.cache', `node-v${NODE_VERSION}-${PLATFORM}-x64`)
  const binaryPath = join(nodeDir, PLATFORM === 'win' ? 'node.exe' : 'bin/node')

  if (existsSync(binaryPath)) {
    console.log(`使用缓存的 Node.js: ${binaryPath}`)
    return binaryPath
  }

  if (config.isLocalMatch()) {
    console.log('使用本地 Node.js')
    return process.execPath
  }

  console.log(`本地 Node.js 与目标平台不匹配，准备下载...`)
  rmSync(nodeDir, { recursive: true, force: true })
  mkdirSync(nodeDir, { recursive: true })

  const tmpDir = join(ROOT, '.cache', 'tmp')
  mkdirSync(tmpDir, { recursive: true })

  const archiveName = config.nodeUrl.split('/').pop()
  const archivePath = join(tmpDir, archiveName)

  await downloadFile(config.nodeUrl, archivePath)

  if (archiveName.endsWith('.tar.xz')) {
    await extractTarXz(archivePath, nodeDir)
  } else if (archiveName.endsWith('.zip')) {
    await extractZip(archivePath, nodeDir)
  }

  rmSync(tmpDir, { recursive: true, force: true })

  if (!existsSync(binaryPath)) {
    throw new Error(`Node.js 二进制未找到: ${binaryPath}`)
  }

  return binaryPath
}

async function main() {
  console.log(`\n=== 打包 ${outName} ===\n`)

  // 1. 执行 build
  console.log('执行 pnpm build ...')
  execSync('pnpm build', { cwd: ROOT, stdio: 'inherit' })

  // 2. 获取 Node.js 二进制
  const nodeBinary = await getNodeBinary()

  // 3. 清理并创建分发目录
  rmSync(distDir, { recursive: true, force: true })
  mkdirSync(distDir, { recursive: true })

  // 4. 复制 Node.js 二进制
  const destBinary = join(distDir, config.nodeBinary)
  copyFileSync(nodeBinary, destBinary)
  if (PLATFORM === 'linux') {
    chmodSync(destBinary, 0o755)
  }
  console.log(`已复制 Node.js: ${config.nodeBinary}`)

  // 5. 复制 .output 目录
  const outputSrc = join(ROOT, '.output')
  const outputDest = join(distDir, '.output')
  cpSync(outputSrc, outputDest, { recursive: true })
  console.log('已复制 .output/')

  // 6. 复制 .env.example
  const envExample = join(ROOT, '.env.example')
  if (existsSync(envExample)) {
    copyFileSync(envExample, join(distDir, '.env.example'))
    console.log('已复制 .env.example')
  }

  // 7. 创建启动脚本
  for (const script of config.startScripts) {
    const scriptPath = join(distDir, script.name)
    writeFileSync(scriptPath, script.content)
    if (script.executable) {
      chmodSync(scriptPath, 0o755)
    }
    console.log(`已创建启动脚本: ${script.name}`)
  }

  // 8. 打包
  const archiveDir = join(ROOT, 'dist')
  const archivePath = join(archiveDir, `${outName}.tar.gz`)
  execSync(`tar -czf "${archivePath}" -C "${archiveDir}" "${outName}"`, { stdio: 'inherit' })
  console.log(`\n打包完成: dist/${outName}.tar.gz`)
}

main().catch((err) => {
  console.error('打包失败:', err.message)
  process.exit(1)
})
