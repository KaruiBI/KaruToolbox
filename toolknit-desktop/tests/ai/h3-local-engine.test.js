import assert from 'node:assert/strict';
import { buildH3LowVramWorkflow, detectH3LocalEnvironment, snapH3FrameCount } from '../../src/features/ai/h3-local-engine.js';

assert.equal(snapH3FrameCount(5), 124);
assert.equal(snapH3FrameCount(3), 73);

const combo = (values) => [values];
const info = Object.fromEntries([
  'UNETLoader', 'CLIPLoader', 'ClipProjApply', 'VAELoader', 'ModelAttentionBackend',
  'MiniMaxH3SigmaShift', 'SpectrumApplyMiniMaxH3', 'MiniMaxH3ImageToVideo', 'BasicGuider',
  'KSamplerSelect', 'BasicScheduler', 'RandomNoise', 'SamplerCustomAdvanced', 'VAEDecode',
  'CreateVideo', 'SaveVideo',
].map((name) => [name, { input: { required: {} } }]));
info.UNETLoader.input.required.unet_name = combo(['minimax_h3_fl2va_pruned_w4a8_mixed.safetensors']);
info.CLIPLoader.input.required.clip_name = combo(['qwen3vl_4b_int8_convrot.safetensors']);
info.VAELoader.input.required.vae_name = combo(['minimax_h3_video_vae_int8_convrot.safetensors']);
info.ClipProjApply.input.required.projection = combo(['mmh3-4b-ClipProj-v3-mlp.safetensors']);
const detected = detectH3LocalEnvironment(info);
assert.equal(detected.ready, true);

const workflow = buildH3LowVramWorkflow({
  prompt: 'A calm lake', model: detected.selected.model, clip: detected.selected.clip,
  vae: detected.selected.vae, projection: detected.selected.projection, firstFrame: 'start.png',
});
assert.equal(workflow['8'].inputs.length, 124);
assert.deepEqual(workflow['8'].inputs.first_frame, ['17', 0]);
assert.equal(workflow['2'].inputs.type, 'krea2');
assert.equal(workflow['5'].inputs.attention, 'comfy kitchen attention');
assert.equal(workflow['16'].class_type, 'SaveVideo');

console.log('H3 local engine tests passed');
