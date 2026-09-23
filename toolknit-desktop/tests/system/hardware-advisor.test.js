import assert from 'node:assert/strict';
import test from 'node:test';
import { buildHardwareAdvice, formatBytes, percentText } from '../../src/features/system/hardware-advisor.js';

const gib = 1024 ** 3;

function profile (vramGb, ramGb = 32) {
  return {
    memory: { totalBytes: ramGb * gib },
    gpus: vramGb ? [{ name: 'Test GPU', dedicatedMemoryBytes: vramGb * gib }] : [],
  };
}

test('formats system metrics', () => {
  assert.equal(formatBytes(8 * gib), '8.0 GB');
  assert.equal(percentText(43.6), '44%');
  assert.equal(percentText(null), '--');
});

test('recommends remote compute without a capable GPU', () => {
  assert.equal(buildHardwareAdvice(profile(0))[0].level, 'remote');
});

test('recommends SDXL and Wan 1.3B around 8 GB VRAM', () => {
  const titles = buildHardwareAdvice(profile(8)).map((entry) => entry.title);
  assert.ok(titles.some((title) => title.includes('SDXL')));
  assert.ok(titles.some((title) => title.includes('Wan 2.1')));
});

test('adds a memory warning below 16 GB RAM', () => {
  const advice = buildHardwareAdvice(profile(8, 8));
  assert.ok(advice.some((entry) => entry.level === 'warning'));
});

