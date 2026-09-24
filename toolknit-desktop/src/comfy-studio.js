import { createIcons, icons } from 'lucide';
import { getLang, onLangChange, t } from './i18n.js';
import { buildHardwareAdvice, formatBytes, percentText } from './features/system/hardware-advisor.js';
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
    browsePath: document.getElementById('comfyBrowsePath'),
    engineStatus: document.getElementById('comfyEngineStatus'),
    startEngine: document.getElementById('comfyStartEngine'),
    stopEngine: document.getElementById('comfyStopEngine'),
    testEngine: document.getElementById('comfyTestEngine'),
    saveEngine: document.getElementById('comfySaveEngine'),
    refreshHardware: document.getElementById('comfyRefreshHardware'),
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
    videoStatus: document.getElementById('comfyVideoStatus'),
    videoInstallHelp: document.getElementById('comfyVideoInstallHelp'),
    videoModel: document.getElementById('comfyVideoModel'),
    videoClip: document.getElementById('comfyVideoClip'),
    videoVae: document.getElementById('comfyVideoVae'),
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
let modelRefreshPromise = null;
let lastRunSeed = -1;
let videoNegativeTouched = false;
let hardwarePollTimer = null;
let hardwareRequestPending = false;
let lastHardwareStatus = null;

function loadConfig() {
    const fallback = {
        mode: 'local',
        localPath: '',
        pythonPath: '',
        serverUrl: 'http://127.0.0.1:8188',
        accessToken: '',
        autoStart: false,
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
    };
}

