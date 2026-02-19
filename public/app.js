/**
 * 前端应用逻辑
 * 支持：视频文字生成、视频链接解析、图片生成、图片解析
 */

const API_BASE = '';

// DOM元素
const elements = {
  // 模式按钮
  modeVideoText: document.getElementById('mode-video-text'),
  modeVideoLink: document.getElementById('mode-video-link'),
  modeImageGen: document.getElementById('mode-image-gen'),
  modeImageParse: document.getElementById('mode-image-parse'),
  
  // 模式容器
  videoTextMode: document.getElementById('video-text-mode'),
  videoLinkMode: document.getElementById('video-link-mode'),
  imageGenMode: document.getElementById('image-gen-mode'),
  imageParseMode: document.getElementById('image-parse-mode'),
  
  // 视频文字模式
  inputVideoText: document.getElementById('input-video-text'),
  btnGenerateVideo: document.getElementById('btn-generate-video'),
  videoLoading: document.getElementById('video-loading'),
  videoResults: document.getElementById('video-results'),
  resultSora2: document.getElementById('result-sora2'),
  resultVeo3: document.getElementById('result-veo3'),
  resultSeedance2: document.getElementById('result-seedance2'),
  templateTags: document.getElementById('template-tags'),
  
  // 视频链接模式
  videoUrlInput: document.getElementById('video-url-input'),
  btnParseUrl: document.getElementById('btn-parse-url'),
  parseLoading: document.getElementById('parse-loading'),
  videoInfo: document.getElementById('video-info'),
  videoCover: document.getElementById('video-cover'),
  videoPlatform: document.getElementById('video-platform'),
  videoTitle: document.getElementById('video-title'),
  videoAuthor: document.getElementById('video-author'),
  linkResults: document.getElementById('link-results'),
  
  // 图片生成模式
  inputImageText: document.getElementById('input-image-text'),
  btnGenerateImage: document.getElementById('btn-generate-image'),
  imageLoading: document.getElementById('image-loading'),
  imageResults: document.getElementById('image-results'),
  resultMidjourney: document.getElementById('result-midjourney'),
  resultSD: document.getElementById('result-sd'),
  resultDalle3: document.getElementById('result-dalle3'),
  resultIdeogram: document.getElementById('result-ideogram'),
  resultNano: document.getElementById('result-nano'),
  imageModelTags: document.getElementById('image-model-tags'),
  
  // 图片解析模式
  imageUploadArea: document.getElementById('image-upload-area'),
  imageInput: document.getElementById('image-input'),
  imagePreview: document.getElementById('image-preview'),
  previewImg: document.getElementById('preview-img'),
  imageName: document.getElementById('image-name'),
  btnAnalyzeImage: document.getElementById('btn-analyze-image'),
  analyzeLoading: document.getElementById('analyze-loading'),
  analysisResults: document.getElementById('analysis-results'),
};

let currentMode = 'video-text';
let templates = [];
let selectedImage = null;

// 初始化
async function init() {
  await loadTemplates();
  bindEvents();
  switchMode('video-text');
}

// 加载模板
async function loadTemplates() {
  try {
    const response = await fetch(`${API_BASE}/api/templates`);
    const data = await response.json();
    templates = data.templates || [];
    renderTemplateTags();
  } catch (error) {
    console.error('Failed to load templates:', error);
  }
}

// 渲染模板标签
function renderTemplateTags() {
  const categories = { cinematic: '🎬', commercial: '📺', social: '📱', artistic: '🎨' };
  const html = templates.slice(0, 8).map(t => 
    `<button onclick="applyTemplate('${t.id}')" class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition">${categories[t.category] || ''} ${t.name}</button>`
  ).join('');
  elements.templateTags.innerHTML = html;
}

// 应用模板
async function applyTemplate(id) {
  try {
    const response = await fetch(`${API_BASE}/api/templates/${id}`);
    const data = await response.json();
    if (data.template) {
      const t = data.template;
      elements.inputVideoText.value = `${t.params.subject}，${t.params.action}，${t.params.scene}`;
    }
  } catch (error) {
    console.error('Failed to load template:', error);
  }
}

