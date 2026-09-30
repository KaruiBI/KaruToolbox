import { createIcons, icons } from 'lucide';
import { getLang, onLangChange, t } from './i18n.js';
import { buildHardwareAdvice, formatBytes, percentText } from './features/system/hardware-advisor.js';
import { buildH3LowVramWorkflow, detectH3LocalEnvironment } from './features/ai/h3-local-engine.js';
import { H3_MODEL_DOWNLOADS, recommendH3Model } from './features/ai/h3-model-advisor.js';
import './comfy-studio-ux.css';
import {
  IMAGE_STYLE_PRESETS,
  IMAGE_QUALITY_TAGS,
  IMAGE_NEGATIVE_TAGS,
  IMAGE_EXAMPLES,
  VIDEO_CAMERA_TAGS,
  VIDEO_MOOD_TAGS,
  VIDEO_EXAMPLES,
  DEFAULT_NEGATIVE,
  FIELD_HELP,
  IMAGE_SIZE_PRESETS,
  VIDEO_SIZE_PRESETS,
  IMAGE_QUALITY_PRESETS,
  VIDEO_QUALITY_PRESETS,
  PROMPT_TIPS,
  pickText,
} from './comfy-presets.js';

const CONFIG_KEY = 'karui-comfy-engine-v1';
const PROMPT_LIBRARY_KEY = 'karui-comfy-prompt-library-v1';
const PROMPT_DRAFT_KEY = 'karui-comfy-prompt-draft-v1';
const VIDEO_ENGINE_KEY = 'karui-video-engine-v1';
const BUILTIN_KEY = 'karui-builtin-engine-v1';
const H3_SIZE_PRESETS = [
  { id: 'h3-wide', label: { zh: '16:9 横屏', en: '16:9 Landscape' }, width: 608, height: 352 },
  { id: 'h3-tall', label: { zh: '9:16 竖屏', en: '9:16 Portrait' }, width: 352, height: 608 },
  { id: 'h3-wide-hq', label: { zh: '16:9 清晰', en: '16:9 Clear' }, width: 864, height: 480 },
];
const H3_QUALITY_PRESETS = [
  { id: 'h3-draft', label: { zh: '快速试拍', en: 'Quick Test' }, hint: { zh: '608×352 · 3 秒', en: '608×352 · 3 seconds' }, steps: 20, cfg: 1, duration: 3, fps: 24, width: 608, height: 352 },
  { id: 'h3-standard', label: { zh: '标准成片', en: 'Standard' }, hint: { zh: '608×352 · 5 秒', en: '608×352 · 5 seconds' }, steps: 20, cfg: 1, duration: 5, fps: 24, width: 608, height: 352 },
  { id: 'h3-fine', label: { zh: '清晰成片', en: 'Clear' }, hint: { zh: '864×480 · 6 秒，较慢', en: '864×480 · 6 seconds, slower' }, steps: 20, cfg: 1, duration: 6, fps: 24, width: 864, height: 480 },
];
const isTauri = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;

const elements = {
    engineOverlay: document.getElementById('comfyEngineOverlay'),
    engineBack: document.getElementById('comfyEngineBack'),
    openEngineSettings: document.getElementById('openComfyEngineSettings'),
    studioEngineSettings: document.getElementById('comfyOpenEngineSettings'),
    engineMode: document.getElementById('comfyEngineMode'),
    advancedSettings: document.getElementById('comfyAdvancedSettings'),
    localPath: document.getElementById('comfyLocalPath'),
    pythonPath: document.getElementById('comfyPythonPath'),
    serverUrl: document.getElementById('comfyServerUrl'),
    accessToken: document.getElementById('comfyAccessToken'),
    autoStart: document.getElementById('comfyAutoStart'),
    lowVram: document.getElementById('comfyLowVram'),
    browsePath: document.getElementById('comfyBrowsePath'),
    builtinRuntime: document.getElementById('comfyBuiltinRuntime'),
    builtinDetectBadge: document.getElementById('comfyBuiltinDetectBadge'),
    builtinDetectTitle: document.getElementById('comfyBuiltinDetectTitle'),
    builtinDetectDetail: document.getElementById('comfyBuiltinDetectDetail'),
    builtinManual: document.getElementById('comfyBuiltinManual'),
    builtinStatus: document.getElementById('comfyBuiltinStatus'),
    builtinStatusText: document.getElementById('comfyBuiltinStatusText'),
    builtinProgress: document.getElementById('comfyBuiltinProgress'),
    builtinProgressFill: document.getElementById('comfyBuiltinProgressFill'),
    builtinProgressText: document.getElementById('comfyBuiltinProgressText'),
    installBuiltin: document.getElementById('comfyInstallBuiltin'),
    cancelBuiltinInstall: document.getElementById('comfyCancelBuiltinInstall'),
    clearBuiltinCache: document.getElementById('comfyClearBuiltinCache'),
    installBuiltinFromFile: document.getElementById('comfyInstallFromFile'),
    importExtractedBuiltin: document.getElementById('comfyImportExtracted'),
    builtinTutorial: document.getElementById('comfyBuiltinTutorial'),
    openDownloadPage: document.getElementById('comfyOpenDownloadPage'),
    startBuiltin: document.getElementById('comfyStartBuiltin'),
    rollbackBuiltin: document.getElementById('comfyRollbackBuiltin'),
    engineStatus: document.getElementById('comfyEngineStatus'),
    startEngine: document.getElementById('comfyStartEngine'),
    stopEngine: document.getElementById('comfyStopEngine'),
    testEngine: document.getElementById('comfyTestEngine'),
    saveEngine: document.getElementById('comfySaveEngine'),
    refreshHardware: document.getElementById('comfyRefreshHardware'),
    toggleHardware: document.getElementById('comfyToggleHardware'),
    hardwareBody: document.getElementById('comfyHardwareBody'),
    hardwareSummary: document.getElementById('comfyHardwareSummary'),
    hardwareState: document.getElementById('comfyHardwareState'),
    hardwareCpu: document.getElementById('comfyHardwareCpu'),
    hardwareCpuMeta: document.getElementById('comfyHardwareCpuMeta'),
    hardwareMemory: document.getElementById('comfyHardwareMemory'),
    hardwareMemoryMeta: document.getElementById('comfyHardwareMemoryMeta'),
    hardwareGpu: document.getElementById('comfyHardwareGpu'),
    hardwareGpuMeta: document.getElementById('comfyHardwareGpuMeta'),
    hardwareVram: document.getElementById('comfyHardwareVram'),
    hardwareVramMeta: document.getElementById('comfyHardwareVramMeta'),
    hardwareAdvice: document.getElementById('comfyHardwareAdvice'),
    tutorialOverlay: document.getElementById('comfyTutorialOverlay'),
    tutorialTabs: document.getElementById('comfyTutorialTabs'),
    openTutorial: document.getElementById('comfyOpenTutorial'),
    pageOpenTutorial: document.getElementById('aiCreativeOpenTutorial'),
    pageOpenSettings: document.getElementById('aiCreativeOpenSettings'),
    tutorialClose: document.getElementById('comfyTutorialClose'),
    tutorialDone: document.getElementById('comfyTutorialDone'),
    tutorialSettings: document.getElementById('comfyTutorialSettings'),
    openModelCenter: document.getElementById('comfyOpenModelCenter'),
    tutorialRootPath: document.getElementById('comfyTutorialRootPath'),
    tutorialModelPath: document.getElementById('comfyTutorialModelPath'),
    tutorialCustomNodesPath: document.getElementById('comfyTutorialCustomNodesPath'),
    tutorialDiffusionPath: document.getElementById('comfyTutorialDiffusionPath'),
    tutorialClipPath: document.getElementById('comfyTutorialClipPath'),
    tutorialVaePath: document.getElementById('comfyTutorialVaePath'),
    installVideoHelper: document.getElementById('comfyInstallVideoHelper'),
    videoInstallStatus: document.getElementById('comfyVideoInstallStatus'),
    installH3Nodes: document.getElementById('comfyInstallH3Nodes'),
    h3InstallStatus: document.getElementById('comfyH3InstallStatus'),
    modelDownloadPanel: document.getElementById('modelDownloadPanel'),
    modelDownloadFilename: document.getElementById('modelDownloadFilename'),
    modelDownloadFill: document.getElementById('modelDownloadFill'),
    modelDownloadDetail: document.getElementById('modelDownloadDetail'),
    modelDownloadCancel: document.getElementById('modelDownloadCancel'),
    modelDownloadHide: document.getElementById('modelDownloadHide'),
    h3Guide: document.getElementById('comfyH3Guide'),
    h3Recommendation: document.getElementById('comfyH3Recommendation'),
    h3RecommendationTitle: document.getElementById('comfyH3RecommendationTitle'),
    h3RecommendationHardware: document.getElementById('comfyH3RecommendationHardware'),
    h3RecommendationReason: document.getElementById('comfyH3RecommendationReason'),
    h3RecommendationFile: document.getElementById('comfyH3RecommendationFile'),
    h3RecommendedDownload: document.getElementById('comfyH3RecommendedDownload'),
    h3OverrideDownload: document.getElementById('comfyH3OverrideDownload'),
    h3RefreshHardware: document.getElementById('comfyH3RefreshHardware'),
    wanGuide: document.getElementById('comfyWanGuide'),
    wanNodesGuide: document.getElementById('comfyWanNodesGuide'),
    wanModelsGuide: document.getElementById('comfyWanModelsGuide'),
    refreshVideoStatus: document.getElementById('comfyRefreshVideoStatus'),
    tutorialServiceStatus: document.getElementById('comfyTutorialServiceStatus'),
    modelOverlay: document.getElementById('comfyModelOverlay'),
    modelClose: document.getElementById('comfyModelClose'),
    modelPathbar: document.getElementById('comfyModelPathbar'),
    modelPath: document.getElementById('comfyModelPath'),
    openModelFolder: document.getElementById('comfyOpenModelFolder'),
    refreshModels: document.getElementById('comfyRefreshModels'),
    modelStatus: document.getElementById('comfyModelStatus'),
    studioOverlay: document.getElementById('comfyStudioOverlay'),
    studioBack: document.getElementById('comfyStudioBack'),
    connectionPill: document.getElementById('comfyConnectionPill'),
    runtimeCpu: document.getElementById('comfyRuntimeCpu'),
    runtimeMemory: document.getElementById('comfyRuntimeMemory'),
    runtimeGpu: document.getElementById('comfyRuntimeGpu'),
    runtimeVram: document.getElementById('comfyRuntimeVram'),
    runtimeTemp: document.getElementById('comfyRuntimeTemp'),
    studioTabs: document.getElementById('comfyStudioTabs'),
    imagePanel: document.getElementById('comfyImagePanel'),
    workflowPanel: document.getElementById('comfyWorkflowPanel'),
    workflowSwitch: document.getElementById('comfyWorkflowSwitch'),
    videoComposer: document.getElementById('comfyVideoComposer'),
    videoEnginePicker: document.getElementById('comfyVideoEnginePicker'),
    videoStatus: document.getElementById('comfyVideoStatus'),
    videoInstallHelp: document.getElementById('comfyVideoInstallHelp'),
    videoModel: document.getElementById('comfyVideoModel'),
    videoClip: document.getElementById('comfyVideoClip'),
    videoVae: document.getElementById('comfyVideoVae'),
    h3ProjectionField: document.getElementById('comfyH3ProjectionField'),
    h3Projection: document.getElementById('comfyH3Projection'),
    h3FrameControls: document.getElementById('comfyH3FrameControls'),
    h3FirstFrame: document.getElementById('comfyH3FirstFrame'),
    h3LastFrame: document.getElementById('comfyH3LastFrame'),
    h3FirstFrameDrop: document.getElementById('comfyH3FirstFrameDrop'),
    h3LastFrameDrop: document.getElementById('comfyH3LastFrameDrop'),
    h3FirstFrameName: document.getElementById('comfyH3FirstFrameName'),
    h3LastFrameName: document.getElementById('comfyH3LastFrameName'),
    videoPrompt: document.getElementById('comfyVideoPrompt'),
    videoWidth: document.getElementById('comfyVideoWidth'),
    videoHeight: document.getElementById('comfyVideoHeight'),
    videoDuration: document.getElementById('comfyVideoDuration'),
    videoFps: document.getElementById('comfyVideoFps'),
    videoSteps: document.getElementById('comfyVideoSteps'),
    videoCfg: document.getElementById('comfyVideoCfg'),
    videoSeed: document.getElementById('comfyVideoSeed'),
    workflowAdvanced: document.getElementById('comfyWorkflowAdvanced'),
    checkpoint: document.getElementById('comfyCheckpoint'),
    prompt: document.getElementById('comfyPrompt'),
    negativePrompt: document.getElementById('comfyNegativePrompt'),
    width: document.getElementById('comfyWidth'),
    height: document.getElementById('comfyHeight'),
    steps: document.getElementById('comfySteps'),
    cfg: document.getElementById('comfyCfg'),
    sampler: document.getElementById('comfySampler'),
    scheduler: document.getElementById('comfyScheduler'),
    seed: document.getElementById('comfySeed'),
    batch: document.getElementById('comfyBatch'),
    promptCount: document.getElementById('comfyPromptCount'),
    promptClear: document.getElementById('comfyPromptClear'),
    promptSave: document.getElementById('comfyPromptSave'),
    imageStyles: document.getElementById('comfyImageStyles'),
    imageQuality: document.getElementById('comfyImageQuality'),
    imageExamples: document.getElementById('comfyImageExamples'),
    imageNegatives: document.getElementById('comfyImageNegatives'),
    videoNegatives: document.getElementById('comfyVideoNegatives'),
    videoNegative: document.getElementById('comfyVideoNegative'),
    videoPromptCount: document.getElementById('comfyVideoPromptCount'),
    videoPromptClear: document.getElementById('comfyVideoPromptClear'),
    videoPromptSave: document.getElementById('comfyVideoPromptSave'),
    videoCamera: document.getElementById('comfyVideoCamera'),
    videoMood: document.getElementById('comfyVideoMood'),
    videoExamples: document.getElementById('comfyVideoExamples'),
    promptInspire: document.getElementById('comfyPromptInspire'),
    videoPromptInspire: document.getElementById('comfyVideoPromptInspire'),
    promptTips: document.getElementById('comfyPromptTips'),
    imagePreset: document.getElementById('comfyImagePreset'),
    imageRatio: document.getElementById('comfyImageRatio'),
    imageParamPreview: document.getElementById('comfyImageParamPreview'),
    videoPreset: document.getElementById('comfyVideoPreset'),
    videoRatio: document.getElementById('comfyVideoRatio'),
    videoParamPreview: document.getElementById('comfyVideoParamPreview'),
    resultStats: document.getElementById('comfyResultStats'),
    clearResults: document.getElementById('comfyClearResults'),
    emptyOpenSettings: document.getElementById('comfyEmptyOpenSettings'),
    promptLibrary: document.getElementById('comfyPromptLibrary'),
    libraryList: document.getElementById('comfyLibraryList'),
    libraryEmpty: document.getElementById('comfyLibraryEmpty'),
    resultSummary: document.getElementById('comfyResultSummary'),
    workflowFile: document.getElementById('comfyWorkflowFile'),
    importWorkflow: document.getElementById('comfyImportWorkflow'),
    workflowJson: document.getElementById('comfyWorkflowJson'),
    run: document.getElementById('comfyRun'),
    cancelRun: document.getElementById('comfyCancelRun'),
    progress: document.getElementById('comfyProgress'),
    progressFill: document.getElementById('comfyProgressFill'),
    progressText: document.getElementById('comfyProgressText'),
    progressTiming: document.getElementById('comfyProgressTiming'),
    resultEmpty: document.getElementById('comfyResultEmpty'),
    resultGrid: document.getElementById('comfyResultGrid'),
    errorCard: document.getElementById('comfyErrorCard'),
    openOutputFolder: document.getElementById('comfyOpenOutputFolder'),
};

