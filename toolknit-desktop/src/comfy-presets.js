/**
 * Karui AI Studio — 提示词工作台预设数据
 * 所有文案均为中英双语，按当前语言自动切换。
 */

export const IMAGE_STYLE_PRESETS = [
    {
        id: 'cinematic',
        label: { zh: '电影感', en: 'Cinematic' },
        tag: 'cinematic lighting, film grain, shallow depth of field, anamorphic flare'
    },
    {
        id: 'photoreal',
        label: { zh: '写实摄影', en: 'Photoreal' },
        tag: 'photorealistic, ultra detailed, 85mm lens, natural skin texture'
    },
    {
        id: 'anime',
        label: { zh: '二次元', en: 'Anime' },
        tag: 'anime style, vibrant colors, clean lineart, cel shading'
    },
    {
        id: 'render3d',
        label: { zh: '3D 渲染', en: '3D Render' },
        tag: '3d render, octane render, volumetric lighting, soft studio light'
    },
    {
        id: 'cyberpunk',
        label: { zh: '赛博朋克', en: 'Cyberpunk' },
        tag: 'cyberpunk, neon lights, rain-soaked street, futuristic city'
    },
    {
        id: 'ink',
        label: { zh: '水墨国风', en: 'Ink Wash' },
        tag: 'traditional chinese ink painting, rice paper texture, elegant brush strokes'
    },
    {
        id: 'product',
        label: { zh: '产品摄影', en: 'Product' },
        tag: 'product photography, seamless studio background, softbox lighting, high detail'
    },
    {
        id: 'oil',
        label: { zh: '油画', en: 'Oil Painting' },
        tag: 'oil painting, thick brush strokes, canvas texture, classical composition'
    },
    {
        id: 'pixel',
        label: { zh: '像素艺术', en: 'Pixel Art' },
        tag: 'pixel art, 16-bit, limited palette, crisp edges'
    },
    {
        id: 'surreal',
        label: { zh: '超现实', en: 'Surreal' },
        tag: 'surrealism, dreamlike atmosphere, floating objects, impossible architecture'
    },
    {
        id: 'architecture',
        label: { zh: '建筑空间', en: 'Architecture' },
        tag: 'architectural photography, wide angle, clean geometry, natural light'
    },
    {
        id: 'poster',
        label: { zh: '插画海报', en: 'Poster' },
        tag: 'editorial illustration, flat colors, bold composition, poster style'
    }
];

export const IMAGE_QUALITY_TAGS = [
    { id: 'u8k', label: { zh: '高清细节', en: 'Ultra Detail' }, tag: '8k, ultra detailed, sharp focus' },
    { id: 'light', label: { zh: '电影布光', en: 'Cine Light' }, tag: 'cinematic lighting, rim light, volumetric light' },
    { id: 'bokeh', label: { zh: '浅景深', en: 'Bokeh' }, tag: 'shallow depth of field, bokeh background' },
    { id: 'wide', label: { zh: '超广角', en: 'Ultra Wide' }, tag: 'ultra wide angle, dramatic perspective' },
    { id: 'hdr', label: { zh: '高动态', en: 'HDR' }, tag: 'high dynamic range, rich contrast' },
    { id: 'texture', label: { zh: '精致材质', en: 'Textures' }, tag: 'intricate textures, physically based rendering' }
];

export const IMAGE_NEGATIVE_TAGS = [
    { id: 'lowq', label: { zh: '低质量', en: 'Low Quality' }, tag: 'low quality, worst quality, jpeg artifacts' },
    { id: 'blur', label: { zh: '模糊', en: 'Blurry' }, tag: 'blurry, out of focus, soft image' },
    { id: 'hands', label: { zh: '手指畸形', en: 'Bad Hands' }, tag: 'bad hands, extra fingers, mutated hands' },
    { id: 'body', label: { zh: '人体畸形', en: 'Bad Anatomy' }, tag: 'deformed body, bad anatomy, extra limbs' },
    { id: 'mark', label: { zh: '水印文字', en: 'Watermark' }, tag: 'watermark, signature, text, logo' },
    { id: 'expo', label: { zh: '曝光异常', en: 'Bad Exposure' }, tag: 'overexposed, underexposed, bad exposure' },
    { id: 'noise', label: { zh: '噪点杂色', en: 'Noisy' }, tag: 'noisy, grainy, artifacts' },
    { id: 'face', label: { zh: '面部崩坏', en: 'Bad Face' }, tag: 'ugly face, asymmetric eyes, distorted face' }
];

