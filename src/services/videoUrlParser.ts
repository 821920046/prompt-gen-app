/**
 * 视频平台链接解析服务
 * 支持抖音、TikTok、B站、快手、小红书等平台
 */

import type { PromptParams, ModelPrompts } from '../models/types';

// 平台类型
export type VideoPlatform = 'douyin' | 'tiktok' | 'bilibili' | 'kuaishou' | 'xiaohongshu' | 'weibo' | 'unknown';

// 解析结果
export interface VideoParseResult {
  platform: VideoPlatform;
  videoId: string;
  title: string;
  description: string;
  author: {
    name: string;
    avatar?: string;
  };
  cover: string;
  videoUrl?: string;
  duration?: number;
  tags?: string[];
  music?: {
    title: string;
    author: string;
  };
}

// 第三方解析API配置
const PARSE_APIS = {
  // 使用公共API服务（可替换为自己的服务）
  douyin: {
    url: 'https://api.douyin.wtf/api/v1/aweme',
    method: 'GET',
  },
  tiktok: {
    url: 'https://api.douyin.wtf/api/v1/tiktok',
    method: 'GET',
  },
};

/**
 * 识别平台类型
 */
export function detectPlatform(url: string): VideoPlatform {
  const patterns: Record<VideoPlatform, RegExp> = {
    douyin: /douyin\.com|v\.douyin\.com/i,
    tiktok: /tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com/i,
    bilibili: /bilibili\.com|b23\.tv|bili\.2233\.cn/i,
    kuaishou: /kuaishou\.com|chenzhongtech\.com/i,
    xiaohongshu: /xiaohongshu\.com|xhslink\.com/i,
    weibo: /weibo\.com|weibo\.cn|t\.cn/i,
    unknown: /.*/,
  };

  for (const [platform, pattern] of Object.entries(patterns)) {
    if (pattern.test(url) && platform !== 'unknown') {
      return platform as VideoPlatform;
    }
  }
  return 'unknown';
}

/**
 * 从抖音分享链接提取视频ID
 */
async function extractDouyinVideoId(shareUrl: string): Promise<string | null> {
  try {
    // 抖音短链接需要重定向获取真实ID
    const response = await fetch(shareUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_0 like Mac OS X) AppleWebKit/605.1.15',
      },
    });
    
    const finalUrl = response.url;
    // 从URL中提取视频ID
    const match = finalUrl.match(/\/video\/(\d+)/);
    if (match) {
      return match[1];
    }
    
    // 尝试其他格式
    const idMatch = finalUrl.match(/[?&]modal_id=(\d+)/);
    if (idMatch) {
      return idMatch[1];
    }
    
    return null;
  } catch (error) {
    console.error('Extract Douyin video ID error:', error);
    return null;
  }
}

/**
 * 从B站URL提取aid和cid
 */
async function extractBilibiliIds(url: string): Promise<{ aid: string; cid?: string } | null> {
  try {
    // 处理短链接
    let finalUrl = url;
    if (url.includes('b23.tv') || url.includes('bili.2233.cn')) {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
      });
      finalUrl = response.url;
    }

    // 提取aid (av号)
    const avMatch = finalUrl.match(/av(\d+)/i);
    if (avMatch) {
      return { aid: avMatch[1] };
    }

    // 提取BV号
    const bvMatch = finalUrl.match(/BV([a-zA-Z0-9]+)/);
    if (bvMatch) {
      // BV转AV的逻辑可以后续添加
      return { aid: bvMatch[0] };
    }

    return null;
  } catch (error) {
    console.error('Extract Bilibili IDs error:', error);
    return null;
  }
}

/**
 * 解析抖音视频
 */
async function parseDouyin(url: string): Promise<VideoParseResult | null> {
  try {
    const videoId = await extractDouyinVideoId(url);
    if (!videoId) {
      // 如果无法提取ID，返回基本结果让用户直接输入描述
      return null;
    }

    // 调用解析API
    // 注意：这里使用公共API，生产环境建议自建服务
    const apiUrl = `${PARSE_APIS.douyin.url}?aweme_id=${videoId}`;
    
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_0 like Mac OS X)',
        },
      });
      
      const data = await response.json() as any;
      
      if (data && data.aweme_detail) {
        const detail = data.aweme_detail;
        return {
          platform: 'douyin',
          videoId: videoId,
          title: detail.desc || '',
          description: detail.desc || '',
          author: {
            name: detail.author?.nickname || '',
            avatar: detail.author?.avatar_thumb?.url_list?.[0],
          },
          cover: detail.video?.cover?.url_list?.[0] || '',
          videoUrl: detail.video?.play_addr?.url_list?.[0],
          duration: detail.video?.duration / 1000,
          tags: detail.text_extra?.map((t: any) => t.hashtag_name).filter(Boolean) || [],
          music: detail.music ? {
            title: detail.music.title || '',
            author: detail.music.author || '',
          } : undefined,
        };
      }
    } catch (apiError) {
      console.log('Douyin API not available, using fallback');
    }

    // API失败时返回基本结果
    return {
      platform: 'douyin',
      videoId: videoId,
      title: '',
      description: '',
      author: { name: '' },
      cover: '',
    };
  } catch (error) {
    console.error('Parse Douyin error:', error);
    return null;
  }
}