let engineConfig = loadConfig();
let studioMode = 'image';
let workflowView = 'video';
let activePromptId = '';
let runCancelled = false;
let lastOutputDir = '';
let videoEnvironment = null;
let wanEnvironment = null;
let h3Environment = null;
let videoEngine = localStorage.getItem(VIDEO_ENGINE_KEY) === 'h3' ? 'h3' : 'wan';
let modelRefreshPromise = null;
let lastRunSeed = -1;
let videoNegativeTouched = false;
let hardwarePollTimer = null;
let hardwareRequestPending = false;
let lastHardwareStatus = null;
let modelDownloadActive = false;
let builtinInstallActive = false;
let builtinRuntimeTouched = false;
let builtinProgressSample = { bytes: 0, time: 0 };

function loadConfig() {
    const fallback = {
        mode: 'builtin',
        localPath: '',
        pythonPath: '',
        serverUrl: 'http://127.0.0.1:8188',
        accessToken: '',
        autoStart: false,
        lowVram: false,
    };
    try {
        return {...fallback, ...JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}') };
    } catch (_) {
        return fallback;
    }
}

function normalizeBaseUrl(url) {
    return String(url || '').trim().replace(/\/+$/, '');
}

function readConfigForm() {
    const activeModeButton = elements.engineMode && elements.engineMode.querySelector('button.active');
    return {
        mode: activeModeButton ? activeModeButton.dataset.mode : 'local',
        localPath: elements.localPath ? elements.localPath.value.trim() : '',
        pythonPath: elements.pythonPath ? elements.pythonPath.value.trim() : '',
        serverUrl: normalizeBaseUrl(elements.serverUrl ? elements.serverUrl.value : 'http://127.0.0.1:8188'),
        accessToken: elements.accessToken ? elements.accessToken.value.trim() : '',
        autoStart: elements.autoStart ? elements.autoStart.checked : false,
        lowVram: elements.lowVram ? elements.lowVram.checked : false,
    };
}

function writeConfigForm(config = engineConfig) {
    elements.localPath.value = config.localPath || '';
    elements.pythonPath.value = config.pythonPath || '';
    elements.serverUrl.value = config.serverUrl || 'http://127.0.0.1:8188';
    elements.accessToken.value = config.accessToken || '';
    elements.autoStart.checked = !!config.autoStart;
    if (elements.lowVram) elements.lowVram.checked = !!config.lowVram;
    elements.engineMode.querySelectorAll('button').forEach((button) => {
        button.classList.toggle('active', button.dataset.mode === config.mode);
    });
    updateEngineModeFields(config.mode);
}

function saveConfig() {
    engineConfig = readConfigForm();
    localStorage.setItem(CONFIG_KEY, JSON.stringify(engineConfig));
    syncModelAccess(engineConfig);
    return engineConfig;
}

function updateEngineModeFields(mode) {
    document.querySelectorAll('.comfy-local-field').forEach((field) => {
        field.hidden = mode !== 'local';
    });
    document.querySelectorAll('.comfy-remote-field').forEach((field) => {
        field.hidden = mode !== 'remote';
    });
    document.querySelectorAll('.comfy-builtin-field').forEach((field) => {
        field.hidden = mode !== 'builtin';
    });
    if (elements.advancedSettings && mode === 'remote') elements.advancedSettings.open = true;
    // 切出内置模式时恢复底部启动按钮（内置模式下已连接时会隐藏它）
    if (mode !== 'builtin' && elements.startEngine) elements.startEngine.hidden = false;
    // 内置模式自带状态行，隐藏底部那份避免重复
    if (elements.engineStatus) elements.engineStatus.hidden = mode === 'builtin';
    const startLabel = elements.startEngine && elements.startEngine.querySelector('span');
    if (startLabel) {
        startLabel.textContent = mode === 'builtin'
            ? t('comfyStudio.startBuiltin')
            : t('comfyStudio.saveAndStart');
    }
}

function setStatus(target, state, message) {
    if (!target) return;
    target.dataset.state = state;
    const label = target.querySelector('span:last-child');
    if (label) label.textContent = message;
}

function setEngineStatus(state, message) {
    setStatus(elements.engineStatus, state, message);
}

function setConnectionStatus(state, message) {
    setStatus(elements.connectionPill, state, message);
}

function syncEngineStatusFromConnection() {
    const state = elements.connectionPill && elements.connectionPill.dataset.state;
    const label = elements.connectionPill && elements.connectionPill.querySelector('span:last-child');
    if (state === 'online' && label) {
        setEngineStatus('online', label.textContent);
        return;
    }
    setEngineStatus('idle', t('comfyStudio.notTested'));
}

function showError(error) {
    const message = typeof error === 'string' ? error : ((error && error.message) || String(error));
    elements.errorCard.textContent = message;
    elements.errorCard.hidden = false;
}

function clearError() {
    elements.errorCard.hidden = true;
    elements.errorCard.textContent = '';
}

async function tauriInvoke(command, args = {}) {
    const { invoke } = await
    import ('@tauri-apps/api/core');
    return invoke(command, args);
}