export const IMAGE_EXAMPLES = [
    {
        id: 'ex-cyber',
        icon: 'building-2',
        title: { zh: '霓虹街景', en: 'Neon Street' },
        prompt: {
            zh: '雨后的赛博朋克街道，霓虹灯牌倒映在积水里，一位撑伞的行人走在画面中央，远处是高耸的未来建筑，电影感构图',
            en: 'A rain-soaked cyberpunk street, neon signs reflecting in puddles, a person with an umbrella walking in the center, towering futuristic buildings in the distance, cinematic composition'
        },
        negative: 'blurry, low quality, watermark, extra fingers'
    },
    {
        id: 'ex-product',
        icon: 'package',
        title: { zh: '产品主图', en: 'Product Hero' },
        prompt: {
            zh: '极简白色背景上的磨砂金属保温杯，柔和摄影棚布光，细腻材质，商业广告级别产品摄影',
            en: 'A frosted metal tumbler on a minimal white background, soft studio lighting, refined material, commercial product photography'
        },
        negative: 'cluttered background, harsh shadow, watermark, text'
    },
    {
        id: 'ex-ink',
        icon: 'mountain-snow',
        title: { zh: '国风山水', en: 'Ink Landscape' },
        prompt: {
            zh: '水墨风格的江南山水，远山层叠，一叶扁舟行于江面，留白讲究，宣纸质感',
            en: 'Ink wash landscape of Jiangnan, layered distant mountains, a small boat on the river, elegant negative space, rice paper texture'
        },
        negative: 'oversaturated, modern buildings, watermark'
    },
    {
        id: 'ex-anime',
        icon: 'sparkle',
        title: { zh: '二次元角色', en: 'Anime Character' },
        prompt: {
            zh: '阳光下的校园少女，白色衬衫与蓝色领结，微风吹起长发，柔和逆光，清新的二次元插画风格',
            en: 'A school girl in sunlight, white shirt and blue ribbon, long hair flowing in the breeze, soft backlight, fresh anime illustration style'
        },
        negative: 'bad hands, extra fingers, blurry, low quality'
    },
    {
        id: 'ex-space',
        icon: 'sofa',
        title: { zh: '室内空间', en: 'Interior Space' },
        prompt: {
            zh: '北欧极简风格的客厅，原木家具与亚麻沙发，大面积落地窗引入自然光，干净的建筑摄影',
            en: 'A Nordic minimalist living room, wooden furniture and linen sofa, large floor-to-ceiling windows with natural light, clean architectural photography'
        },
        negative: 'cluttered, dark, distorted perspective, watermark'
    },
    {
        id: 'ex-food',
        icon: 'utensils',
        title: { zh: '美食摄影', en: 'Food Photo' },
        prompt: {
            zh: '木质桌面上的手工拉面，溏心蛋与葱花点缀，热气升腾，暖色调侧逆光，商业美食摄影',
            en: 'Handmade ramen on a wooden table, soft-boiled egg and scallions, rising steam, warm backlight, commercial food photography'
        },
        negative: 'plastic look, dull color, watermark, blurry'
    }
];

