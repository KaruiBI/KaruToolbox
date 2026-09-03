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
    openTutorial: document.getElementById('comfyOpenTutorial'),
    pageOpenTutorial: document.getElementById('aiCreativeOpenTutorial'),
    pageOpenSettings: document.getElementById('aiCreativeOpenSettings'),
    tutorialClose: document.getElementById('comfyTutorialClose'),
    tutorialDone: document.getElementById('comfyTutorialDone'),
    tutorialSettings: document.getElementById('comfyTutorialSettings'),
    openModelCenter: document.getElementById('comfyOpenModelCenter'),
    tutorialModelPath: document.getElementById('comfyTutorialModelPath'),
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

async function loadCapabilities () {
  const info = await requestWithFallback(['/object_info', '/api/object_info']);
  const checkpoints = arrayOption(info?.CheckpointLoaderSimple, 'ckpt_name');
  const samplers = arrayOption(info?.KSampler, 'sampler_name');
  const schedulers = arrayOption(info?.KSampler, 'scheduler');
  fillSelect(elements.checkpoint, checkpoints, [t('comfyStudio.noModel')]);
  fillSelect(elements.sampler, samplers, ['euler']);
  fillSelect(elements.scheduler, schedulers, ['normal']);
  if (!checkpoints.length) elements.checkpoint.value = t('comfyStudio.noModel');
  return info;
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

function openTutorial () {
  syncModelAccess();
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
    elements.tutorialModelPath.textContent = checkpointPath;
    elements.tutorialModelPath.hidden = !checkpointPath;
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
    const workflow = studioMode === 'image' ? buildImageWorkflow() : parseWorkflow();
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
elements.openModelCenter?.addEventListener('click', openModelCenter);
elements.modelClose?.addEventListener('click', closeModelCenter);
elements.modelOverlay?.addEventListener('click', (event) => {
  if (event.target === elements.modelOverlay) closeModelCenter();
});
elements.openModelFolder?.addEventListener('click', async () => {
  const checkpointPath = getCheckpointPath();
  if (checkpointPath) await tauriInvoke('open_path', { path: checkpointPath });
});
elements.refreshModels?.addEventListener('click', async () => {
  elements.refreshModels.disabled = true;
  elements.modelStatus.textContent = t('comfyStudio.refreshingModels');
  try {
    const info = await loadCapabilities();
    const checkpoints = arrayOption(info && info.CheckpointLoaderSimple, 'ckpt_name');
    elements.modelStatus.textContent = t('comfyStudio.modelsFound', { count: checkpoints.length });
  } catch (error) {
    elements.modelStatus.textContent = `${t('comfyStudio.connectionFailed')}: ${error.message || error}`;
  } finally {
    elements.refreshModels.disabled = false;
  }
});
document.querySelectorAll('[data-comfy-download]').forEach((button) => {
  button.addEventListener('click', () => {
    openDownloadUrl(button.dataset.comfyDownload).catch((error) => {
      console.error('Open ComfyUI download failed:', error);
    });
  });
});
elements.tutorialClose?.addEventListener('click', closeTutorial);
elements.tutorialDone?.addEventListener('click', closeTutorial);
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