async function openDownloadUrl(url) {
    if (isTauri) {
        await tauriInvoke('open_url', { url });
        return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
}

function modelDownloadText(zh, en) {
  return getLang() === 'zh' ? zh : en;
}

function setModelDownloadStatus(state, filename, message, percent = 0, showInline = false) {
  if (elements.modelDownloadPanel) {
    elements.modelDownloadPanel.hidden = false;
    elements.modelDownloadPanel.dataset.state = state;
  }
  if (elements.modelDownloadFilename) elements.modelDownloadFilename.textContent = filename || modelDownloadText('模型下载', 'Model download');
  if (elements.modelDownloadDetail) elements.modelDownloadDetail.textContent = message;
  if (elements.modelDownloadFill) elements.modelDownloadFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  if (elements.modelDownloadCancel) elements.modelDownloadCancel.hidden = state !== 'working';
  if (showInline && elements.h3InstallStatus) {
    elements.h3InstallStatus.hidden = false;
    elements.h3InstallStatus.dataset.state = state;
    elements.h3InstallStatus.textContent = message;
  }
}

async function downloadModelInApp(button) {
  if (!isTauri) {
    await openDownloadUrl(button.dataset.comfyDownload);
    return;
  }
  if (modelDownloadActive) return;

  const config = loadConfig();
  const modelId = button.dataset.h3Model;
  const model = H3_MODEL_DOWNLOADS[modelId];
  const filename = button.dataset.comfyFile || model?.filename || '';
  const folder = button.dataset.comfyFolder || (model ? 'diffusion' : '');
  const url = button.dataset.comfyDownload || model?.url || '';
  const showInline = !!button.closest('#comfyH3Guide');
  const useBuiltin = builtinEnabled();
  if (config.mode !== 'local' || (!config.localPath && !useBuiltin)) {
    setModelDownloadStatus('error', filename, modelDownloadText(
      '请先安装内置引擎，或在“设置 → 本地引擎”中选择包含 main.py 的 ComfyUI 文件夹。',
      'Install the built-in engine first, or choose the ComfyUI folder containing main.py in Settings → Local Engine.',
    ), 0, showInline);
    return;
  }
  if (!filename || !folder || !url) {
    setModelDownloadStatus('error', filename, modelDownloadText('无法识别模型下载信息。', 'Unknown model download metadata.'), 0, showInline);
    return;
  }

  modelDownloadActive = true;
  const buttons = [...document.querySelectorAll('[data-comfy-file], [data-h3-model]')];
  buttons.forEach(item => { item.disabled = true; });
  setModelDownloadStatus('working', filename, modelDownloadText(
    `准备下载，已下载的部分会自动续传…`,
    `Preparing download; any partial file will resume automatically…`,
  ), 0, showInline);

  let unlisten = null;
  try {
    const { listen } = await import('@tauri-apps/api/event');
    unlisten = await listen('comfy-model-download-progress', event => {
      const progress = event.payload || {};
      const downloaded = Number(progress.downloadedBytes) || 0;
      const total = Number(progress.totalBytes) || 0;
      const percent = total > 0 ? Math.min(100, downloaded / total * 100) : 0;
      const progressText = total > 0
        ? `${formatBytes(downloaded)} / ${formatBytes(total)} · ${percent.toFixed(1)}%`
        : formatBytes(downloaded);
      setModelDownloadStatus('working', filename, modelDownloadText(
        `${progressText}（可暂停，稍后继续）`,
        `${progressText} (you can pause and resume later)`,
      ), percent, showInline);
    });
    const savedPath = await tauriInvoke('download_comfy_model', {
      comfyPath: useBuiltin ? '' : config.localPath,
      url,
      filename,
      folder,
    });
    setModelDownloadStatus('success', filename, modelDownloadText(
      `模型下载完成，已保存到：${savedPath}`,
      `Model downloaded to: ${savedPath}`,
    ), 100, showInline);
    await renderVideoEngineEnvironment();
    if (folder === 'checkpoints') await refreshModelInventory();
  } catch (error) {
    setModelDownloadStatus('error', filename, error?.message || String(error), 0, showInline);
  } finally {
    if (unlisten) unlisten();
    modelDownloadActive = false;
    buttons.forEach(item => { item.disabled = false; });
    if (lastHardwareStatus) renderH3Recommendation(lastHardwareStatus);
  }
}

async function engineRequest(path, { method = 'GET', body } = {}) {
    const base = normalizeBaseUrl(engineConfig.serverUrl);
    if (!base) throw new Error(t('comfyStudio.connectionFailed'));
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  if (isTauri) {
    return tauriInvoke('comfy_http_json', {
      method,
      url,
      body: body ?? null,
      apiKey: engineConfig.accessToken || null,
    });
  }
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (engineConfig.accessToken) headers.Authorization = `Bearer ${engineConfig.accessToken}`;
  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`ComfyUI HTTP ${response.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : { ok: true };
}

async function requestWithFallback (paths, options) {
  let lastError;
  for (const path of paths) {
    try {
      return await engineRequest(path, options);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(t('comfyStudio.connectionFailed'));
}

async function testConnection ({ updateCard = true } = {}) {
  try {
    const stats = await requestWithFallback(['/system_stats', '/api/system_stats']);
    const deviceName = stats?.devices?.[0]?.name || stats?.system?.comfyui_version || '';
    const label = deviceName ? `${t('comfyStudio.connected')} · ${deviceName}` : t('comfyStudio.connected');
    if (updateCard) setEngineStatus('online', label);
    setConnectionStatus('online', label);
    return stats;
  } catch (error) {
    if (updateCard) setEngineStatus('error', `${t('comfyStudio.connectionFailed')} · ${error.message || error}`);
    setConnectionStatus('error', t('comfyStudio.offline'));
    throw error;
  }
}

function arrayOption (nodeInfo, name) {
  const value = nodeInfo?.input?.required?.[name]?.[0];
  return Array.isArray(value) ? value : [];
}

function fillSelect (select, values, fallback) {
  const previous = select.value;
  const items = values.length ? values : fallback;
  select.innerHTML = '';
  items.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  if (items.includes(previous)) select.value = previous;
}

function updateModelCards (checkpoints) {
  const installed = new Set(checkpoints.map((path) => String(path).split(/[\\/]/).pop().toLowerCase()));
  document.querySelectorAll('.comfy-model-card[data-model-file]').forEach((card) => {
    const isInstalled = installed.has(card.dataset.modelFile.toLowerCase());
    card.classList.toggle('installed', isInstalled);
    const badge = card.querySelector('.comfy-model-installed');
    const download = card.querySelector('[data-comfy-download]');
    if (badge) badge.hidden = !isInstalled;
    if (download) download.hidden = isInstalled;
  });
}

function nodeOptions (info, nodeName, inputName) {
  return arrayOption(info?.[nodeName], inputName).filter((value) => typeof value === 'string');
}

function setVideoStatus (state, message) {
  if (!elements.videoStatus) return;
  elements.videoStatus.dataset.state = state;
  const label = elements.videoStatus.querySelector('span');
  if (label) label.textContent = message;
}

function detectVideoEnvironment (info) {
  const requiredNodes = [
    'UNETLoader', 'CLIPLoader', 'VAELoader', 'CLIPTextEncode',
    'EmptyHunyuanLatentVideo', 'ModelSamplingSD3', 'KSampler', 'VAEDecode',
  ];
  const missingNodes = requiredNodes.filter((name) => !info?.[name]);
  const videoOutputMode = info?.CreateVideo && info?.SaveVideo
    ? 'native'
    : (info?.VHS_VideoCombine ? 'vhs' : '');
  const models = nodeOptions(info, 'UNETLoader', 'unet_name').filter((value) => /wan/i.test(value));
  const clips = nodeOptions(info, 'CLIPLoader', 'clip_name').filter((value) => /wan|umt5/i.test(value));
  const vaes = nodeOptions(info, 'VAELoader', 'vae_name').filter((value) => /wan/i.test(value));
  const missing = [...missingNodes];
  if (!videoOutputMode) missing.push('CreateVideo + SaveVideo / VHS_VideoCombine');
  if (!models.length) missing.push(t('comfyStudio.videoMissingModel'));
  if (!clips.length) missing.push(t('comfyStudio.videoMissingClip'));
  if (!vaes.length) missing.push(t('comfyStudio.videoMissingVae'));
  const ready = missing.length === 0;
  wanEnvironment = { ready, info, missing, videoOutputMode, models, clips, vaes };
  h3Environment = { ...detectH3LocalEnvironment(info), info };
  renderVideoEngineEnvironment();
  return videoEnvironment;
}

function renderVideoEngineEnvironment () {
  const isH3 = videoEngine === 'h3';
  videoEnvironment = isH3 ? h3Environment : wanEnvironment;
  const environment = videoEnvironment;
  const models = environment?.models || [];
  const clips = environment?.clips || [];
  const vaes = environment?.vaes || [];
    fillSelect(elements.videoModel, models, [isH3 ? '未检测到 H3 FL2VA 模型' : t('comfyStudio.videoNoModel')]);
  fillSelect(elements.videoClip, clips, [isH3 ? '未检测到 Qwen3-VL 4B' : t('comfyStudio.videoNoClip')]);
  fillSelect(elements.videoVae, vaes, [isH3 ? '未检测到 H3 视频 VAE' : t('comfyStudio.videoNoVae')]);
  if (isH3) {
    fillSelect(elements.h3Projection, environment?.projections || [], ['未检测到 H3 ClipProj']);
    if (environment?.selected?.model) elements.videoModel.value = environment.selected.model;
    if (environment?.selected?.clip) elements.videoClip.value = environment.selected.clip;
    if (environment?.selected?.vae) elements.videoVae.value = environment.selected.vae;
    if (environment?.selected?.projection) elements.h3Projection.value = environment.selected.projection;
  }
  if (elements.h3ProjectionField) elements.h3ProjectionField.hidden = !isH3;
  if (elements.h3FrameControls) elements.h3FrameControls.hidden = !isH3;
  if (elements.videoFps) elements.videoFps.disabled = isH3;
  if (elements.videoCfg) elements.videoCfg.disabled = isH3;
  elements.videoEnginePicker?.querySelectorAll('button[data-video-engine]').forEach((button) => {
    const active = button.dataset.videoEngine === videoEngine;
    button.classList.toggle('active', active);
    button.setAttribute('aria-checked', String(active));
  });
  if (!environment) {
    setVideoStatus('checking', t('comfyStudio.videoChecking'));
  } else {
    setVideoStatus(
      environment.ready ? 'ready' : 'missing',
      environment.ready
        ? (isH3 ? t('comfyStudio.h3Ready') : t('comfyStudio.videoReady'))
        : t('comfyStudio.videoMissing', { items: environment.missing.join('、') }),
    );
  }
}

function setVideoEngine (engine, { applyDefaults = true } = {}) {
  videoEngine = engine === 'h3' ? 'h3' : 'wan';
  localStorage.setItem(VIDEO_ENGINE_KEY, videoEngine);
  if (applyDefaults && videoEngine === 'h3') {
    elements.videoWidth.value = 608;
    elements.videoHeight.value = 352;
    elements.videoDuration.value = 5;
    elements.videoFps.value = 24;
    elements.videoSteps.value = 20;
    elements.videoCfg.value = 1;
  }
  renderVideoEngineEnvironment();
  buildPromptLab();
}

function syncH3FrameFileUI (input, drop, name) {
  const file = input?.files?.[0];
  drop?.classList.toggle('has-file', !!file);
  if (name) name.textContent = file?.name || t('comfyStudio.h3FrameOptional');
}

async function loadCapabilities () {
  const info = await requestWithFallback(['/object_info', '/api/object_info']);
  const checkpoints = arrayOption(info?.CheckpointLoaderSimple, 'ckpt_name');
  const samplers = arrayOption(info?.KSampler, 'sampler_name');
  const schedulers = arrayOption(info?.KSampler, 'scheduler');
  fillSelect(elements.checkpoint, checkpoints, [t('comfyStudio.noModel')]);
  fillSelect(elements.sampler, samplers, ['euler']);
  fillSelect(elements.scheduler, schedulers, ['normal']);
  if (!checkpoints.length) elements.checkpoint.value = t('comfyStudio.noModel');
  updateModelCards(checkpoints);
  detectVideoEnvironment(info);
  return info;
}

async function refreshModelInventory () {
  if (modelRefreshPromise) return modelRefreshPromise;
  elements.refreshModels.disabled = true;
  elements.modelStatus.textContent = t('comfyStudio.refreshingModels');
  modelRefreshPromise = loadCapabilities()
    .then((info) => {
      const checkpoints = arrayOption(info?.CheckpointLoaderSimple, 'ckpt_name');
      elements.modelStatus.textContent = t('comfyStudio.modelsFound', { count: checkpoints.length });
      return info;
    })
    .catch((error) => {
      elements.modelStatus.textContent = `${t('comfyStudio.connectionFailed')}: ${error.message || error}`;
      return null;
    })
    .finally(() => {
      elements.refreshModels.disabled = false;
      modelRefreshPromise = null;
    });
  return modelRefreshPromise;
}

function primaryGpu (status) {
  const gpus = Array.isArray(status?.gpus) ? status.gpus : [];
  return gpus.reduce((best, gpu) => {
    return (gpu?.dedicatedMemoryBytes || 0) > (best?.dedicatedMemoryBytes || 0) ? gpu : best;
  }, gpus[0] || null);
}

function setHardwareState (state, message) {
  if (!elements.hardwareState) return;
  elements.hardwareState.dataset.state = state;
  const label = elements.hardwareState.querySelector('span:last-child');
  if (label) label.textContent = message;
}

function renderHardwareAdvice (status) {
  if (!elements.hardwareAdvice) return;
  elements.hardwareAdvice.replaceChildren();
  buildHardwareAdvice(status, getLang()).forEach((advice) => {
    const card = document.createElement('article');
    card.className = 'comfy-advice-item';
    card.dataset.level = advice.level;
    const title = document.createElement('strong');
    const detail = document.createElement('span');
    title.textContent = advice.title;
    detail.textContent = advice.detail;
    card.append(title, detail);
    elements.hardwareAdvice.appendChild(card);
  });
}

function renderH3Recommendation (status) {
  if (!elements.h3Recommendation) return;
  const recommendation = recommendH3Model(status, getLang());
  const gpu = primaryGpu(status);
  const lang = getLang();
  elements.h3Recommendation.dataset.state = recommendation.supported ? 'online' : 'error';
  elements.h3RecommendationTitle.textContent = recommendation.summary;
  elements.h3RecommendationHardware.textContent = [
    status?.osName,
    recommendation.gpuName,
    formatBytes(gpu?.dedicatedMemoryBytes),
    formatBytes(status?.memory?.totalBytes),
  ].filter(Boolean).join(' · ');
  elements.h3RecommendationReason.textContent = recommendation.lowVram && recommendation.supported
    ? `${recommendation.reason} ${lang === 'zh' ? '建议在设置中手动开启低显存模式。' : 'Enable low VRAM mode manually in Settings.'}`
    : recommendation.reason;
  elements.h3RecommendationFile.textContent = recommendation.model
    ? `${recommendation.model.filename} · ${recommendation.model.size}`
    : (lang === 'zh' ? '未提供默认推荐，可参考下方说明选择版本' : 'No default recommendation; see the guide below');
  elements.h3RecommendedDownload.disabled = !recommendation.model;
  elements.h3RecommendedDownload.dataset.comfyDownload = recommendation.model?.url || '';
  elements.h3RecommendedDownload.dataset.h3Model = recommendation.model?.id || '';
  elements.h3RecommendedDownload.dataset.comfyFile = recommendation.model?.filename || '';
  elements.h3RecommendedDownload.dataset.comfyFolder = 'diffusion';
  const override = elements.h3OverrideDownload;
  if (override) {
    const alternative = recommendation.overrideModel;
    const showOverride = alternative && (!recommendation.supported || recommendation.lowVram);
    override.hidden = !showOverride;
    if (showOverride) {
      override.dataset.comfyDownload = alternative.url;
      override.dataset.h3Model = alternative.id;
      override.dataset.comfyFile = alternative.filename;
      override.dataset.comfyFolder = 'diffusion';
      override.title = `${alternative.filename} · ${alternative.size}`;
      const label = override.querySelector('span');
      if (label) {
        label.textContent = recommendation.supported
          ? (lang === 'zh' ? `改下 ${alternative.id.toUpperCase()} 版` : `Use ${alternative.id.toUpperCase()} instead`)
          : (lang === 'zh' ? `仍要下载 ${alternative.id.toUpperCase()} 轻量版` : `Download ${alternative.id.toUpperCase()} anyway`);
      }
    }
  }
}

function renderHardwareStatus (status) {
  const gpu = primaryGpu(status);
  const cpu = status?.cpu || {};
  const memory = status?.memory || {};
  const coreText = t('comfyStudio.coreCount', { count: cpu.logicalCores || 0 });
  elements.hardwareCpu.textContent = cpu.name || t('comfyStudio.unknownHardware');
  elements.hardwareCpu.title = cpu.name || '';
  elements.hardwareCpuMeta.textContent = `${coreText} · ${percentText(cpu.usagePercent)}`;
  elements.hardwareMemory.textContent = formatBytes(memory.totalBytes);
  elements.hardwareMemoryMeta.textContent = t('comfyStudio.memoryUsed', {
    used: formatBytes(memory.usedBytes),
    percent: percentText(memory.usagePercent),
  });
  elements.hardwareGpu.textContent = gpu?.name || t('comfyStudio.noGpuDetected');
  elements.hardwareGpu.title = gpu?.name || '';
  elements.hardwareGpuMeta.textContent = gpu
    ? `${gpu.vendor || ''}${gpu.utilizationPercent != null ? ` · ${percentText(gpu.utilizationPercent)}` : ''}`
    : t('comfyStudio.remoteRecommended');
  elements.hardwareVram.textContent = formatBytes(gpu?.dedicatedMemoryBytes);
  elements.hardwareVramMeta.textContent = gpu?.usedMemoryBytes != null
    ? t('comfyStudio.vramUsed', { used: formatBytes(gpu.usedMemoryBytes) })
    : t('comfyStudio.realtimeUnavailable');

  elements.runtimeCpu.textContent = percentText(cpu.usagePercent);
  elements.runtimeMemory.textContent = percentText(memory.usagePercent);
  elements.runtimeGpu.textContent = percentText(gpu?.utilizationPercent);
  elements.runtimeVram.textContent = gpu?.usedMemoryBytes != null && gpu?.dedicatedMemoryBytes
    ? `${formatBytes(gpu.usedMemoryBytes, 0)} / ${formatBytes(gpu.dedicatedMemoryBytes, 0)}`
    : formatBytes(gpu?.dedicatedMemoryBytes, 0);
  elements.runtimeTemp.textContent = Number.isFinite(gpu?.temperatureCelsius)
    ? `${Math.round(gpu.temperatureCelsius)}°C`
    : '--';
  renderHardwareAdvice(status);
  renderH3Recommendation(status);
  renderHardwareSummary(status);
  syncBuiltinRuntimeFromHardware(status);
  setHardwareState('ready', t('comfyStudio.hardwareReady'));
}

// 按检测到的显卡自动匹配内置引擎版本；用户手动改过后不再覆盖
function syncBuiltinRuntimeFromHardware (status) {
  if (!elements.builtinRuntime) return;
  const gpu = primaryGpu(status);
  const name = shortHardwareName(gpu?.name);
  const label = `${gpu?.vendor || ''} ${gpu?.name || ''}`.toLowerCase();
  let value = '';
  let badge = 'CPU';
  let title = builtinText('未检测到独立显卡', 'No dedicated GPU detected');
  let detail = builtinText('核显或纯 CPU 生成会很慢，建议手动选择兼容版本，或改用云端 AI。',
    'Integrated graphics or CPU is very slow. Pick a compatible build manually or use cloud AI instead.');

  if (/nvidia|geforce|\brtx\b|\bgtx\b|quadro|tesla/.test(label)) {
    value = 'comfyui-windows-nvidia';
    badge = 'NVIDIA';
    title = builtinText(`已识别到 NVIDIA 显卡${name ? `：${name}` : ''}`, `Detected NVIDIA GPU${name ? `: ${name}` : ''}`);
    detail = builtinText('将自动安装 NVIDIA 版引擎；若装好后启动失败，可在下方手动改为旧显卡版。',
      'The NVIDIA build will be installed. If it fails to start, switch to the legacy build below.');
  } else if (/amd|radeon/.test(label)) {
    value = 'comfyui-windows-amd';
    badge = 'AMD';
    title = builtinText(`已识别到 AMD 显卡${name ? `：${name}` : ''}`, `Detected AMD GPU${name ? `: ${name}` : ''}`);
    detail = builtinText('将自动安装 AMD 版引擎。', 'The AMD build will be installed.');
  } else if (/intel|\barc\b|iris|uhd graphics/.test(label)) {
    value = 'comfyui-windows-intel';
    badge = 'INTEL';
    title = builtinText(`已识别到 Intel 显卡${name ? `：${name}` : ''}`, `Detected Intel GPU${name ? `: ${name}` : ''}`);
    detail = builtinText('将自动安装 Intel 版引擎；核显生成速度较慢。', 'The Intel build will be installed. Integrated graphics is slower.');
  }

  if (builtinRuntimeTouched) return;
  if (value) elements.builtinRuntime.value = value;
  if (elements.builtinDetectBadge) elements.builtinDetectBadge.textContent = badge;
  if (elements.builtinDetectTitle) elements.builtinDetectTitle.textContent = title;
  if (elements.builtinDetectDetail) elements.builtinDetectDetail.textContent = detail;
}

// 用户手动选择了显卡类型时，显示当前选择并停止自动覆盖
function refreshBuiltinDetectText () {
  if (!elements.builtinRuntime || !elements.builtinDetectTitle) return;
  const text = elements.builtinRuntime.selectedOptions?.[0]?.textContent?.trim() || '';
  elements.builtinDetectTitle.textContent = builtinText(`已手动选择：${text}`, `Manually selected: ${text}`);
  if (elements.builtinDetectDetail) {
    elements.builtinDetectDetail.textContent = builtinText('将安装你选择的这个版本。', 'This build will be installed.');
  }
  const badgeMap = {
    'comfyui-windows-nvidia': 'NVIDIA',
    'comfyui-windows-nvidia-cu126': 'NVIDIA',
    'comfyui-windows-amd': 'AMD',
    'comfyui-windows-intel': 'INTEL',
  };
  if (elements.builtinDetectBadge) {
    elements.builtinDetectBadge.textContent = badgeMap[elements.builtinRuntime.value] || 'CPU';
  }
}

function renderHardwareSummary (status) {
  if (!elements.hardwareSummary) return;
  const gpu = primaryGpu(status);
  const cpuName = shortHardwareName(status?.cpu?.name);
  const memoryText = formatBytes(status?.memory?.totalBytes);
  const gpuName = gpu ? shortHardwareName(gpu.name) : '';
  const vramText = gpu?.dedicatedMemoryBytes ? formatBytes(gpu.dedicatedMemoryBytes) : '';
  const parts = [];
  if (cpuName) parts.push(cpuName);
  if (memoryText && memoryText !== '0 B') parts.push(builtinText(`${memoryText} 内存`, `${memoryText} RAM`));
  if (gpuName) parts.push(vramText ? `${gpuName} · ${vramText}${builtinText(' 显存', ' VRAM')}` : gpuName);
  else parts.push(t('comfyStudio.noGpuDetected'));
  elements.hardwareSummary.textContent = parts.join(' · ');
  elements.hardwareSummary.hidden = false;
}

// 硬件名称过长时去掉厂商后缀，便于在摘要行完整显示
function shortHardwareName (name) {
  if (!name) return '';
  return String(name)
    .replace(/\s*\((R|TM|C)\)/gi, '')
    .replace(/\s*(CPU|GPU)\b/gi, '')
    .replace(/\s*@\s*[\d.]+\s*GHz/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function setHardwareDetailsOpen (open) {
  if (!elements.hardwareBody || !elements.toggleHardware) return;
  elements.hardwareBody.hidden = !open;
  elements.toggleHardware.textContent = open
    ? builtinText('收起', 'Hide')
    : builtinText('查看详情', 'Details');
  elements.toggleHardware.setAttribute('aria-expanded', open ? 'true' : 'false');
}

async function refreshHardwareStatus () {
  if (hardwareRequestPending) return lastHardwareStatus;
  if (!isTauri) {
    setHardwareState('error', t('comfyStudio.hardwareDesktopOnly'));
    return null;
  }
  hardwareRequestPending = true;
  elements.refreshHardware?.classList.add('is-loading');
  try {
    const status = await tauriInvoke('get_system_status');
    lastHardwareStatus = status;
    renderHardwareStatus(status);
    return status;
  } catch (error) {
    setHardwareState('error', `${t('comfyStudio.hardwareFailed')}: ${error.message || error}`);
    return null;
  } finally {
    hardwareRequestPending = false;
    elements.refreshHardware?.classList.remove('is-loading');
  }
}

function hardwarePanelVisible () {
  return elements.engineOverlay?.classList.contains('visible') || elements.studioOverlay?.classList.contains('visible');
}

function startHardwareMonitor () {
  refreshHardwareStatus();
  if (!hardwarePollTimer) {
    hardwarePollTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && hardwarePanelVisible()) refreshHardwareStatus();
    }, 2500);
  }
}

function stopHardwareMonitorIfHidden () {
  if (hardwarePanelVisible() || !hardwarePollTimer) return;
  window.clearInterval(hardwarePollTimer);
  hardwarePollTimer = null;
}

function openEngineSettings () {
  engineConfig = loadConfig();
  writeConfigForm();
  elements.engineOverlay.classList.add('visible');
  elements.engineOverlay.setAttribute('aria-hidden', 'false');
  startHardwareMonitor();
  refreshBuiltinRuntimeState();
  syncEngineStatusFromConnection();
  testConnection().catch(() => {
    // testConnection updates the visible status with the connection error.
  });
}

function closeEngineSettings () {
  elements.engineOverlay.classList.remove('visible');
  elements.engineOverlay.setAttribute('aria-hidden', 'true');
  stopHardwareMonitorIfHidden();
}

function setTutorialMode (mode) {
  const selectedMode = mode === 'video' ? 'video' : 'image';
  elements.tutorialTabs?.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('active', button.dataset.tutorialMode === selectedMode);
  });
  elements.tutorialOverlay?.querySelectorAll('[data-tutorial-panel]').forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.tutorialPanel === selectedMode);
  });
}

// 引擎的模型根目录：内置引擎在统一目录 AI\data\models，本地引擎在其 ComfyUI\models
function getEngineModelRoot () {
  const builtinData = builtinRuntimeState?.paths?.data;
  if (builtinData) return `${builtinData.replace(/[\\/]+$/, '')}\\models`;
  const config = loadConfig();
  if (config.mode === 'local' && config.localPath) {
    return `${config.localPath.replace(/[\\/]+$/, '')}\\models`;
  }
  return '';
}

// 引擎的 ComfyUI 目录（custom_nodes 所在处）
function getEngineComfyDir () {
  if (builtinRuntimeState?.installed?.comfyDir) {
    return builtinRuntimeState.installed.comfyDir.replace(/[\\/]+$/, '');
  }
  const config = loadConfig();
  if (config.mode === 'local' && config.localPath) {
    return config.localPath.replace(/[\\/]+$/, '');
  }
  return '';
}

function syncTutorialPaths () {
  const modelRoot = getEngineModelRoot();
  const comfyRoot = getEngineComfyDir();
  const pathPending = t('comfyStudio.tutorialPathPending');
  const paths = {
    tutorialRootPath: comfyRoot || pathPending,
    tutorialCustomNodesPath: comfyRoot ? `${comfyRoot}\\custom_nodes` : pathPending,
    tutorialDiffusionPath: modelRoot ? `${modelRoot}\\diffusion_models` : pathPending,
    tutorialClipPath: modelRoot ? `${modelRoot}\\text_encoders` : pathPending,
    tutorialVaePath: modelRoot ? `${modelRoot}\\vae` : pathPending,
  };
  Object.entries(paths).forEach(([key, path]) => {
    if (elements[key]) elements[key].textContent = path;
  });
  document.querySelectorAll('[data-comfy-folder]').forEach((button) => {
    button.disabled = !(comfyRoot || modelRoot);
  });
}

function getTutorialFolderPath (folder) {
  const modelRoot = getEngineModelRoot();
  const comfyRoot = getEngineComfyDir();
  const folders = {
    root: comfyRoot,
    checkpoints: modelRoot ? `${modelRoot}\\checkpoints` : '',
    customNodes: comfyRoot ? `${comfyRoot}\\custom_nodes` : '',
    diffusion: modelRoot ? `${modelRoot}\\diffusion_models` : '',
    clip: modelRoot ? `${modelRoot}\\text_encoders` : '',
    vae: modelRoot ? `${modelRoot}\\vae` : '',
    clipProjection: modelRoot ? `${modelRoot}\\clip_projections` : '',
  };
  return folders[folder] || '';
}

function openTutorial (requestedMode) {
  // 内置引擎路径需要先向后端拿一次，拿到后再刷新教程里的目录显示
  if (isTauri && !builtinRuntimeState) {
    refreshBuiltinRuntimeState().then(() => {
      syncTutorialPaths();
      syncModelAccess();
    });
  }
  syncModelAccess();
  syncTutorialPaths();
  const mode = typeof requestedMode === 'string'
    ? requestedMode
    : (studioMode === 'workflow' ? 'video' : 'image');
  setTutorialMode(mode);
  if (elements.h3Guide) elements.h3Guide.hidden = videoEngine !== 'h3';
  if (elements.wanGuide) elements.wanGuide.hidden = false;
  if (elements.wanNodesGuide) elements.wanNodesGuide.hidden = videoEngine === 'h3';
  if (elements.wanModelsGuide) elements.wanModelsGuide.hidden = videoEngine === 'h3';
  if (lastHardwareStatus) renderH3Recommendation(lastHardwareStatus);
  else refreshHardwareStatus();
  elements.tutorialOverlay.classList.add('visible');
  elements.tutorialOverlay.setAttribute('aria-hidden', 'false');
}

function closeTutorial () {
  elements.tutorialOverlay.classList.remove('visible');
  elements.tutorialOverlay.setAttribute('aria-hidden', 'true');
}

function getCheckpointPath () {
  const modelRoot = getEngineModelRoot();
  return modelRoot ? `${modelRoot}\\checkpoints` : '';
}

function syncModelAccess (config = loadConfig()) {
  const checkpointPath = getCheckpointPath();
  if (elements.tutorialModelPath) {
    elements.tutorialModelPath.textContent = checkpointPath || t('comfyStudio.tutorialPathPending');
    elements.tutorialModelPath.hidden = false;
  }
  if (elements.openModelCenter) elements.openModelCenter.hidden = !checkpointPath;
  if (elements.modelPathbar) elements.modelPathbar.hidden = !checkpointPath;
  if (elements.modelPath) elements.modelPath.textContent = checkpointPath;
  if (elements.openModelFolder) elements.openModelFolder.disabled = !checkpointPath;
  return checkpointPath;
}

function openModelCenter () {
  const checkpointPath = syncModelAccess();
  if (!checkpointPath) return;
  elements.modelOverlay.classList.add('visible');
  elements.modelOverlay.setAttribute('aria-hidden', 'false');
  refreshModelInventory();
}

function closeModelCenter () {
  elements.modelOverlay.classList.remove('visible');
  elements.modelOverlay.setAttribute('aria-hidden', 'true');
}

function setStudioMode (mode) {
  studioMode = mode === 'workflow' ? 'workflow' : 'image';
  elements.studioTabs.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('active', button.dataset.studioMode === studioMode);
  });
  elements.imagePanel.classList.toggle('active', studioMode === 'image');
  elements.workflowPanel.classList.toggle('active', studioMode === 'workflow');
  syncRunLabel();
}

function syncRunLabel () {
  const runLabel = elements.run?.querySelector('span');
  if (!runLabel) return;
  runLabel.textContent = studioMode === 'workflow' && workflowView === 'custom'
    ? t('comfyStudio.runWorkflow')
    : t('comfyStudio.generate');
}

function setWorkflowView (view) {
  workflowView = view === 'custom' ? 'custom' : 'video';
  elements.workflowSwitch?.querySelectorAll('button[data-workflow-view]').forEach((button) => {
    const active = button.dataset.workflowView === workflowView;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  if (elements.videoComposer) elements.videoComposer.hidden = workflowView !== 'video';
  if (elements.workflowAdvanced) {
    elements.workflowAdvanced.hidden = workflowView !== 'custom';
    elements.workflowAdvanced.open = workflowView === 'custom';
  }
  syncRunLabel();
}

async function openStudio (mode = 'image') {
  setStudioMode(mode === 'video' ? 'workflow' : mode);
  if (mode === 'video') setWorkflowView('video');
  clearError();
  elements.studioOverlay.classList.add('visible');
  elements.studioOverlay.setAttribute('aria-hidden', 'false');
  startHardwareMonitor();
  engineConfig = loadConfig();
  if (engineConfig.mode === 'local' && engineConfig.autoStart && isTauri) {
    try {
      await startLocalEngine(false);
    } catch (_) {
      // Connection check below reports the useful error state.
    }
  }
  try {
    await testConnection({ updateCard: false });
    await loadCapabilities();
  } catch (_) {
    showError(`${t('comfyStudio.connectionFailed')}。${getLang() === 'zh' ? '请点击右上角设置检查引擎地址。' : 'Open settings in the top-right and check the engine URL.'}`);
  }
}

function closeStudio () {
  elements.studioOverlay.classList.remove('visible');
  elements.studioOverlay.setAttribute('aria-hidden', 'true');
  stopHardwareMonitorIfHidden();
}

async function browseComfyPath () {
  if (!isTauri) {
    setEngineStatus('error', t('comfyStudio.browserNoStart'));
    return;
  }
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({ directory: true, multiple: false, title: t('comfyStudio.chooseComfyDir') });
  if (typeof selected === 'string') {
    elements.localPath.value = selected;
    saveConfig();
    setEngineStatus('idle', t('comfyStudio.readyToStart'));
  }
}

async function startLocalEngine (testAfterStart = true) {
  const config = saveConfig();
  if (!isTauri) throw new Error(t('comfyStudio.browserNoStart'));
  if (!config.localPath) throw new Error(t('comfyStudio.chooseComfyDir'));
  const parsed = new URL(config.serverUrl);
  const port = Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80));
  setEngineStatus('idle', t('comfyStudio.starting'));
  await tauriInvoke('start_comfy_local', {
    comfyPath: config.localPath,
    pythonPath: config.pythonPath,
    port,
    lowVram: !!config.lowVram,
  });
  if (!testAfterStart) return;
  let lastError;
  for (let attempt = 0; attempt < 45; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    try {
      await testConnection();
      return;
    } catch (error) {
      lastError = error;
      setEngineStatus('idle', `${t('comfyStudio.starting')} ${attempt + 1}/45`);
    }
  }
  throw lastError || new Error(t('comfyStudio.connectionFailed'));
}

async function stopLocalEngine () {
  if (!isTauri) throw new Error(t('comfyStudio.browserNoStart'));
  await tauriInvoke('stop_comfy_local');
  setEngineStatus('idle', t('comfyStudio.stopped'));
  setConnectionStatus('offline', t('comfyStudio.offline'));
  if (elements.startEngine) elements.startEngine.hidden = false;
}

/* ---------------- 内置运行时（Karui 自带生成引擎） ---------------- */

function builtinText (zh, en) {
  return document.body.classList.contains('lang-zh') ? zh : en;
}

function builtinEnabled () {
  return localStorage.getItem(BUILTIN_KEY) === 'on';
}

function setBuiltinEnabled (enabled) {
  if (enabled) localStorage.setItem(BUILTIN_KEY, 'on');
  else localStorage.removeItem(BUILTIN_KEY);
}

function setBuiltinStatus (state, message) {
  if (!elements.builtinStatus) return;
  elements.builtinStatus.dataset.state = state;
  if (elements.builtinStatusText) elements.builtinStatusText.textContent = message;
}

function setBuiltinBusy (busy) {
  [
    elements.installBuiltin,
    elements.openDownloadPage,
    elements.startBuiltin,
    elements.rollbackBuiltin,
    elements.installBuiltinFromFile,
    elements.importExtractedBuiltin,
  ].forEach((button) => { if (button) button.disabled = busy; });
}

function showBuiltinProgress (percent, text) {
  if (!elements.builtinProgress) return;
  elements.builtinProgress.hidden = false;
  if (elements.builtinProgressFill) elements.builtinProgressFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  if (elements.builtinProgressText) elements.builtinProgressText.textContent = text;
}

function hideBuiltinProgress () {
  if (elements.builtinProgress) elements.builtinProgress.hidden = true;
}

function formatDuration (seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  if (minutes <= 0) return builtinText(`${secs} 秒`, `${secs}s`);
  return builtinText(`${minutes} 分 ${secs} 秒`, `${minutes}m ${secs}s`);
}

function builtinPhaseText (phase, payload) {
  const downloaded = Number(payload?.downloadedBytes) || 0;
  const total = Number(payload?.totalBytes) || 0;

  if (phase !== 'downloading') builtinProgressSample = { bytes: 0, time: 0 };
  if (phase === 'probing') {
    return builtinText('正在挑选最快的下载源（GitHub 直连 / 国内镜像）…',
      'Picking the fastest download source…');
  }
  if (phase === 'verifying') return builtinText('正在校验文件完整性…', 'Verifying file integrity…');
  if (phase === 'extracting') return builtinText('正在解压，这一步比较慢，请耐心等待…', 'Extracting, this takes a while…');
  if (phase === 'done') return builtinText('内置引擎安装完成', 'Built-in engine installed');
  if (phase !== 'downloading') return builtinText('正在准备…', 'Preparing…');

  const now = performance.now();
  let speed = 0;
  if (builtinProgressSample.time > 0) {
    const elapsed = (now - builtinProgressSample.time) / 1000;
    if (elapsed > 0.4) {
      speed = Math.max(0, (downloaded - builtinProgressSample.bytes) / elapsed);
      builtinProgressSample = { bytes: downloaded, time: now };
    }
  } else {
    builtinProgressSample = { bytes: downloaded, time: now };
  }

  const bits = [total > 0 ? `${formatBytes(downloaded)} / ${formatBytes(total)}` : formatBytes(downloaded)];
  if (speed > 0) {
    bits.push(`${formatBytes(speed)}/s`);
    if (total > downloaded) {
      const remaining = formatDuration((total - downloaded) / speed);
      if (remaining) bits.push(builtinText(`剩余约 ${remaining}`, `about ${remaining} left`));
    }
  }
  if (payload?.message) bits.push(payload.message);
  return `${builtinText('正在下载内置引擎…', 'Downloading built-in engine…')} ${bits.join(' · ')}`;
}

async function refreshBuiltinRuntimeState () {
  if (!isTauri || !elements.builtinStatus) return null;
  try {
    const state = await tauriInvoke('get_ai_runtime_state');
    const installed = state?.installed;
    const hasInstall = !!installed?.version;
    if (hasInstall) setBuiltinEnabled(true);
    if (hasInstall) {
      setBuiltinStatus('online', builtinText(
        `内置引擎已安装：${installed.runtimeId || ''} ${installed.version}`,
        `Built-in engine installed: ${installed.runtimeId || ''} ${installed.version}`,
      ));
      // 打开面板时探测一次引擎是否真的在跑，让状态与按钮一致
      testConnection({ updateCard: false }).then(() => {
        setBuiltinStatus('online', builtinText(
          '内置引擎运行中，直接去生成即可。',
          'Built-in engine is running. You are ready to generate.',
        ));
        if (elements.startEngine) elements.startEngine.hidden = true;
      }).catch(() => { /* 引擎没在跑：保持已安装提示，用户可点启动 */ });
    } else {
      setBuiltinStatus('idle', builtinText(
        '还没装内置引擎，点下面的按钮装好就能直接用（约 2GB）。',
        'Built-in engine is not installed yet. Click the button below to install it (~2GB).',
      ));
    }
    // 已安装：收起安装入口（一键安装/下载页/教程/本地导入），只留启动和回滚
    const setupOnly = [
      elements.installBuiltin,
      elements.openDownloadPage,
      elements.installBuiltinFromFile,
      elements.importExtractedBuiltin,
      elements.builtinManual,
      elements.builtinTutorial,
      elements.clearBuiltinCache,
    ];
    setupOnly.forEach((item) => { if (item) item.hidden = hasInstall; });
    if (elements.rollbackBuiltin) elements.rollbackBuiltin.hidden = !installed?.previous;
    return state;
  } catch (error) {
    setBuiltinStatus('error', error?.message || String(error));
    return null;
  }
}

async function attachBuiltinProgressListener () {
  const { listen } = await import('@tauri-apps/api/event');
  return listen('ai-runtime-install-progress', (event) => {
    const payload = event.payload || {};
    const percent = payload.totalBytes > 0
      ? (payload.downloadedBytes / payload.totalBytes) * 100
      : (payload.phase === 'done' ? 100 : 0);
    showBuiltinProgress(percent, builtinPhaseText(payload.phase, payload));
  });
}

// 用本地已下载的压缩包安装（比如自己用迅雷下的），跳过官方 sha256 比对
async function installBuiltinFromLocalFile () {
  if (!isTauri) return;
  if (builtinInstallActive) return;
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    multiple: false,
    title: builtinText('选择已下载的 ComfyUI 便携包（.7z / .zip）', 'Choose the downloaded ComfyUI portable archive (.7z / .zip)'),
    filters: [{ name: 'Archive', extensions: ['7z', 'zip'] }],
  });
  if (typeof selected !== 'string') return;
  await runLocalBuiltinInstall('offline', selected, true);
}

// 直接导入已经解压好的 ComfyUI 便携包目录
async function importExtractedBuiltin () {
  if (!isTauri) return;
  if (builtinInstallActive) return;
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    directory: true,
    multiple: false,
    title: builtinText('选择包含 main.py 的 ComfyUI 文件夹', 'Choose the ComfyUI folder containing main.py'),
  });
  if (typeof selected !== 'string') return;
  await runLocalBuiltinInstall('local', selected, true);
}

async function runLocalBuiltinInstall (mode, targetPath, skipSha) {
  const runtimeId = elements.builtinRuntime?.value || 'comfyui-windows-nvidia';
  builtinInstallActive = true;
  setBuiltinBusy(true);
  let unlisten = null;
  try {
    unlisten = await attachBuiltinProgressListener();
    showBuiltinProgress(0, builtinText('正在准备本地安装…', 'Preparing local install…'));
    const manifest = await tauriInvoke('install_ai_runtime', {
      runtimeId,
      mode,
      archivePath: targetPath,
      skipSha: !!skipSha,
    });
    setBuiltinEnabled(true);
    setBuiltinStatus('online', builtinText(
      `内置引擎安装完成（${manifest?.version || ''}），点“启动内置引擎”即可开始。`,
      `Built-in engine installed (${manifest?.version || ''}). Click Start to launch it.`,
    ));
    await refreshBuiltinRuntimeState();
    await refreshModelInventory().catch(() => {});
  } catch (error) {
    setBuiltinStatus('error', error?.message || String(error));
  } finally {
    if (unlisten) unlisten();
    builtinInstallActive = false;
    setBuiltinBusy(false);
    hideBuiltinProgress();
  }
}

async function installBuiltinRuntime (mode) {
  if (!isTauri) {
    setBuiltinStatus('error', builtinText('内置引擎需要在 Karui 桌面版中使用。', 'The built-in engine requires the Karui desktop app.'));
    return;
  }
  if (builtinInstallActive) return;
  const runtimeId = elements.builtinRuntime?.value || 'comfyui-windows-nvidia';
  builtinInstallActive = true;
  setBuiltinBusy(true);
  let unlisten = null;
  try {
    unlisten = await attachBuiltinProgressListener();
    showBuiltinProgress(0, builtinText('正在准备…', 'Preparing…'));
    if (elements.cancelBuiltinInstall) elements.cancelBuiltinInstall.hidden = false;

    let useMode = mode;
    let archivePath = null;
    if (mode === 'offline') {
      archivePath = await tauriInvoke('find_bundled_ai_runtime', { runtimeId, mode });
      if (!archivePath) useMode = 'online'; // 离线包不在本机时自动改为下载
    }
    const manifest = await tauriInvoke('install_ai_runtime', { runtimeId, mode: useMode, archivePath });
    setBuiltinEnabled(true);
    setBuiltinStatus('online', builtinText(
      `内置引擎安装完成（${manifest?.version || ''}），点“启动内置引擎”即可开始。`,
      `Built-in engine installed (${manifest?.version || ''}). Click Start to launch it.`,
    ));
    await refreshBuiltinRuntimeState();
    await refreshModelInventory().catch(() => {});
  } catch (error) {
    setBuiltinStatus('error', error?.message || String(error));
  } finally {
    if (unlisten) unlisten();
    builtinInstallActive = false;
    setBuiltinBusy(false);
    hideBuiltinProgress();
    if (elements.cancelBuiltinInstall) elements.cancelBuiltinInstall.hidden = true;
  }
}

async function startBuiltinRuntime () {
  if (!isTauri) {
    setBuiltinStatus('error', builtinText('内置引擎需要在 Karui 桌面版中使用。', 'The built-in engine requires the Karui desktop app.'));
    return;
  }
  const config = saveConfig();
  setBuiltinBusy(true);
  try {
    let port = 8188;
    try { port = Number(new URL(config.serverUrl).port) || 8188; } catch (_) { port = 8188; }
    setBuiltinStatus('idle', builtinText('正在启动内置引擎…', 'Starting built-in engine…'));
    const info = await tauriInvoke('start_ai_runtime', { port, lowVram: !!config.lowVram });
    if (elements.serverUrl) elements.serverUrl.value = info.baseUrl;
    engineConfig = saveConfig();
    setBuiltinEnabled(true);
    setBuiltinStatus('online', builtinText(
      `内置引擎已启动：${info.baseUrl}`,
      `Built-in engine running at ${info.baseUrl}`,
    ));
    for (let attempt = 0; attempt < 45; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        // 等待期间不把失败写到卡片状态行，避免「已启动」和「无法连接」同时出现
        await testConnection({ updateCard: false });
        setBuiltinStatus('online', builtinText('内置引擎已连接，可以开始生成了。', 'Built-in engine connected. You are ready to generate.'));
        if (elements.startEngine) elements.startEngine.hidden = true;
        return;
      } catch (error) {
        setBuiltinStatus('idle', `${builtinText('正在等待引擎就绪…', 'Waiting for the engine…')} ${attempt + 1}/45`);
      }
    }
    setBuiltinStatus('error', t('comfyStudio.connectionFailed'));
  } catch (error) {
    setBuiltinStatus('error', error?.message || String(error));
    setEngineStatus('error', error?.message || String(error));
  } finally {
    setBuiltinBusy(false);
  }
}

async function rollbackBuiltinRuntime () {
  if (!isTauri) return;
  setBuiltinBusy(true);
  try {
    const previous = await tauriInvoke('rollback_ai_runtime');
    setBuiltinStatus('idle', builtinText(
      `已回滚到 ${previous?.version || '上一版'}，下次启动生效。`,
      `Rolled back to ${previous?.version || 'previous version'}. It takes effect on next start.`,
    ));
    await refreshBuiltinRuntimeState();
  } catch (error) {
    setBuiltinStatus('error', error?.message || String(error));
  } finally {
    setBuiltinBusy(false);
  }
}

/* ---------------- 提示词工作台 ---------------- */

function uiLang () {
  return getLang() === 'zh' ? 'zh' : 'en';
}

function refreshIcons () {
  try {
    createIcons({ icons });
  } catch (_) {
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
  }
}

function splitTags (value) {
  return String(value || '').split(/[,，]/).map((part) => part.trim()).filter(Boolean);
}

function hasTag (textarea, tag) {
  return splitTags(textarea.value).some((part) => part.toLowerCase() === tag.toLowerCase());
}

function toggleTag (textarea, tag) {
  const parts = splitTags(textarea.value);
  const index = parts.findIndex((part) => part.toLowerCase() === tag.toLowerCase());
  if (index >= 0) parts.splice(index, 1);
  else parts.push(tag);
  textarea.value = parts.join(', ');
  syncPromptUI();
}

function renderChipRow (container, items, textarea) {
  if (!container) return;
  container.innerHTML = '';
  items.forEach((item) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'comfy-chip';
    chip.dataset.tag = item.tag;
    chip.textContent = pickText(item.label, uiLang());
    chip.title = item.tag;
    chip.__target = textarea;
    chip.addEventListener('click', () => toggleTag(textarea, item.tag));
    container.appendChild(chip);
  });
}

function renderExamples (container, examples, onPick) {
  if (!container) return;
  container.innerHTML = '';
  examples.forEach((example) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'comfy-example-card';
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', example.icon || 'sparkles');
    const copy = document.createElement('span');
    copy.className = 'comfy-example-copy';
    const title = document.createElement('strong');
    title.textContent = pickText(example.title, uiLang());
    const desc = document.createElement('span');
    desc.textContent = pickText(example.prompt, uiLang());
    copy.append(title, desc);
    card.append(icon, copy);
    card.addEventListener('click', () => onPick(example));
    container.appendChild(card);
  });
  refreshIcons();
}

function loadPromptLibrary () {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROMPT_LIBRARY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function savePromptLibrary (list) {
  localStorage.setItem(PROMPT_LIBRARY_KEY, JSON.stringify(list));
}

function renderPromptLibrary () {
  if (!elements.libraryList) return;
  const list = loadPromptLibrary();
  elements.libraryList.innerHTML = '';
  elements.libraryEmpty.hidden = list.length > 0;
  list.forEach((entry) => {
    const row = document.createElement('div');
    row.className = 'comfy-library-item';
    const kind = document.createElement('span');
    kind.className = 'comfy-library-kind';
    kind.textContent = entry.kind === 'video' ? t('comfyStudio.videoMode') : t('comfyStudio.imageMode');
    const text = document.createElement('span');
    text.className = 'comfy-library-text';
    text.textContent = entry.prompt;
    const actions = document.createElement('div');
    actions.className = 'comfy-library-actions';
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.className = 'comfy-mini-btn';
    apply.textContent = t('comfyStudio.libraryApply');
    apply.addEventListener('click', () => applyLibraryEntry(entry));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'comfy-mini-btn danger';
    remove.textContent = t('common.delete');
    remove.addEventListener('click', () => {
      savePromptLibrary(loadPromptLibrary().filter((item) => item.id !== entry.id));
      renderPromptLibrary();
    });
    actions.append(apply, remove);
    row.append(kind, text, actions);
    elements.libraryList.appendChild(row);
  });
}

function applyLibraryEntry (entry) {
  const isVideo = entry.kind === 'video';
  const prompt = isVideo ? elements.videoPrompt : elements.prompt;
  const negative = isVideo ? elements.videoNegative : elements.negativePrompt;
  if (prompt) prompt.value = entry.prompt || '';
  if (negative && entry.negative) negative.value = entry.negative;
  if (isVideo) setStudioMode('workflow');
  else setStudioMode('image');
  syncPromptUI();
}

function saveCurrentPrompt (kind) {
  const isVideo = kind === 'video';
  const prompt = isVideo ? elements.videoPrompt.value.trim() : elements.prompt.value.trim();
  if (!prompt) {
    showError(t('comfyStudio.noPrompt'));
    return;
  }
  const negative = (isVideo ? elements.videoNegative.value : elements.negativePrompt.value).trim();
  const list = loadPromptLibrary();
  const duplicate = list.some((item) => item.kind === kind && item.prompt === prompt);
  if (duplicate) {
    showError(t('comfyStudio.libraryDuplicate'));
    return;
  }
  const seed = splitTags(prompt).slice(0, 4).join(' ') || prompt.slice(0, 18);
  list.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind,
    title: seed,
    prompt,
    negative,
    createdAt: Date.now(),
  });
  savePromptLibrary(list.slice(0, 40));
  renderPromptLibrary();
  if (elements.promptLibrary) elements.promptLibrary.open = true;
  clearError();
}

function setPromptCount (target, textarea) {
  if (!target || !textarea) return;
  const count = textarea.value.trim().length;
  target.textContent = `${count}`;
  target.dataset.empty = count === 0 ? 'true' : 'false';
}

function savePromptDraft () {
  try {
    localStorage.setItem(PROMPT_DRAFT_KEY, JSON.stringify({
      prompt: elements.prompt?.value || '',
      negative: elements.negativePrompt?.value || '',
      videoPrompt: elements.videoPrompt?.value || '',
      videoNegative: elements.videoNegative?.value || '',
    }));
  } catch (_) { }
}

function loadPromptDraft () {
  try {
    const draft = JSON.parse(localStorage.getItem(PROMPT_DRAFT_KEY) || '{}');
    if (elements.prompt && draft.prompt) elements.prompt.value = draft.prompt;
    if (elements.negativePrompt && draft.negative) elements.negativePrompt.value = draft.negative;
    if (elements.videoPrompt && draft.videoPrompt) elements.videoPrompt.value = draft.videoPrompt;
    if (elements.videoNegative && draft.videoNegative) elements.videoNegative.value = draft.videoNegative;
  } catch (_) { }
}

function syncPromptUI () {
  setPromptCount(elements.promptCount, elements.prompt);
  setPromptCount(elements.videoPromptCount, elements.videoPrompt);
  document.querySelectorAll('.comfy-chip').forEach((chip) => {
    const source = chip.__target;
    if (source) chip.classList.toggle('active', hasTag(source, chip.dataset.tag));
  });
  savePromptDraft();
}

function buildPromptLab () {
  const lang = uiLang();
  renderChipRow(elements.imageStyles, IMAGE_STYLE_PRESETS, elements.prompt);
  renderChipRow(elements.imageQuality, IMAGE_QUALITY_TAGS, elements.prompt);
  renderChipRow(elements.imageNegatives, IMAGE_NEGATIVE_TAGS, elements.negativePrompt);
  renderChipRow(elements.videoCamera, VIDEO_CAMERA_TAGS, elements.videoPrompt);
  renderChipRow(elements.videoMood, VIDEO_MOOD_TAGS, elements.videoPrompt);
  renderChipRow(elements.videoNegatives, IMAGE_NEGATIVE_TAGS, elements.videoNegative);
  renderExamples(elements.imageExamples, IMAGE_EXAMPLES, (example) => {
    elements.prompt.value = pickText(example.prompt, lang);
    if (example.negative) elements.negativePrompt.value = example.negative;
    syncPromptUI();
  });
  renderExamples(elements.videoExamples, VIDEO_EXAMPLES, (example) => {
    elements.videoPrompt.value = pickText(example.prompt, lang);
    syncPromptUI();
  });
  if (elements.videoNegative && !videoNegativeTouched && !elements.videoNegative.value) {
    elements.videoNegative.value = pickText(DEFAULT_NEGATIVE, lang);
  }
  renderTips();
  renderSizePresets(elements.imageRatio, IMAGE_SIZE_PRESETS, elements.width, elements.height);
  const videoSizes = videoEngine === 'h3' ? H3_SIZE_PRESETS : VIDEO_SIZE_PRESETS;
  const videoQualities = videoEngine === 'h3' ? H3_QUALITY_PRESETS : VIDEO_QUALITY_PRESETS;
  renderSizePresets(elements.videoRatio, videoSizes, elements.videoWidth, elements.videoHeight);
  renderQualityPresets(elements.imagePreset, IMAGE_QUALITY_PRESETS, (preset) => {
    elements.width.value = preset.width;
    elements.height.value = preset.height;
    elements.steps.value = preset.steps;
    elements.cfg.value = preset.cfg;
  });
  renderQualityPresets(elements.videoPreset, videoQualities, (preset) => {
    elements.videoWidth.value = preset.width;
    elements.videoHeight.value = preset.height;
    elements.videoDuration.value = preset.duration;
    elements.videoFps.value = preset.fps;
    elements.videoSteps.value = preset.steps;
    elements.videoCfg.value = preset.cfg;
  });
  applyFieldHelp();
  renderPromptLibrary();
  syncPromptUI();
  syncParamUI();
}

function applyFieldHelp () {
  const lang = uiLang();
  document.querySelectorAll('.comfy-field[data-help-key]').forEach((field) => {
    const text = pickText(FIELD_HELP[field.dataset.helpKey], lang);
    if (!text) return;
    let help = field.querySelector(':scope > .comfy-field-help');
    if (!help) {
      help = document.createElement('small');
      help.className = 'comfy-field-help';
      field.appendChild(help);
    }
    help.textContent = text;
  });
}

function renderSizePresets (container, presets, width, height) {
  if (!container) return;
  container.innerHTML = '';
  presets.forEach((preset) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'comfy-chip';
    chip.dataset.sizeId = preset.id;
    chip.textContent = pickText(preset.label, uiLang());
    chip.title = `${preset.width} × ${preset.height}`;
    chip.addEventListener('click', () => {
      width.value = preset.width;
      height.value = preset.height;
      syncParamUI();
    });
    container.appendChild(chip);
  });
}

function renderQualityPresets (container, presets, onApply) {
  if (!container) return;
  container.innerHTML = '';
  presets.forEach((preset) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'comfy-preset-card';
    card.dataset.presetId = preset.id;
    const title = document.createElement('strong');
    title.textContent = pickText(preset.label, uiLang());
    const hint = document.createElement('span');
    hint.textContent = pickText(preset.hint, uiLang());
    card.append(title, hint);
    card.addEventListener('click', () => {
      onApply(preset);
      syncParamUI();
    });
    container.appendChild(card);
  });
}

function renderTips () {
  if (!elements.promptTips) return;
  const lang = uiLang();
  elements.promptTips.innerHTML = '';
  PROMPT_TIPS.forEach((tip) => {
    const item = document.createElement('li');
    item.textContent = pickText(tip, lang);
    elements.promptTips.appendChild(item);
  });
}

function numberValue (input, fallback) {
  const value = Number(input?.value);
  return Number.isFinite(value) ? value : fallback;
}

function syncParamUI () {
  const imageWidth = numberValue(elements.width, 1024);
  const imageHeight = numberValue(elements.height, 1024);
  const imageSteps = numberValue(elements.steps, 24);
  const imageCfg = numberValue(elements.cfg, 7);
  elements.imageRatio?.querySelectorAll('.comfy-chip').forEach((chip) => {
    const preset = IMAGE_SIZE_PRESETS.find((item) => item.id === chip.dataset.sizeId);
    chip.classList.toggle('active', !!preset && preset.width === imageWidth && preset.height === imageHeight);
  });
  elements.imagePreset?.querySelectorAll('.comfy-preset-card').forEach((card) => {
    const preset = IMAGE_QUALITY_PRESETS.find((item) => item.id === card.dataset.presetId);
    card.classList.toggle('active', !!preset
      && preset.steps === imageSteps && preset.cfg === imageCfg
      && preset.width === imageWidth && preset.height === imageHeight);
  });
  if (elements.imageParamPreview) {
    elements.imageParamPreview.textContent = [
      `${imageWidth}×${imageHeight}`,
      `${t('comfyStudio.steps')} ${imageSteps}`,
      `CFG ${imageCfg}`,
      `${t('comfyStudio.batchCount')} ${numberValue(elements.batch, 1)}`,
    ].join(' · ');
  }

  const videoWidth = numberValue(elements.videoWidth, 832);
  const videoHeight = numberValue(elements.videoHeight, 480);
  const videoSteps = numberValue(elements.videoSteps, 20);
  const videoCfg = numberValue(elements.videoCfg, 6);
  const duration = numberValue(elements.videoDuration, 5);
  const fps = numberValue(elements.videoFps, 16);
  const videoSizes = videoEngine === 'h3' ? H3_SIZE_PRESETS : VIDEO_SIZE_PRESETS;
  const videoQualities = videoEngine === 'h3' ? H3_QUALITY_PRESETS : VIDEO_QUALITY_PRESETS;
  elements.videoRatio?.querySelectorAll('.comfy-chip').forEach((chip) => {
    const preset = videoSizes.find((item) => item.id === chip.dataset.sizeId);
    chip.classList.toggle('active', !!preset && preset.width === videoWidth && preset.height === videoHeight);
  });
  elements.videoPreset?.querySelectorAll('.comfy-preset-card').forEach((card) => {
    const preset = videoQualities.find((item) => item.id === card.dataset.presetId);
    card.classList.toggle('active', !!preset
      && preset.steps === videoSteps && preset.cfg === videoCfg
      && preset.width === videoWidth && preset.height === videoHeight
      && preset.duration === duration && preset.fps === fps);
  });
  if (elements.videoParamPreview) {
    elements.videoParamPreview.textContent = [
      `${videoWidth}×${videoHeight}`,
      `${duration}${t('comfyStudio.summarySeconds')}`,
      `${fps}fps`,
      `${t('comfyStudio.steps')} ${videoSteps}`,
      videoEngine === 'h3' ? 'H3 FL2VA · 24fps' : `CFG ${videoCfg}`,
    ].join(' · ');
  }
}

function updateResultStats (count) {
  if (!elements.resultStats) return;
  if (!count) {
    elements.resultStats.hidden = true;
    elements.clearResults.hidden = true;
    return;
  }
  elements.resultStats.hidden = false;
  elements.resultStats.textContent = t('comfyStudio.resultCount', { count });
  elements.clearResults.hidden = false;
}

function clearResults () {
  elements.resultGrid.innerHTML = '';
  elements.resultEmpty.hidden = false;
  renderSummary(null);
  updateResultStats(0);
  elements.progress.hidden = true;
}

function inspirePrompt (kind) {
  const isVideo = kind === 'video';
  const source = isVideo ? VIDEO_EXAMPLES : IMAGE_EXAMPLES;
  const target = isVideo ? elements.videoPrompt : elements.prompt;
  const current = target.value.trim();
  const lang = uiLang();
  const pool = source.filter((item) => pickText(item.prompt, lang) !== current);
  const picked = (pool.length ? pool : source)[Math.floor(Math.random() * (pool.length || source.length))];
  if (!picked) return;
  target.value = pickText(picked.prompt, lang);
  if (!isVideo && picked.negative) elements.negativePrompt.value = picked.negative;
  syncPromptUI();
}

function positiveInteger (input, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const value = Math.round(Number(input.value));
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
}

function buildImageWorkflow () {
  const prompt = elements.prompt.value.trim();
  const checkpoint = elements.checkpoint.value;
  if (!prompt) throw new Error(t('comfyStudio.noPrompt'));
  if (!checkpoint || checkpoint === t('comfyStudio.noModel')) throw new Error(t('comfyStudio.noModel'));
  const seedInput = Number(elements.seed.value);
  const seed = Number.isFinite(seedInput) && seedInput >= 0
    ? Math.floor(seedInput)
    : Math.floor(Math.random() * 0x7fffffff);
  lastRunSeed = seed;
  return {
    '3': {
      class_type: 'KSampler', inputs: {
        seed,
        steps: positiveInteger(elements.steps, 24, 1, 150),
        cfg: Math.max(0, Math.min(30, Number(elements.cfg.value) || 7)),
        sampler_name: elements.sampler.value || 'euler',
        scheduler: elements.scheduler.value || 'normal',
        denoise: 1,
        model: ['4', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['5', 0],
      }
    },
    '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: checkpoint } },
    '5': {
      class_type: 'EmptyLatentImage', inputs: {
        width: positiveInteger(elements.width, 1024, 64, 4096),
        height: positiveInteger(elements.height, 1024, 64, 4096),
        batch_size: positiveInteger(elements.batch, 1, 1, 8),
      }
    },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['4', 1] } },
    '7': { class_type: 'CLIPTextEncode', inputs: { text: elements.negativePrompt.value.trim(), clip: ['4', 1] } },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
    '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'Karui', images: ['8', 0] } },
  };
}

function optionalNodeInput (info, nodeName, inputName, value) {
  const inputs = info?.[nodeName]?.input;
  return inputs?.required?.[inputName] || inputs?.optional?.[inputName] ? { [inputName]: value } : {};
}

function preferredOption (info, nodeName, inputName, preferred, fallback) {
  const options = nodeOptions(info, nodeName, inputName);
  return options.find((value) => preferred.test(value)) || options[0] || fallback;
}

function buildWanVideoWorkflow () {
  if (!videoEnvironment?.ready) {
    throw new Error(t('comfyStudio.videoMissing', { items: videoEnvironment?.missing?.join('、') || t('comfyStudio.videoNotChecked') }));
  }
  const prompt = elements.videoPrompt.value.trim();
  if (!prompt) throw new Error(t('comfyStudio.noPrompt'));
  const info = videoEnvironment.info;
  const seedValue = Number(elements.videoSeed.value);
  const seed = Number.isFinite(seedValue) && seedValue >= 0
    ? Math.floor(seedValue)
    : Math.floor(Math.random() * 0x7fffffff);
  lastRunSeed = seed;
  const negativeText = elements.videoNegative && elements.videoNegative.value.trim()
    ? elements.videoNegative.value.trim()
    : 'low quality, blurry, distorted, static, watermark, text';
  const sampler = preferredOption(info, 'KSampler', 'sampler_name', /^euler$/, 'euler');
  const scheduler = preferredOption(info, 'KSampler', 'scheduler', /simple|normal/, 'normal');
  const fps = positiveInteger(elements.videoFps, 16, 1, 60);
  const duration = positiveInteger(elements.videoDuration, 5, 1, 60);
  const videoFrames = Math.max(17, Math.round((duration * fps - 1) / 4) * 4 + 1);

  const workflow = {
    '1': { class_type: 'UNETLoader', inputs: {
      unet_name: elements.videoModel.value,
      ...optionalNodeInput(info, 'UNETLoader', 'weight_dtype', 'default'),
    } },
    '2': { class_type: 'CLIPLoader', inputs: {
      clip_name: elements.videoClip.value,
      ...optionalNodeInput(info, 'CLIPLoader', 'type', preferredOption(info, 'CLIPLoader', 'type', /^wan$/i, 'wan')),
      ...optionalNodeInput(info, 'CLIPLoader', 'device', 'default'),
    } },
    '3': { class_type: 'VAELoader', inputs: { vae_name: elements.videoVae.value } },
    '4': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['2', 0] } },
    '5': { class_type: 'CLIPTextEncode', inputs: { text: negativeText, clip: ['2', 0] } },
    '6': { class_type: 'EmptyHunyuanLatentVideo', inputs: {
      width: positiveInteger(elements.videoWidth, 832, 256, 1920),
      height: positiveInteger(elements.videoHeight, 480, 256, 1920),
      length: videoFrames,
      batch_size: 1,
    } },
    '7': { class_type: 'ModelSamplingSD3', inputs: { model: ['1', 0], shift: 8 } },
    '8': { class_type: 'KSampler', inputs: {
      seed,
      steps: positiveInteger(elements.videoSteps, 20, 1, 100),
      cfg: Math.max(0, Math.min(30, Number(elements.videoCfg.value) || 6)),
      sampler_name: sampler,
      scheduler,
      denoise: 1,
      model: ['7', 0], positive: ['4', 0], negative: ['5', 0], latent_image: ['6', 0],
    } },
    '9': { class_type: 'VAEDecode', inputs: { samples: ['8', 0], vae: ['3', 0] } },
  };
  if (videoEnvironment.videoOutputMode === 'native') {
    workflow['10'] = { class_type: 'CreateVideo', inputs: { images: ['9', 0], fps } };
    workflow['11'] = { class_type: 'SaveVideo', inputs: {
      video: ['10', 0], filename_prefix: 'KaruiVideo', format: 'auto',
    } };
  } else {
    const format = preferredOption(info, 'VHS_VideoCombine', 'format', /h264.*mp4|video\/h264/i, 'video/h264-mp4');
    workflow['10'] = { class_type: 'VHS_VideoCombine', inputs: {
      images: ['9', 0], frame_rate: fps, loop_count: 0,
      filename_prefix: 'KaruiVideo', format, pingpong: false, save_output: true,
    } };
  }
  return workflow;
}

function buildH3VideoWorkflow (frames = {}) {
  if (!h3Environment?.ready) {
    throw new Error(t('comfyStudio.videoMissing', { items: h3Environment?.missing?.join('、') || t('comfyStudio.videoNotChecked') }));
  }
  const sourcePrompt = elements.videoPrompt.value.trim();
  if (!sourcePrompt) throw new Error(t('comfyStudio.noPrompt'));
  const avoid = elements.videoNegative?.value.trim();
  const prompt = avoid ? `${sourcePrompt}\n\nAvoid: ${avoid}` : sourcePrompt;
  const seedValue = Number(elements.videoSeed.value);
  const seed = Number.isFinite(seedValue) && seedValue >= 0
    ? Math.floor(seedValue)
    : Math.floor(Math.random() * 0x7fffffff);
  lastRunSeed = seed;
  return buildH3LowVramWorkflow({
    prompt,
    width: Math.round(positiveInteger(elements.videoWidth, 608, 256, 960) / 32) * 32,
    height: Math.round(positiveInteger(elements.videoHeight, 352, 256, 960) / 32) * 32,
    duration: positiveInteger(elements.videoDuration, 5, 1, 15),
    steps: positiveInteger(elements.videoSteps, 20, 1, 30),
    seed,
    model: elements.videoModel.value,
    clip: elements.videoClip.value,
    vae: elements.videoVae.value,
    projection: elements.h3Projection.value,
    firstFrame: frames.firstFrame,
    lastFrame: frames.lastFrame,
  });
}

async function uploadComfyImage (file, slot) {
  if (!file) return '';
  const cleanName = String(file.name || `${slot}.png`).replace(/[^a-zA-Z0-9._-]+/g, '_');
  const filename = `karui_h3_${slot}_${Date.now()}_${cleanName}`;
  const base = normalizeBaseUrl(engineConfig.serverUrl);
  if (isTauri) {
    const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
    const result = await tauriInvoke('comfy_upload_image', {
      url: `${base}/upload/image`, filename, bytes, apiKey: engineConfig.accessToken || null,
    });
    return result?.subfolder ? `${result.subfolder}/${result.name}` : (result?.name || filename);
  }
  const form = new FormData();
  form.append('image', file, filename);
  form.append('type', 'input');
  form.append('overwrite', 'true');
  const headers = {};
  if (engineConfig.accessToken) headers.Authorization = `Bearer ${engineConfig.accessToken}`;
  const response = await fetch(`${base}/upload/image`, { method: 'POST', headers, body: form });
  if (!response.ok) throw new Error(`${t('comfyStudio.h3FrameUploadFailed')}: HTTP ${response.status}`);
  const result = await response.json();
  return result?.subfolder ? `${result.subfolder}/${result.name}` : (result?.name || filename);
}

async function prepareH3Frames () {
  const first = elements.h3FirstFrame?.files?.[0];
  const last = elements.h3LastFrame?.files?.[0];
  if (!first && !last) return {};
  setProgress(16, t('comfyStudio.h3UploadingFrames'));
  const [firstFrame, lastFrame] = await Promise.all([
    uploadComfyImage(first, 'first'),
    uploadComfyImage(last, 'last'),
  ]);
  return { firstFrame, lastFrame };
}

function parseWorkflow () {
  const raw = elements.workflowJson.value.trim();
  if (!raw) throw new Error(t('comfyStudio.noWorkflow'));
  try {
    const parsed = JSON.parse(raw);
    const workflow = parsed.prompt && typeof parsed.prompt === 'object' ? parsed.prompt : parsed;
    if (!workflow || Array.isArray(workflow) || workflow.nodes || !Object.values(workflow).some((node) => node?.class_type)) {
      throw new Error(t('comfyStudio.invalidWorkflow'));
    }
    return workflow;
  } catch (error) {
    if (error.message === t('comfyStudio.invalidWorkflow')) throw error;
    throw new Error(`${t('comfyStudio.invalidWorkflow')}: ${error.message}`);
  }
}

// ===== Run progress: percentage, elapsed time and ETA =====
const RUN_STATS_KEY = 'karui-comfy-run-stats-v1';
// Sampling occupies this slice of the progress bar, so the phases around it
// (queueing, decoding, downloading) always stay visible.
const SAMPLE_PERCENT_FROM = 25;
const SAMPLE_PERCENT_TO = 87;

const runProgress = {
  active: false,
  startedAt: 0,
  percent: 0,
  phaseMessage: '',
  stepValue: 0,
  stepMax: 0,
  samplingStartedAt: 0,
  queuePosition: null,
  ticker: null,
  socket: null,
};

function formatClock (seconds) {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  return `${String(minutes).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function runSignature () {
  const isVideo = studioMode === 'workflow';
  const steps = isVideo
    ? positiveInteger(elements.videoSteps, 20, 1, 100)
    : positiveInteger(elements.steps, 24, 1, 150);
  return `${isVideo ? 'video' : 'image'}-${steps}`;
}

function loadRunStats () {
  try {
    return JSON.parse(localStorage.getItem(RUN_STATS_KEY) || '{}');
  } catch (_) {
    return {};
  }
}

function recordRunDuration (durationMs) {
  if (!(durationMs > 2000)) return;
  try {
    const stats = loadRunStats();
    const list = Array.isArray(stats[runSignature()]) ? stats[runSignature()] : [];
    list.push(Math.round(durationMs));
    stats[runSignature()] = list.slice(-5);
    localStorage.setItem(RUN_STATS_KEY, JSON.stringify(stats));
  } catch (_) { }
}

function estimateRemaining () {
  // Real sampling speed is the best signal once ComfyUI reports step progress.
  if (runProgress.samplingStartedAt && runProgress.stepValue > 0 && runProgress.stepMax > 0) {
    const perStep = (Date.now() - runProgress.samplingStartedAt) / runProgress.stepValue;
    const stepsLeft = Math.max(0, runProgress.stepMax - runProgress.stepValue);
    const tail = studioMode === 'workflow' ? 10 : 4;
    return (stepsLeft * perStep) / 1000 + tail;
  }
  // Otherwise fall back to the average duration of the last runs of this shape.
  const history = loadRunStats()[runSignature()];
  if (Array.isArray(history) && history.length) {
    const average = history.reduce((sum, value) => sum + value, 0) / history.length / 1000;
    return Math.max(1, average * (1 - runProgress.percent / 100));
  }
  return null;
}

function renderProgress () {
  if (!elements.progressText) return;
  const parts = [runProgress.phaseMessage || t('comfyStudio.preparing')];
  if (runProgress.stepMax > 0) parts.push(`${runProgress.stepValue}/${runProgress.stepMax}`);
  if (runProgress.queuePosition) parts.push(t('comfyStudio.queuePosition', { count: runProgress.queuePosition }));
  elements.progressText.textContent = parts.join(' · ');

  if (!elements.progressTiming) return;
  const timing = [];
  if (runProgress.startedAt) {
    timing.push(t('comfyStudio.elapsedTime', { time: formatClock((Date.now() - runProgress.startedAt) / 1000) }));
  }
  if (runProgress.active) {
    const remaining = estimateRemaining();
    timing.push(remaining == null
      ? t('comfyStudio.remainingUnknown')
      : t('comfyStudio.remainingTime', { time: formatClock(remaining) }));
  }
  elements.progressTiming.hidden = !timing.length;
  elements.progressTiming.textContent = timing.join(' · ');
}

function startProgressTicker () {
  stopProgressTicker();
  runProgress.ticker = window.setInterval(renderProgress, 1000);
}

function stopProgressTicker () {
  if (runProgress.ticker) {
    window.clearInterval(runProgress.ticker);
    runProgress.ticker = null;
  }
}

function setProgressFill (percent) {
  runProgress.percent = Math.max(0, Math.min(100, percent));
  if (elements.progressFill) elements.progressFill.style.width = `${Math.max(4, runProgress.percent)}%`;
}

function setProgress (percent, message) {
  elements.progress.hidden = false;
  setProgressFill(percent);
  if (message) runProgress.phaseMessage = message;
  renderProgress();
}

function applyStepProgress () {
  if (!runProgress.stepMax) return;
  const ratio = Math.min(1, runProgress.stepValue / runProgress.stepMax);
  setProgressFill(SAMPLE_PERCENT_FROM + ratio * (SAMPLE_PERCENT_TO - SAMPLE_PERCENT_FROM));
}

function closeProgressSocket () {
  if (!runProgress.socket) return;
  try {
    runProgress.socket.close();
  } catch (_) { }
  runProgress.socket = null;
}

function handleProgressEvent (payload) {
  const type = payload && payload.type;
  const data = (payload && payload.data) || {};
  // Ignore events that belong to somebody else's job.
  if (data.prompt_id && activePromptId && data.prompt_id !== activePromptId) return;
  if (type === 'progress') {
    runProgress.stepValue = Number(data.value) || 0;
    runProgress.stepMax = Number(data.max) || 0;
    if (!runProgress.samplingStartedAt) runProgress.samplingStartedAt = Date.now();
    runProgress.queuePosition = null;
    runProgress.phaseMessage = studioMode === 'workflow'
      ? t('comfyStudio.samplingVideo')
      : t('comfyStudio.samplingImage');
    applyStepProgress();
    renderProgress();
    return;
  }
  if (type === 'execution_start') {
    runProgress.phaseMessage = t('comfyStudio.running');
    renderProgress();
    return;
  }
  if (type === 'executing' && data.node) {
    if (!runProgress.stepMax && !runProgress.phaseMessage) runProgress.phaseMessage = t('comfyStudio.running');
    renderProgress();
  }
}

function openProgressSocket (clientId) {
  closeProgressSocket();
  const base = normalizeBaseUrl(engineConfig.serverUrl);
  if (!base || typeof WebSocket !== 'function') return;
  const url = `${base.replace(/^http/i, 'ws')}/ws?clientId=${encodeURIComponent(clientId)}`;
  let socket;
  try {
    socket = new WebSocket(url);
  } catch (_) {
    return;
  }
  runProgress.socket = socket;
  socket.addEventListener('message', (event) => {
    if (typeof event.data !== 'string') return;
    try {
      handleProgressEvent(JSON.parse(event.data));
    } catch (_) { }
  });
  // Live progress is a bonus: if the socket fails (CSP, remote host, firewall)
  // the elapsed timer and the history based estimate still work.
  socket.addEventListener('error', closeProgressSocket);
};

async function refreshQueuePosition (promptId) {
  try {
    const queue = await requestWithFallback(['/queue', '/api/queue']);
    const running = Array.isArray(queue?.queue_running) ? queue.queue_running : [];
    const pending = Array.isArray(queue?.queue_pending) ? queue.queue_pending : [];
    const isRunning = running.some((entry) => Array.isArray(entry) && entry[1] === promptId);
    const pendingIndex = pending.findIndex((entry) => Array.isArray(entry) && entry[1] === promptId);
    runProgress.queuePosition = isRunning ? null : (pendingIndex >= 0 ? pendingIndex + 1 : null);
  } catch (_) { }
}

function setRunning (running) {
  elements.run.disabled = running;
  elements.cancelRun.hidden = !running;
}

async function queueWorkflow (workflow, clientId) {
  const payload = { prompt: workflow, client_id: clientId };
  return requestWithFallback(['/prompt', '/api/prompt'], { method: 'POST', body: payload });
}

async function waitForHistory (promptId) {
  const startedAt = Date.now();
  let lastQueueCheck = 0;
  while (!runCancelled) {
    if (Date.now() - startedAt > 2 * 60 * 60 * 1000) throw new Error('ComfyUI task timed out');
    // While the job is still queued, tell the user how many jobs are ahead.
    if (!runProgress.samplingStartedAt && Date.now() - lastQueueCheck > 4000) {
      lastQueueCheck = Date.now();
      await refreshQueuePosition(promptId);
    }
    try {
      const history = await requestWithFallback([
        `/history/${encodeURIComponent(promptId)}`,
        `/api/history/${encodeURIComponent(promptId)}`,
        `/api/history_v2/${encodeURIComponent(promptId)}`,
      ]);
      const record = history?.[promptId] || history?.history?.find?.((item) => item.prompt_id === promptId) || history;
      if (record?.outputs && Object.keys(record.outputs).length) return record;
      if (record?.status?.status_str === 'error' || record?.status?.completed === false && record?.status?.messages?.some?.((m) => m?.[0] === 'execution_error')) {
        throw new Error('ComfyUI workflow execution failed');
      }
    } catch (error) {
      if (/execution failed/i.test(error.message || '')) throw error;
    }
    // Live step progress from the engine wins over this coarse fallback.
    if (!runProgress.stepMax && !runProgress.samplingStartedAt) setProgress(62, t('comfyStudio.running'));
    await new Promise((resolve) => setTimeout(resolve, 1400));
  }
  throw new Error(t('comfyStudio.cancelled'));
}

function collectOutputs (record) {
  const results = [];
  Object.values(record?.outputs || {}).forEach((nodeOutput) => {
    ['images', 'gifs', 'videos', 'audio'].forEach((kind) => {
      const files = nodeOutput?.[kind];
      if (!Array.isArray(files)) return;
      files.forEach((file) => {
        if (file?.filename) results.push({ ...file, kind });
      });
    });
  });
  return results;
}

function safeFilename (name) {
  return String(name || `karui-${Date.now()}`).split(/[\\/]/).pop().replace(/[^\w.\-\u4e00-\u9fff]/g, '_');
}

function outputViewUrl (file) {
  const params = new URLSearchParams({
    filename: file.filename,
    subfolder: file.subfolder || '',
    type: file.type || 'output',
  });
  return `${normalizeBaseUrl(engineConfig.serverUrl)}/view?${params.toString()}`;
}

async function getOutputDir () {
  if (!isTauri) return '';
  try {
    const config = await tauriInvoke('get_install_config');
    if (config?.install_path) return `${config.install_path.replace(/[\\/]+$/, '')}\\AI Studio`;
  } catch (_) { }
  const docs = await tauriInvoke('get_documents_dir');
  return `${docs}\\Karui 工具箱\\AI Studio`;
}

async function materializeOutput (file, index) {
  const remoteUrl = outputViewUrl(file);
  if (!isTauri) return { ...file, src: remoteUrl, localPath: '' };
  lastOutputDir = lastOutputDir || await getOutputDir();
  const outputName = `${Date.now()}-${index + 1}-${safeFilename(file.filename)}`;
  const outputPath = `${lastOutputDir}\\${outputName}`;
  const localPath = await tauriInvoke('comfy_download_output', {
    url: remoteUrl,
    outputPath,
    apiKey: engineConfig.accessToken || null,
  });
  const { convertFileSrc } = await import('@tauri-apps/api/core');
  return { ...file, src: convertFileSrc(localPath), localPath };
}

function renderSummary (meta) {
  if (!elements.resultSummary) return;
  if (!meta) {
    elements.resultSummary.hidden = true;
    return;
  }
  elements.resultSummary.hidden = false;
  elements.resultSummary.innerHTML = '';
  meta.chips.forEach((chip) => {
    const node = document.createElement('span');
    node.className = 'comfy-summary-chip';
    node.textContent = chip;
    elements.resultSummary.appendChild(node);
  });
  if (!meta.prompt) return;
  const prompt = document.createElement('p');
  prompt.className = 'comfy-summary-prompt';
  prompt.textContent = meta.prompt;
  elements.resultSummary.appendChild(prompt);
}

function renderOutputs (outputs, meta = {}) {
  elements.resultGrid.innerHTML = '';
  elements.resultEmpty.hidden = true;
  renderSummary(meta);
  updateResultStats(outputs.length);
  outputs.forEach((file) => {
    const item = document.createElement('article');
    item.className = 'comfy-result-item';
    const isVideo = /\.(mp4|webm|mov|mkv|avi)$/i.test(file.filename) || file.kind === 'videos';
    const media = document.createElement(isVideo ? 'video' : 'img');
    media.src = file.src;
    media.alt = file.filename;
    if (isVideo) {
      media.controls = true;
      media.preload = 'metadata';
    } else {
      media.loading = 'lazy';
    }
    const body = document.createElement('div');
    body.className = 'comfy-result-body';
    const name = document.createElement('span');
    name.className = 'comfy-result-name';
    name.textContent = file.filename;
    body.appendChild(name);

    const actions = document.createElement('div');
    actions.className = 'comfy-result-actions';
    if (meta.prompt) {
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'comfy-mini-btn';
      copy.textContent = t('comfyStudio.copyPrompt');
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(meta.prompt);
          copy.textContent = t('comfyStudio.copied');
          setTimeout(() => { copy.textContent = t('comfyStudio.copyPrompt'); }, 1600);
        } catch (_) {
          showError(t('comfyStudio.copyFailed'));
        }
      });
      actions.appendChild(copy);
    }
    if (file.localPath && isTauri) {
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'comfy-mini-btn';
      open.textContent = t('comfyStudio.openFile');
      open.addEventListener('click', () => {
        tauriInvoke('open_path', { path: file.localPath }).catch((error) => showError(error));
      });
      actions.appendChild(open);
    }
    if (actions.children.length) body.appendChild(actions);
    item.append(media, body);
    elements.resultGrid.appendChild(item);
  });
}

