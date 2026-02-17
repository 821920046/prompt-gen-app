# Cloudflare Workers 部署指南

本文档详细介绍如何将 AI 视频提示词生成器部署到 Cloudflare Workers。

---

## 目录

1. [前置条件](#前置条件)
2. [第一步：Cloudflare 账号设置](#第一步cloudflare-账号设置)
3. [第二步：本地环境准备](#第二步本地环境准备)
4. [第三步：配置 Cloudflare 资源](#第三步配置-cloudflare-资源)
5. [第四步：本地测试](#第四步本地测试)
6. [第五步：部署到生产环境](#第五步部署到生产环境)
7. [第六步：验证部署](#第六步验证部署)
8. [常见问题](#常见问题)

---

## 前置条件

在开始部署之前，请确保你拥有：

- [ ] Cloudflare 账号（免费账号即可）
- [ ] Node.js 18+ 已安装
- [ ] Git 已安装
- [ ] 代码已克隆到本地

---

## 第一步：Cloudflare 账号设置

### 1.1 注册 Cloudflare 账号

如果你还没有 Cloudflare 账号：

1. 访问 https://dash.cloudflare.com/sign-up
2. 输入邮箱和密码注册
3. 验证邮箱

### 1.2 获取 API Token

1. 登录 Cloudflare Dashboard
2. 点击右上角头像 → **My Profile**
3. 左侧菜单选择 **API Tokens**
4. 点击 **Create Token**
5. 选择 **Edit Cloudflare Workers** 模板
6. 点击 **Continue to summary** → **Create Token**
7. **重要**：复制并保存 Token，页面关闭后无法再次查看

### 1.3 获取 Account ID

1. 登录 Cloudflare Dashboard
2. 点击左侧 **Workers & Pages**
3. 在概览页面可以看到 **Account ID**
4. 复制 Account ID

---

## 第二步：本地环境准备

### 2.1 克隆代码

```bash
git clone https://github.com/821920046/prompt-gen-app.git
cd prompt-gen-app
```

### 2.2 安装依赖

```bash
npm install
```

### 2.3 登录 Wrangler

Wrangler 是 Cloudflare 的命令行工具，用于部署 Workers。

```bash
npx wrangler login
```

这会打开浏览器，授权 Wrangler 访问你的 Cloudflare 账号。

### 2.4 验证登录状态

```bash
npx wrangler whoami
```

应该显示你的账号信息。

---

## 第三步：配置 Cloudflare 资源

本项目使用以下 Cloudflare 资源：

| 资源 | 用途 | 是否必需 |
|------|------|----------|
| Workers AI | AI 模型推理 | ✅ 必需 |
| Workers KV | 缓存和历史记录 | ⚪ 可选 |
| R2 | 视频文件存储 | ⚪ 可选 |

### 3.1 启用 Workers AI

1. 登录 Cloudflare Dashboard
2. 点击左侧 **AI** → **Workers AI**
3. 点击 **Enable Workers AI**
4. 选择免费计划（每月 10,000 神经单元免费）

### 3.2 创建 KV 命名空间（可选）

```bash
# 创建 KV 命名空间
npx wrangler kv:namespace create "PROMPT_KV"

# 输出示例：
# { binding = "PROMPT_KV", id = "abc123..." }
```

复制返回的 ID，更新 `wrangler.jsonc`：

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "PROMPT_KV",
      "id": "你的KV命名空间ID"
    }
  ]
}
```

### 3.3 创建 R2 存储桶（可选）

```bash
# 创建 R2 存储桶
npx wrangler r2:bucket create prompt-gen-videos
```

更新 `wrangler.jsonc`：

```jsonc
{
  "r2_buckets": [
    {
      "binding": "VIDEO_BUCKET",
      "bucket_name": "prompt-gen-videos"
    }
  ]
}
```

### 3.4 最终配置文件

最简配置（仅 Workers AI）：

```jsonc
{
  "name": "prompt-gen-app",
  "main": "src/index.ts",
  "compatibility_date": "2025-02-11",
  "compatibility_flags": ["nodejs_compat"],
  
  "assets": {
    "directory": "./public",
    "binding": "ASSETS"
  },
  
  "ai": {
    "binding": "AI"
  }
}
```

---

## 第四步：本地测试

### 4.1 启动本地开发服务器

```bash
npx wrangler dev src/index.ts --assets ./public
```

### 4.2 访问应用

打开浏览器访问：http://localhost:8787

### 4.3 测试 API

```bash
# 健康检查
curl http://localhost:8787/health

# 测试生成
curl -X POST http://localhost:8787/api/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "一位女性在东京雨夜行走，霓虹灯反射在湿润的地面上"}'
```

### 4.4 预期输出

```json
{
  "success": true,
  "id": "1708123456789-abc123",
  "params": {
    "subject": "一位女性",
    "action": "在雨夜行走",
    "scene": "东京街道，霓虹灯反射",
    ...
  },
  "outputs": {
    "sora2": "中景手持，一位女性在东京街道...",
    "veo3": "medium shot, handheld. a woman...",
    "seedance2": "Subject: 一位女性\nAction: ..."
  }
}
```

---

## 第五步：部署到生产环境

### 5.1 部署命令

```bash
npx wrangler deploy
```

### 5.2 部署输出示例

```
⛅️ wrangler 4.65.0
-------------------

Uploading prompt-gen-app...
Published prompt-gen-app (production)
  https://prompt-gen-app.你的账号.workers.dev
Current Deployment ID: abc123...
```

### 5.3 部署状态

```bash
# 查看部署列表
npx wrangler deployments list

# 查看实时日志
npx wrangler tail
```

---

## 第六步：验证部署

### 6.1 访问应用

打开浏览器访问部署 URL：
```
https://prompt-gen-app.你的账号.workers.dev
```

### 6.2 测试功能

1. 在文本框输入视频描述
2. 点击「AI 生成提示词」按钮
3. 查看三模型提示词输出
4. 测试复制功能

### 6.3 检查 AI 功能

```bash
# 测试 API
curl -X POST https://prompt-gen-app.你的账号.workers.dev/api/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "测试描述"}'
```

---

## 自定义域名（可选）

### 7.1 添加自定义域名

如果你有自己的域名托管在 Cloudflare：

```bash
npx wrangler domains add prompt-gen-app 你的域名.com
```

或在 Dashboard 中：

1. 进入 **Workers & Pages** → 选择你的 Worker
2. 点击 **Settings** → **Domains & Routes**
3. 点击 **Add Custom Domain**
4. 输入域名并保存

### 7.2 配置 DNS

Cloudflare 会自动配置 DNS 记录，无需手动操作。

---

## 环境变量配置

### 8.1 生产环境变量

```bash
# 设置生产环境变量
npx wrangler secret put ENVIRONMENT
# 输入值：production
```

### 8.2 本地环境变量

创建 `.dev.vars` 文件（已添加到 .gitignore）：

```bash
ENVIRONMENT=development
MAX_VIDEO_SIZE=104857600
MAX_VIDEO_DURATION=120
```

---

## 常见问题

### Q1: 部署失败，提示权限错误

**解决方案**：
```bash
# 重新登录
npx wrangler logout
npx wrangler login
```

### Q2: AI 功能不工作

**解决方案**：
1. 确认 Workers AI 已启用
2. 检查账号是否有足够的神经单元配额
3. 查看日志：`npx wrangler tail`

### Q3: 前端页面无法加载

**解决方案**：
1. 确认 `public/` 目录包含 `index.html` 和 `app.js`
2. 检查 `wrangler.jsonc` 中的 `assets` 配置

### Q4: KV 或 R2 报错

**解决方案**：
- 如果不使用这些功能，可以从 `wrangler.jsonc` 中移除相关配置
- 如果需要使用，确保已创建对应的资源并更新 ID

### Q5: 部署后 API 返回 500 错误

**解决方案**：
```bash
# 查看实时日志
npx wrangler tail

# 或在 Dashboard 查看
# Workers & Pages → 你的Worker → Logs
```

---

## 成本说明

### 免费额度（每月）

| 服务 | 免费额度 |
|------|----------|
| Workers 请求 | 100,000 次/天 |
| Workers AI | 10,000 神经单元/天 |
| KV 读取 | 100,000 次/天 |
| KV 写入 | 1,000 次/天 |
| R2 存储 | 10 GB |
| R2 请求 | 100 万次 Class A + 1000 万次 Class B |

### 预估月成本

对于个人使用：
- **免费额度完全够用**
- 超出后约 **$0.50 - $5/月**

---

## 更新部署

当有代码更新时：

```bash
# 拉取最新代码
git pull origin main

# 安装新依赖（如有）
npm install

# 重新部署
npx wrangler deploy
```

---

## 监控和分析

### 查看使用统计

1. 登录 Cloudflare Dashboard
2. 进入 **Workers & Pages** → 选择你的 Worker
3. 查看 **Analytics** 标签

### 设置告警

1. 进入 **Notifications**
2. 创建告警规则（如错误率过高、请求量异常）

---

## 获取帮助

- **Cloudflare 文档**: https://developers.cloudflare.com/workers/
- **Wrangler 文档**: https://developers.cloudflare.com/workers/wrangler/
- **GitHub Issues**: https://github.com/821920046/prompt-gen-app/issues

---

**部署完成后，你的应用将可以通过以下地址访问：**

```
https://prompt-gen-app.你的账号.workers.dev
```

祝你部署顺利！🚀
