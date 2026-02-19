/**
 * 图片反向解析服务 (Image-to-Prompt)
 * 使用AI视觉模型分析图片并生成提示词
 */

import type { Env } from '../models/types';
import { generateImagePromptsSimple, type AllImagePrompts } from './imagePromptGenerator';

// 解析结果
export interface ImageAnalysisResult {
  caption: string;           // 图片描述
  subjects: string[];        // 主体
  style: string;             // 风格
  lighting: string;          // 光照
  composition: string;       // 构图
  colors: string[];          // 色彩
  mood: string;              // 氛围
  technical: string;         // 技术细节
}

/**
 * 将Uint8Array转换为base64字符串
 */
function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = '';
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

/**
 * 使用Workers AI视觉模型分析图片
 */
export async function analyzeImage(
  imageData: ArrayBuffer,
  env: Env
): Promise<ImageAnalysisResult> {
  try {
    const uint8Array = new Uint8Array(imageData);
    const base64Image = uint8ArrayToBase64(uint8Array);

    // 使用Llama 3.2 Vision模型分析图片
    const response = await env.AI.run(
      '@cf/meta/llama-3.2-11b-vision-instruct',
      {
        messages: [
          {
            role: 'system',
            content: `You are an expert AI image analyst and prompt engineer.
Analyze the image and provide detailed information in JSON format:

{
  "caption": "Brief description of the image (1-2 sentences)",
  "subjects": ["main subject 1", "main subject 2"],
  "style": "artistic style (e.g., photorealistic, anime, oil painting, etc.)",
  "lighting": "lighting condition (e.g., natural daylight, golden hour, studio lighting, etc.)",
  "composition": "composition type (e.g., rule of thirds, centered, wide shot, close-up, etc.)",
  "colors": ["dominant color 1", "dominant color 2"],
  "mood": "overall mood (e.g., energetic, etc.)",
  "technical peaceful, dramatic,": "technical details (camera, lens, render quality if applicable)"
}

Provide ONLY valid JSON, no other text.`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this image and provide detailed information in the specified JSON format.' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
            ]
          }
        ],
        max_tokens: 800,
        temperature: 0.3
      }
    );

    // 检查响应格式
    let content = '';
    if (typeof response === 'string') {
      content = response;
    } else if (response && typeof response === 'object') {
      const resp = response as Record<string, unknown>;
      if (typeof resp.response === 'string') {
        content = resp.response;
      } else {
        content = JSON.stringify(resp);
      }
    }

    // 解析JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        caption: parsed.caption || '',
        subjects: parsed.subjects || [],
        style: parsed.style || '',
        lighting: parsed.lighting || '',
        composition: parsed.composition || '',
        colors: parsed.colors || [],
        mood: parsed.mood || '',
        technical: parsed.technical || '',
      };
    }

    // 解析失败返回默认
    return getDefaultAnalysis();

  } catch (error) {
    console.error('Image analysis error:', error);
    return getDefaultAnalysis();
  }
}

/**
 * 使用UForm模型进行图片描述
 */
export async function describeImageWithUForm(
  imageData: ArrayBuffer,
  env: Env
): Promise<string> {
  try {
    const input = {
      image: [...new Uint8Array(imageData)],
      prompt: 'Generate a detailed caption describing this image. Include subject, setting, lighting, style, and mood.',
      max_tokens: 512,
    };
    
    const response = await env.AI.run(
      '@cf/unum/uform-gen2-qwen-500m',
      input
    );

    if (typeof response === 'string') {
      return response;
    } else if (response && typeof response === 'object') {
      const resp = response as Record<string, unknown>;
      return (resp.description as string) || (resp.response as string) || '';
    }
    return '';
  } catch (error) {
    console.error('UForm describe error:', error);
    return '';
  }
}

/**
 * 将图片分析结果转换为各模型提示词
 */
export function convertToImagePrompts(analysis: ImageAnalysisResult): AllImagePrompts {
  // 构建描述文本
  const descriptionParts: string[] = [];
  
  if (analysis.subjects.length > 0) {
    descriptionParts.push(analysis.subjects.join(', '));
  }
  
  if (analysis.style) {
    descriptionParts.push(analysis.style);
  }
  
  if (analysis.lighting) {
    descriptionParts.push(analysis.lighting);
  }
  
  if (analysis.composition) {
    descriptionParts.push(analysis.composition);
  }
  
  if (analysis.mood) {
    descriptionParts.push(analysis.mood);
  }
  
  if (analysis.colors.length > 0) {
    descriptionParts.push(analysis.colors.join(', '));
  }
  
  const description = descriptionParts.join(', ');
  
  return generateImagePromptsSimple(description || analysis.caption);
}

/**
 * 完整的图片解析流程
 */
export async function parseImageFromUpload(
  imageData: ArrayBuffer,
  imageName: string,
  env: Env
): Promise<{
  analysis: ImageAnalysisResult;
  prompts: AllImagePrompts;
}> {
  // 1. 使用Vision模型分析
  const analysis = await analyzeImage(imageData, env);
  
  // 2. 如果Vision失败，尝试UForm
  if (!analysis.caption) {
    const caption = await describeImageWithUForm(imageData, env);
    if (caption) {
      analysis.caption = caption;
    }
  }
  
  // 3. 转换为各模型提示词
  const prompts = convertToImagePrompts(analysis);
  
  return { analysis, prompts };
}

/**
 * 获取默认分析结果
 */
function getDefaultAnalysis(): ImageAnalysisResult {
  return {
    caption: '',
    subjects: [],
    style: '',
    lighting: '',
    composition: '',
    colors: [],
    mood: '',
    technical: '',
  };
}

/**
 * 支持的图片格式
 */
export const SUPPORTED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

/**
 * 最大图片大小 (10MB)
 */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