function buildRunMeta (useAdvancedWorkflow, startedAt) {
  const elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
  const isVideo = studioMode === 'workflow';
  const chips = [];
  if (useAdvancedWorkflow) chips.push(t('comfyStudio.summaryWorkflow'));
  else chips.push(isVideo ? t('comfyStudio.videoMode') : t('comfyStudio.imageMode'));
  if (isVideo) {
    if (!useAdvancedWorkflow) chips.push(videoEngine === 'h3' ? 'MiniMax H3 Local' : 'Wan');
    chips.push(`${positiveInteger(elements.videoWidth, 832, 256, 1920)}×${positiveInteger(elements.videoHeight, 480, 256, 1920)}`);
    chips.push(`${positiveInteger(elements.videoDuration, 5, 1, 60)}${t('comfyStudio.summarySeconds')}`);
    chips.push(`${positiveInteger(elements.videoFps, 16, 1, 60)}fps`);
    if (!useAdvancedWorkflow) chips.push(`${t('comfyStudio.steps')} ${positiveInteger(elements.videoSteps, 20, 1, 100)}`);
    if (elements.videoModel?.value) chips.push(elements.videoModel.value);
  } else {
    chips.push(`${positiveInteger(elements.width, 1024, 64, 4096)}×${positiveInteger(elements.height, 1024, 64, 4096)}`);
    chips.push(`${t('comfyStudio.steps')} ${positiveInteger(elements.steps, 24, 1, 150)}`);
    chips.push(`CFG ${Number(elements.cfg.value) || 7}`);
    if (elements.checkpoint?.value) chips.push(elements.checkpoint.value);
  }
  chips.push(`Seed ${lastRunSeed}`);
  chips.push(`${elapsed}s`);
  return {
    chips,
    prompt: (isVideo ? elements.videoPrompt.value : elements.prompt.value).trim(),
  };
}

