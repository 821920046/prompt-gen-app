/**
 * API路由处理器
 */

import type { Env, GenerateRequest, GenerateResponse } from '../models/types';
import { generatePromptsFromText, createGenerationRecord, generateId } from '../services/promptGenerator';
import { getAllTemplates, getTemplateById } from '../models/templates';
import { KV_KEYS } from '../models/types';

// CORS头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 主路由处理器
export async function handleRequest(request: Request, env: Env): Promise<Response> {
  // 处理CORS预检
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // 生成提示词
    if (path === '/api/generate' && request.method === 'POST') {
      return await handleGenerate(request, env);
    }

    // 获取模板列表
    if (path === '/api/templates' && request.method === 'GET') {
      return handleGetTemplates();
    }

    // 获取单个模板
    if (path.startsWith('/api/templates/') && request.method === 'GET') {
      const id = path.replace('/api/templates/', '');
      return handleGetTemplate(id);
    }

    // 健康检查
    if (path === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', message: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

// 处理生成请求
async function handleGenerate(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as GenerateRequest;
  
  if (!body.text || body.text.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: 'Text is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 生成提示词
    const { params, outputs } = await generatePromptsFromText(body.text, env);

    // 创建记录
    const record = createGenerationRecord('text', body.text, params, outputs);

    // 保存到KV（如果可用）
    try {
      if (env.PROMPT_KV) {
        await env.PROMPT_KV.put(
          KV_KEYS.generationResult(record.id),
          JSON.stringify(record),
          { expirationTtl: 86400 }
        );
      }
    } catch (e) {
      // KV未配置时忽略
      console.log('KV not available, skipping cache');
    }

    const response: GenerateResponse = {
      success: true,
      id: record.id,
      params,
      outputs,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Generation failed', message: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// 获取所有模板
function handleGetTemplates(): Response {
  const templates = getAllTemplates().map(t => ({
    id: t.id,
    name: t.name,
    category: t.category,
    description: t.description,
    usage: t.usage,
  }));

  return new Response(JSON.stringify({ templates }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// 获取单个模板
function handleGetTemplate(id: string): Response {
  const template = getTemplateById(id);
  
  if (!template) {
    return new Response(
      JSON.stringify({ error: 'Template not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(JSON.stringify({ template }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
