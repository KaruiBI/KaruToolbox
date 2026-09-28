const optionList = (info, nodeName, inputName) => {
  const value = info?.[nodeName]?.input?.required?.[inputName]?.[0]
    || info?.[nodeName]?.input?.optional?.[inputName]?.[0]
    || [];
  return Array.isArray(value) ? value : [];
};

const firstMatch = (values, pattern) => values.find((value) => pattern.test(String(value))) || '';

export function snapH3FrameCount(durationSeconds) {
  const requested = Math.max(5, Math.round(Number(durationSeconds || 5) * 24));
  return requested + ((5 - (requested % 17)) % 17);
}

export function detectH3LocalEnvironment(info) {
  const requiredNodes = [
    'UNETLoader', 'CLIPLoader', 'ClipProjApply', 'VAELoader',
    'ModelAttentionBackend', 'MiniMaxH3SigmaShift', 'SpectrumApplyMiniMaxH3',
    'MiniMaxH3ImageToVideo', 'BasicGuider', 'KSamplerSelect', 'BasicScheduler',
    'RandomNoise', 'SamplerCustomAdvanced', 'VAEDecode', 'CreateVideo', 'SaveVideo',
  ];
  const missingNodes = requiredNodes.filter((name) => !info?.[name]);
  const models = optionList(info, 'UNETLoader', 'unet_name').filter((value) => /minimax[_-]?h3|\bh3\b/i.test(value));
  const clips = optionList(info, 'CLIPLoader', 'clip_name').filter((value) => /qwen3.*(?:4b|h3)|minimax[_-]?h3/i.test(value));
  const vaes = optionList(info, 'VAELoader', 'vae_name').filter((value) => /minimax[_-]?h3.*video.*vae|h3.*video.*vae/i.test(value));
  const projections = optionList(info, 'ClipProjApply', 'projection').filter((value) => /mmh3.*4b.*clipproj|h3.*4b/i.test(value));

  const selected = {
    model: firstMatch(models, /int8.*convrot/i) || firstMatch(models, /w4a8|int4|q4|nf4/i) || models[0] || '',
    clip: firstMatch(clips, /4b.*(?:int8|fp8|q8)|qwen3.*4b/i) || clips[0] || '',
    vae: firstMatch(vaes, /int8.*convrot/i) || vaes[0] || '',
    projection: firstMatch(projections, /4b.*v3.*mlp/i) || projections[0] || '',
  };
  const missing = [...missingNodes];
  if (!models.length) missing.push('H3 FL2VA 扩散模型');
  if (!clips.length) missing.push('Qwen3-VL 4B 文本编码器');
  if (!vaes.length) missing.push('H3 视频 VAE');
  if (!projections.length) missing.push('H3 4B ClipProj');
  return { ready: missing.length === 0, missing, models, clips, vaes, projections, selected };
}

export function buildH3LowVramWorkflow({
  prompt,
  width = 608,
  height = 352,
  duration = 5,
  steps = 20,
  seed = 0,
  model,
  clip,
  vae,
  projection,
  firstFrame,
  lastFrame,
}) {
  const conditioningInputs = {
    clip: ['3', 0],
    vae: ['4', 0],
    prompt,
    width,
    height,
    length: snapH3FrameCount(duration),
  };
  if (firstFrame) conditioningInputs.first_frame = ['17', 0];
  if (lastFrame) conditioningInputs.last_frame = ['18', 0];

  const workflow = {
    '1': { class_type: 'UNETLoader', inputs: { unet_name: model, weight_dtype: 'default' } },
    '2': { class_type: 'CLIPLoader', inputs: { clip_name: clip, type: 'krea2', device: 'default' } },
    '3': { class_type: 'ClipProjApply', inputs: { clip: ['2', 0], projection } },
    '4': { class_type: 'VAELoader', inputs: { vae_name: vae } },
    '5': { class_type: 'ModelAttentionBackend', inputs: { model: ['1', 0], attention: 'comfy kitchen attention' } },
    '6': { class_type: 'MiniMaxH3SigmaShift', inputs: { model: ['5', 0], shift_video: 12, shift_audio: 3 } },
    '7': { class_type: 'SpectrumApplyMiniMaxH3', inputs: {
      model: ['6', 0], enabled: true, blend_weight: 0.5, degree: 1, ridge_lambda: 0.1,
      window_size: 2, flex_window: 0.75, warmup_steps: 1, tail_actual_steps: 1,
      max_history: 8, debug: false, history_storage: 'system_ram', bootstrap_first_forecast: true,
      anchor_residual_feedback: false, selective_rollback_correction: false,
      offline_smoothing_replay: true, audio_blend_weight: 0,
    } },
    '8': { class_type: 'MiniMaxH3ImageToVideo', inputs: conditioningInputs },
    '9': { class_type: 'BasicGuider', inputs: { model: ['7', 0], conditioning: ['8', 0] } },
    '10': { class_type: 'KSamplerSelect', inputs: { sampler_name: 'euler' } },
    '11': { class_type: 'BasicScheduler', inputs: { model: ['7', 0], scheduler: 'simple', steps, denoise: 1 } },
    '12': { class_type: 'RandomNoise', inputs: { noise_seed: seed } },
    '13': { class_type: 'SamplerCustomAdvanced', inputs: {
      noise: ['12', 0], guider: ['9', 0], sampler: ['10', 0], sigmas: ['11', 0], latent_image: ['8', 1],
    } },
    '14': { class_type: 'VAEDecode', inputs: { samples: ['13', 0], vae: ['4', 0] } },
    '15': { class_type: 'CreateVideo', inputs: { images: ['14', 0], fps: 24 } },
    '16': { class_type: 'SaveVideo', inputs: { video: ['15', 0], filename_prefix: 'KaruiVideo/H3', format: 'auto' } },
  };
  if (firstFrame) workflow['17'] = { class_type: 'LoadImage', inputs: { image: firstFrame } };
  if (lastFrame) workflow['18'] = { class_type: 'LoadImage', inputs: { image: lastFrame } };
  return workflow;
}