/**
 * 解析B站视频
 */
async function parseBilibili(url: string): Promise<VideoParseResult | null> {
  try {
    const ids = await extractBilibiliIds(url);
    if (!ids) {
      return null;
    }

    // 调用B站API
    const apiUrl = `https://api.bilibili.com/x/web-interface/view?aid=${ids.aid}`;
    
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.bilibili.com',
        },
      });
      
      const data = await response.json() as any;
      
      if (data.code === 0 && data.data) {
        const video = data.data;
        return {
          platform: 'bilibili',
          videoId: ids.aid,
          title: video.title || '',
          description: video.desc || '',
          author: {
            name: video.owner?.name || '',
            avatar: video.owner?.face,
          },
          cover: video.pic || '',
          duration: video.duration,
          tags: video.tag?.split(',') || [],
        };
      }
    } catch (apiError) {
      console.log('Bilibili API error:', apiError);
    }

    return {
      platform: 'bilibili',
      videoId: ids.aid,
      title: '',
      description: '',
      author: { name: '' },
      cover: '',
    };
  } catch (error) {
    console.error('Parse Bilibili error:', error);
    return null;
  }
}

/**
 * 解析TikTok视频
 */
async function parseTiktok(url: string): Promise<VideoParseResult | null> {
  try {
    // TikTok解析逻辑类似抖音
    // 由于网络限制，这里返回基本结构
    return {
      platform: 'tiktok',
      videoId: '',
      title: '',
      description: '',
      author: { name: '' },
      cover: '',
    };
  } catch (error) {
    console.error('Parse TikTok error:', error);
    return null;
  }
}

/**
 * 统一解析入口
 */
export async function parseVideoUrl(url: string): Promise<VideoParseResult | null> {
  const platform = detectPlatform(url);
  
  switch (platform) {
    case 'douyin':
      return parseDouyin(url);
    case 'bilibili':
      return parseBilibili(url);
    case 'tiktok':
      return parseTiktok(url);
    case 'kuaishou':
    case 'xiaohongshu':
    case 'weibo':
      // 其他平台待实现
      return {
        platform,
        videoId: '',
        title: '',
        description: '该平台解析功能开发中，请手动输入描述',
        author: { name: '' },
        cover: '',
      };
    default:
      return null;
  }
}

/**
 * 将视频解析结果转换为提示词参数
 */
export function videoResultToPromptParams(result: VideoParseResult): Partial<PromptParams> {
  const params: Partial<PromptParams> = {
    subject: result.author.name ? `视频作者: ${result.author.name}` : '',
    scene: result.description || result.title,
    audio: result.music ? `${result.music.title} - ${result.music.author}` : undefined,
  };

  // 根据标签推断风格
  if (result.tags && result.tags.length > 0) {
    const tagStr = result.tags.join(', ');
    // 简单的标签到风格的映射
    if (tagStr.includes('搞笑') || tagStr.includes('comedy')) {
      params.style = { visual: 'cinematic', lighting: 'natural', colorGrade: 'bright and vibrant', quality: '1080p' };
    } else if (tagStr.includes('美食') || tagStr.includes('food')) {
      params.style = { visual: 'commercial', lighting: 'soft', colorGrade: 'warm and appetizing', quality: '4K' };
    } else if (tagStr.includes('旅行') || tagStr.includes('travel')) {
      params.style = { visual: 'documentary', lighting: 'natural', colorGrade: 'cinematic', quality: '4K' };
    }
  }

  return params;
}

/**
 * 获取平台显示名称
 */
export function getPlatformName(platform: VideoPlatform): string {
  const names: Record<VideoPlatform, string> = {
    douyin: '抖音',
    tiktok: 'TikTok',
    bilibili: '哔哩哔哩',
    kuaishou: '快手',
    xiaohongshu: '小红书',
    weibo: '微博',
    unknown: '未知平台',
  };
  return names[platform];
}

/**
 * 支持的平台列表
 */
export const SUPPORTED_PLATFORMS = [
  { id: 'douyin', name: '抖音', urlPattern: 'v.douyin.com' },
  { id: 'tiktok', name: 'TikTok', urlPattern: 'tiktok.com' },
  { id: 'bilibili', name: '哔哩哔哩', urlPattern: 'bilibili.com / b23.tv' },
  { id: 'kuaishou', name: '快手', urlPattern: 'kuaishou.com' },
  { id: 'xiaohongshu', name: '小红书', urlPattern: 'xiaohongshu.com' },
  { id: 'weibo', name: '微博', urlPattern: 'weibo.com' },
];
