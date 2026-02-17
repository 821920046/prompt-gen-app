/**
 * 提示词生成服务
 * 负责将用户输入转换为Sora 2, Veo 3, Seedance 2.0优化版提示词
 */

import type { PromptParams, ModelPrompts, AIParsedResult, GenerationRecord, Env } from '../models/types';

// AI系统提示词
const SYSTEM_PROMPT = `You are a professional AI video prompt parsing expert.
Parse the user's natural language description into structured parameters.

Output JSON format:
{
  "subject": "main subject",
  "action": "action description",
  "scene": "scene environment",
  "camera": {
    "shot_type": "medium_shot",
    "movement": "static",
    "angle": "eye_level",
    "lens": "35mm"
  },
  "style": {
    "visual": "cinematic",
    "lighting": "natural",
    "color": "natural colors",
    "quality": "4K cinematic"
  },
  "audio": "",
  "duration": 10,
  "aspect_ratio": "16:9"
}

Rules:
1. Intelligently fill reasonable details
2. Extract cinematography terms
3. Output valid JSON only`;

/**
 * 使用AI解析自然语言
 */
export async function parseNaturalLanguage(text: string, env: Env): Promise<AIParsedResult> {
  try {
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text }
      ],
      max_tokens: 800,
      temperature: 0.3
    });

    const content = response.response || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return validateAndFillDefaults(parsed);
    }
    
    return getDefaultParsedResult();
  } catch (error) {
    console.error('AI parsing error:', error);
    return getDefaultParsedResult();
  }
}

function validateAndFillDefaults(parsed: any): AIParsedResult {
  return {
    subject: parsed.subject || 'a person',
    action: parsed.action || 'standing',
    scene: parsed.scene || 'indoor environment',
    camera: {
      shot_type: parsed.camera?.shot_type || 'medium_shot',
      movement: parsed.camera?.movement || 'static',
      angle: parsed.camera?.angle || 'eye_level',
      lens: parsed.camera?.lens || '35mm',
    },
    style: {
      visual: parsed.style?.visual || 'cinematic',
      lighting: parsed.style?.lighting || 'natural',
      color: parsed.style?.color || 'natural colors',
      quality: parsed.style?.quality || '4K cinematic',
    },
    audio: parsed.audio || '',
    duration: parsed.duration || 10,
    aspect_ratio: parsed.aspect_ratio || '16:9',
  };
}

function getDefaultParsedResult(): AIParsedResult {
  return {
    subject: 'a person',
    action: 'standing in a scene',
    scene: 'modern indoor environment',
    camera: {
      shot_type: 'medium_shot',
      movement: 'static',
      angle: 'eye_level',
      lens: '35mm',
    },
    style: {
      visual: 'cinematic',
      lighting: 'natural',
      color: 'natural colors',
      quality: '4K cinematic',
    },
    audio: '',
    duration: 10,
    aspect_ratio: '16:9',
  };
}

export function convertToPromptParams(parsed: AIParsedResult): PromptParams {
  return {
    subject: parsed.subject,
    action: parsed.action,
    scene: parsed.scene,
    camera: {
      shotType: parsed.camera.shot_type as any,
      movement: parsed.camera.movement as any,
      angle: parsed.camera.angle as any,
      lens: parsed.camera.lens,
    },
    style: {
      visual: parsed.style.visual as any,
      lighting: parsed.style.lighting as any,
      colorGrade: parsed.style.color,
      quality: parsed.style.quality,
    },
    audio: parsed.audio,
    duration: parsed.duration,
    aspectRatio: parsed.aspect_ratio as any,
  };
}

// 生成Sora 2优化版提示词
export function generateSora2Prompt(params: PromptParams): string {
  const parts: string[] = [];
  
  const cameraDesc = buildCameraDescription(params.camera);
  parts.push(cameraDesc);
  parts.push(`${params.subject}在${params.scene}`);
  parts.push(params.action);
  
  const styleDesc = buildStyleDescription(params.style);
  parts.push(styleDesc);
  
  if (params.audio) {
    parts.push(`音频: ${params.audio}`);
  }
  
  parts.push(`${params.style.quality}, ${params.aspectRatio}`);
  
  return parts.join('，');
}

