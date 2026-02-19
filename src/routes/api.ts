/**
 * API路由处理器
 */

import type { Env, GenerateRequest, GenerateResponse } from '../models/types';
import { generatePromptsFromText, createGenerationRecord, generateAllPrompts } from '../services/promptGenerator';
import { getAllTemplates, getTemplateById } from '../models/templates';
import { KV_KEYS } from '../models/types';
import { parseVideoUrl, detectPlatform, videoResultToPromptParams, SUPPORTED_PLATFORMS, getPlatformName } from '../services/videoUrlParser';
import { generateImagePromptsFromText, generateImagePromptsSimple, SUPPORTED_IMAGE_MODELS } from '../services/imagePromptGenerator';
import { parseImageFromUpload, SUPPORTED_IMAGE_FORMATS, MAX_IMAGE_SIZE } from '../services/imageReverseParser';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  try {
    if (path === '/api/parse-video' && request.method === 'POST') {
      return await handleParseVideo(request, env);
    }
    if (path === '/api/platforms' && request.method === 'GET') {
      return handleGetPlatforms();
    }
    if (path === '/api/generate-image' && request.method === 'POST') {
      return await handleGenerateImagePrompt(request, env);
    }
    if (path === '/api/analyze-image' && request.method === 'POST') {
      return await handleAnalyzeImage(request, env);
    }
    if (path === '/api/image-models' && request.method === 'GET') {
      return handleGetImageModels();
    }
    if (path === '/api/generate' && request.method === 'POST') {
      return await handleGenerate(request, env);
    }
    if (path === '/api/templates' && request.method === 'GET') {
      return handleGetTemplates();
    }
    if (path.startsWith('/api/templates/') && request.method === 'GET') {
      const id = path.replace('/api/templates/', '');
      return handleGetTemplate(id);
    }
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
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleParseVideo(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { url: string };
  if (!body.url || body.url.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'URL is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  try {
    const platform = detectPlatform(body.url);
    if (platform === 'unknown') {
      return new Response(JSON.stringify({ error: 'Unsupported platform', supportedPlatforms: SUPPORTED_PLATFORMS }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const videoResult = await parseVideoUrl(body.url);
    if (!videoResult) {
      return new Response(JSON.stringify({ error: 'Parse failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const videoParams = videoResultToPromptParams(videoResult);
    const outputs = generateAllPrompts({
      subject: videoParams.subject || videoResult.author.name || '视频内容',
      action: '视频中的场景和动作',
      scene: videoParams.scene || videoResult.description || videoResult.title || '',
      camera: videoParams.camera || { shotType: 'medium_shot', movement: 'gimbal', angle: 'eye_level', lens: '35mm' },
      style: videoParams.style || { visual: 'cinematic', lighting: 'natural', colorGrade: 'natural colors', quality: '1080p' },
      audio: videoParams.audio || '',
      aspectRatio: '16:9',
    });
    return new Response(JSON.stringify({ success: true, platform: { id: videoResult.platform, name: getPlatformName(videoResult.platform) }, video: { id: videoResult.videoId, title: videoResult.title, description: videoResult.description, author: videoResult.author, cover: videoResult.cover }, outputs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Parse failed', message: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

function handleGetPlatforms(): Response {
  return new Response(JSON.stringify({ platforms: SUPPORTED_PLATFORMS }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function handleGenerateImagePrompt(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { text: string };
  if (!body.text || body.text.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Text is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  try {
    const prompts = await generateImagePromptsFromText(body.text, env);
    return new Response(JSON.stringify({ success: true, text: body.text, prompts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    const prompts = generateImagePromptsSimple(body.text);
    return new Response(JSON.stringify({ success: true, text: body.text, prompts, note: 'AI优化不可用' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

async function handleAnalyzeImage(request: Request, env: Env): Promise<Response> {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return new Response(JSON.stringify({ error: 'Content-Type must be multipart/form-data' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    if (!imageFile) {
      return new Response(JSON.stringify({ error: 'Image file is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (imageFile.size > MAX_IMAGE_SIZE) {
      return new Response(JSON.stringify({ error: `Image too large. Max: ${MAX_IMAGE_SIZE / 1024 / 1024}MB` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!SUPPORTED_IMAGE_FORMATS.includes(imageFile.type as any)) {
      return new Response(JSON.stringify({ error: 'Unsupported format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const arrayBuffer = await imageFile.arrayBuffer();
    const { analysis, prompts } = await parseImageFromUpload(arrayBuffer, imageFile.name, env);
    return new Response(JSON.stringify({ success: true, analysis, prompts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Analysis failed', message: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

function handleGetImageModels(): Response {
  return new Response(JSON.stringify({ models: SUPPORTED_IMAGE_MODELS }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function handleGenerate(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as GenerateRequest;
  if (!body.text || body.text.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Text is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  try {
    const { params, outputs } = await generatePromptsFromText(body.text, env);
    const record = createGenerationRecord('text', body.text, params, outputs);
    return new Response(JSON.stringify({ success: true, id: record.id, params, outputs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Generation failed', message: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

function handleGetTemplates(): Response {
  const templates = getAllTemplates().map(t => ({ id: t.id, name: t.name, category: t.category, description: t.description, usage: t.usage }));
  return new Response(JSON.stringify({ templates }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function handleGetTemplate(id: string): Response {
  const template = getTemplateById(id);
  if (!template) {
    return new Response(JSON.stringify({ error: 'Template not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify({ template }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
