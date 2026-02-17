/**
 * 存储工具函数
 */

import type { Env } from '../models/types';

/**
 * 上传视频到R2
 */
export async function uploadVideo(
  file: File,
  key: string,
  env: Env
): Promise<{ key: string; url: string }> {
  await env.VIDEO_BUCKET.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
    },
  });
  
  // 生成URL
  const url = `https://pub-${env.VIDEO_BUCKET}.r2.dev/${key}`;
  
  return { key, url };
}

/**
 * 获取视频
 */
export async function getVideo(key: string, env: Env): Promise<ReadableStream | null> {
  const object = await env.VIDEO_BUCKET.get(key);
  return object?.body || null;
}

/**
 * 删除视频
 */
export async function deleteVideo(key: string, env: Env): Promise<void> {
  await env.VIDEO_BUCKET.delete(key);
}

/**
 * 生成缩略图（简化版）
 */
export function generateThumbnailKey(videoKey: string): string {
  return videoKey.replace(/\.[^/.]+$/, '_thumb.jpg');
}