// 绑定事件
function bindEvents() {
  // 模式切换
  elements.modeVideoText.addEventListener('click', () => switchMode('video-text'));
  elements.modeVideoLink.addEventListener('click', () => switchMode('video-link'));
  elements.modeImageGen.addEventListener('click', () => switchMode('image-gen'));
  elements.modeImageParse.addEventListener('click', () => switchMode('image-parse'));
  
  // 视频文字模式
  elements.btnGenerateVideo.addEventListener('click', handleGenerateVideo);
  elements.inputVideoText.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') handleGenerateVideo();
  });
  
  // 视频链接模式
  elements.btnParseUrl.addEventListener('click', handleParseUrl);
  elements.videoUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleParseUrl();
  });
  
  // 图片生成模式
  elements.btnGenerateImage.addEventListener('click', handleGenerateImage);
  elements.inputImageText.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') handleGenerateImage();
  });
  
  // 图片解析模式
  elements.imageUploadArea.addEventListener('click', () => elements.imageInput.click());
  elements.imageInput.addEventListener('change', handleImageSelect);
  elements.btnAnalyzeImage.addEventListener('click', handleAnalyzeImage);
  
  // 拖拽上传
  elements.imageUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.imageUploadArea.classList.add('border-purple-500');
  });
  elements.imageUploadArea.addEventListener('dragleave', () => {
    elements.imageUploadArea.classList.remove('border-purple-500');
  });
  elements.imageUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.imageUploadArea.classList.remove('border-purple-500');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageFile(file);
    }
  });
}

// 切换模式
function switchMode(mode) {
  currentMode = mode;
  
  // 更新按钮状态
  const modeButtons = [
    elements.modeVideoText,
    elements.modeVideoLink,
    elements.modeImageGen,
    elements.modeImageParse
  ];
  modeButtons.forEach(btn => {
    btn.classList.remove('active', 'bg-blue-500', 'text-white');
    btn.classList.add('text-gray-600');
  });
  
  const activeBtn = {
    'video-text': elements.modeVideoText,
    'video-link': elements.modeVideoLink,
    'image-gen': elements.modeImageGen,
    'image-parse': elements.modeImageParse
  }[mode];
  
  if (activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.classList.remove('text-gray-600');
  }
  
  // 显示对应模式
  elements.videoTextMode.classList.toggle('hidden', mode !== 'video-text');
  elements.videoLinkMode.classList.toggle('hidden', mode !== 'video-link');
  elements.imageGenMode.classList.toggle('hidden', mode !== 'image-gen');
  elements.imageParseMode.classList.toggle('hidden', mode !== 'image-parse');
}

