import { createIcons, icons } from 'lucide';
import { onLangChange, t } from '../../i18n.js';
import { createEmptyProject, createId } from './project-schema.js';
import { describeMediaProbe, probeMedia } from './media-probe.js';
import './editor-shell.css';

const isTauri = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'mkv', 'avi', 'webm', 'flv', 'wmv', 'ts'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'wma'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'];
const SUBTITLE_EXTENSIONS = ['srt', 'vtt', 'ass'];
const ALL_EXTENSIONS = [...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS, ...IMAGE_EXTENSIONS, ...SUBTITLE_EXTENSIONS];

const elements = {
  overlay: document.getElementById('karuiEditorOverlay'),
  back: document.getElementById('karuiEditorBack'),
  projectName: document.getElementById('karuiEditorProjectName'),
  dirty: document.getElementById('karuiEditorDirty'),
  newProject: document.getElementById('karuiEditorNew'),
  importMedia: document.getElementById('karuiEditorImport'),
  emptyImport: document.getElementById('karuiEditorEmptyImport'),
  mediaList: document.getElementById('karuiEditorMediaList'),
  tracks: document.getElementById('karuiEditorTracks'),
  resolution: document.getElementById('karuiEditorResolution'),
  canvas: document.getElementById('karuiEditorCanvas'),
  fps: document.getElementById('karuiEditorFps'),
  audio: document.getElementById('karuiEditorAudio'),
};

let project = createEmptyProject();
let dirty = true;

function extensionOf (name) {
  return String(name || '').split('.').pop()?.toLowerCase() || '';
}

function assetKind (name) {
  const extension = extensionOf(name);
  if (VIDEO_EXTENSIONS.includes(extension)) return 'video';
  if (AUDIO_EXTENSIONS.includes(extension)) return 'audio';
  if (IMAGE_EXTENSIONS.includes(extension)) return 'image';
  if (SUBTITLE_EXTENSIONS.includes(extension)) return 'subtitle';
  return null;
}

function fileName (path) {
  return String(path || '').split(/[\\/]/).pop() || String(path || '');
}

function kindIcon (kind) {
  return { video: 'clapperboard', audio: 'audio-lines', image: 'image', subtitle: 'captions' }[kind] || 'file';
}

function kindLabel (kind) {
  return t(`editor.kind.${kind}`);
}

function setDirty (value) {
  dirty = value;
  elements.dirty.hidden = !dirty;
}

function activeSequence () {
  return project.sequences[project.activeSequenceId];
}

function renderProject () {
  const settings = project.settings;
  const fps = settings.frameRate.num / settings.frameRate.den;
  elements.projectName.textContent = project.name;
  elements.resolution.textContent = `${settings.width} × ${settings.height} · ${fps}fps`;
  elements.canvas.textContent = `${settings.width} × ${settings.height}`;
  elements.fps.textContent = `${fps} fps`;
  elements.audio.textContent = `${Math.round(settings.sampleRate / 1000)} kHz`;
  renderMedia();
  renderTracks();
  setDirty(dirty);
  createIcons({ icons });
}

function renderMedia () {
  const assets = Object.values(project.assets);
  elements.mediaList.replaceChildren();
  elements.emptyImport.hidden = assets.length > 0;
  assets.forEach((asset) => {
    const item = document.createElement('article');
    item.className = 'karui-media-item';
    const icon = document.createElement('span');
    icon.className = 'karui-media-icon';
    icon.innerHTML = `<i data-lucide="${kindIcon(asset.kind)}"></i>`;
    const copy = document.createElement('span');
    copy.className = 'karui-media-copy';
    const title = document.createElement('strong');
    title.textContent = asset.name || fileName(asset.uri);
    title.title = title.textContent;
    const meta = document.createElement('small');
    meta.textContent = asset.probe
      ? `${kindLabel(asset.kind)} · ${describeMediaProbe(asset.probe)}`
      : `${kindLabel(asset.kind)} · ${extensionOf(asset.name || asset.uri).toUpperCase()}`;
    copy.append(title, meta);
    const pending = document.createElement('span');
    pending.className = 'karui-media-pending';
    pending.dataset.state = asset.probeState || 'waiting';
    pending.textContent = t(`editor.probeState.${asset.probeState || 'waiting'}`);
    if (asset.probeError) pending.title = asset.probeError;
    item.append(icon, copy, pending);
    elements.mediaList.appendChild(item);
  });
}