export const VIDEO_CAMERA_TAGS = [
    { id: 'dolly', label: { zh: '缓慢推进', en: 'Dolly In' }, tag: 'slow dolly in, cinematic camera movement' },
    { id: 'orbit', label: { zh: '环绕运镜', en: 'Orbit' }, tag: 'orbiting camera, smooth 360 degree rotation' },
    { id: 'aerial', label: { zh: '航拍俯瞰', en: 'Aerial' }, tag: 'aerial drone shot, top-down view' },
    { id: 'handheld', label: { zh: '手持跟拍', en: 'Handheld' }, tag: 'handheld follow shot, natural camera shake' },
    { id: 'static', label: { zh: '固定机位', en: 'Static' }, tag: 'static camera, locked-off shot' },
    { id: 'lowangle', label: { zh: '低角度', en: 'Low Angle' }, tag: 'low angle shot, dramatic perspective' },
    { id: 'pullback', label: { zh: '快速拉远', en: 'Pull Back' }, tag: 'fast pull back, reveal shot' },
    { id: 'pov', label: { zh: '第一视角', en: 'POV' }, tag: 'first person view, pov shot' }
];

export const VIDEO_MOOD_TAGS = [
    { id: 'cine', label: { zh: '电影感', en: 'Cinematic' }, tag: 'cinematic atmosphere, film grain, teal and orange grade' },
    { id: 'dream', label: { zh: '梦幻柔光', en: 'Dreamy' }, tag: 'dreamy soft light, pastel tones' },
    { id: 'docu', label: { zh: '纪实自然', en: 'Documentary' }, tag: 'documentary style, natural lighting' },
    { id: 'neon', label: { zh: '赛博霓虹', en: 'Neon Night' }, tag: 'neon cyberpunk, rain, night city' },
    { id: 'golden', label: { zh: '黄金时刻', en: 'Golden Hour' }, tag: 'golden hour, warm sunlight, long shadows' },
    { id: 'clean', label: { zh: '极简纯净', en: 'Minimal' }, tag: 'minimal, clean background, soft neutral light' }
];

export const VIDEO_EXAMPLES = [
    {
        id: 'vex-city',
        icon: 'building-2',
        title: { zh: '未来城市', en: 'Future City' },
        prompt: {
            zh: '镜头缓慢推进，未来城市天际线在黄昏中亮起灯火，飞行器穿梭于高楼之间，电影感氛围',
            en: 'Slow dolly in, futuristic city skyline lighting up at dusk, flying vehicles weaving between towers, cinematic atmosphere'
        }
    },
    {
        id: 'vex-nature',
        icon: 'waves',
        title: { zh: '自然风光', en: 'Nature' },
        prompt: {
            zh: '航拍镜头掠过碧蓝海岸线，浪花拍打礁石，阳光在水面闪烁，纪实自然风格',
            en: 'Aerial shot gliding over a turquoise coastline, waves crashing on rocks, sunlight shimmering on water, documentary style'
        }
    },
    {
        id: 'vex-portrait',
        icon: 'user',
        title: { zh: '人物特写', en: 'Portrait' },
        prompt: {
            zh: '固定机位的人物特写，柔和逆光勾勒轮廓发丝，轻微微风，眼神缓缓看向镜头',
            en: 'Locked-off close-up portrait, soft backlight tracing hair strands, gentle breeze, eyes slowly turning to camera'
        }
    },
    {
        id: 'vex-product',
        icon: 'package',
        title: { zh: '产品展示', en: 'Product Spin' },
        prompt: {
            zh: '极简背景下产品缓缓旋转，柔和摄影棚布光，细腻金属反光，商业广告质感',
            en: 'A product slowly rotating on a minimal background, soft studio lighting, refined metallic reflections, commercial quality'
        }
    },
    {
        id: 'vex-animal',
        icon: 'paw-print',
        title: { zh: '动物瞬间', en: 'Wildlife' },
        prompt: {
            zh: '低角度手持跟拍，一只小猫在草地上奔跑回望，阳光洒在毛发上，自然真实',
            en: 'Low angle handheld follow shot, a kitten running and looking back on grass, sunlight on its fur, natural and realistic'
        }
    }
];

