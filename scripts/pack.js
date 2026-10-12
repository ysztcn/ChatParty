#!/usr/bin/env node

/**
 * 快速打包脚本
 *
 * 检测到 Electron 运行时未变化时，跳过 electron-builder 对约 200MB 运行时文件的
 * 全量拷贝，只重建变化的 resources\app.asar；否则执行完整的 electron-builder dir 构建。
 *
 * 触发全量重建的条件（任一）：
 * - dist/win-unpacked 或 dist/pack-meta.json 不存在
 * - Electron 版本变化（node_modules/electron）
 * - package.json 变化（版本号、build 配置、依赖）
 * - 应用图标 public/icons/chatparty-icon.png 变化
 */

const { spawnSync } = require('child_process')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const asar = require('@electron/asar')

const root = process.cwd()
const distDir = path.join(root, 'dist')
const distElectronDir = path.join(root, 'dist-electron')
const unpackedDir = path.join(distDir, 'win-unpacked')
const appAsarPath = path.join(unpackedDir, 'resources', 'app.asar')
const metaPath = path.join(distDir, 'pack-meta.json')
const iconPath = path.join(root, 'public', 'icons', 'chatparty-icon.png')
const asarSrcDir = path.join(distDir, '.asar-src')

// electron-builder 输出到 dist 根的文件，不属于应用内容，不打进 app.asar
const shouldSkipDistEntry = (entry) => {
  if (entry === 'win-unpacked' || entry === '.asar-src') return true
  if (['builder-debug.yml', 'latest.yml', '.icon-ico', 'pack-meta.json'].includes(entry)) return true
  return entry.endsWith('.exe') || entry.endsWith('.blockmap') || entry.endsWith('.yml')
}

const hashFile = (filePath) => crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')

const readBuildInputs = () => ({
  electronVersion: JSON.parse(
    fs.readFileSync(path.join(root, 'node_modules', 'electron', 'package.json'), 'utf8')
  ).version,
  packageJsonHash: hashFile(path.join(root, 'package.json')),
  iconHash: hashFile(iconPath)
})

// 命令与参数均为固定常量，拼成命令行字符串交给 shell 执行
const run = (commandLine, env = process.env) => {
  const result = spawnSync(commandLine, {
    stdio: 'inherit',
    shell: true,
    cwd: root,
    env
  })
  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

const canFastPack = (inputs) => {
  if (!fs.existsSync(path.join(unpackedDir, 'ChatParty.exe'))) return false
  if (!fs.existsSync(appAsarPath)) return false
  if (!fs.existsSync(metaPath)) return false
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
  return meta.electronVersion === inputs.electronVersion
    && meta.packageJsonHash === inputs.packageJsonHash
    && meta.iconHash === inputs.iconHash
}

const cleanForBuild = (fast) => {
  console.log(fast ? '🧹 清理构建产物（保留 win-unpacked）...' : '🧹 清理构建产物...')
  fs.rmSync(distElectronDir, {
    recursive: true,
    force: true
  })
  if (fast) {
    fs.readdirSync(distDir).forEach((entry) => {
      if (entry === 'win-unpacked') return
      fs.rmSync(path.join(distDir, entry), {
        recursive: true,
        force: true
      })
    })
  } else {
    fs.rmSync(distDir, {
      recursive: true,
      force: true
    })
  }
}

/**
 * 组装 app.asar 源目录，结构与 electron-builder 的 build.files 一致：
 * 根下 dist/、dist-electron/、package.json
 */
const assembleAsarSource = () => {
  fs.rmSync(asarSrcDir, {
    recursive: true,
    force: true
  })
  const asarDistDir = path.join(asarSrcDir, 'dist')
  fs.mkdirSync(asarDistDir, { recursive: true })
  fs.readdirSync(distDir).forEach((entry) => {
    if (shouldSkipDistEntry(entry)) return
    fs.cpSync(path.join(distDir, entry), path.join(asarDistDir, entry), { recursive: true })
  })
  fs.cpSync(distElectronDir, path.join(asarSrcDir, 'dist-electron'), { recursive: true })
  fs.cpSync(path.join(root, 'package.json'), path.join(asarSrcDir, 'package.json'))
}

const writeMeta = (inputs) => {
  fs.writeFileSync(metaPath, `${JSON.stringify(inputs, null, 2)}\n`)
}

const formatSeconds = (ms) => `${(ms / 1000).toFixed(1)}s`

const main = async() => {
  const start = Date.now()
  const inputs = readBuildInputs()
  const fast = canFastPack(inputs)

  console.log(fast
    ? '⚡ Electron 运行时未变化，走快速打包（仅重建 app.asar）'
    : '🔧 走全量打包（electron-builder --win dir）')

  cleanForBuild(fast)

  console.log('📦 构建前端资源...')
  run('npm exec --no vite build', fast
    ? { ...process.env, KEEP_WIN_UNPACKED: '1' }
    : process.env)

  if (fast) {
    const asarStart = Date.now()
    assembleAsarSource()
    await asar.createPackage(asarSrcDir, appAsarPath)
    fs.rmSync(asarSrcDir, {
      recursive: true,
      force: true
    })
    console.log(`✅ app.asar 重建完成（${formatSeconds(Date.now() - asarStart)}）`)
  } else {
    run('npx electron-builder --win dir --publish=never')
  }

  writeMeta(inputs)
  console.log(`✅ 打包完成，总耗时 ${formatSeconds(Date.now() - start)}`)
}

main().catch((error) => {
  console.error('❌ 打包失败:', error)
  process.exit(1)
})
