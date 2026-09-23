const GIB = 1024 ** 3;

export function formatBytes (bytes, decimals = 1) {
  if (!Number.isFinite(bytes) || bytes < 0) return '--';
  if (bytes < GIB) return `${(bytes / (1024 ** 2)).toFixed(0)} MB`;
  return `${(bytes / GIB).toFixed(decimals)} GB`;
}

export function percentText (value) {
  return Number.isFinite(value) ? `${Math.round(value)}%` : '--';
}

function item (level, titleZh, titleEn, detailZh, detailEn) {
  return { level, title: { zh: titleZh, en: titleEn }, detail: { zh: detailZh, en: detailEn } };
}

export function buildHardwareAdvice (status, lang = 'zh') {
  const gpus = Array.isArray(status?.gpus) ? status.gpus : [];
  const gpu = gpus.reduce((best, current) => {
    const currentBytes = current?.dedicatedMemoryBytes || 0;
    const bestBytes = best?.dedicatedMemoryBytes || 0;
    return currentBytes > bestBytes ? current : best;
  }, gpus[0] || null);
  const vramGb = (gpu?.dedicatedMemoryBytes || 0) / GIB;
  const ramGb = (status?.memory?.totalBytes || 0) / GIB;
  const advice = [];

  if (!gpu || vramGb < 3.5) {
    advice.push(item('remote', '优先使用远程算力', 'Prefer remote compute', '本机未检测到足够的独立显存；本地生成容易很慢或失败。', 'No sufficiently large dedicated VRAM was detected; local generation may be slow or fail.'));
    advice.push(item('limited', '本地：SD 1.5 低显存模式', 'Local: SD 1.5 low-VRAM mode', '可尝试 512px、单张、低批次；AI 视频建议走远程。', 'Try 512px, one image, and a small batch; use remote compute for AI video.'));
  } else if (vramGb < 6) {
    advice.push(item('good', 'Stable Diffusion 1.5', 'Stable Diffusion 1.5', '建议 512–768px、单张生成，并启用低显存优化。', 'Use 512–768px, one image at a time, with low-VRAM optimizations.'));
    advice.push(item('limited', 'SDXL Turbo（谨慎）', 'SDXL Turbo (limited)', '可尝试较低分辨率与精简工作流；AI 视频优先远程。', 'Try lower resolutions and compact workflows; prefer remote compute for AI video.'));
  } else if (vramGb < 8) {
    advice.push(item('good', 'SD 1.5 / SDXL Turbo', 'SD 1.5 / SDXL Turbo', '适合日常图片生成；SDXL Base 建议使用低显存模式。', 'Suitable for daily image generation; use low-VRAM mode for SDXL Base.'));
    advice.push(item('limited', 'FLUX 量化版 / AI 视频', 'Quantized FLUX / AI video', '仅建议轻量量化工作流；视频生成仍优先远程。', 'Use only lightweight quantized workflows; remote compute is still preferred for video.'));
  } else if (vramGb < 12) {
    advice.push(item('good', 'SDXL Base / Turbo', 'SDXL Base / Turbo', '适合 1024px 图片生成，复杂 ControlNet 工作流需留意显存。', 'Suitable for 1024px images; watch VRAM in complex ControlNet workflows.'));
    advice.push(item('good', 'FLUX.1 Schnell 量化版', 'Quantized FLUX.1 Schnell', '建议 Q4/NF4、CPU 卸载或分块解码。', 'Use Q4/NF4, CPU offload, or tiled decoding.'));
    advice.push(item('limited', 'Wan 2.1 1.3B', 'Wan 2.1 1.3B', '可尝试短时 480p 视频；运行速度与峰值显存取决于节点和参数。', 'Try short 480p videos; speed and peak VRAM depend on nodes and settings.'));
  } else if (vramGb < 16) {
    advice.push(item('good', 'SDXL + ControlNet', 'SDXL + ControlNet', '可运行较完整的图片工作流，仍建议单任务生成。', 'Can run richer image workflows; generate one task at a time.'));
    advice.push(item('good', 'FLUX 量化版 / Wan 1.3B', 'Quantized FLUX / Wan 1.3B', '适合量化 FLUX 和短视频工作流，优先启用模型卸载。', 'Suitable for quantized FLUX and short video workflows; enable model offload.'));
  } else if (vramGb < 24) {
    advice.push(item('good', '专业图片工作流', 'Advanced image workflows', '适合 SDXL 多 ControlNet、FLUX FP8/量化工作流。', 'Suitable for SDXL multi-ControlNet and FLUX FP8/quantized workflows.'));
    advice.push(item('good', '本地 AI 视频', 'Local AI video', '可运行 Wan 1.3B 及部分量化视频工作流；先从 480p 短片开始。', 'Can run Wan 1.3B and some quantized video workflows; start with short 480p clips.'));
  } else {
    advice.push(item('good', '高阶图片工作流', 'High-end image workflows', '适合高分辨率 SDXL、FLUX 与多模型组合；仍需按工作流控制峰值显存。', 'Suitable for high-resolution SDXL, FLUX, and multi-model stacks; peak VRAM still varies by workflow.'));
    advice.push(item('good', '高阶本地视频工作流', 'Advanced local video workflows', '可尝试更大视频模型与更高分辨率，建议逐级提高参数并观察显存。', 'You can try larger video models and resolutions; increase settings gradually while watching VRAM.'));
  }

  if (ramGb > 0 && ramGb < 16) {
    advice.push(item('warning', '系统内存偏低', 'Limited system memory', '建议关闭其他大型程序；FLUX 与视频模型优先使用远程算力。', 'Close other large apps; prefer remote compute for FLUX and video models.'));
  } else if (ramGb >= 32) {
    advice.push(item('good', '系统内存充足', 'Good system memory', '适合模型卸载、缓存和较复杂的本地工作流。', 'Suitable for model offload, caching, and more complex local workflows.'));
  }

  return advice.map((entry) => ({
    level: entry.level,
    title: entry.title[lang] || entry.title.zh,
    detail: entry.detail[lang] || entry.detail.zh,
  }));
}

