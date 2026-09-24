function finiteNumber (value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function formatDuration (seconds) {
  const value = finiteNumber(seconds);
  if (value === null || value < 0) return '--:--';
  const total = Math.round(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function formatFileSize (bytes) {
  const value = finiteNumber(bytes);
  if (value === null || value < 0) return '—';
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = value / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size >= 10 ? size.toFixed(0) : size.toFixed(1)} ${units[unit]}`;
}

export function normalizeProbe (probe) {
  if (!probe || typeof probe !== 'object') throw new Error('媒体分析结果为空');
  return {
    ...probe,
    kind: typeof probe.kind === 'string' ? probe.kind : 'unknown',
    duration: finiteNumber(probe.duration),
    size: finiteNumber(probe.size) || 0,
    video_streams: Array.isArray(probe.video_streams) ? probe.video_streams : [],
    audio_streams: Array.isArray(probe.audio_streams) ? probe.audio_streams : [],
    subtitle_streams: Array.isArray(probe.subtitle_streams) ? probe.subtitle_streams : [],
  };
}

export function describeMediaProbe (probe) {
  const normalized = normalizeProbe(probe);
  const video = normalized.video_streams[0];
  const audio = normalized.audio_streams[0];
  const details = [];
  if (video?.width && video?.height) details.push(`${video.width}×${video.height}`);
  if (video?.frame_rate?.value) details.push(`${Number(video.frame_rate.value.toFixed(2))}fps`);
  if (!video && audio?.sample_rate) details.push(`${Math.round(audio.sample_rate / 1000)}kHz`);
  if (normalized.duration !== null) details.push(formatDuration(normalized.duration));
  details.push(formatFileSize(normalized.size));
  return details.join(' · ');
}

export async function probeMedia (path, invokeOverride) {
  const invoke = invokeOverride || (await import('@tauri-apps/api/core')).invoke;
  return normalizeProbe(await invoke('probe_media', { inputPath: path }));
}
