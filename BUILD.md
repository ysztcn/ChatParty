# 构建说明

## 构建命令

### 1. 开发环境

```bash
# 开发模式
npm run dev

# 生产模式
npm run prod
```

### 2. 生产构建

```bash
npm run build:prod
```

### 3. 平台特定构建

```bash
# Windows（NSIS 安装包 + 便携版 exe）
npm run build:win

# Windows 仅便携版（绿色免安装）
npm run build:win:portable

# macOS
npm run build:mac

# macOS ARM64 (M1/M2)
npm run build:mac:arm64

# macOS x64 (Intel)
npm run build:mac:x64

# macOS Universal (同时支持Intel和M1/M2)
npm run build:mac:universal
```

## 构建错误解决方案

### 错误: Cannot create symbolic link - 客户端没有所需的特权

**原因**: Windows 创建符号链接需要管理员权限

**解决方案**:

#### 方案一：以管理员身份运行（推荐）

1. 右键点击 PowerShell 或 CMD
2. 选择"以管理员身份运行"
3. 导航到项目目录
4. 运行构建命令

#### 方案二：启用开发者模式（Windows 10/11）

1. 打开"设置" > "更新和安全" > "开发者选项"
2. 启用"开发人员模式"
3. 重启电脑
4. 正常运行构建命令

#### 方案三：禁用代码签名（已自动处理）

构建配置已优化，会自动处理签名问题。

## 构建输出

构建命令会在打包前自动删除 `dist/` 与 `dist-electron/`（不清理 Electron 系统缓存）。深度清理请用 `npm run clean`。

构建完成后，产物位于 `dist/` 目录：

- Windows 安装包: `dist/ChatParty Setup <版本>.exe`
- Windows 绿色版: `dist/ChatParty <版本>.exe`（portable，免安装）
- macOS: `dist/ChatParty-<版本>.dmg`

版本号由 `scripts/bump-version.js` 在构建时根据 `package.json` 自动递增。

## GitHub Releases 自动发布

推送 `v*` 标签时，GitHub Actions（`.github/workflows/release.yml`）会自动在 Windows 与 macOS 上构建，并把安装包上传到对应 Release：

```bash
npm version --no-git-tag-version 1.0.5   # 本地同步版本号（可选，CI 会按标签自动设置）
git commit -am "chore: release v1.0.5"
git tag v1.0.5
git push origin main v1.0.5
```

CI 中不执行 `bump-version.js`，产物版本号与标签保持一致。

## 注意事项

1. **首次构建**: 首次构建会下载 Electron 和相关工具，可能需要较长时间
2. **网络问题**: 如果下载失败，可以配置国内镜像源
3. **杀毒软件**: 某些杀毒软件可能会拦截构建过程，请添加信任
4. **磁盘空间**: 构建过程需要约 2GB 临时空间

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 构建
npm run build:prod
```

## 高级配置

### 自定义构建配置

编辑 `package.json` 中的 `build` 字段：

```json
{
  "build": {
    "appId": "com.yourapp.app",
    "productName": "YourAppName",
    "compression": "maximum",
    "asar": true
  }
}
```
