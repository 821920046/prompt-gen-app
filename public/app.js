/**
 * 前端应用逻辑
 */

const API_BASE = '';

const elements = {
  modeText: document.getElementById('mode-text'),
  modeLink: document.getElementById('mode-link'),
  modeVideo: document.getElementById('mode-video'),
  textMode: document.getElementById('text-mode'),
  linkMode: document.getElementById('link-mode'),
  videoMode: document.getElementById('video-mode'),
  inputText: document.getElementById('input-text'),
  btnGenerate: document.getElementById('btn-generate'),
  loading: document.getElementById('loading'),
  results: document.getElementById('results'),
  resultSora2: document.getElementById('result-sora2'),
  resultVeo3: document.getElementById('result-veo3'),
  resultSeedance2: document.getElementById('result-seedance2'),
  templateTags: document.getElementById('template-tags'),
  videoUrlInput: document.getElementById('video-url-input'),
  btnParseUrl: document.getElementById('btn-parse-url'),
  parseLoading: document.getElementById('parse-loading'),
  videoInfo: document.getElementById('video-info'),
  videoCover: document.getElementById('video-cover'),
  videoPlatform: document.getElementById('video-platform'),
  videoTitle: document.getElementById('video-title'),
  videoAuthor: document.getElementById('video-author'),
  linkResults: document.getElementById('link-results'),
};

let currentMode = 'text';
let templates = [];

async function init() {
  await loadTemplates();
  bindEvents();
}

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

function renderTemplateTags() {
  const categories = { cinematic: '🎬', commercial: '📺', social: '📱', artistic: '🎨' };
  const html = templates.slice(0, 8).map(t => 
    `<button onclick="applyTemplate('${t.id}')" class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition">${categories[t.category] || ''} ${t.name}</button>`
  ).join('');
  elements.templateTags.innerHTML = html;
}

async function applyTemplate(id) {
  try {
    const response = await fetch(`${API_BASE}/api/templates/${id}`);
    const data = await response.json();
    if (data.template) {
      const t = data.template;
      elements.inputText.value = `${t.params.subject}，${t.params.action}，${t.params.scene}`;
    }
  } catch (error) {
    console.error('Failed to load template:', error);
  }
}

function bindEvents() {
  elements.modeText.addEventListener('click', () => switchMode('text'));
  elements.modeLink.addEventListener('click', () => switchMode('link'));
  elements.modeVideo.addEventListener('click', () => switchMode('video'));
  elements.btnGenerate.addEventListener('click', handleGenerate);
  elements.btnParseUrl.addEventListener('click', handleParseUrl);
  elements.inputText.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') handleGenerate();
  });
  elements.videoUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleParseUrl();
  });
}

function switchMode(mode) {
  currentMode = mode;
  [elements.modeText, elements.modeLink, elements.modeVideo].forEach(btn => {
    btn.classList.remove('bg-blue-500', 'text-white');
    btn.classList.add('text-gray-600');
  });
  const activeBtn = mode === 'text' ? elements.modeText : mode === 'link' ? elements.modeLink : elements.modeVideo;
  activeBtn.classList.add('bg-blue-500', 'text-white');
  activeBtn.classList.remove('text-gray-600');
  elements.textMode.classList.toggle('hidden', mode !== 'text');
  elements.linkMode.classList.toggle('hidden', mode !== 'link');
  elements.videoMode.classList.toggle('hidden', mode !== 'video');
}

async function handleGenerate() {
  const text = elements.inputText.value.trim();
  if (!text) { alert('请输入视频描述'); return; }
  elements.loading.classList.remove('hidden');
  elements.results.classList.add('hidden');
  elements.btnGenerate.disabled = true;
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
      elements.results.classList.remove('hidden');
      elements.results.scrollIntoView({ behavior: 'smooth' });
    } else {
      alert('生成失败：' + (data.error || '未知错误'));
    }
  } catch (error) {
    console.error('Generation error:', error);
    alert('生成失败，请检查网络连接');
  } finally {
    elements.loading.classList.add('hidden');
    elements.btnGenerate.disabled = false;
  }
}

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
      // 显示结果
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

function copyToClipboard(elementId) {
  const element = document.getElementById(elementId);
  const text = element.textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = element.nextElementSibling;
    const originalText = btn.textContent;
    btn.textContent = '已复制!';
    btn.classList.add('bg-green-100');
    setTimeout(() => { btn.textContent = originalText; btn.classList.remove('bg-green-100'); }, 2000);
  }).catch(err => console.error('Copy failed:', err));
}

document.addEventListener('DOMContentLoaded', init);
