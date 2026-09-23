export const KARUI_PROJECT_SCHEMA = 'karui.project';
export const KARUI_PROJECT_VERSION = 1;
export const TICKS_PER_SECOND = 1_000_000;

export const DEFAULT_PROJECT_SETTINGS = Object.freeze({
  width: 1920,
  height: 1080,
  frameRate: Object.freeze({ num: 30, den: 1 }),
  sampleRate: 48_000,
  colorSpace: 'bt709',
  background: '#000000',
});

const TRACK_KINDS = new Set(['video', 'audio', 'image', 'text', 'subtitle']);
const ITEM_TYPES = new Set(['clip', 'subtitle', 'text', 'gap', 'transition']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fallbackUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
    const value = Math.floor(Math.random() * 16);
    const nibble = token === 'x' ? value : (value & 0x3) | 0x8;
    return nibble.toString(16);
  });
}

export function createId() {
  return globalThis.crypto?.randomUUID?.() || fallbackUuid();
}

function createTrack(kind, name, idFactory) {
  return {
    id: idFactory(),
    kind,
    name,
    locked: false,
    muted: false,
    items: [],
  };
}

export function createEmptyProject(options = {}) {
  const idFactory = options.idFactory || createId;
  const now = options.now || new Date().toISOString();
  const sequenceId = idFactory();
  const settings = {
    ...DEFAULT_PROJECT_SETTINGS,
    ...options.settings,
    frameRate: {
      ...DEFAULT_PROJECT_SETTINGS.frameRate,
      ...options.settings?.frameRate,
    },
  };
  const tracks = options.includeDefaultTracks === false
    ? []
    : [
        createTrack('video', 'V1', idFactory),
        createTrack('audio', 'A1', idFactory),
        createTrack('subtitle', 'S1', idFactory),
      ];

  return {
    schema: KARUI_PROJECT_SCHEMA,
    schemaVersion: KARUI_PROJECT_VERSION,
    projectId: idFactory(),
    name: options.name || '未命名工程',
    createdAt: now,
    updatedAt: now,
    settings,
    assets: {},
    sequences: {
      [sequenceId]: {
        id: sequenceId,
        name: options.sequenceName || '主时间线',
        tracks,
        markers: [],
        durationTicks: 0,
      },
    },
    activeSequenceId: sequenceId,
    memoryRefs: [],
    metadata: {},
  };
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isInteger(value, minimum = Number.MIN_SAFE_INTEGER) {
  return Number.isSafeInteger(value) && value >= minimum;
}

function isIsoDate(value) {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

export function validateProject(project, options = {}) {
  const errors = [];
  const warnings = [];
  const addError = (path, code, message) => errors.push({ path, code, message });
  const addWarning = (path, code, message) => warnings.push({ path, code, message });

  if (!isRecord(project)) {
    addError('$', 'project.type', '工程必须是一个 JSON 对象');
    return { valid: false, errors, warnings };
  }

  if (project.schema !== KARUI_PROJECT_SCHEMA) {
    addError('schema', 'schema.unsupported', `不支持的工程类型：${String(project.schema || '')}`);
  }
  if (!isInteger(project.schemaVersion, 1)) {
    addError('schemaVersion', 'schema.version.invalid', 'schemaVersion 必须是正整数');
  } else if (project.schemaVersion > KARUI_PROJECT_VERSION) {
    const message = `工程版本 ${project.schemaVersion} 高于当前支持版本 ${KARUI_PROJECT_VERSION}`;
    if (options.allowFutureVersion) addWarning('schemaVersion', 'schema.version.future', message);
    else addError('schemaVersion', 'schema.version.future', message);
  }

  if (!UUID_PATTERN.test(project.projectId || '')) {
    addError('projectId', 'project.id.invalid', 'projectId 必须是 UUID');
  }
  if (typeof project.name !== 'string' || !project.name.trim()) {
    addError('name', 'project.name.required', '工程名称不能为空');
  }
  if (!isIsoDate(project.createdAt)) addError('createdAt', 'date.invalid', 'createdAt 必须是 ISO 日期');
  if (!isIsoDate(project.updatedAt)) addError('updatedAt', 'date.invalid', 'updatedAt 必须是 ISO 日期');

  validateSettings(project.settings, addError);

  const assets = isRecord(project.assets) ? project.assets : {};
  if (!isRecord(project.assets)) addError('assets', 'assets.type', 'assets 必须是对象');
  for (const [assetId, asset] of Object.entries(assets)) {
    validateAsset(assetId, asset, addError);
  }

  const sequences = isRecord(project.sequences) ? project.sequences : {};
  if (!isRecord(project.sequences)) {
    addError('sequences', 'sequences.type', 'sequences 必须是对象');
  } else if (Object.keys(sequences).length === 0) {
    addError('sequences', 'sequences.empty', '工程至少需要一个序列');
  }

  for (const [sequenceId, sequence] of Object.entries(sequences)) {
    validateSequence(sequenceId, sequence, assets, addError, addWarning);
  }

  if (typeof project.activeSequenceId !== 'string' || !sequences[project.activeSequenceId]) {
    addError('activeSequenceId', 'sequence.active.missing', 'activeSequenceId 必须指向现有序列');
  }
  if (!Array.isArray(project.memoryRefs)) {
    addError('memoryRefs', 'memoryRefs.type', 'memoryRefs 必须是数组');
  }
  if (!isRecord(project.metadata)) {
    addError('metadata', 'metadata.type', 'metadata 必须是对象');
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateSettings(settings, addError) {
  if (!isRecord(settings)) {
    addError('settings', 'settings.type', 'settings 必须是对象');
    return;
  }
  if (!isInteger(settings.width, 16)) addError('settings.width', 'settings.width.invalid', '宽度必须是不小于 16 的整数');
  if (!isInteger(settings.height, 16)) addError('settings.height', 'settings.height.invalid', '高度必须是不小于 16 的整数');
  if (!isRecord(settings.frameRate)
    || !isInteger(settings.frameRate.num, 1)
    || !isInteger(settings.frameRate.den, 1)) {
    addError('settings.frameRate', 'settings.frameRate.invalid', '帧率必须使用正整数 num/den');
  }
  if (!isInteger(settings.sampleRate, 8_000)) {
    addError('settings.sampleRate', 'settings.sampleRate.invalid', '音频采样率必须是不小于 8000 的整数');
  }
  if (typeof settings.colorSpace !== 'string' || !settings.colorSpace) {
    addError('settings.colorSpace', 'settings.colorSpace.required', '必须指定色彩空间');
  }
  if (typeof settings.background !== 'string' || !settings.background) {
    addError('settings.background', 'settings.background.required', '必须指定背景色');
  }
}

function validateAsset(assetId, asset, addError) {
  const path = `assets.${assetId}`;
  if (!UUID_PATTERN.test(assetId)) addError(path, 'asset.key.invalid', 'asset key 必须是 UUID');
  if (!isRecord(asset)) {
    addError(path, 'asset.type', 'asset 必须是对象');
    return;
  }
  if (asset.id !== assetId) addError(`${path}.id`, 'asset.id.mismatch', 'asset.id 必须与对象 key 一致');
  if (!['video', 'audio', 'image', 'subtitle', 'generated'].includes(asset.kind)) {
    addError(`${path}.kind`, 'asset.kind.invalid', '不支持的素材类型');
  }
  if (typeof asset.uri !== 'string' || !asset.uri.trim()) {
    addError(`${path}.uri`, 'asset.uri.required', '素材 URI 不能为空');
  }
  if (asset.fingerprint !== undefined && !isRecord(asset.fingerprint)) {
    addError(`${path}.fingerprint`, 'asset.fingerprint.type', 'fingerprint 必须是对象');
  }
  if (asset.probe !== undefined && !isRecord(asset.probe)) {
    addError(`${path}.probe`, 'asset.probe.type', 'probe 必须是对象');
  }
}

function validateSequence(sequenceId, sequence, assets, addError, addWarning) {
  const path = `sequences.${sequenceId}`;
  if (!UUID_PATTERN.test(sequenceId)) addError(path, 'sequence.key.invalid', 'sequence key 必须是 UUID');
  if (!isRecord(sequence)) {
    addError(path, 'sequence.type', 'sequence 必须是对象');
    return;
  }
  if (sequence.id !== sequenceId) addError(`${path}.id`, 'sequence.id.mismatch', 'sequence.id 必须与对象 key 一致');
  if (typeof sequence.name !== 'string' || !sequence.name.trim()) {
    addError(`${path}.name`, 'sequence.name.required', '序列名称不能为空');
  }
  if (!Array.isArray(sequence.tracks)) {
    addError(`${path}.tracks`, 'tracks.type', 'tracks 必须是数组');
    return;
  }
  if (!Array.isArray(sequence.markers)) addError(`${path}.markers`, 'markers.type', 'markers 必须是数组');
  if (!isInteger(sequence.durationTicks, 0)) {
    addError(`${path}.durationTicks`, 'sequence.duration.invalid', 'durationTicks 必须是非负整数');
  }

  const trackIds = new Set();
  const itemIds = new Set();
  let calculatedDuration = 0;
  sequence.tracks.forEach((track, trackIndex) => {
    const trackPath = `${path}.tracks[${trackIndex}]`;
    if (!isRecord(track)) {
      addError(trackPath, 'track.type', 'track 必须是对象');
      return;
    }
    if (!UUID_PATTERN.test(track.id || '')) addError(`${trackPath}.id`, 'track.id.invalid', 'track.id 必须是 UUID');
    if (trackIds.has(track.id)) addError(`${trackPath}.id`, 'track.id.duplicate', '同一序列内 track.id 不能重复');
    trackIds.add(track.id);
    if (!TRACK_KINDS.has(track.kind)) addError(`${trackPath}.kind`, 'track.kind.invalid', '不支持的轨道类型');
    if (typeof track.name !== 'string' || !track.name.trim()) addError(`${trackPath}.name`, 'track.name.required', '轨道名称不能为空');
    if (!Array.isArray(track.items)) {
      addError(`${trackPath}.items`, 'items.type', 'items 必须是数组');
      return;
    }
    track.items.forEach((item, itemIndex) => {
      const itemPath = `${trackPath}.items[${itemIndex}]`;
      const end = validateItem(item, itemPath, track.kind, assets, itemIds, addError);
      calculatedDuration = Math.max(calculatedDuration, end);
    });
  });

  if (isInteger(sequence.durationTicks, 0) && sequence.durationTicks < calculatedDuration) {
    addError(`${path}.durationTicks`, 'sequence.duration.tooShort', 'durationTicks 不能短于最后一个时间线项目');
  } else if (isInteger(sequence.durationTicks, 0) && sequence.durationTicks > calculatedDuration && calculatedDuration > 0) {
    addWarning(`${path}.durationTicks`, 'sequence.duration.hasTail', '序列末尾包含空白时长');
  }
}

function validateItem(item, path, trackKind, assets, itemIds, addError) {
  if (!isRecord(item)) {
    addError(path, 'item.type', '时间线项目必须是对象');
    return 0;
  }
  if (!UUID_PATTERN.test(item.id || '')) addError(`${path}.id`, 'item.id.invalid', 'item.id 必须是 UUID');
  if (itemIds.has(item.id)) addError(`${path}.id`, 'item.id.duplicate', '同一序列内 item.id 不能重复');
  itemIds.add(item.id);
  if (!ITEM_TYPES.has(item.type)) addError(`${path}.type`, 'item.type.invalid', '不支持的时间线项目类型');
  if (!isInteger(item.timelineStart, 0)) addError(`${path}.timelineStart`, 'item.start.invalid', 'timelineStart 必须是非负整数');
  if (!isInteger(item.duration, 1)) addError(`${path}.duration`, 'item.duration.invalid', 'duration 必须是正整数');

  if (item.type === 'clip') {
    if (typeof item.assetId !== 'string' || !assets[item.assetId]) {
      addError(`${path}.assetId`, 'item.asset.missing', 'clip 必须引用现有素材');
    }
    if (!isInteger(item.sourceIn, 0)) addError(`${path}.sourceIn`, 'item.sourceIn.invalid', 'sourceIn 必须是非负整数');
    if (!isInteger(item.sourceDuration, 1)) addError(`${path}.sourceDuration`, 'item.sourceDuration.invalid', 'sourceDuration 必须是正整数');
    if (isInteger(item.duration, 1) && isInteger(item.sourceDuration, 1) && item.duration !== item.sourceDuration) {
      addError(`${path}.sourceDuration`, 'item.speed.unsupported', 'v1 未定义变速时 duration 必须等于 sourceDuration');
    }
  }
  if (item.type === 'subtitle' && trackKind !== 'subtitle') {
    addError(path, 'item.track.mismatch', '字幕项目必须位于字幕轨');
  }
  if (item.type === 'subtitle' && (typeof item.text !== 'string' || !item.text.trim())) {
    addError(`${path}.text`, 'subtitle.text.required', '字幕文本不能为空');
  }
  return isInteger(item.timelineStart, 0) && isInteger(item.duration, 1)
    ? item.timelineStart + item.duration
    : 0;
}

export function assertValidProject(project, options) {
  const result = validateProject(project, options);
  if (!result.valid) {
    const error = new Error(result.errors.map((item) => `${item.path}: ${item.message}`).join('\n'));
    error.name = 'KaruiProjectValidationError';
    error.details = result.errors;
    throw error;
  }
  return project;
}

function sortForSerialization(value) {
  if (Array.isArray(value)) return value.map(sortForSerialization);
  if (!isRecord(value)) return value;
  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = sortForSerialization(value[key]);
    return result;
  }, {});
}

export function serializeProject(project, options = {}) {
  assertValidProject(project, options);
  const indent = options.pretty === false ? 0 : 2;
  return `${JSON.stringify(sortForSerialization(project), null, indent)}${indent ? '\n' : ''}`;
}

export function parseProject(json, options = {}) {
  let project;
  try {
    project = JSON.parse(json);
  } catch (cause) {
    const error = new Error(`工程 JSON 无法解析：${cause.message}`);
    error.name = 'KaruiProjectParseError';
    error.cause = cause;
    throw error;
  }
  return assertValidProject(project, options);
}