export const DEFAULT_NEGATIVE = {
    zh: 'low quality, worst quality, blurry, bad anatomy, watermark, text',
    en: 'low quality, worst quality, blurry, bad anatomy, watermark, text'
};

/* ---------------- 参数说明（面向新手） ---------------- */

export const FIELD_HELP = {
    model: {
        zh: '决定画面整体风格的大模型（Checkpoint）。文件放在 ComfyUI 的 models/checkpoints 目录后这里才会出现。',
        en: 'The checkpoint that defines the overall look. It appears here once the file is inside ComfyUI\'s models/checkpoints folder.'
    },
    prompt: {
        zh: '用一句话描述你想要的画面，越具体越好：主体 + 动作/姿态 + 环境 + 光线 + 风格。英文关键词、逗号分隔效果最好。',
        en: 'Describe the shot in one sentence — the more specific the better: subject + pose + environment + lighting + style. Comma-separated English keywords work best.'
    },
    negativePrompt: {
        zh: '告诉模型「不要出现什么」。常用词可以直接点下方标签添加。',
        en: 'Tell the model what to avoid. Tap the chips below to insert common negative keywords.'
    },
    size: {
        zh: '出图的像素尺寸。数值越大越精细，但更吃显存、也更慢；建议保持 64 的倍数。',
        en: 'Output resolution in pixels. Larger = more detail but slower and heavier on VRAM. Keep values as multiples of 64.'
    },
    steps: {
        zh: '采样步数，相当于「打磨次数」。12~20 快，24~30 更稳，超过 40 通常肉眼差别不大但明显变慢。',
        en: 'How many refinement passes. 12–20 is fast, 24–30 is a good default, beyond 40 rarely looks better but is much slower.'
    },
    cfg: {
        zh: '提示词遵循强度。太低（1~4）会跑偏，5~8 最自然，太高（12+）容易过曝、颜色发硬。',
        en: 'How strictly the image follows your prompt. 1–4 drifts off, 5–8 looks natural, 12+ tends to over-saturate.'
    },
    sampler: {
        zh: '采样算法，决定「怎么打磨」。euler / euler_ancestral 最通用，dpmpp 系列细节更好。',
        en: 'The algorithm that refines the image. euler is a safe default; dpmpp variants usually give finer detail.'
    },
    scheduler: {
        zh: '每一轮打磨的节奏。normal 通用，karras 对比更强，simple 更干净。',
        en: 'The pacing of each step. normal is universal, karras adds contrast, simple looks cleaner.'
    },
    seed: {
        zh: '随机种子。相同种子 + 相同参数 = 完全一样的图；填 -1 每次随机。想微调就固定种子。',
        en: 'Random seed. Same seed + same settings = identical result. Use -1 for a new random value each run.'
    },
    batch: {
        zh: '一次生成几张。数量越多越吃显存，建议 1~4。',
        en: 'How many images per run. More images needs more VRAM; 1–4 is a safe range.'
    },
    videoModel: {
        zh: '视频扩散模型（UNET），决定画面的主体质量，例如 Wan 2.1 的 fp16 / 1.3B 版本。',
        en: 'The video diffusion model (UNET) that defines image quality, e.g. Wan 2.1 fp16 or the 1.3B variant.'
    },
    videoClip: {
        zh: '文本编码器，负责「读懂」你的提示词。Wan 系列一般搭配 UMT5。',
        en: 'The text encoder that interprets your prompt. Wan models usually pair with UMT5.'
    },
    videoVae: {
        zh: '视频 VAE，负责把模型内部数据还原成画面。要和扩散模型配套。',
        en: 'The VAE that decodes model data back into frames. It must match the diffusion model.'
    },
    duration: {
        zh: '视频时长（秒）。越长越吃显存、生成时间成倍增加，建议先用 3~5 秒试。',
        en: 'Clip length in seconds. Longer clips need much more VRAM and time — start with 3–5s.'
    },
    fps: {
        zh: '每秒帧数。12~16 够用，24 更流畅但生成量更大。',
        en: 'Frames per second. 12–16 is enough, 24 is smoother but heavier.'
    },
    workflowJson: {
        zh: '进阶用法：在 ComfyUI 里点「导出（API）」得到 JSON，粘贴到这里即可原样运行你的工作流。',
        en: 'Advanced: export your graph with "Export (API)" in ComfyUI and paste the JSON here to run it as-is.'
    }
};

