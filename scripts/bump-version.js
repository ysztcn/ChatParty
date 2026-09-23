#!/usr/bin/env node

/**
 * 打包前递增 package.json 的 patch 版本号
 * 用法: node scripts/bump-version.js
 */

const fs = require('fs')
const path = require('path')

const packagePath = path.join(__dirname, '..', 'package.json')
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(pkg.version)
if (!match) {
  console.error(`❌ 版本号格式不正确: ${pkg.version}（需为 x.y.z）`)
  process.exit(1)
}

const major = Number(match[1])
const minor = Number(match[2])
const patch = Number(match[3]) + 1
const nextVersion = `${major}.${minor}.${patch}`

pkg.version = nextVersion
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')

console.log(`🔢 版本号已递增: ${match[0]} → ${nextVersion}`)
