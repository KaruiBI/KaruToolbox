import assert from 'node:assert/strict';
import test from 'node:test';
import { describeMediaProbe, formatDuration, formatFileSize, normalizeProbe, probeMedia } from '../../src/features/editor/media-probe.js';

test('格式化媒体时长', () => {
  assert.equal(formatDuration(65.4), '1:05');
  assert.equal(formatDuration(3661), '1:01:01');
  assert.equal(formatDuration(null), '--:--');
});

test('格式化文件大小', () => {
  assert.equal(formatFileSize(1536), '1.5 KB');
  assert.equal(formatFileSize(10 * 1024 * 1024), '10 MB');
});

test('媒体说明优先显示画面参数', () => {
  const text = describeMediaProbe({
    kind: 'video', duration: 12.2, size: 2048,
    video_streams: [{ width: 1920, height: 1080, frame_rate: { value: 29.97 } }],
    audio_streams: [], subtitle_streams: [],
  });
  assert.equal(text, '1920×1080 · 29.97fps · 0:12 · 2.0 KB');
});

test('缺失的流数组会被归一化', () => {
  const value = normalizeProbe({ kind: 'audio', duration: '2.5', size: '1024' });
  assert.deepEqual(value.video_streams, []);
  assert.equal(value.duration, 2.5);
});

test('probeMedia 使用结构化 Tauri 命令', async () => {
  const calls = [];
  const result = await probeMedia('D:/素材/a.mp4', async (command, payload) => {
    calls.push({ command, payload });
    return { kind: 'video', duration: 1, size: 10 };
  });
  assert.equal(result.kind, 'video');
  assert.deepEqual(calls, [{ command: 'probe_media', payload: { inputPath: 'D:/素材/a.mp4' } }]);
});
