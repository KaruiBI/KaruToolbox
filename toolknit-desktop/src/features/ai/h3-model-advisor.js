const GIB = 1024 ** 3;

// Windows/DXGI 上报的专用显存通常比标称值少几 MB（如 8GB 卡上报 7.999 GiB），
// 所以按 7.5 GiB 作为「8GB 级」判断阈值，避免把 8GB 显卡误判成不达标。
const MIN_H3_VRAM_GIB = 7.5;

export const H3_MODEL_DOWNLOADS = {
  int8: {
    id: 'int8',
    filename: 'minimax_h3_fl2va_pruned_int8_convrot.safetensors',
    size: '约 21 GB',
    url: 'https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/diffusion_models/minimax_h3_fl2va_pruned_int8_convrot.safetensors?download=true',
  },
  w4a8: {
    id: 'w4a8',
    filename: 'minimax_h3_fl2va_pruned_w4a8_mixed.safetensors',
    size: '约 12.54 GB',
    url: 'https://huggingface.co/starsfriday/MiniMax-H3-w4a8/resolve/main/minimax_h3_fl2va_pruned_w4a8_mixed.safetensors?download=true',
  },
};

function primaryGpu(status) {
  const gpus = Array.isArray(status?.gpus) ? status.gpus : [];
  return gpus.reduce((best, current) => (
    (current?.dedicatedMemoryBytes || 0) > (best?.dedicatedMemoryBytes || 0) ? current : best
  ), gpus[0] || null);
}

export function recommendH3Model(status, lang = 'zh') {
  const gpu = primaryGpu(status);
  const gpuName = String(gpu?.name || '');
  const osName = String(status?.osName || '');
  const vramGb = (gpu?.dedicatedMemoryBytes || 0) / GIB;
  const ramGb = (status?.memory?.totalBytes || 0) / GIB;
  const nvidia = /nvidia|geforce|rtx|gtx/i.test(`${gpu?.vendor || ''} ${gpuName}`);
  const windows = /windows/i.test(osName);
  const blackwell = /(?:rtx\s*)?50\d{2}/i.test(gpuName);
  const vramText = vramGb > 0 ? vramGb.toFixed(1) : (lang === 'zh' ? '未知' : 'unknown');

  if (!nvidia) {
    return {
      supported: false,
      gpuName: gpuName || (lang === 'zh' ? '未检测到 NVIDIA 显卡' : 'No NVIDIA GPU detected'),
      summary: lang === 'zh' ? '不建议下载本地 H3 模型' : 'Local H3 download is not recommended',
      reason: lang === 'zh'
        ? '未检测到 NVIDIA 显卡。H3 本地生成依赖 CUDA，AMD / Intel 显卡更适合使用远程算力。'
        : 'No NVIDIA GPU detected. Local H3 generation relies on CUDA; AMD / Intel GPUs should use remote compute.',
      lowVram: true,
      model: null,
      overrideModel: null,
      vramGb,
    };
  }

  if (vramGb < MIN_H3_VRAM_GIB) {
    return {
      supported: false,
      gpuName,
      summary: lang === 'zh' ? '不太建议下载本地 H3 模型' : 'Local H3 download is not recommended',
      reason: lang === 'zh'
        ? `检测到 ${vramText} GB 显存，低于建议的 8GB，直接生成很容易爆显存。社区已有 8GB 跑通的方案（见「查看 8GB 配置说明」），如仍想尝试，可下载 W4A8 轻量版并在设置中开启低显存模式。`
        : `Detected ${vramText} GB VRAM, below the recommended 8 GB, so out-of-memory errors are likely. Community setups do run it on 8 GB cards (see the 8 GB guide); if you still want to try, grab the W4A8 lightweight model and enable low VRAM mode.`,
      lowVram: true,
      model: null,
      overrideModel: H3_MODEL_DOWNLOADS.w4a8,
      vramGb,
    };
  }

  const useInt8 = windows || blackwell;
  const model = useInt8 ? H3_MODEL_DOWNLOADS.int8 : H3_MODEL_DOWNLOADS.w4a8;
  const memoryWarning = ramGb > 0 && ramGb < 32;
  return {
    supported: true,
    gpuName,
    summary: useInt8
      ? (lang === 'zh' ? '推荐：FL2VA INT8（Windows 稳定版）' : 'Recommended: FL2VA INT8 (Windows-safe)')
      : (lang === 'zh' ? '推荐：FL2VA W4A8（Linux 轻量版）' : 'Recommended: FL2VA W4A8 (Linux lightweight)'),
    reason: lang === 'zh'
      ? `${osName || '当前系统'} · ${vramText}GB 显存${blackwell ? ' · RTX 50 系' : ''}。${memoryWarning ? '系统内存不足 32GB，生成时请关闭大型程序。' : '已按系统和显卡自动排除不合适的版本。'}${vramGb < 16 ? ' 8GB 显存跑 INT8 依赖内存卸载，速度较慢；追求速度可改下 W4A8 轻量版。' : ''}`
      : `${osName || 'Current OS'} · ${vramText} GB VRAM${blackwell ? ' · RTX 50 series' : ''}. ${memoryWarning ? 'System RAM is below 32 GB; close large apps while generating.' : 'Incompatible variants were filtered automatically.'}${vramGb < 16 ? ' Running INT8 on 8 GB relies on RAM offloading and is slow; pick W4A8 if speed matters more.' : ''}`,
    lowVram: vramGb < 16,
    model,
    overrideModel: model.id === 'int8' ? H3_MODEL_DOWNLOADS.w4a8 : H3_MODEL_DOWNLOADS.int8,
    vramGb,
  };
}
