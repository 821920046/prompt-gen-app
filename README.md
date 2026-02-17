# AI视频提示词生成器

专为 Sora 2, Veo 3, Seedance 2.0 设计的智能提示词生成工具。

![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 功能特性

- ✨ **自然语言生成**: 描述你的想法，AI自动生成专业提示词
- 🎬 **视频反向解析**: 上传视频，AI分析并生成提示词
- 🎯 **三模型适配**: 同时输出 Sora 2 / Veo 3 / Seedance 2.0 优化版
- 📚 **模板库**: 20个精选模板，一键应用
- ⚡ **边缘部署**: Cloudflare Workers，全球低延迟

## 快速部署

详细部署步骤请查看 **[部署指南](./DEPLOYMENT.md)**

### 一键部署命令

```bash
# 1. 克隆项目
git clone https://github.com/821920046/prompt-gen-app.git
cd prompt-gen-app

# 2. 安装依赖
npm install

# 3. 登录 Cloudflare
npx wrangler login

# 4. 部署
npx wrangler deploy
```

部署成功后访问：`https://prompt-gen-app.你的账号.workers.dev`

## 本地开发

```bash
# 安装依赖
npm install

# 启动本地服务器
npx wrangler dev src/index.ts --assets ./public

# 访问 http://localhost:8787
```

## API接口

### 生成提示词

```bash
POST /api/generate
Content-Type: application/json

{
  "text": "一位女性在东京雨夜行走，霓虹灯反射在湿润的地面上"
}
```

**响应示例：**
```json
{
  "success": true,
  "id": "1708123456789-abc123",
  "outputs": {
    "sora2": "中景手持，一位女性在东京雨夜行走...",
    "veo3": "medium shot, handheld. a woman walking...",
    "seedance2": "Subject: 一位女性\nAction: 行走..."
  }
}
```

### 获取模板列表

```bash
GET /api/templates
```

### 健康检查

```bash
GET /health
```

## 项目结构

```
prompt-gen-app/
├── src/
│   ├── index.ts              # Worker 入口
│   ├── routes/api.ts         # API 路由
│   ├── services/             # 提示词生成引擎
│   ├── models/               # 类型定义和模板
│   └── utils/                # 存储工具
├── public/
│   ├── index.html            # 前端页面
│   └── app.js                # 前端逻辑
├── wrangler.jsonc            # Cloudflare Workers 配置
├── README.md
└── DEPLOYMENT.md             # 部署指南
```

## 支持的 AI 模型

| 模型 | 提示词特点 |
|------|-----------|
| **Sora 2** | 叙事驱动型，重视时间序列和音频描述 |
| **Veo 3** | 技术精确型，7层结构 |
| **Seedance 2.0** | 参考优先型，结构化参数 |

## 技术栈

- **后端**: Cloudflare Workers + TypeScript
- **AI**: Workers AI
- **存储**: Workers KV + R2（可选）
- **前端**: HTML + Tailwind CSS

## 成本说明

完全基于 Cloudflare 免费额度，个人使用 **$0/月**。

## 许可证

MIT License