// ========== 视频文字生成 ==========
async function handleGenerateVideo() {
  const text = elements.inputVideoText.value.trim();
  if (!text) { alert('请输入视频描述'); return; }
  
  elements.videoLoading.classList.remove('hidden');
  elements.videoResults.classList.add('hidden');
  elements.btnGenerateVideo.disabled = true;
  
  try {
    const response = await fetch(`${API_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    
    if (data.success) {
      elements.resultSora2.textContent = data.outputs.sora2;
      elements.resultVeo3.textContent = data.outputs.veo3;
      elements.resultSeedance2.textContent = data.outputs.seedance2;
      elements.videoResults.classList.remove('hidden');
      elements.videoResults.scrollIntoView({ behavior: 'smooth' });
    } else {
      alert('生成失败：' + (data.error || '未知错误'));
    }
  } catch (error) {
    console.error('Generation error:', error);
    alert('生成失败，请检查网络连接');
  } finally {
    elements.videoLoading.classList.add('hidden');
    elements.btnGenerateVideo.disabled = false;
  }
}

// ========== 视频链接解析 ==========
async function handleParseUrl() {
  const url = elements.videoUrlInput.value.trim();
  if (!url) { alert('请输入视频链接'); return; }
  
  elements.parseLoading.classList.remove('hidden');
  elements.videoInfo.classList.add('hidden');
  elements.linkResults.classList.add('hidden');
  elements.btnParseUrl.disabled = true;
  
  try {
    const response = await fetch(`${API_BASE}/api/parse-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await response.json();
    
    if (data.success) {
      elements.videoPlatform.textContent = data.platform.name;
      elements.videoTitle.textContent = data.video.title || '无标题';
      elements.videoAuthor.textContent = data.video.author?.name ? `作者: ${data.video.author.name}` : '';
      
      if (data.video.cover) {
        elements.videoCover.src = data.video.cover;
        elements.videoCover.classList.remove('hidden');
      } else {
        elements.videoCover.classList.add('hidden');
      }
      
      elements.videoInfo.classList.remove('hidden');
      
      const resultsHtml = `
        <h3 class="text-lg font-bold text-gray-800 mb-3">生成结果</h3>
        <div class="grid gap-3">
          <div class="p-3 bg-pink-50 rounded-lg"><span class="font-medium text-pink-700">Sora 2:</span><pre class="mt-1 text-sm text-gray-700 whitespace-pre-wrap">${data.outputs.sora2}</pre></div>
          <div class="p-3 bg-blue-50 rounded-lg"><span class="font-medium text-blue-700">Veo 3:</span><pre class="mt-1 text-sm text-gray-700 whitespace-pre-wrap">${data.outputs.veo3}</pre></div>
          <div class="p-3 bg-purple-50 rounded-lg"><span class="font-medium text-purple-700">Seedance 2.0:</span><pre class="mt-1 text-sm text-gray-700 whitespace-pre-wrap">${data.outputs.seedance2}</pre></div>
        </div>`;
      
      elements.linkResults.innerHTML = resultsHtml;
      elements.linkResults.classList.remove('hidden');
      elements.linkResults.scrollIntoView({ behavior: 'smooth' });
    } else {
      alert('解析失败：' + (data.message || data.error || '未知错误'));
    }
  } catch (error) {
    console.error('Parse error:', error);
    alert('解析失败，请检查链接是否正确');
  } finally {
    elements.parseLoading.classList.add('hidden');
    elements.btnParseUrl.disabled = false;
  }
}

// ========== 图片生成 ==========
async function handleGenerateImage() {
  const text = elements.inputImageText.value.trim();
  if (!text) { alert('请输入图片描述'); return; }
  
  elements.imageLoading.classList.remove('hidden');
  elements.imageResults.classList.add('hidden');
  elements.btnGenerateImage.disabled = true;
  
  try {
    const response = await fetch(`${API_BASE}/api/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    
    if (data.success) {
      elements.resultMidjourney.textContent = data.prompts.midjourney;
      elements.resultSD.textContent = data.prompts.stableDiffusion;
      elements.resultDalle3.textContent = data.prompts.dalle3;
      elements.resultIdeogram.textContent = data.prompts.ideogram;
      elements.resultNano.textContent = data.prompts.nanoBanana;
      
      elements.imageResults.classList.remove('hidden');
      elements.imageResults.scrollIntoView({ behavior: 'smooth' });
    } else {
      alert('生成失败：' + (data.error || '未知错误'));
    }
  } catch (error) {
    console.error('Image generation error:', error);
    alert('生成失败，请检查网络连接');
  } finally {
    elements.imageLoading.classList.add('hidden');
    elements.btnGenerateImage.disabled = false;
  }
}

// ========== 图片解析 ==========
function handleImageSelect(e) {
  const file = e.target.files[0];
  if (file) {
    handleImageFile(file);
  }
}

function handleImageFile(file) {
  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    alert('请选择图片文件');
    return;
  }
  
  // 验证文件大小 (10MB)
  if (file.size > 10 * 1024 * 1024) {
    alert('图片大小不能超过10MB');
    return;
  }
  
  selectedImage = file;
  
  // 显示预览
  const reader = new FileReader();
  reader.onload = (e) => {
    elements.previewImg.src = e.target.result;
    elements.imageName.textContent = file.name;
    elements.imagePreview.classList.remove('hidden');
    elements.btnAnalyzeImage.disabled = false;
  };
  reader.readAsDataURL(file);
}

async function handleAnalyzeImage() {
  if (!selectedImage) { alert('请先选择图片'); return; }
  
  elements.analyzeLoading.classList.remove('hidden');
  elements.analysisResults.classList.add('hidden');
  elements.btnAnalyzeImage.disabled = true;
  
  try {
    const formData = new FormData();
    formData.append('image', selectedImage);
    
    const response = await fetch(`${API_BASE}/api/analyze-image`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    
    if (data.success) {
      // 显示分析结果
      const a = data.analysis;
      elements.analysisCaption.textContent = a.caption || '无';
      elements.analysisSubjects.textContent = a.subjects?.join(', ') || '无';
      elements.analysisStyle.textContent = a.style || '无';
      elements.analysisLighting.textContent = a.lighting || '无';
      elements.analysisComposition.textContent = a.composition || '无';
      elements.analysisColors.textContent = a.colors?.join(', ') || '无';
      elements.analysisMood.textContent = a.mood || '无';
      
      // 显示提示词
      const p = data.prompts;
      elements.parseMidjourney.textContent = p.midjourney;
      elements.parseSD.textContent = p.stableDiffusion;
      elements.parseDalle3.textContent = p.dalle3;
      elements.parseIdeogram.textContent = p.ideogram;
      elements.parseNano.textContent = p.nanoBanana;
      
      elements.analysisResults.classList.remove('hidden');
      elements.analysisResults.scrollIntoView({ behavior: 'smooth' });
    } else {
      alert('分析失败：' + (data.error || '未知错误'));
    }
  } catch (error) {
    console.error('Analysis error:', error);
    alert('分析失败，请检查网络连接');
  } finally {
    elements.analyzeLoading.classList.add('hidden');
    elements.btnAnalyzeImage.disabled = false;
  }
}

// ========== 通用函数 ==========
function copyToClipboard(elementId) {
  const element = document.getElementById(elementId);
  const text = element.textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = element.nextElementSibling;
    const originalText = btn.textContent;
    btn.textContent = '已复制!';
    btn.classList.add('bg-green-100');
    setTimeout(() => { 
      btn.textContent = originalText; 
      btn.classList.remove('bg-green-100'); 
    }, 2000);
  }).catch(err => console.error('Copy failed:', err));
}

// 启动应用
document.addEventListener('DOMContentLoaded', init);
