/**
 * AI视频提示词生成应用 - 类型定义
 */

// 镜头类型
export type ShotType = 'extreme_close_up' | 'close_up' | 'medium_shot' | 'long_shot' | 'extreme_long_shot' | 'wide_shot';

// 镜头运动
export type CameraMovement = 'static' | 'pan' | 'tilt' | 'dolly_in' | 'dolly_out' | 'truck' | 'pedestal' | 'handheld' | 'gimbal' | 'drone';

// 镜头角度
export type CameraAngle = 'eye_level' | 'low_angle' | 'high_angle' | 'dutch_angle' | 'overhead' | 'birds_eye';

// 视觉风格
export type VisualStyle = 'cinematic' | 'documentary' | 'commercial' | 'music_video' | 'anime' | 'minimalist' | 'vintage' | 'noir' | 'cyberpunk';

// 光照类型
export type LightingType = 'natural' | 'golden_hour' | 'blue_hour' | 'soft' | 'hard' | 'neon' | 'studio' | 'dramatic' | 'low_key' | 'high_key';

// 宽高比
export type AspectRatio = '16:9' | '9:16' | '4:3' | '3:4' | '1:1' | '21:9';

// 相机配置
export interface CameraConfig {
  shotType: ShotType;
  movement: CameraMovement;
  angle: CameraAngle;
  lens?: string; // 例如: "35mm", "50mm f/1.8"
}

// 风格配置
export interface StyleConfig {
  visual: VisualStyle;
  lighting: LightingType;
  colorGrade: string;
  quality: string; // 例如: "4K", "1080p cinematic"
  filmStock?: string; // 例如: "Kodak Vision3", "digital"
}

// 通用参数结构 - 所有AI模型共享的基础参数
export interface PromptParams {
  subject: string;           // 主体描述
  action: string;            // 动作描述
  scene: string;             // 场景环境
  camera: CameraConfig;
  style: StyleConfig;
  audio?: string;            // 音频描述（可选）
  duration?: number;         // 时长秒数（可选）
  aspectRatio: AspectRatio;
  negativePrompt?: string;   // 负面提示词（可选）
}

// 三模型特定提示词
export interface ModelPrompts {
  sora2: string;             // Sora 2优化版
  veo3: string;              // Veo 3优化版
  seedance2: string;         // Seedance 2.0优化版
}

// 生成记录
export interface GenerationRecord {
  id: string;                // UUID
  mode: 'text' | 'video';    // 生成模式
  timestamp: number;         // 时间戳
  sourceText?: string;       // 原始文本输入
  sourceVideo?: {
    key: string;             // R2存储key
    url: string;             // 访问URL
    thumbnail: string;       // 缩略图URL
    duration: number;        // 视频时长
  };
  params: PromptParams;      // 解析参数
  outputs: ModelPrompts;     // 生成结果
  userId?: string;           // 用户ID（可选）
}

// 模板分类
export type TemplateCategory = 'cinematic' | 'commercial' | 'social' | 'artistic';

// 模板定义
export interface PromptTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  params: Partial<PromptParams>;
  previewImage?: string;
  usage: number;             // 使用次数
}

// 视频解析任务状态
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 视频解析任务
export interface VideoParseJob {
  id: string;
  status: JobStatus;
  videoKey: string;          // R2中的key
  frames?: {
    timestamp: number;       // 帧时间点
    key: string;             // R2中的帧图片key
  }[];
  analysis?: {
    scenes: string[];        // 场景描述列表
    cameraWork: string;      // 镜头运动分析
    style: string;           // 风格分析
  };
  result?: PromptParams;     // 解析结果
  error?: string;            // 错误信息
  createdAt: number;
  completedAt?: number;
}

// API请求类型
export interface GenerateRequest {
  text: string;
  templateId?: string;
  aspectRatio?: AspectRatio;
}

export interface GenerateResponse {
  success: boolean;
  id: string;
  params: PromptParams;
  outputs: ModelPrompts;
  message?: string;
}

// AI解析结果
export interface AIParsedResult {
  subject: string;
  action: string;
  scene: string;
  camera: {
    shot_type: string;
    movement: string;
    angle: string;
    lens?: string;
  };
  style: {
    visual: string;
    lighting: string;
    color: string;
    quality: string;
  };
  audio?: string;
  duration?: number;
  aspect_ratio: string;
}

// KV存储Key设计
export const KV_KEYS = {
  template: (id: string) => `template:${id}`,
  templatesList: (category: TemplateCategory) => `templates:${category}`,
  userHistory: (userId: string, page: number) => `history:${userId}:${page}`,
  generationResult: (id: string) => `result:${id}`,
  rateLimit: (ip: string) => `ratelimit:${ip}`,
  videoJob: (id: string) => `job:${id}`,
} as const;

// Workers环境绑定
export interface Env {
  AI: Ai;
  PROMPT_KV: KVNamespace;
  VIDEO_BUCKET: R2Bucket;
  JOB_MANAGER: DurableObjectNamespace;
  ASSETS: Fetcher;
}