async function runWorkflow () {
  clearError();
  runCancelled = false;
  activePromptId = '';
  lastOutputDir = '';
  lastRunSeed = -1;
  const startedAt = Date.now();
  runProgress.active = true;
  runProgress.startedAt = startedAt;
  runProgress.percent = 0;
  runProgress.phaseMessage = '';
  runProgress.stepValue = 0;
  runProgress.stepMax = 0;
  runProgress.samplingStartedAt = 0;
  runProgress.queuePosition = null;
  startProgressTicker();
  setRunning(true);
  setProgress(8, t('comfyStudio.preparing'));
  try {
    engineConfig = loadConfig();
    await testConnection({ updateCard: false });
    const useAdvancedWorkflow = studioMode === 'workflow' && workflowView === 'custom';
    const h3Frames = studioMode === 'workflow' && workflowView === 'video' && videoEngine === 'h3'
      ? await prepareH3Frames()
      : {};
    const workflow = studioMode === 'image'
      ? buildImageWorkflow()
      : (useAdvancedWorkflow ? parseWorkflow() : (videoEngine === 'h3' ? buildH3VideoWorkflow(h3Frames) : buildWanVideoWorkflow()));
    const clientId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const queued = await queueWorkflow(workflow, clientId);
    activePromptId = queued?.prompt_id || queued?.promptId;
    if (!activePromptId) throw new Error('ComfyUI did not return a prompt_id');
    openProgressSocket(clientId);
    setProgress(28, t('comfyStudio.queued'));
    const record = await waitForHistory(activePromptId);
    setProgress(88, t('comfyStudio.downloading'));
    const descriptors = collectOutputs(record);
    if (!descriptors.length) throw new Error(t('comfyStudio.noOutput'));
    const outputs = [];
    for (let index = 0; index < descriptors.length; index += 1) {
      if (runCancelled) throw new Error(t('comfyStudio.cancelled'));
      outputs.push(await materializeOutput(descriptors[index], index));
    }
    renderOutputs(outputs, buildRunMeta(useAdvancedWorkflow, startedAt));
    recordRunDuration(Date.now() - startedAt);
    setProgress(100, t('comfyStudio.completed'));
  } catch (error) {
    showError(error);
    setProgress(100, runCancelled ? t('comfyStudio.cancelled') : (error.message || String(error)));
  } finally {
    runProgress.active = false;
    stopProgressTicker();
    closeProgressSocket();
    renderProgress();
    setRunning(false);
    activePromptId = '';
  }
}

