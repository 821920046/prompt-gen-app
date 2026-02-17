/**
 * Workers主入口
 */

import type { Env } from './models/types';
import { handleRequest } from './routes/api';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // API路由
    if (url.pathname.startsWith('/api/') || url.pathname === '/health') {
      return handleRequest(request, env);
    }
    
    // 静态资源（由Assets绑定处理）
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    
    // 默认返回前端页面
    return new Response(getDefaultHTML(), {
      headers: { 'Content-Type': 'text/html' },
    });
  },
};

// 默认HTML（当Assets不可用时使用）
function getDefaultHTML(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI视频提示词生成器</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
  <script src="/app.js"></script>
</body>
</html>`;
}
