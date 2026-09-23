#!/usr/bin/env node

/**
 * 清理打包输出目录（仅项目内 dist、dist-electron，不清理系统缓存）
 */

const fs = require('fs')
const path = require('path')

const pathsToClean = ['dist', 'dist-electron']

pathsToClean.forEach((dir) => {
  const dirPath = path.join(process.cwd(), dir)
  if (fs.existsSync(dirPath)) {
    console.log(`删除: ${dir}`)
    fs.rmSync(dirPath, { recursive: true, force: true })
  }
})