async function cancelWorkflow () {
  runCancelled = true;
  try {
    await requestWithFallback(['/interrupt', '/api/interrupt'], { method: 'POST', body: {} });
  } catch (_) { }
  setProgress(100, t('comfyStudio.cancelled'));
}

async function importWorkflowFile (file) {
  if (!file) return;
  const text = await file.text();
  JSON.parse(text);
  elements.workflowJson.value = text;
  elements.workflowAdvanced.open = true;
}

async function installVideoHelper () {
  const config = loadConfig();
  const comfyPath = getEngineComfyDir();
  if (!isTauri || !comfyPath) {
    throw new Error(t('comfyStudio.videoInstallLocalOnly'));
  }
  elements.installVideoHelper.disabled = true;
  elements.videoInstallStatus.hidden = false;
  elements.videoInstallStatus.dataset.state = 'working';
  elements.videoInstallStatus.textContent = t('comfyStudio.videoInstalling');
  try {
    const message = await tauriInvoke('install_comfy_video_helper', {
      comfyPath,
      pythonPath: config.pythonPath || '',
    });
    const processStatus = await tauriInvoke('comfy_process_status');
    if (processStatus?.running) {
      elements.videoInstallStatus.textContent = t('comfyStudio.videoRestarting');
      await stopLocalEngine();
      await startLocalEngine(true);
      await loadCapabilities();
      elements.videoInstallStatus.dataset.state = videoEnvironment?.ready ? 'success' : 'error';
      elements.videoInstallStatus.textContent = videoEnvironment?.ready
        ? t('comfyStudio.videoInstallReady')
        : t('comfyStudio.videoInstallRestartedMissing', { items: videoEnvironment?.missing?.join('、') || 'VHS_VideoCombine' });
    } else {
      elements.videoInstallStatus.dataset.state = 'success';
      elements.videoInstallStatus.textContent = message || t('comfyStudio.videoInstallComplete');
    }
  } catch (error) {
    elements.videoInstallStatus.dataset.state = 'error';
    elements.videoInstallStatus.textContent = error.message || String(error);
  } finally {
    elements.installVideoHelper.disabled = false;
  }
}