function renderTracks () {
  elements.tracks.replaceChildren();
  activeSequence().tracks.forEach((track) => {
    const row = document.createElement('div');
    row.className = 'karui-track-row';
    row.dataset.kind = track.kind;
    const label = document.createElement('div');
    label.className = 'karui-track-label';
    const icon = document.createElement('i');
    icon.dataset.lucide = kindIcon(track.kind);
    const name = document.createElement('strong');
    name.textContent = track.name;
    label.append(icon, name);
    const lane = document.createElement('div');
    lane.className = 'karui-track-lane';
    const hint = document.createElement('span');
    hint.textContent = t(`editor.trackHint.${track.kind}`);
    lane.appendChild(hint);
    row.append(label, lane);
    elements.tracks.appendChild(row);
  });
}

function addAssets (files) {
  let added = 0;
  const addedIds = [];
  files.forEach((file) => {
    const path = typeof file === 'string' ? file : (file.path || file.name);
    const name = fileName(path);
    const kind = assetKind(name);
    if (!kind) return;
    const duplicate = Object.values(project.assets).some((asset) => asset.uri === path);
    if (duplicate) return;
    const id = createId();
    project.assets[id] = { id, kind, uri: path, name, probeState: isTauri ? 'probing' : 'desktopOnly' };
    addedIds.push(id);
    added += 1;
  });
  if (added > 0) {
    project.updatedAt = new Date().toISOString();
    setDirty(true);
    renderProject();
    if (isTauri) probeAssets(addedIds).catch(console.error);
  }
}

async function probeAssets (assetIds) {
  const projectId = project.projectId;
  await Promise.all(assetIds.map(async (assetId) => {
    const asset = project.assets[assetId];
    if (!asset) return;
    try {
      const probe = await probeMedia(asset.uri);
      if (project.projectId !== projectId || !project.assets[assetId]) return;
      asset.probe = probe;
      asset.fingerprint = probe.fingerprint;
      if (probe.kind && probe.kind !== 'unknown') asset.kind = probe.kind;
      asset.probeState = 'ready';
      delete asset.probeError;
    } catch (error) {
      if (project.projectId !== projectId || !project.assets[assetId]) return;
      asset.probeState = 'failed';
      asset.probeError = error?.message || error?.details || String(error);
    }
    project.updatedAt = new Date().toISOString();
    setDirty(true);
    renderMedia();
    createIcons({ icons });
  }));
}

async function chooseMedia () {
  if (isTauri) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      multiple: true,
      title: t('editor.importMedia'),
      filters: [{ name: 'Media', extensions: ALL_EXTENSIONS }],
    });
    if (Array.isArray(selected)) addAssets(selected);
    else if (typeof selected === 'string') addAssets([selected]);
    return;
  }
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = 'video/*,audio/*,image/*,.srt,.vtt,.ass';
  input.addEventListener('change', () => addAssets(Array.from(input.files || [])), { once: true });
  input.click();
}

function newProject () {
  project = createEmptyProject({ name: t('editor.untitled') });
  dirty = true;
  renderProject();
}

function openEditor () {
  elements.overlay.classList.add('visible');
  elements.overlay.setAttribute('aria-hidden', 'false');
  renderProject();
}

function closeEditor () {
  elements.overlay.classList.remove('visible');
  elements.overlay.setAttribute('aria-hidden', 'true');
}

document.querySelectorAll('[data-tool="video-editor"]').forEach((entry) => {
  entry.addEventListener('click', openEditor);
  entry.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openEditor();
    }
  });
});

elements.back?.addEventListener('click', closeEditor);
elements.newProject?.addEventListener('click', newProject);
elements.importMedia?.addEventListener('click', () => chooseMedia().catch(console.error));
elements.emptyImport?.addEventListener('click', () => chooseMedia().catch(console.error));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && elements.overlay?.classList.contains('visible')) closeEditor();
});
onLangChange(() => renderProject());

renderProject();
