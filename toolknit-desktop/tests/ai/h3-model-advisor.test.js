import assert from 'node:assert/strict';
import { recommendH3Model } from '../../src/features/ai/h3-model-advisor.js';

const gib = 1024 ** 3;
const windows5070 = recommendH3Model({
  osName: 'Windows 11',
  memory: { totalBytes: 64 * gib },
  gpus: [{ name: 'NVIDIA GeForce RTX 5070 Laptop GPU', vendor: 'NVIDIA', dedicatedMemoryBytes: 8 * gib }],
});
assert.equal(windows5070.model.id, 'int8');
assert.equal(windows5070.lowVram, true);
assert.match(windows5070.model.filename, /fl2va.*int8/i);

const linux4090 = recommendH3Model({
  osName: 'Linux',
  memory: { totalBytes: 64 * gib },
  gpus: [{ name: 'NVIDIA GeForce RTX 4090', vendor: 'NVIDIA', dedicatedMemoryBytes: 24 * gib }],
});
assert.equal(linux4090.model.id, 'w4a8');
assert.equal(linux4090.lowVram, false);

const weakGpu = recommendH3Model({
  osName: 'Windows 11',
  memory: { totalBytes: 16 * gib },
  gpus: [{ name: 'NVIDIA GeForce GTX 1650', vendor: 'NVIDIA', dedicatedMemoryBytes: 4 * gib }],
});
assert.equal(weakGpu.supported, false);
assert.equal(weakGpu.model, null);
assert.equal(weakGpu.overrideModel.id, 'w4a8');

// 回归：Windows/DXGI 会把 8GB 显卡上报成 8588365824 字节（约 7.9994 GiB），
// 不能因为差了几 MB 就把 8GB 卡判成不达标。
const realWorld5070 = recommendH3Model({
  osName: 'Microsoft Windows 11 专业版 10.0.26200',
  memory: { totalBytes: 63 * gib + 6 * (1024 ** 2) },
  gpus: [{ name: 'NVIDIA GeForce RTX 5070 Laptop GPU', vendor: 'NVIDIA', dedicatedMemoryBytes: 8588365824 }],
});
assert.equal(realWorld5070.supported, true);
assert.equal(realWorld5070.model.id, 'int8');
assert.equal(realWorld5070.lowVram, true);
assert.equal(realWorld5070.overrideModel.id, 'w4a8');

// 非 NVIDIA 显卡依旧不给本地 H3 入口
const amdGpu = recommendH3Model({
  osName: 'Windows 11',
  memory: { totalBytes: 32 * gib },
  gpus: [{ name: 'AMD Radeon RX 7800M', vendor: 'AMD', dedicatedMemoryBytes: 12 * gib }],
});
assert.equal(amdGpu.supported, false);
assert.equal(amdGpu.overrideModel, null);

console.log('H3 model advisor tests passed');