async function installH3Nodes () {
  const config = loadConfig();
  const comfyPath = getEngineComfyDir();
  if (!isTauri || !comfyPath) {
    throw new Error(t('comfyStudio.videoInstallLocalOnly'));
  }
  elements.installH3Nodes.disabled = true;
  elements.h3InstallStatus.hidden = false;
  elements.h3InstallStatus.dataset.state = 'working';
  elements.h3InstallStatus.textContent = '正在安装 H3 低显存节点…';
  try {
    const message = await tauriInvoke('install_comfy_h3_nodes', { comfyPath });
    const processStatus = await tauriInvoke('comfy_process_status');
    if (processStatus?.running) {
      elements.h3InstallStatus.textContent = '正在重启 ComfyUI…';
      await stopLocalEngine();
      await startLocalEngine(true);
      await loadCapabilities();
    }
    elements.h3InstallStatus.dataset.state = 'success';
    elements.h3InstallStatus.textContent = message;
  } catch (error) {
    elements.h3InstallStatus.dataset.state = 'error';
    elements.h3InstallStatus.textContent = error.message || String(error);
  } finally {
    elements.installH3Nodes.disabled = false;
  }
}

async function refreshVideoServiceStatus () {
  elements.refreshVideoStatus.disabled = true;
  elements.tutorialServiceStatus.hidden = false;
  elements.tutorialServiceStatus.dataset.state = 'working';
  elements.tutorialServiceStatus.textContent = t('comfyStudio.refreshingServiceStatus');
  try {
    await testConnection({ updateCard: false });
    await loadCapabilities();
    const ready = videoEnvironment?.ready;
    elements.tutorialServiceStatus.dataset.state = ready ? 'success' : 'error';
    elements.tutorialServiceStatus.textContent = ready
      ? t('comfyStudio.videoServiceReady')
      : t('comfyStudio.videoServiceMissing', { items: videoEnvironment?.missing?.join('、') || '' });
  } catch (error) {
    elements.tutorialServiceStatus.dataset.state = 'error';
    elements.tutorialServiceStatus.textContent = `${t('comfyStudio.connectionFailed')}: ${error.message || error}`;
  } finally {
    elements.refreshVideoStatus.disabled = false;
  }
}

