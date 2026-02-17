/**
 * 前端应用逻辑
 */

// API基础URL
const API_BASE = '';

// DOM元素
const elements = {
  modeText: document.getElementById('mode-text'),
  modeVideo: document.getElementById('mode-video'),
  textMode: document.getElementById('text-mode'),
  videoMode: document.getElementById('video-mode'),
  inputText: document.getElementById('input-text'),
  btnGenerate: document.getElementById('btn-generate'),
  loading: document.getElementById('loading'),
  results: document.getElementById('results'),
  resultSora2: document.getElementById('result-sora2'),
  resultVeo3: document.getElementById('result-veo3'),
  resultSeedance2: document.getElementById('result-seedance2'),
  templateTags: document.getElementById('template-tags'),
};

// 状态
let currentMode = 'text';
let templates = [];

// 初始化
async function init() {
  // 加载模板
  await loadTemplates();
  
  // 绑定事件
  bindEvents();
}

// 加载模板列表
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
  const categories = {
    cinematic: '🎬',
    commercial: '📺',
    social: '📱',
    artistic: '🎨',
  };
  
  const html = templates.slice(0, 8).map(t => `
    <button 
      onclick="applyTemplate('${t.id}')"
      class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition"
    >
      ${categories[t.category] || ''} ${t.name}
    </button>
  `).join('');
  
  elements.templateTags.innerHTML = html;
}

// 应用模板
async function applyTemplate(id) {
  try {
    const response = await fetch(`${API_BASE}/api/templates/${id}`);
    const data = await response.json();
    
    if (data.template) {
      const t = data.template;
      const desc = `${t.params.subject}，${t.params.action}，${t.params.scene}`;
      elements.inputText.value = desc;
    }
  } catch (error) {
    console.error('Failed to load template:', error);
  }
}

// 绑定事件
function bindEvents() {
  // 模式切换
  elements.modeText.addEventListener('click', () => switchMode('text'));
  elements.modeVideo.addEventListener('click', () => switchMode('video'));
  
  // 生成按钮
  elements.btnGenerate.addEventListener('click', handleGenerate);
  
  // 回车生成
  elements.inputText.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      handleGenerate();
    }
  });
}

// 切换模式
function switchMode(mode) {
  currentMode = mode;
  
  if (mode === 'text') {
    elements.modeText.classList.add('bg-blue-500', 'text-white');
    elements.modeText.classList.remove('text-gray-600');
    elements.modeVideo.classList.remove('bg-blue-500', 'text-white');
    elements.modeVideo.classList.add('text-gray-600');
    
    elements.textMode.classList.remove('hidden');
    elements.videoMode.classList.add('hidden');
  } else {
    elements.modeVideo.classList.add('bg-blue-500', 'text-white');
    elements.modeVideo.classList.remove('text-gray-600');
    elements.modeText.classList.remove('bg-blue-500', 'text-white');
    elements.modeText.classList.add('text-gray-600');
    
    elements.videoMode.classList.remove('hidden');
    elements.textMode.classList.add('hidden');
  }
}

// 处理生成请求
async function handleGenerate() {
  const text = elements.inputText.value.trim();
  
  if (!text) {
    alert('请输入视频描述');
    return;
  }
  
  // 显示加载
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
      // 显示结果
      elements.resultSora2.textContent = data.outputs.sora2;
      elements.resultVeo3.textContent = data.outputs.veo3;
      elements.resultSeedance2.textContent = data.outputs.seedance2;
      
      elements.results.classList.remove('hidden');
      
      // 滚动到结果
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

// 复制到剪贴板
function copyToClipboard(elementId) {
  const element = document.getElementById(elementId);
  const text = element.textContent;
  
  navigator.clipboard.writeText(text).then(() => {
    // 显示复制成功提示
    const btn = element.nextElementSibling;
    const originalText = btn.textContent;
    btn.textContent = '✅ 已复制';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  }).catch(err => {
    console.error('Copy failed:', err);
  });
}

// 启动应用
document.addEventListener('DOMContentLoaded', init);