function writeConfigForm(config = engineConfig) {
    elements.localPath.value = config.localPath || '';
    elements.pythonPath.value = config.pythonPath || '';
    elements.serverUrl.value = config.serverUrl || 'http://127.0.0.1:8188';
    elements.accessToken.value = config.accessToken || '';
    elements.autoStart.checked = !!config.autoStart;
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
    if (elements.advancedSettings && mode === 'remote') elements.advancedSettings.open = true;
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
  fillSelect(elements.videoModel, models, [t('comfyStudio.videoNoModel')]);
  fillSelect(elements.videoClip, clips, [t('comfyStudio.videoNoClip')]);
  fillSelect(elements.videoVae, vaes, [t('comfyStudio.videoNoVae')]);

  const missing = [...missingNodes];
  if (!videoOutputMode) missing.push('CreateVideo + SaveVideo / VHS_VideoCombine');
  if (!models.length) missing.push(t('comfyStudio.videoMissingModel'));
  if (!clips.length) missing.push(t('comfyStudio.videoMissingClip'));
  if (!vaes.length) missing.push(t('comfyStudio.videoMissingVae'));
  const ready = missing.length === 0;
  setVideoStatus(
    ready ? 'ready' : 'missing',
    ready ? t('comfyStudio.videoReady') : t('comfyStudio.videoMissing', { items: missing.join('、') }),
  );
  videoEnvironment = { ready, info, missing, videoOutputMode };
  return videoEnvironment;
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
  setHardwareState('ready', t('comfyStudio.hardwareReady'));
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

function syncTutorialPaths () {
  const config = loadConfig();
  const root = config.mode === 'local' && config.localPath
    ? config.localPath.replace(/[\\/]+$/, '')
    : '';
  const pathPending = t('comfyStudio.tutorialPathPending');
  const paths = {
    tutorialRootPath: root || pathPending,
    tutorialCustomNodesPath: root ? `${root}\\custom_nodes` : pathPending,
    tutorialDiffusionPath: root ? `${root}\\models\\diffusion_models` : pathPending,
    tutorialClipPath: root ? `${root}\\models\\text_encoders` : pathPending,
    tutorialVaePath: root ? `${root}\\models\\vae` : pathPending,
  };
  Object.entries(paths).forEach(([key, path]) => {
    if (elements[key]) elements[key].textContent = path;
  });
  document.querySelectorAll('[data-comfy-folder]').forEach((button) => {
    button.disabled = config.mode !== 'local' || !config.localPath;
  });
}

function getTutorialFolderPath (folder) {
  const config = loadConfig();
  if (config.mode !== 'local' || !config.localPath) return '';
  const root = config.localPath.replace(/[\\/]+$/, '');
  const folders = {
    root,
    checkpoints: `${root}\\models\\checkpoints`,
    customNodes: `${root}\\custom_nodes`,
    diffusion: `${root}\\models\\diffusion_models`,
    clip: `${root}\\models\\text_encoders`,
    vae: `${root}\\models\\vae`,
  };
  return folders[folder] || '';
}

function openTutorial (requestedMode) {
  syncModelAccess();
  syncTutorialPaths();
  const mode = typeof requestedMode === 'string'
    ? requestedMode
    : (studioMode === 'workflow' ? 'video' : 'image');
  setTutorialMode(mode);
  elements.tutorialOverlay.classList.add('visible');
  elements.tutorialOverlay.setAttribute('aria-hidden', 'false');
}

function closeTutorial () {
  elements.tutorialOverlay.classList.remove('visible');
  elements.tutorialOverlay.setAttribute('aria-hidden', 'true');
}

function getCheckpointPath () {
  const config = loadConfig();
  if (config.mode !== 'local' || !config.localPath) return '';
  return `${config.localPath.replace(/[\\/]+$/, '')}\\models\\checkpoints`;
}

function syncModelAccess (config = loadConfig()) {
  const checkpointPath = config.mode === 'local' && config.localPath
    ? `${config.localPath.replace(/[\\/]+$/, '')}\\models\\checkpoints`
    : '';
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
  renderSizePresets(elements.videoRatio, VIDEO_SIZE_PRESETS, elements.videoWidth, elements.videoHeight);
  renderQualityPresets(elements.imagePreset, IMAGE_QUALITY_PRESETS, (preset) => {
    elements.width.value = preset.width;
    elements.height.value = preset.height;
    elements.steps.value = preset.steps;
    elements.cfg.value = preset.cfg;
  });
  renderQualityPresets(elements.videoPreset, VIDEO_QUALITY_PRESETS, (preset) => {
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
  elements.videoRatio?.querySelectorAll('.comfy-chip').forEach((chip) => {
    const preset = VIDEO_SIZE_PRESETS.find((item) => item.id === chip.dataset.sizeId);
    chip.classList.toggle('active', !!preset && preset.width === videoWidth && preset.height === videoHeight);
  });
  elements.videoPreset?.querySelectorAll('.comfy-preset-card').forEach((card) => {
    const preset = VIDEO_QUALITY_PRESETS.find((item) => item.id === card.dataset.presetId);
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
      `CFG ${videoCfg}`,
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
    const workflow = studioMode === 'image'
      ? buildImageWorkflow()
      : (useAdvancedWorkflow ? parseWorkflow() : buildWanVideoWorkflow());
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
  if (!isTauri || config.mode !== 'local' || !config.localPath) {
    throw new Error(t('comfyStudio.videoInstallLocalOnly'));
  }
  elements.installVideoHelper.disabled = true;
  elements.videoInstallStatus.hidden = false;
  elements.videoInstallStatus.dataset.state = 'working';
  elements.videoInstallStatus.textContent = t('comfyStudio.videoInstalling');
  try {
    const message = await tauriInvoke('install_comfy_video_helper', {
      comfyPath: config.localPath,
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
    openDownloadUrl(button.dataset.comfyDownload).catch((error) => {
      console.error('Open ComfyUI download failed:', error);
    });
  });
});
document.querySelectorAll('[data-comfy-folder]').forEach((button) => {
  button.addEventListener('click', async () => {
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
  try { await startLocalEngine(); }
  catch (error) { setEngineStatus('error', error.message || String(error)); }
  finally { elements.startEngine.disabled = false; }
});
elements.stopEngine?.addEventListener('click', async () => {
  try { await stopLocalEngine(); }
  catch (error) { setEngineStatus('error', error.message || String(error)); }
});
elements.studioTabs?.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-studio-mode]');
  if (button) setStudioMode(button.dataset.studioMode);
});
elements.workflowSwitch?.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-workflow-view]');
  if (button) setWorkflowView(button.dataset.workflowView);
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

onLangChange(() => {
  if (elements.connectionPill.dataset.state !== 'online') setConnectionStatus('offline', t('comfyStudio.offline'));
  if (lastHardwareStatus) renderHardwareStatus(lastHardwareStatus);
  buildPromptLab();
  setWorkflowView(workflowView);
});

writeConfigForm();
syncModelAccess();
loadPromptDraft();
buildPromptLab();
setWorkflowView(workflowView);
updateResultStats(0);
