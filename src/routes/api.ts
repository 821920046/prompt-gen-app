/**
 * API路由处理器
 */

import type { Env, GenerateRequest, GenerateResponse } from '../models/types';
import { generatePromptsFromText, createGenerationRecord, generateId, generateAllPrompts } from '../services/promptGenerator';
import { getAllTemplates, getTemplateById } from '../models/templates';
import { KV_KEYS } from '../models/types';
import { parseVideoUrl, detectPlatform, videoResultToPromptParams, SUPPORTED_PLATFORMS, getPlatformName } from '../services/videoUrlParser';

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
    // 解析视频链接
    if (path === '/api/parse-video' && request.method === 'POST') {
      return await handleParseVideo(request, env);
    }

    // 获取支持的平台列表
    if (path === '/api/platforms' && request.method === 'GET') {
      return handleGetPlatforms();
    }

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

// 处理视频链接解析
async function handleParseVideo(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { url: string };
  
  if (!body.url || body.url.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: 'URL is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 识别平台
    const platform = detectPlatform(body.url);
    
    if (platform === 'unknown') {
      return new Response(
        JSON.stringify({ 
          error: 'Unsupported platform', 
          message: '无法识别该链接所属平台',
          supportedPlatforms: SUPPORTED_PLATFORMS 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 解析视频信息
    const videoResult = await parseVideoUrl(body.url);
    
    if (!videoResult) {
      return new Response(
        JSON.stringify({ 
          error: 'Parse failed',
          message: '无法解析该视频链接，请确认链接是否有效' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 提取提示词参数
    const videoParams = videoResultToPromptParams(videoResult);
    
    // 构建描述文本
    const descriptionParts: string[] = [];
    if (videoResult.title) {
      descriptionParts.push(`标题: ${videoResult.title}`);
    }
    if (videoResult.description) {
      descriptionParts.push(`描述: ${videoResult.description}`);
    }
    if (videoResult.author.name) {
      descriptionParts.push(`作者: ${videoResult.author.name}`);
    }
    if (videoResult.tags && videoResult.tags.length > 0) {
      descriptionParts.push(`标签: ${videoResult.tags.join(', ')}`);
    }
    
    const description = descriptionParts.join('\n');

    // 生成三模型提示词
    const outputs = generateAllPrompts({
      subject: videoParams.subject || videoResult.author.name || '视频内容',
      action: '视频中的场景和动作',
      scene: videoParams.scene || videoResult.description || videoResult.title || '',
      camera: videoParams.camera || {
        shotType: 'medium_shot',
        movement: 'gimbal',
        angle: 'eye_level',
        lens: '35mm',
      },
      style: videoParams.style || {
        visual: 'cinematic',
        lighting: 'natural',
        colorGrade: 'natural colors',
        quality: '1080p',
      },
      audio: videoParams.audio || '',
      aspectRatio: '16:9',
    });

    const response = {
      success: true,
      platform: {
        id: videoResult.platform,
        name: getPlatformName(videoResult.platform),
      },
      video: {
        id: videoResult.videoId,
        title: videoResult.title,
        description: videoResult.description,
        author: videoResult.author,
        cover: videoResult.cover,
        duration: videoResult.duration,
        tags: videoResult.tags,
        music: videoResult.music,
      },
      description,
      outputs,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Parse failed', message: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// 获取支持的平台列表
function handleGetPlatforms(): Response {
  return new Response(JSON.stringify({ 
    platforms: SUPPORTED_PLATFORMS 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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