elements.openEngineSettings?.addEventListener('click', openEngineSettings);
elements.studioEngineSettings?.addEventListener('click', openEngineSettings);
elements.pageOpenSettings?.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  openEngineSettings();
});
elements.engineBack?.addEventListener('click', closeEngineSettings);
elements.openTutorial?.addEventListener('click', openTutorial);
elements.pageOpenTutorial?.addEventListener('click', openTutorial);
elements.videoInstallHelp?.addEventListener('click', () => openTutorial('video'));
elements.installVideoHelper?.addEventListener('click', installVideoHelper);
elements.installH3Nodes?.addEventListener('click', () => installH3Nodes().catch(showError));
elements.h3RefreshHardware?.addEventListener('click', refreshHardwareStatus);
elements.refreshVideoStatus?.addEventListener('click', refreshVideoServiceStatus);
elements.openModelCenter?.addEventListener('click', openModelCenter);
elements.modelClose?.addEventListener('click', closeModelCenter);
elements.modelOverlay?.addEventListener('click', (event) => {
  if (event.target === elements.modelOverlay) closeModelCenter();
});
elements.openModelFolder?.addEventListener('click', async () => {
  const checkpointPath = getCheckpointPath();
  if (checkpointPath) await tauriInvoke('open_path', { path: checkpointPath });
});
elements.refreshModels?.addEventListener('click', refreshModelInventory);
window.addEventListener('focus', () => {
  if (elements.modelOverlay?.classList.contains('visible')) refreshModelInventory();
});
document.querySelectorAll('[data-comfy-download]').forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.comfyFile || button.dataset.h3Model) {
      downloadModelInApp(button).catch((error) => {
        setModelDownloadStatus('error', button.dataset.comfyFile || '', error?.message || String(error));
      });
      return;
    }
    openDownloadUrl(button.dataset.comfyDownload).catch((error) => {
      console.error('Open ComfyUI download failed:', error);
    });
  });
});
elements.modelDownloadCancel?.addEventListener('click', async () => {
  if (!modelDownloadActive) return;
  elements.modelDownloadCancel.disabled = true;
  elements.modelDownloadCancel.textContent = modelDownloadText('正在暂停…', 'Pausing…');
  await tauriInvoke('cancel_comfy_model_download');
  elements.modelDownloadCancel.disabled = false;
  elements.modelDownloadCancel.textContent = modelDownloadText('暂停下载', 'Pause download');
});
elements.modelDownloadHide?.addEventListener('click', () => {
  if (elements.modelDownloadPanel) elements.modelDownloadPanel.hidden = true;
});
document.querySelectorAll('[data-comfy-folder]').forEach((button) => {
  button.addEventListener('click', async () => {
    if (button.dataset.comfyDownload) return;
    const path = getTutorialFolderPath(button.dataset.comfyFolder);
    if (path) await tauriInvoke('open_path', { path });
  });
});
elements.tutorialClose?.addEventListener('click', closeTutorial);
elements.tutorialDone?.addEventListener('click', closeTutorial);
elements.tutorialTabs?.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-tutorial-mode]');
  if (button) setTutorialMode(button.dataset.tutorialMode);
});
elements.tutorialSettings?.addEventListener('click', () => {
  closeTutorial();
  openEngineSettings();
});
elements.tutorialOverlay?.addEventListener('click', (event) => {
  if (event.target === elements.tutorialOverlay) closeTutorial();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && elements.tutorialOverlay?.classList.contains('visible')) closeTutorial();
});
elements.studioBack?.addEventListener('click', closeStudio);
elements.engineMode?.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-mode]');
  if (!button) return;
  elements.engineMode.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === button));
  updateEngineModeFields(button.dataset.mode);
});
elements.browsePath?.addEventListener('click', () => browseComfyPath().catch((error) => setEngineStatus('error', error.message || String(error))));
elements.refreshHardware?.addEventListener('click', refreshHardwareStatus);
elements.toggleHardware?.addEventListener('click', () => {
  setHardwareDetailsOpen(!!elements.hardwareBody?.hidden);
});
elements.saveEngine?.addEventListener('click', () => {
  saveConfig();
  setEngineStatus('online', t('comfyStudio.saved'));
});
elements.testEngine?.addEventListener('click', async () => {
  saveConfig();
  elements.testEngine.disabled = true;
  try { await testConnection(); } catch (_) { }
  finally { elements.testEngine.disabled = false; }
});
elements.startEngine?.addEventListener('click', async () => {
  elements.startEngine.disabled = true;
  try {
    const mode = readConfigForm().mode;
    if (mode === 'builtin') {
      saveConfig();
      await startBuiltinRuntime();
    } else {
      await startLocalEngine();
    }
  }
  catch (error) { setEngineStatus('error', error.message || String(error)); }
  finally { elements.startEngine.disabled = false; }
});
elements.stopEngine?.addEventListener('click', async () => {
  try { await stopLocalEngine(); }
  catch (error) { setEngineStatus('error', error.message || String(error)); }
});
elements.builtinRuntime?.addEventListener('change', () => {
  builtinRuntimeTouched = true;
  refreshBuiltinDetectText();
});
elements.installBuiltin?.addEventListener('click', () => installBuiltinRuntime('offline'));
elements.openDownloadPage?.addEventListener('click', async () => {
  // 浏览器下载到用户自己的下载位置，下完解压后从「导入已解压目录」导入
  const page = 'https://github.com/Comfy-Org/ComfyUI/releases/latest';
  try {
    await openDownloadUrl(page);
    setBuiltinStatus('idle', builtinText(
      '浏览器已打开官方下载页，下载解压后点「导入已解压目录」（详见下方教程）',
      'The official download page is open in your browser. After extracting, use Import extracted folder (see the tutorial below)',
    ));
  } catch (error) {
    setBuiltinStatus('error', builtinText(
      `打开下载页失败：${error?.message || error}。可直接复制这个网址到浏览器：${page}`,
      `Failed to open the page: ${error?.message || error}. Copy this URL into your browser: ${page}`,
    ));
  }
});
elements.installBuiltinFromFile?.addEventListener('click', () => {
  installBuiltinFromLocalFile().catch((error) => setBuiltinStatus('error', error?.message || String(error)));
});
elements.importExtractedBuiltin?.addEventListener('click', () => {
  importExtractedBuiltin().catch((error) => setBuiltinStatus('error', error?.message || String(error)));
});
elements.clearBuiltinCache?.addEventListener('click', async () => {
  if (builtinInstallActive) return;
  try {
    const message = await tauriInvoke('clear_ai_runtime_cache');
    setBuiltinStatus('idle', message || builtinText('已清除下载缓存', 'Download cache cleared'));
  } catch (error) {
    setBuiltinStatus('error', error?.message || String(error));
  }
});
elements.cancelBuiltinInstall?.addEventListener('click', async () => {
  try {
    await tauriInvoke('cancel_ai_runtime_install');
    setBuiltinStatus('idle', builtinText('正在取消下载…', 'Cancelling download…'));
  } catch (error) {
    setBuiltinStatus('error', error?.message || String(error));
  }
});
elements.startBuiltin?.addEventListener('click', () => startBuiltinRuntime());
elements.rollbackBuiltin?.addEventListener('click', () => rollbackBuiltinRuntime());
elements.studioTabs?.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-studio-mode]');
  if (button) setStudioMode(button.dataset.studioMode);
});
elements.workflowSwitch?.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-workflow-view]');
  if (button) setWorkflowView(button.dataset.workflowView);
});
elements.videoEnginePicker?.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-video-engine]');
  if (button) setVideoEngine(button.dataset.videoEngine);
});
elements.h3FirstFrame?.addEventListener('change', () => {
  syncH3FrameFileUI(elements.h3FirstFrame, elements.h3FirstFrameDrop, elements.h3FirstFrameName);
});
elements.h3LastFrame?.addEventListener('change', () => {
  syncH3FrameFileUI(elements.h3LastFrame, elements.h3LastFrameDrop, elements.h3LastFrameName);
});
elements.importWorkflow?.addEventListener('click', () => elements.workflowFile.click());
elements.workflowFile?.addEventListener('change', async () => {
  try {
    await importWorkflowFile(elements.workflowFile.files?.[0]);
    setWorkflowView('custom');
    clearError();
  } catch (error) {
    showError(`${t('comfyStudio.invalidWorkflow')}: ${error.message}`);
  } finally {
    elements.workflowFile.value = '';
  }
});
elements.run?.addEventListener('click', runWorkflow);
elements.cancelRun?.addEventListener('click', cancelWorkflow);
elements.openOutputFolder?.addEventListener('click', async () => {
  if (!isTauri) {
    showError(t('comfyStudio.browserOutputHint'));
    return;
  }
  lastOutputDir = lastOutputDir || await getOutputDir();
  await tauriInvoke('open_path', { path: lastOutputDir });
});

document.querySelectorAll('.audio-list-item[data-tool="comfy-image"]').forEach((item) => {
  item.addEventListener('click', () => openStudio('image'));
  item.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openStudio('image'); }
  });
});

document.querySelectorAll('.audio-list-item[data-tool="comfy-video"]').forEach((item) => {
  item.addEventListener('click', () => openStudio('video'));
  item.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openStudio('video'); }
  });
});

elements.promptClear?.addEventListener('click', () => {
  elements.prompt.value = '';
  syncPromptUI();
});
elements.videoPromptClear?.addEventListener('click', () => {
  elements.videoPrompt.value = '';
  syncPromptUI();
});
elements.promptSave?.addEventListener('click', () => saveCurrentPrompt('image'));
elements.videoPromptSave?.addEventListener('click', () => saveCurrentPrompt('video'));
elements.promptInspire?.addEventListener('click', () => inspirePrompt('image'));
elements.videoPromptInspire?.addEventListener('click', () => inspirePrompt('video'));
elements.clearResults?.addEventListener('click', clearResults);
elements.emptyOpenSettings?.addEventListener('click', openEngineSettings);
[elements.prompt, elements.negativePrompt, elements.videoPrompt].forEach((field) => {
  field?.addEventListener('input', syncPromptUI);
});
elements.videoNegative?.addEventListener('input', () => {
  videoNegativeTouched = true;
  syncPromptUI();
});
[
  elements.width, elements.height, elements.steps, elements.cfg,
  elements.sampler, elements.scheduler, elements.batch,
  elements.videoWidth, elements.videoHeight, elements.videoDuration,
  elements.videoFps, elements.videoSteps, elements.videoCfg,
].forEach((field) => {
  field?.addEventListener('change', syncParamUI);
  field?.addEventListener('input', syncParamUI);
});
elements.promptLibrary?.addEventListener('toggle', () => {
  if (elements.promptLibrary.open) renderPromptLibrary();
});

// Called by the global application shutdown flow before the native process
// exits. This prevents an active generation and its WebSocket from lingering.
window.shutdownKaruiAiConnections = async function shutdownKaruiAiConnections () {
  runCancelled = true;
  runProgress.active = false;
  stopProgressTicker();
  closeProgressSocket();
  if (hardwarePollTimer) {
    window.clearInterval(hardwarePollTimer);
    hardwarePollTimer = null;
  }
  if (activePromptId) {
    try {
      await requestWithFallback(['/interrupt', '/api/interrupt'], { method: 'POST', body: {} });
    } catch (_) { }
  }
};

onLangChange(() => {
  if (elements.connectionPill.dataset.state !== 'online') setConnectionStatus('offline', t('comfyStudio.offline'));
  if (lastHardwareStatus) renderHardwareStatus(lastHardwareStatus);
  setHardwareDetailsOpen(!!(elements.hardwareBody && !elements.hardwareBody.hidden));
  renderVideoEngineEnvironment();
  buildPromptLab();
  setWorkflowView(workflowView);
});

writeConfigForm();
setHardwareDetailsOpen(false);
syncModelAccess();
loadPromptDraft();
renderVideoEngineEnvironment();
buildPromptLab();
setWorkflowView(workflowView);
updateResultStats(0);