// 生成Veo 3优化版提示词
export function generateVeo3Prompt(params: PromptParams): string {
  const parts: string[] = [];
  
  parts.push(`${params.camera.shotType.replace(/_/g, ' ')}, ${params.camera.movement.replace(/_/g, ' ')}`);
  if (params.camera.lens) {
    parts.push(params.camera.lens);
  }
  parts.push(params.subject);
  parts.push(params.action);
  parts.push(params.scene);
  parts.push(`${params.style.lighting.replace(/_/g, ' ')} lighting`);
  parts.push(`${params.style.visual} style, ${params.style.colorGrade}`);
  
  if (params.audio) {
    parts.push(`with ${params.audio}`);
  }
  
  parts.push(params.style.quality);
  
  return parts.join('. ');
}

// 生成Seedance 2.0优化版提示词
export function generateSeedance2Prompt(params: PromptParams): string {
  const lines: string[] = [];
  
  lines.push(`Subject: ${params.subject}`);
  lines.push(`Action: ${params.action}`);
  lines.push(`Scene: ${params.scene}`);
  
  const cameraLine = `Camera: ${params.camera.shotType.replace(/_/g, ' ')} + ${params.camera.movement.replace(/_/g, ' ')}, ${params.camera.angle.replace(/_/g, ' ')}`;
  lines.push(cameraLine);
  
  if (params.camera.lens) {
    lines.push(`Lens: ${params.camera.lens}`);
  }
  
  lines.push(`Style: ${params.style.visual}, ${params.style.lighting.replace(/_/g, ' ')} light, ${params.style.colorGrade}`);
  
  if (params.audio) {
    lines.push(`Audio: ${params.audio}`);
  }
  
  lines.push(`Output: ${params.style.quality}, ${params.aspectRatio}`);
  
  return lines.join('\n');
}

// 构建相机描述
function buildCameraDescription(camera: PromptParams['camera']): string {
  const shotTypeMap: Record<string, string> = {
    extreme_close_up: '超特写',
    close_up: '特写',
    medium_shot: '中景',
    long_shot: '远景',
    wide_shot: '广角',
    extreme_long_shot: '超远景',
  };
  
  const movementMap: Record<string, string> = {
    static: '固定镜头',
    pan: '摇镜头',
    tilt: '俯仰',
    dolly_in: '推进',
    dolly_out: '拉远',
    truck: '横移',
    handheld: '手持',
    gimbal: '稳定器',
    drone: '无人机',
  };
  
  return shotTypeMap[camera.shotType] + movementMap[camera.movement];
}

// 构建风格描述
function buildStyleDescription(style: PromptParams['style']): string {
  const visualMap: Record<string, string> = {
    cinematic: '电影感',
    documentary: '纪录片风格',
    commercial: '商业广告',
    anime: '动画风格',
    cyberpunk: '赛博朋克',
    noir: '黑色电影',
    vintage: '复古风格',
    minimalist: '极简主义',
  };
  
  const lightingMap: Record<string, string> = {
    natural: '自然光',
    golden_hour: '黄金时刻',
    blue_hour: '蓝色时刻',
    neon: '霓虹灯',
    studio: '影棚灯光',
    soft: '柔光',
    hard: '硬光',
    dramatic: '戏剧性光影',
    low_key: '低调',
    high_key: '高调',
  };
  
  return visualMap[style.visual] + lightingMap[style.lighting] + style.colorGrade;
}

// 生成所有模型的提示词
export function generateAllPrompts(params: PromptParams): ModelPrompts {
  return {
    sora2: generateSora2Prompt(params),
    veo3: generateVeo3Prompt(params),
    seedance2: generateSeedance2Prompt(params),
  };
}

// 完整的生成流程
export async function generatePromptsFromText(text: string, env: Env): Promise<{ params: PromptParams; outputs: ModelPrompts }> {
  const parsed = await parseNaturalLanguage(text, env);
  const params = convertToPromptParams(parsed);
  const outputs = generateAllPrompts(params);
  return { params, outputs };
}

// 生成唯一ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 创建生成记录
export function createGenerationRecord(
  mode: 'text' | 'video',
  source: string | { key: string; url: string; thumbnail: string; duration: number },
  params: PromptParams,
  outputs: ModelPrompts
): GenerationRecord {
  const record: GenerationRecord = {
    id: generateId(),
    mode,
    timestamp: Date.now(),
    params,
    outputs,
  };
  
  if (typeof source === 'string') {
    record.sourceText = source;
  } else {
    record.sourceVideo = source;
  }
  
  return record;
}