/* ---------------- 画幅 / 档位预设 ---------------- */

export const IMAGE_SIZE_PRESETS = [
    { id: 'square', label: { zh: '1:1 方图', en: '1:1 Square' }, width: 1024, height: 1024 },
    { id: 'portrait', label: { zh: '3:4 竖版', en: '3:4 Portrait' }, width: 896, height: 1152 },
    { id: 'landscape', label: { zh: '4:3 横版', en: '4:3 Landscape' }, width: 1152, height: 896 },
    { id: 'wide', label: { zh: '16:9 宽屏', en: '16:9 Wide' }, width: 1344, height: 768 },
    { id: 'tall', label: { zh: '9:16 竖屏', en: '9:16 Tall' }, width: 768, height: 1344 }
];

export const VIDEO_SIZE_PRESETS = [
    { id: 'v-wide', label: { zh: '16:9 横屏', en: '16:9 Landscape' }, width: 832, height: 480 },
    { id: 'v-tall', label: { zh: '9:16 竖屏', en: '9:16 Portrait' }, width: 480, height: 832 },
    { id: 'v-square', label: { zh: '1:1 方形', en: '1:1 Square' }, width: 720, height: 720 },
    { id: 'v-cine', label: { zh: '2.4:1 电影', en: '2.4:1 Cinema' }, width: 960, height: 400 }
];

export const IMAGE_QUALITY_PRESETS = [
    { id: 'draft', label: { zh: '草稿预览', en: 'Draft' }, hint: { zh: '最快，用来试构图', en: 'Fastest, for layout tests' }, steps: 12, cfg: 5, width: 512, height: 512 },
    { id: 'standard', label: { zh: '标准', en: 'Standard' }, hint: { zh: '画质与速度均衡', en: 'Balanced quality & speed' }, steps: 24, cfg: 7, width: 1024, height: 1024 },
    { id: 'fine', label: { zh: '精细', en: 'Fine' }, hint: { zh: '细节最好，耗时更久', en: 'Best detail, slower' }, steps: 36, cfg: 7.5, width: 1024, height: 1024 }
];

export const VIDEO_QUALITY_PRESETS = [
    { id: 'v-draft', label: { zh: '快速试拍', en: 'Quick Test' }, hint: { zh: '3 秒小尺寸，先验证流程', en: '3s small clip to verify' }, steps: 8, cfg: 5, duration: 3, fps: 12, width: 512, height: 320 },
    { id: 'v-standard', label: { zh: '标准', en: 'Standard' }, hint: { zh: '5 秒 16:9，常用出片', en: '5s 16:9, everyday use' }, steps: 20, cfg: 6, duration: 5, fps: 16, width: 832, height: 480 },
    { id: 'v-fine', label: { zh: '精细', en: 'Fine' }, hint: { zh: '8 秒更高画质，很吃显存', en: '8s higher quality, VRAM heavy' }, steps: 30, cfg: 6.5, duration: 8, fps: 16, width: 960, height: 544 }
];

export const PROMPT_TIPS = [
    { zh: '按「主体 → 动作 → 环境 → 光线 → 风格」的顺序写，模型更容易理解。', en: 'Write in order: subject → action → environment → lighting → style.' },
    { zh: '正面词控制在 40~80 个词最佳，堆太多反而互相稀释。', en: 'Around 40–80 words works best; overloading dilutes each keyword.' },
    { zh: '想要固定构图就固定种子，只改提示词，方便对比效果。', en: 'Lock the seed to compare prompt changes on the same composition.' }
];

export function pickText(value, lang) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    return value[lang] || value.zh || value.en || '';
}
