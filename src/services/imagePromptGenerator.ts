/**
 * 图片提示词生成服务
 * 支持 Midjourney、Stable Diffusion、DALL-E 3、Ideogram、Nano Banana
 */

import type { Env } from '../models/types';

// 支持的图片模型
export const SUPPORTED_IMAGE_MODELS = [
  { id: 'midjourney', name: 'Midjourney', icon: '🎨', description: '艺术性强，风格多样' },
  { id: 'stable-diffusion', name: 'Stable Diffusion', icon: '🖌️', description: '开源可控，插件丰富' },
  { id: 'dalle3', name: 'DALL-E 3', icon: '🎭', description: 'OpenAI出品，理解力强' },
  { id: 'ideogram', name: 'Ideogram', icon: '✍️', description: '文字生成能力强' },
  { id: 'nano-banana', name: 'Nano Banana', icon: '🍌', description: '可爱卡通风格' },
];

// 各模型的提示词格式和参数
interface ModelFormat {
  prefix: string;
  suffix: string;
  parameters: string[];
  maxLength: number;
  style: string;
}

const MODEL_FORMATS: Record<string, ModelFormat> = {
  'midjourney': {
    prefix: '',
    suffix: '--ar 16:9 --v 6 --style expressive --q 2',
    parameters: ['--ar', '--v', '--style', '--q', '--iw', '--no', '--seed'],
    maxLength: 4000,
    style: '艺术风格关键词，摄影术语，光照描述'
  },
  'stable-diffusion': {
    prefix: '',
    suffix: '',
    parameters: ['--seed', '--steps', '--cfg', '--sampler', '--denoise'],
    maxLength: 2000,
    style: '详细描述，包括主体、服装、场景、光照、氛围'
  },
  'dalle3': {
    prefix: '',
    suffix: '',
    parameters: ['--size', '--quality', '--style'],
    maxLength: 4000,
    style: '详细具体的描述，越详细越好'
  },
  'ideogram': {
    prefix: '',
    suffix: '',
    parameters: ['--aspect', '--seed', '--prompt-weight'],
    maxLength: 2000,
    style: '包含文字设计的描述，风格标签'
  },
  'nano-banana': {
    prefix: 'cute kawaii illustration of ',
    suffix: ', disney style, cute, adorable, pastel colors, soft lighting',
    parameters: ['--seed'],
    maxLength: 500,
    style: '可爱，卡通，童话风格'
  }
};

// 提示词增强词库
const STYLE_ENHANCERS = {
  lighting: [
    'cinematic lighting', 'golden hour', 'soft natural light', 'studio lighting',
    'dramatic shadows', 'backlit', 'rim light', 'volumetric lighting'
  ],
  camera: [
    'wide angle', 'telephoto', 'macro lens', 'depth of field', 'bokeh',
    'rule of thirds', 'centered composition', 'leading lines'
  ],
  mood: [
    'peaceful', 'dramatic', 'mysterious', 'energetic', 'romantic', 'melancholic',
    'ethereal', 'dreamy', 'vibrant', 'moody'
  ],
  quality: [
    'highly detailed', '8k resolution', 'photorealistic', 'masterpiece',
    'award winning', 'professional photography', 'concept art'
  ]
};

/**
 * 增强图片提示词
 */
function enhancePrompt(text: string): string {
  let enhanced = text;

  // 添加一些通用的质量修饰词
  if (!enhanced.includes('detailed') && !enhanced.includes('quality')) {
    enhanced += ', highly detailed, professional quality';
  }

  return enhanced;
}

/**
 * 生成各模型提示词（简单版本，不调用AI）
 */
export function generateImagePromptsSimple(description: string): AllImagePrompts {
  const enhanced = enhancePrompt(description);

  return {
    midjourney: generateMidjourneyPrompt(enhanced),
    stableDiffusion: generateStableDiffusionPrompt(enhanced),
    dalle3: generateDalle3Prompt(enhanced),
    ideogram: generateIdeogramPrompt(enhanced),
    nanoBanana: generateNanoBananaPrompt(enhanced)
  };
}

/**
 * 生成Midjourney提示词
 */
function generateMidjourneyPrompt(description: string): string {
  const format = MODEL_FORMATS['midjourney'];
  const parts = [
    format.prefix,
    description,
    ', ' + STYLE_ENHANCERS.mood[Math.floor(Math.random() * STYLE_ENHANCERS.mood.length)],
    ', ' + STYLE_ENHANCERS.lighting[Math.floor(Math.random() * STYLE_ENHANCERS.lighting.length)],
    format.suffix
  ];
  return parts.join('').slice(0, format.maxLength);
}

/**
 * 生成Stable Diffusion提示词
 */
function generateStableDiffusionPrompt(description: string): string {
  const format = MODEL_FORMATS['stable-diffusion'];
  const parts = [
    format.prefix,
    description,
    ', ' + STYLE_ENHANCERS.quality[Math.floor(Math.random() * STYLE_ENHANCERS.quality.length)],
    format.suffix
  ];
  return parts.join('').slice(0, format.maxLength);
}

/**
 * 生成DALL-E 3提示词
 */
function generateDalle3Prompt(description: string): string {
  const format = MODEL_FORMATS['dalle3'];
  const parts = [
    format.prefix,
    description,
    format.suffix
  ];
  return parts.join('').slice(0, format.maxLength);
}

/**
 * 生成Ideogram提示词
 */
function generateIdeogramPrompt(description: string): string {
  const format = MODEL_FORMATS['ideogram'];
  const parts = [
    format.prefix,
    description,
    ', typography design',
    format.suffix
  ];
  return parts.join('').slice(0, format.maxLength);
}

/**
 * 生成Nano Banana提示词
 */
function generateNanoBananaPrompt(description: string): string {
  const format = MODEL_FORMATS['nano-banana'];
  const parts = [
    format.prefix,
    description,
    format.suffix
  ];
  return parts.join('').slice(0, format.maxLength);
}

/**
 * 使用AI优化图片提示词
 */
export async function generateImagePromptsFromText(
  text: string,
  env: Env
): Promise<AllImagePrompts> {
  try {
    const systemPrompt = `You are an expert AI image prompt engineer.
Generate optimized prompts for 5 different AI image models based on the user's description.

Output ONLY valid JSON in this exact format:
{
  "midjourney": "optimized prompt for Midjourney",
  "stableDiffusion": "optimized prompt for Stable Diffusion",
  "dalle3": "optimized prompt for DALL-E 3",
  "ideogram": "optimized prompt for Ideogram",
  "nanoBanana": "optimized prompt for Nano Banana"
}

Rules:
1. Each prompt should be 50-200 characters
2. Include relevant style, lighting, and composition keywords
3. Use appropriate syntax for each model
4. Output ONLY JSON, no other text`;

    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      max_tokens: 1000,
      temperature: 0.5
    });

    const content = response.response || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        midjourney: parsed.midjourney || generateMidjourneyPrompt(text),
        stableDiffusion: parsed.stableDiffusion || generateStableDiffusionPrompt(text),
        dalle3: parsed.dalle3 || generateDalle3Prompt(text),
        ideogram: parsed.ideogram || generateIdeogramPrompt(text),
        nanoBanana: parsed.nanoBanana || generateNanoBananaPrompt(text)
      };
    }

    return generateImagePromptsSimple(text);
  } catch (error) {
    console.error('AI image prompt error:', error);
    return generateImagePromptsSimple(text);
  }
}

/**
 * 所有模型的提示词结果
 */
export interface AllImagePrompts {
  midjourney: string;
  stableDiffusion: string;
  dalle3: string;
  ideogram: string;
  nanoBanana: string;
}
