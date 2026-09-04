import { getLang, onLangChange, t } from './i18n.js';

const CONFIG_KEY = 'karui-comfy-engine-v1';
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
    studioTabs: document.getElementById('comfyStudioTabs'),
    imagePanel: document.getElementById('comfyImagePanel'),
    workflowPanel: document.getElementById('comfyWorkflowPanel'),
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
    workflowFile: document.getElementById('comfyWorkflowFile'),
    importWorkflow: document.getElementById('comfyImportWorkflow'),
    workflowJson: document.getElementById('comfyWorkflowJson'),
    run: document.getElementById('comfyRun'),
    cancelRun: document.getElementById('comfyCancelRun'),
    progress: document.getElementById('comfyProgress'),
    progressFill: document.getElementById('comfyProgressFill'),
    progressText: document.getElementById('comfyProgressText'),
    resultEmpty: document.getElementById('comfyResultEmpty'),
    resultGrid: document.getElementById('comfyResultGrid'),
    errorCard: document.getElementById('comfyErrorCard'),
    openOutputFolder: document.getElementById('comfyOpenOutputFolder'),
};

let engineConfig = loadConfig();
let studioMode = 'image';
let activePromptId = '';
let runCancelled = false;
let lastOutputDir = '';
let videoEnvironment = null;
let modelRefreshPromise = null;

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

function openEngineSettings () {
  engineConfig = loadConfig();
  writeConfigForm();
  elements.engineOverlay.classList.add('visible');
  elements.engineOverlay.setAttribute('aria-hidden', 'false');
  syncEngineStatusFromConnection();
  testConnection().catch(() => {
    // testConnection updates the visible status with the connection error.
  });
}

function closeEngineSettings () {
  elements.engineOverlay.classList.remove('visible');
  elements.engineOverlay.setAttribute('aria-hidden', 'true');
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
}

async function openStudio (mode = 'image') {
  setStudioMode(mode === 'video' ? 'workflow' : mode);
  clearError();
  elements.studioOverlay.classList.add('visible');
  elements.studioOverlay.setAttribute('aria-hidden', 'false');
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
        batch_size: 1,
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
    '5': { class_type: 'CLIPTextEncode', inputs: {
      text: 'low quality, blurry, distorted, static, watermark, text', clip: ['2', 0],
    } },
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

function setProgress (percent, message) {
  elements.progress.hidden = false;
  elements.progressFill.style.width = `${Math.max(4, Math.min(100, percent))}%`;
  elements.progressText.textContent = message;
}

function setRunning (running) {
  elements.run.disabled = running;
  elements.cancelRun.hidden = !running;
}

async function queueWorkflow (workflow) {
  const clientId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const payload = { prompt: workflow, client_id: clientId };
  return requestWithFallback(['/prompt', '/api/prompt'], { method: 'POST', body: payload });
}

async function waitForHistory (promptId) {
  const startedAt = Date.now();
  while (!runCancelled) {
    if (Date.now() - startedAt > 2 * 60 * 60 * 1000) throw new Error('ComfyUI task timed out');
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
    setProgress(62, t('comfyStudio.running'));
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

function renderOutputs (outputs) {
  elements.resultGrid.innerHTML = '';
  elements.resultEmpty.hidden = true;
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
    const name = document.createElement('span');
    name.className = 'comfy-result-name';
    name.textContent = file.filename;
    item.append(media, name);
    elements.resultGrid.appendChild(item);
  });
}

async function runWorkflow () {
  clearError();
  runCancelled = false;
  activePromptId = '';
  lastOutputDir = '';
  setRunning(true);
  setProgress(8, t('comfyStudio.preparing'));
  try {
    engineConfig = loadConfig();
    await testConnection({ updateCard: false });
    const useAdvancedWorkflow = studioMode === 'workflow'
      && elements.workflowAdvanced?.open
      && elements.workflowJson.value.trim();
    const workflow = studioMode === 'image'
      ? buildImageWorkflow()
      : (useAdvancedWorkflow ? parseWorkflow() : buildWanVideoWorkflow());
    const queued = await queueWorkflow(workflow);
    activePromptId = queued?.prompt_id || queued?.promptId;
    if (!activePromptId) throw new Error('ComfyUI did not return a prompt_id');
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
    renderOutputs(outputs);
    setProgress(100, t('comfyStudio.completed'));
  } catch (error) {
    showError(error);
    setProgress(100, runCancelled ? t('comfyStudio.cancelled') : (error.message || String(error)));
  } finally {
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
elements.importWorkflow?.addEventListener('click', () => elements.workflowFile.click());
elements.workflowFile?.addEventListener('change', async () => {
  try {
    await importWorkflowFile(elements.workflowFile.files?.[0]);
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

onLangChange(() => {
  if (elements.connectionPill.dataset.state !== 'online') setConnectionStatus('offline', t('comfyStudio.offline'));
});

writeConfigForm();
syncModelAccess();