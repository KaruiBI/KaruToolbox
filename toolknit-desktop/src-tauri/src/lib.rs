use tauri::Manager;
use std::sync::{Mutex, OnceLock};

#[cfg(target_os = "windows")]
static WINDOWS_SYSTEM_PROFILE: OnceLock<Result<WindowsSystemProfile, String>> = OnceLock::new();
#[cfg(target_os = "windows")]
static CPU_TIME_SAMPLE: OnceLock<Mutex<Option<(u64, u64)>>> = OnceLock::new();

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct CpuStatus {
    name: String,
    logical_cores: usize,
    physical_cores: Option<usize>,
    usage_percent: f32,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct MemoryStatus {
    total_bytes: u64,
    used_bytes: u64,
    usage_percent: f32,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct GpuStatus {
    name: String,
    vendor: String,
    dedicated_memory_bytes: Option<u64>,
    used_memory_bytes: Option<u64>,
    utilization_percent: Option<f32>,
    temperature_celsius: Option<f32>,
    driver_version: Option<String>,
    runtime_source: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemStatus {
    os_name: String,
    cpu: CpuStatus,
    memory: MemoryStatus,
    gpus: Vec<GpuStatus>,
    captured_at_ms: u128,
}

#[cfg(target_os = "windows")]
#[derive(Clone)]
struct WindowsSystemProfile {
    os_name: String,
    cpu_name: String,
    logical_cores: usize,
    physical_cores: Option<usize>,
    gpus: Vec<GpuStatus>,
}

fn gpu_vendor(name: &str) -> String {
    let value = name.to_ascii_lowercase();
    if value.contains("nvidia") || value.contains("geforce") || value.contains("quadro") {
        "NVIDIA".to_string()
    } else if value.contains("amd") || value.contains("radeon") {
        "AMD".to_string()
    } else if value.contains("intel") || value.contains("arc") {
        "Intel".to_string()
    } else {
        "Unknown".to_string()
    }
}

#[cfg(target_os = "windows")]
fn hidden_command(program: &str) -> std::process::Command {
    use std::os::windows::process::CommandExt;
    let mut command = std::process::Command::new(program);
    command.creation_flags(0x08000000);
    command
}

#[cfg(not(target_os = "windows"))]
fn hidden_command(program: &str) -> std::process::Command {
    std::process::Command::new(program)
}

fn query_nvidia_gpus() -> Vec<GpuStatus> {
    let output = match hidden_command("nvidia-smi")
        .args([
            "--query-gpu=name,memory.total,memory.used,utilization.gpu,temperature.gpu,driver_version",
            "--format=csv,noheader,nounits",
        ])
        .output()
    {
        Ok(output) if output.status.success() => output,
        _ => return Vec::new(),
    };
    String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter_map(|line| {
            let values: Vec<&str> = line.split(',').map(str::trim).collect();
            if values.len() < 6 { return None; }
            let total_mib = values[1].parse::<u64>().ok();
            let used_mib = values[2].parse::<u64>().ok();
            Some(GpuStatus {
                name: values[0].to_string(),
                vendor: "NVIDIA".to_string(),
                dedicated_memory_bytes: total_mib.map(|value| value * 1024 * 1024),
                used_memory_bytes: used_mib.map(|value| value * 1024 * 1024),
                utilization_percent: values[3].parse::<f32>().ok(),
                temperature_celsius: values[4].parse::<f32>().ok(),
                driver_version: Some(values[5].to_string()),
                runtime_source: "nvidia-smi".to_string(),
            })
        })
        .collect()
}

#[cfg(target_os = "windows")]
fn query_windows_profile() -> Result<WindowsSystemProfile, String> {
    let script = r#"[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); $cpu=Get-CimInstance Win32_Processor | Select-Object -First 1; $os=Get-CimInstance Win32_OperatingSystem; $gpus=@(Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM,DriverVersion); [pscustomobject]@{OsName=($os.Caption+' '+$os.Version);CpuName=$cpu.Name;LogicalCores=$cpu.NumberOfLogicalProcessors;PhysicalCores=$cpu.NumberOfCores;Gpus=$gpus} | ConvertTo-Json -Compress -Depth 4"#;
    let output = match hidden_command("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .output()
    {
        Ok(output) if output.status.success() => output,
        Ok(output) => return Err(String::from_utf8_lossy(&output.stderr).trim().to_string()),
        Err(error) => return Err(error.to_string()),
    };
    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("Invalid system information: {}", error))?;
    let gpu_json = json.get("Gpus").cloned().unwrap_or(serde_json::Value::Array(Vec::new()));
    let gpu_items = match gpu_json {
        serde_json::Value::Array(items) => items,
        serde_json::Value::Object(_) => vec![gpu_json],
        _ => Vec::new(),
    };
    let gpus = gpu_items.into_iter().filter_map(|item| {
        let name = item.get("Name")?.as_str()?.trim().to_string();
        if name.is_empty() { return None; }
        Some(GpuStatus {
            vendor: gpu_vendor(&name),
            name,
            dedicated_memory_bytes: item.get("AdapterRAM").and_then(|value| value.as_u64()),
            used_memory_bytes: None,
            utilization_percent: None,
            temperature_celsius: None,
            driver_version: item.get("DriverVersion").and_then(|value| value.as_str()).map(str::to_string),
            runtime_source: "windows-cim".to_string(),
        })
    }).collect();
    Ok(WindowsSystemProfile {
        os_name: json.get("OsName").and_then(|value| value.as_str()).unwrap_or_default().trim().to_string(),
        cpu_name: json.get("CpuName").and_then(|value| value.as_str()).unwrap_or_default().trim().to_string(),
        logical_cores: json.get("LogicalCores").and_then(|value| value.as_u64()).unwrap_or(0) as usize,
        physical_cores: json.get("PhysicalCores").and_then(|value| value.as_u64()).map(|value| value as usize),
        gpus,
    })
}

#[cfg(target_os = "windows")]
fn filetime_value(value: windows::Win32::Foundation::FILETIME) -> u64 {
    ((value.dwHighDateTime as u64) << 32) | value.dwLowDateTime as u64
}

#[cfg(target_os = "windows")]
fn windows_cpu_usage() -> f32 {
    use windows::Win32::Foundation::FILETIME;
    use windows::Win32::System::Threading::GetSystemTimes;
    let mut idle = FILETIME::default();
    let mut kernel = FILETIME::default();
    let mut user = FILETIME::default();
    if unsafe { GetSystemTimes(Some(&mut idle), Some(&mut kernel), Some(&mut user)) }.is_err() {
        return 0.0;
    }
    let idle_now = filetime_value(idle);
    let total_now = filetime_value(kernel).saturating_add(filetime_value(user));
    let sample = CPU_TIME_SAMPLE.get_or_init(|| Mutex::new(None));
    let mut previous = match sample.lock() { Ok(value) => value, Err(_) => return 0.0 };
    let (idle_delta, total_delta) = previous
        .map(|(old_idle, old_total)| (idle_now.saturating_sub(old_idle), total_now.saturating_sub(old_total)))
        .unwrap_or((idle_now, total_now));
    *previous = Some((idle_now, total_now));
    if total_delta == 0 { 0.0 } else {
        ((total_delta.saturating_sub(idle_delta)) as f64 / total_delta as f64 * 100.0).clamp(0.0, 100.0) as f32
    }
}

#[cfg(target_os = "windows")]
fn windows_memory_status() -> Result<MemoryStatus, String> {
    use windows::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};
    let mut status = MEMORYSTATUSEX::default();
    status.dwLength = std::mem::size_of::<MEMORYSTATUSEX>() as u32;
    unsafe { GlobalMemoryStatusEx(&mut status) }.map_err(|error| error.to_string())?;
    let used = status.ullTotalPhys.saturating_sub(status.ullAvailPhys);
    Ok(MemoryStatus {
        total_bytes: status.ullTotalPhys,
        used_bytes: used,
        usage_percent: status.dwMemoryLoad as f32,
    })
}

#[cfg(target_os = "windows")]
fn query_windows_system() -> Result<SystemStatus, String> {
    let profile = WINDOWS_SYSTEM_PROFILE.get_or_init(query_windows_profile).clone()?;
    Ok(SystemStatus {
        os_name: profile.os_name,
        cpu: CpuStatus {
            name: profile.cpu_name,
            logical_cores: profile.logical_cores,
            physical_cores: profile.physical_cores,
            usage_percent: windows_cpu_usage(),
        },
        memory: windows_memory_status()?,
        gpus: profile.gpus,
        captured_at_ms: current_time_millis(),
    })
}

#[cfg(not(target_os = "windows"))]
fn query_windows_system() -> Result<SystemStatus, String> {
    let logical_cores = std::thread::available_parallelism().map(|value| value.get()).unwrap_or(0);
    Ok(SystemStatus {
        os_name: std::env::consts::OS.to_string(),
        cpu: CpuStatus { name: String::new(), logical_cores, physical_cores: None, usage_percent: 0.0 },
        memory: MemoryStatus { total_bytes: 0, used_bytes: 0, usage_percent: 0.0 },
        gpus: Vec::new(),
        captured_at_ms: current_time_millis(),
    })
}

fn current_time_millis() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

fn collect_system_status() -> Result<SystemStatus, String> {
    let mut status = query_windows_system()?;
    let nvidia_gpus = query_nvidia_gpus();
    if !nvidia_gpus.is_empty() {
        status.gpus = nvidia_gpus;
    }
    status.captured_at_ms = current_time_millis();
    Ok(status)
}

#[tauri::command]
async fn get_system_status() -> Result<SystemStatus, String> {
    tauri::async_runtime::spawn_blocking(collect_system_status)
        .await
        .map_err(|error| error.to_string())?
}

/// Read the installer language at startup (from install_lang.txt).
/// Returns "zh" or "en", defaulting to "zh" on any error.
fn read_initial_lang() -> String {
    let exe = match std::env::current_exe() {
        Ok(e) => e,
        Err(_) => return "zh".to_string(),
    };
    let dir = match exe.parent() {
        Some(d) => d,
        None => return "zh".to_string(),
    };
    let lang_file = dir.join("install_lang.txt");
    match std::fs::read_to_string(&lang_file) {
        Ok(content) => {
            match content.trim().parse::<u32>() {
                Ok(2052) => "zh".to_string(),
                _ => "en".to_string(),
            }
        }
        Err(_) => "zh".to_string(),
    }
}

/// Build the tray menu with labels in the given language.
fn build_tray_menu(app: &tauri::AppHandle, lang: &str) -> Result<tauri::menu::Menu<tauri::Wry>, tauri::Error> {
    let (show_text, quit_text) = if lang == "zh" {
        ("\u{663e}\u{793a}\u{4e3b}\u{7a0b}\u{5e8f}", "\u{9000}\u{51fa} Karui 工具箱")
    } else {
        ("Show Karui 工具箱", "Quit Karui 工具箱")
    };
    let show_i = tauri::menu::MenuItem::with_id(app, "show", show_text, true, None::<&str>)?;
    let quit_i = tauri::menu::MenuItem::with_id(app, "quit", quit_text, true, None::<&str>)?;
    tauri::menu::Menu::with_items(app, &[&show_i, &quit_i])
}

#[tauri::command]
fn set_tray_lang(app: tauri::AppHandle, lang: String) -> Result<(), String> {
    let menu = build_tray_menu(&app, &lang).map_err(|e| e.to_string())?;
    if let Some(tray) = app.tray_by_id("main-tray") {
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
  let parsed = url::Url::parse(&url).map_err(|e| format!("Invalid URL: {}", e))?;
  match parsed.scheme() {
    "http" | "https" => {
      let _ = opener::open(&url);
      Ok(())
    }
    _ => Err(format!("Unsupported URL scheme: {}", parsed.scheme())),
  }
}

#[tauri::command]
fn get_documents_dir() -> Result<String, String> {
    let dir = dirs::document_dir().ok_or("Cannot find Documents folder")?;
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
fn get_download_dir() -> Result<String, String> {
    let dir = dirs::download_dir().ok_or("Cannot find Downloads folder")?;
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
fn get_install_lang() -> Result<String, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let dir = exe.parent().ok_or("Cannot find exe directory")?;
    let lang_file = dir.join("install_lang.txt");
    let content = std::fs::read_to_string(&lang_file).map_err(|e| e.to_string())?;
    let lang_id: u32 = content.trim().parse::<u32>().map_err(|e| e.to_string())?;
    // NSIS language IDs: 1033 = English, 2052 = Simplified Chinese
    match lang_id {
        2052 => Ok("zh".to_string()),
        _ => Ok("en".to_string()),
    }
}

#[derive(serde::Serialize)]
struct InstallConfig {
    language: String,
    install_path: String,
}

fn get_storage_override() -> Option<String> {
    let config_file = dirs::data_local_dir()?
        .join("KaruiToolbox")
        .join("storage_config.json");
    let content = std::fs::read_to_string(config_file).ok()?;
    let config: serde_json::Value = serde_json::from_str(&content).ok()?;
    config.get("storagePath")
        .and_then(|value| value.as_str())
        .filter(|path| !path.trim().is_empty())
        .map(str::to_string)
}

#[tauri::command]
fn set_storage_path(path: String) -> Result<String, String> {
    let trimmed = path.trim();
    let storage_path = std::path::PathBuf::from(trimmed);
    if trimmed.is_empty() || !storage_path.is_absolute() {
        return Err("存储位置必须是有效的绝对路径".to_string());
    }
    std::fs::create_dir_all(&storage_path).map_err(|e| format!("无法创建存储目录: {}", e))?;

    let config_dir = dirs::data_local_dir()
        .ok_or("Cannot find local data directory")?
        .join("KaruiToolbox");
    std::fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    let content = serde_json::to_string_pretty(&serde_json::json!({ "storagePath": trimmed }))
        .map_err(|e| e.to_string())?;
    std::fs::write(config_dir.join("storage_config.json"), content).map_err(|e| e.to_string())?;
    Ok(storage_path.to_string_lossy().to_string())
}

#[tauri::command]
fn get_install_config() -> Result<InstallConfig, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let dir = exe.parent().ok_or("Cannot find exe directory")?;
    
    // Search for install_config.json in exe dir, then parent dirs (up to 3 levels)
    let mut config_file = None;
    let mut search_dir = dir;
    for _ in 0..4 {
        let candidate = search_dir.join("install_config.json");
        if candidate.exists() {
            config_file = Some(candidate);
            break;
        }
        match search_dir.parent() {
            Some(p) => search_dir = p,
            None => break,
        }
    }
    
    // Fallback: return defaults if install_config.json not found (e.g. running without installer)
    if config_file.is_none() {
        let default_path = dirs::document_dir()
            .map(|d| d.join("Karui 工具箱").to_string_lossy().to_string())
            .unwrap_or_default();
        return Ok(InstallConfig {
            language: "zh".to_string(),
            install_path: get_storage_override().unwrap_or(default_path),
        });
    }
    
    let config_file = config_file.unwrap();
    let content = std::fs::read_to_string(&config_file)
        .map_err(|e| format!("Cannot read install_config.json: {}", e))?;
    let config: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Cannot parse install_config.json: {}", e))?;
    let language = config.get("language")
        .and_then(|v| v.as_str())
        .unwrap_or("en")
        .to_string();
    let install_path = get_storage_override().unwrap_or_else(|| config.get("installPath")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string());
    Ok(InstallConfig { language, install_path })
}

// ===== 内置 AI 引擎：统一数据目录（KARUI-AI-NODE-STUDIO-PLAN 阶段 A） =====
//
// 目录布局（8.1）：
//   <存储位置>\AI\runtime\comfyui-<版本>\     引擎，可整体替换
//   <存储位置>\AI\data\models\...             模型，升级不移动
//   <存储位置>\AI\data\{custom_nodes,input,output,temp,user}
//   <存储位置>\AI\{cache,logs,manifests}

const AI_CATALOG_JSON: &str = include_str!("../ai-catalog/runtimes.json");

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct AiModelPaths {
    checkpoints: String,
    diffusion_models: String,
    text_encoders: String,
    vae: String,
    clip_projections: String,
    loras: String,
    controlnet: String,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct AiPaths {
    ai_root: String,
    runtime: String,
    data: String,
    models: AiModelPaths,
    custom_nodes: String,
    input: String,
    output: String,
    temp: String,
    user: String,
    cache: String,
    logs: String,
    manifests: String,
}

/// 统一 AI 根目录：优先用户在设置里选的存储位置，其次安装配置，最后文档目录。
fn resolve_ai_root() -> Result<std::path::PathBuf, String> {
    let base = match get_storage_override() {
        Some(path) if !path.trim().is_empty() => std::path::PathBuf::from(path.trim()),
        _ => {
            let install_path = get_install_config()?.install_path;
            if install_path.trim().is_empty() {
                dirs::document_dir()
                    .ok_or("找不到文档目录，无法确定 AI 存储位置".to_string())?
                    .join("Karui 工具箱")
            } else {
                std::path::PathBuf::from(install_path.trim())
            }
        }
    };
    Ok(base.join("AI"))
}

fn ensure_ai_dirs() -> Result<AiPaths, String> {
    let root = resolve_ai_root()?;
    let sub = |segments: &[&str]| -> std::path::PathBuf {
        let mut path = root.clone();
        for segment in segments {
            path.push(segment);
        }
        path
    };

    let paths = AiPaths {
        ai_root: root.to_string_lossy().to_string(),
        runtime: sub(&["runtime"]).to_string_lossy().to_string(),
        data: sub(&["data"]).to_string_lossy().to_string(),
        models: AiModelPaths {
            checkpoints: sub(&["data", "models", "checkpoints"]).to_string_lossy().to_string(),
            diffusion_models: sub(&["data", "models", "diffusion_models"]).to_string_lossy().to_string(),
            text_encoders: sub(&["data", "models", "text_encoders"]).to_string_lossy().to_string(),
            vae: sub(&["data", "models", "vae"]).to_string_lossy().to_string(),
            clip_projections: sub(&["data", "models", "clip_projections"]).to_string_lossy().to_string(),
            loras: sub(&["data", "models", "loras"]).to_string_lossy().to_string(),
            controlnet: sub(&["data", "models", "controlnet"]).to_string_lossy().to_string(),
        },
        custom_nodes: sub(&["data", "custom_nodes"]).to_string_lossy().to_string(),
        input: sub(&["data", "input"]).to_string_lossy().to_string(),
        output: sub(&["data", "output"]).to_string_lossy().to_string(),
        temp: sub(&["data", "temp"]).to_string_lossy().to_string(),
        user: sub(&["data", "user"]).to_string_lossy().to_string(),
        cache: sub(&["cache"]).to_string_lossy().to_string(),
        logs: sub(&["logs"]).to_string_lossy().to_string(),
        manifests: sub(&["manifests"]).to_string_lossy().to_string(),
    };

    let all = [
        paths.runtime.as_str(),
        paths.data.as_str(),
        paths.models.checkpoints.as_str(),
        paths.models.diffusion_models.as_str(),
        paths.models.text_encoders.as_str(),
        paths.models.vae.as_str(),
        paths.models.clip_projections.as_str(),
        paths.models.loras.as_str(),
        paths.models.controlnet.as_str(),
        paths.custom_nodes.as_str(),
        paths.input.as_str(),
        paths.output.as_str(),
        paths.temp.as_str(),
        paths.user.as_str(),
        paths.cache.as_str(),
        paths.logs.as_str(),
        paths.manifests.as_str(),
    ];
    for dir in all {
        std::fs::create_dir_all(dir).map_err(|e| format!("无法创建 AI 目录 {}: {}", dir, e))?;
    }
    Ok(paths)
}

#[tauri::command]
fn get_ai_paths() -> Result<AiPaths, String> {
    ensure_ai_dirs()
}

/// 内置运行时清单（随程序分发的 catalog，不含用户实际安装状态）
#[tauri::command]
fn list_ai_runtime_catalog() -> Result<serde_json::Value, String> {
    serde_json::from_str(AI_CATALOG_JSON).map_err(|e| format!("内置运行时清单解析失败: {}", e))
}

/// 统一目录 + 清单 + 已安装运行时记录（manifests/runtime-installed.json）
#[tauri::command]
fn get_ai_runtime_state() -> Result<serde_json::Value, String> {
    let paths = ensure_ai_dirs()?;
    let installed_file = std::path::PathBuf::from(&paths.manifests).join("runtime-installed.json");
    let installed = std::fs::read_to_string(&installed_file)
        .ok()
        .and_then(|content| serde_json::from_str::<serde_json::Value>(&content).ok());
    let catalog: serde_json::Value =
        serde_json::from_str(AI_CATALOG_JSON).map_err(|e| format!("内置运行时清单解析失败: {}", e))?;
    Ok(serde_json::json!({
        "paths": paths,
        "catalog": catalog,
        "installed": installed,
    }))
}

/// 内置运行时：下载 / 校验 / 解压 / 切换 / 回滚 / 启动（阶段 A 第 4 步）
static AI_RUNTIME_CANCEL: AtomicBool = AtomicBool::new(false);

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct AiRuntimeProgress {
    runtime_id: String,
    phase: String,
    downloaded_bytes: u64,
    total_bytes: u64,
    message: String,
}

fn emit_runtime_progress(app: &tauri::AppHandle, payload: AiRuntimeProgress) {
    use tauri::Emitter;
    let _ = app.emit("ai-runtime-install-progress", payload);
}

fn catalog_runtime(catalog: &serde_json::Value, runtime_id: &str) -> Result<serde_json::Value, String> {
    catalog
        .get("runtimes")
        .and_then(|value| value.as_array())
        .and_then(|list| {
            list.iter()
                .find(|item| item.get("id").and_then(|v| v.as_str()) == Some(runtime_id))
                .cloned()
        })
        .ok_or_else(|| format!("未找到运行时 {}", runtime_id))
}

fn catalog_variant(runtime: &serde_json::Value, mode: &str) -> Result<serde_json::Value, String> {
    runtime
        .get("variants")
        .and_then(|value| value.as_array())
        .and_then(|list| {
            list.iter()
                .find(|item| item.get("mode").and_then(|v| v.as_str()) == Some(mode))
                .cloned()
        })
        .ok_or_else(|| format!("运行时 {} 不支持 {} 方式", runtime.get("id").and_then(|v| v.as_str()).unwrap_or("?"), mode))
}

fn sha256_file(path: &std::path::Path) -> Result<String, String> {
    use sha2::{Digest, Sha256};
    let mut file = std::fs::File::open(path).map_err(|e| format!("无法打开文件: {}", e))?;
    let mut hasher = Sha256::new();
    std::io::copy(&mut file, &mut hasher).map_err(|e| format!("读取文件失败: {}", e))?;
    Ok(format!("{:x}", hasher.finalize()))
}

/// 在线安装前解析最新 release：返回（下载地址、体积、sha256）
async fn resolve_latest_asset(api_url: &str, asset_name: &str) -> Option<(String, Option<u64>, Option<String>)> {
    let client = build_download_client(None).ok()?;
    let response = client
        .get(api_url)
        .header("User-Agent", "KaruiToolbox")
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .ok()?;
    if !response.status().is_success() {
        return None;
    }
    let payload: serde_json::Value = response.json().await.ok()?;
    let assets = payload.get("assets")?.as_array()?;
    let asset = assets
        .iter()
        .find(|item| item.get("name").and_then(|v| v.as_str()) == Some(asset_name))?;
    let url = asset.get("browser_download_url")?.as_str()?.to_string();
    let size = asset.get("size").and_then(|v| v.as_u64());
    let sha256 = asset
        .get("digest")
        .and_then(|v| v.as_str())
        .and_then(|digest| digest.strip_prefix("sha256:"))
        .map(str::to_string);
    Some((url, size, sha256))
}

/// 运行时下载：多源测速 + 多连接分片并发，缓解 GitHub 单连接限速
const RUNTIME_DOWNLOAD_PARTS: usize = 4;
const RUNTIME_PARALLEL_MIN_BYTES: u64 = 24 * 1024 * 1024;
const RUNTIME_PROBE_BYTES: u64 = 1024 * 1024;

/// 国内常见的 GitHub 加速前缀；只用于提速，下载完仍按 sha256 校验
const GITHUB_MIRROR_PREFIXES: [&str; 3] = [
    "https://ghfast.top/",
    "https://gh-proxy.com/",
    "https://ghproxy.net/",
];

#[derive(Clone)]
struct RuntimeSource {
    url: String,
    proxy: Option<String>,
    label: String,
}

fn push_runtime_source(sources: &mut Vec<RuntimeSource>, candidate: RuntimeSource) {
    if !sources
        .iter()
        .any(|item| item.url == candidate.url && item.proxy == candidate.proxy)
    {
        sources.push(candidate);
    }
}

fn runtime_download_sources(url: &str) -> Vec<RuntimeSource> {
    let mut sources: Vec<RuntimeSource> = Vec::new();
    let env_proxy = ["HTTPS_PROXY", "https_proxy", "ALL_PROXY", "all_proxy"]
        .iter()
        .find_map(|key| std::env::var(key).ok().filter(|value| !value.trim().is_empty()));
    push_runtime_source(&mut sources, RuntimeSource {
        url: url.to_string(),
        proxy: env_proxy,
        label: "GitHub 直连".to_string(),
    });
    for port in ["7890", "10809", "1080"] {
        push_runtime_source(&mut sources, RuntimeSource {
            url: url.to_string(),
            proxy: Some(format!("http://127.0.0.1:{port}")),
            label: format!("本地代理 {}", port),
        });
    }
    for prefix in GITHUB_MIRROR_PREFIXES {
        push_runtime_source(&mut sources, RuntimeSource {
            url: format!("{}{}", prefix, url),
            proxy: None,
            label: "国内加速镜像".to_string(),
        });
    }
    sources
}

fn build_runtime_probe_client(proxy: Option<&str>) -> Result<reqwest::Client, String> {
    let mut builder = reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(10))
        .timeout(std::time::Duration::from_secs(25))
        .redirect(reqwest::redirect::Policy::limited(10));
    if let Some(addr) = proxy {
        let proxy = reqwest::Proxy::all(addr).map_err(|e| e.to_string())?;
        builder = builder.proxy(proxy);
    }
    builder.build().map_err(|e| e.to_string())
}

/// 探测某个源：返回（文件大小、是否支持分片、测速结果 bytes/s）
async fn probe_runtime_source(source: &RuntimeSource) -> Result<(u64, bool, f64), String> {
    let client = build_runtime_probe_client(source.proxy.as_deref())?;
    let started = std::time::Instant::now();
    let mut response = client
        .get(&source.url)
        .header(reqwest::header::RANGE, format!("bytes=0-{}", RUNTIME_PROBE_BYTES - 1))
        .send()
        .await
        .map_err(|error| format!("{}", error))?;
    let status = response.status();
    if !status.is_success() && status != reqwest::StatusCode::PARTIAL_CONTENT {
        return Err(format!("HTTP {}", status));
    }
    let supports_range = status == reqwest::StatusCode::PARTIAL_CONTENT;
    let total = if supports_range {
        response
            .headers()
            .get(reqwest::header::CONTENT_RANGE)
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.rsplit('/').next())
            .and_then(|value| value.trim().parse::<u64>().ok())
            .unwrap_or(0)
    } else {
        response.content_length().unwrap_or(0)
    };
    if total == 0 {
        return Err("未获取到文件大小".to_string());
    }
    let mut bytes = 0u64;
    while let Some(chunk) = response.chunk().await.map_err(|error| format!("{}", error))? {
        bytes += chunk.len() as u64;
        if bytes >= RUNTIME_PROBE_BYTES || started.elapsed() > std::time::Duration::from_secs(6) {
            break;
        }
    }
    let seconds = started.elapsed().as_secs_f64().max(0.001);
    Ok((total, supports_range, bytes as f64 / seconds))
}

/// 下载一个分片；源轮转使用，任何源成功即返回
async fn download_runtime_part(
    index: usize,
    sources: Vec<RuntimeSource>,
    target: std::path::PathBuf,
    start: u64,
    end: u64,
    total: u64,
    written_before: u64,
    progress: std::sync::Arc<std::sync::atomic::AtomicU64>,
    state: std::sync::Arc<std::sync::Mutex<Vec<u64>>>,
) -> Result<(), String> {
    use std::io::{Seek, SeekFrom, Write};
    let expected = end - start + 1;
    let mut last_error = String::new();

    for source in &sources {
        if AI_RUNTIME_CANCEL.load(Ordering::SeqCst) {
            return Err("已取消运行时下载".to_string());
        }
        let resume_at = start + written_before;
        if resume_at > end {
            return Ok(());
        }
        let client = match build_download_client(source.proxy.as_deref()) {
            Ok(value) => value,
            Err(error) => {
                last_error = error;
                continue;
            }
        };
        let response = match client
            .get(&source.url)
            .header(reqwest::header::RANGE, format!("bytes={}-{}", resume_at, end))
            .send()
            .await
        {
            Ok(value) => value,
            Err(error) => {
                last_error = format!("{}: {}", source.label, error);
                continue;
            }
        };
        let status = response.status();
        // 服务器必须按 Range 返回，否则会写到错误的位置把包写坏
        let full_file_requested = resume_at == 0 && end == total - 1;
        if status != reqwest::StatusCode::PARTIAL_CONTENT
            && !(full_file_requested && status.is_success())
        {
            last_error = format!("{}: 不支持断点下载（HTTP {}）", source.label, status);
            continue;
        }
        if resume_at > start {
            let actual_start = response
                .headers()
                .get(reqwest::header::CONTENT_RANGE)
                .and_then(|value| value.to_str().ok())
                .and_then(|value| value.split(' ').nth(1))
                .and_then(|value| value.split('-').next())
                .and_then(|value| value.trim().parse::<u64>().ok());
            match actual_start {
                Some(offset) if offset == resume_at => {}
                _ => {
                    last_error = format!("{}: 断点位置不匹配", source.label);
                    continue;
                }
            }
        }
        let mut response = response;
        let mut file = std::fs::OpenOptions::new()
            .write(true)
            .open(&target)
            .map_err(|error| format!("无法写入下载文件: {}", error))?;
        file.seek(SeekFrom::Start(resume_at))
            .map_err(|error| format!("无法定位写入位置: {}", error))?;

        let mut written = 0u64;
        let mut since_state_update = 0u64;
        let mut failed = false;
        loop {
            match response.chunk().await {
                Ok(Some(chunk)) => {
                    if AI_RUNTIME_CANCEL.load(Ordering::SeqCst) {
                        if let Ok(mut guard) = state.lock() {
                            guard[index] = written_before + written;
                        }
                        return Err("已取消运行时下载".to_string());
                    }
                    if let Err(error) = file.write_all(&chunk) {
                        return Err(format!("写入失败: {}", error));
                    }
                    written += chunk.len() as u64;
                    since_state_update += chunk.len() as u64;
                    progress.fetch_add(chunk.len() as u64, Ordering::SeqCst);
                    if since_state_update >= 4 * 1024 * 1024 {
                        since_state_update = 0;
                        if let Ok(mut guard) = state.lock() {
                            guard[index] = written_before + written;
                        }
                    }
                    if written_before + written >= expected {
                        break;
                    }
                }
                Ok(None) => break,
                Err(error) => {
                    last_error = format!("{}: {}", source.label, error);
                    failed = true;
                    break;
                }
            }
        }
        drop(file);
        if let Ok(mut guard) = state.lock() {
            guard[index] = written_before + written;
        }
        if !failed && written_before + written >= expected {
            return Ok(());
        }
    }
    Err(format!("分片下载失败：{}", last_error))
}

fn human_bytes(bytes: u64) -> String {
    const UNITS: [&str; 5] = ["B", "KB", "MB", "GB", "TB"];
    let mut value = bytes as f64;
    let mut unit_index = 0usize;
    while value >= 1024.0 && unit_index < UNITS.len() - 1 {
        value /= 1024.0;
        unit_index += 1;
    }
    if unit_index == 0 {
        format!("{} {}", bytes, UNITS[unit_index])
    } else {
        format!("{:.1} {}", value, UNITS[unit_index])
    }
}

/// 分片进度记录，用于断点续传
fn runtime_state_path(target: &std::path::Path) -> std::path::PathBuf {
    std::path::PathBuf::from(format!("{}.state.json", target.to_string_lossy()))
}

fn load_runtime_state(target: &std::path::Path, url: &str, size: u64, parts: usize) -> Vec<u64> {
    let path = runtime_state_path(target);
    let Ok(content) = std::fs::read_to_string(&path) else {
        return vec![0u64; parts];
    };
    let Ok(value) = serde_json::from_str::<serde_json::Value>(&content) else {
        return vec![0u64; parts];
    };
    // 下载地址或文件大小变了，说明不是同一个文件，不能接着下
    if value.get("url").and_then(|v| v.as_str()) != Some(url)
        || value.get("size").and_then(|v| v.as_u64()) != Some(size)
    {
        return vec![0u64; parts];
    }
    let Some(list) = value.get("parts").and_then(|v| v.as_array()) else {
        return vec![0u64; parts];
    };
    if list.len() != parts {
        return vec![0u64; parts];
    }
    list.iter()
        .map(|item| item.get("written").and_then(|v| v.as_u64()).unwrap_or(0))
        .collect()
}

fn save_runtime_state(
    target: &std::path::Path,
    url: &str,
    size: u64,
    ranges: &[(u64, u64)],
    written: &[u64],
) {
    let payload = serde_json::json!({
        "url": url,
        "size": size,
        "updatedAt": chrono_like_now(),
        "parts": ranges
            .iter()
            .enumerate()
            .map(|(index, range)| serde_json::json!({
                "start": range.0,
                "end": range.1,
                "written": written.get(index).copied().unwrap_or(0),
            }))
            .collect::<Vec<_>>(),
    });
    if let Ok(content) = serde_json::to_string_pretty(&payload) {
        let _ = std::fs::write(runtime_state_path(target), content);
    }
}

/// 下载运行时包。返回（文件大小、实际使用的下载地址）。
/// 一次下载只走同一个源：不同镜像可能缓存着不同版本，混着分片会拼出坏文件。
/// `excluded` 用于在上一次校验失败后换源重下。
async fn download_runtime_archive(
    app: &tauri::AppHandle,
    runtime_id: &str,
    url: &str,
    target: &std::path::Path,
    expected_size: Option<u64>,
    excluded: &[String],
) -> Result<(u64, String), String> {
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("无法创建下载目录: {}", e))?;
    }
    // 已存在完整文件时直接复用
    if let Some(expected) = expected_size.filter(|value| *value > 0) {
        if std::fs::metadata(target).map(|value| value.len()).unwrap_or(0) == expected {
            return Ok((expected, url.to_string()));
        }
    }

    emit_runtime_progress(app, AiRuntimeProgress {
        runtime_id: runtime_id.to_string(),
        phase: "probing".to_string(),
        downloaded_bytes: 0,
        total_bytes: 0,
        message: String::new(),
    });

    let sources = runtime_download_sources(url);
    struct Candidate {
        source: RuntimeSource,
        size: u64,
        supports_range: bool,
        speed: f64,
    }
    let mut candidates: Vec<Candidate> = Vec::new();
    let mut last_error = String::new();
    for source in sources.iter() {
        if excluded.iter().any(|item| item == &source.url) {
            continue;
        }
        match probe_runtime_source(source).await {
            Ok((size, supports_range, speed)) => {
                // 大小必须和清单一致，否则这个源给的是另一个文件
                if let Some(expected) = expected_size.filter(|value| *value > 0) {
                    if size != expected {
                        last_error = format!("{}: 文件大小不一致（{} 字节）", source.label, size);
                        continue;
                    }
                }
                candidates.push(Candidate {
                    source: source.clone(),
                    size,
                    supports_range,
                    speed,
                });
            }
            Err(error) => last_error = format!("{}: {}", source.label, error),
        }
    }
    if candidates.is_empty() {
        return Err(format!("运行时下载失败：{}", last_error));
    }
    candidates.sort_by(|left, right| {
        right
            .speed
            .partial_cmp(&left.speed)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    // 只选一个源，所有分片都用它，避免不同源内容不一致
    let chosen = candidates[0].source.clone();
    let total = candidates[0].size;
    let supports_range = candidates[0].supports_range;
    let best_label = chosen.label.clone();
    let ordered: Vec<RuntimeSource> = vec![chosen.clone()];

    // 文件长度已经对得上就保留内容（续传），否则重建并预分配
    let existing_size = std::fs::metadata(target).map(|value| value.len()).unwrap_or(0);
    if existing_size != total {
        let file = std::fs::OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(target)
            .map_err(|e| format!("无法创建下载文件: {}", e))?;
        file.set_len(total).map_err(|e| format!("无法预分配下载文件: {}", e))?;
    }

    let parts = if supports_range && total >= RUNTIME_PARALLEL_MIN_BYTES {
        RUNTIME_DOWNLOAD_PARTS
    } else {
        1
    };
    let ranges: Vec<(u64, u64)> = if parts == 1 {
        vec![(0u64, total - 1)]
    } else {
        let chunk = total / parts as u64;
        (0..parts)
            .map(|index| {
                let start = chunk * index as u64;
                let end = if index + 1 == parts {
                    total - 1
                } else {
                    chunk * (index + 1) as u64 - 1
                };
                (start, end)
            })
            .collect()
    };

    // 断点续传：只有同一个源、同一个文件才接着下
    let mut written = load_runtime_state(target, &chosen.url, total, ranges.len());
    if existing_size != total {
        written = vec![0u64; ranges.len()];
        let _ = std::fs::remove_file(runtime_state_path(target));
    }
    let restored: u64 = written.iter().sum();
    let state = std::sync::Arc::new(std::sync::Mutex::new(written.clone()));
    let progress = std::sync::Arc::new(std::sync::atomic::AtomicU64::new(restored));
    if restored > 0 {
        emit_runtime_progress(app, AiRuntimeProgress {
            runtime_id: runtime_id.to_string(),
            phase: "downloading".to_string(),
            downloaded_bytes: restored,
            total_bytes: total,
            message: format!("继续上次下载（已保留 {}）", human_bytes(restored)),
        });
    }

    let done_flag = std::sync::Arc::new(AtomicBool::new(false));
    let reporter = {
        let app = app.clone();
        let runtime_id = runtime_id.to_string();
        let progress = std::sync::Arc::clone(&progress);
        let done_flag = std::sync::Arc::clone(&done_flag);
        let label = best_label.clone();
        tokio::spawn(async move {
            while !done_flag.load(Ordering::SeqCst) {
                tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                emit_runtime_progress(&app, AiRuntimeProgress {
                    runtime_id: runtime_id.clone(),
                    phase: "downloading".to_string(),
                    downloaded_bytes: progress.load(Ordering::SeqCst),
                    total_bytes: total,
                    message: label.clone(),
                });
            }
        })
    };

    let mut join_set: tokio::task::JoinSet<Result<(), String>> = tokio::task::JoinSet::new();
    for (index, range) in ranges.iter().enumerate() {
        let expected = range.1 - range.0 + 1;
        if written[index] >= expected {
            continue; // 这个分片上次已经下完
        }
        join_set.spawn(download_runtime_part(
            index,
            ordered.clone(),
            target.to_path_buf(),
            range.0,
            range.1,
            total,
            written[index],
            std::sync::Arc::clone(&progress),
            std::sync::Arc::clone(&state),
        ));
    }

    let mut failure: Option<String> = None;
    while let Some(result) = join_set.join_next().await {
        match result {
            Ok(Ok(())) => {}
            Ok(Err(message)) => {
                failure = Some(message);
                join_set.abort_all();
                break;
            }
            Err(error) => {
                failure = Some(error.to_string());
                join_set.abort_all();
                break;
            }
        }
    }
    done_flag.store(true, Ordering::SeqCst);
    reporter.abort();

    let final_written = state
        .lock()
        .map(|guard| guard.clone())
        .unwrap_or_else(|_| written.clone());
    let saved_bytes: u64 = final_written.iter().sum();

    // 取消或失败时保留已下载内容并记下进度，下次接着下
    if let Some(message) = failure {
        save_runtime_state(target, &chosen.url, total, &ranges, &final_written);
        if AI_RUNTIME_CANCEL.load(Ordering::SeqCst) {
            return Err(format!("已取消下载，已保留 {}，下次会自动继续", human_bytes(saved_bytes)));
        }
        return Err(message);
    }
    if AI_RUNTIME_CANCEL.load(Ordering::SeqCst) {
        save_runtime_state(target, &chosen.url, total, &ranges, &final_written);
        return Err(format!("已取消下载，已保留 {}，下次会自动继续", human_bytes(saved_bytes)));
    }
    let _ = std::fs::remove_file(runtime_state_path(target));

    emit_runtime_progress(app, AiRuntimeProgress {
        runtime_id: runtime_id.to_string(),
        phase: "downloading".to_string(),
        downloaded_bytes: total,
        total_bytes: total,
        message: best_label,
    });
    Ok((total, chosen.url))
}

/// 解压运行时包：优先用系统自带工具（Windows 的 tar.exe 基于 libarchive，支持 7z/zip，
/// 比 Rust 解压库可靠得多），7-Zip 次之，内置库兜底
fn extract_archive_best_effort(archive: &std::path::Path, staging: &std::path::Path) -> Result<(), String> {
    let run_quiet = |command: &mut std::process::Command| -> Result<std::process::Output, String> {
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000);
        }
        command.output().map_err(|error| format!("{}", error))
    };
    let reset_staging = || {
        let _ = std::fs::remove_dir_all(staging);
        let _ = std::fs::create_dir_all(staging);
    };

    // 1) Windows 自带 tar.exe
    let tar_exe = std::path::PathBuf::from("C:\\Windows\\System32\\tar.exe");
    if tar_exe.is_file() {
        std::fs::create_dir_all(staging).map_err(|e| format!("无法创建暂存目录: {}", e))?;
        let mut command = std::process::Command::new(&tar_exe);
        command.arg("-xf").arg(archive).arg("-C").arg(staging);
        match run_quiet(&mut command) {
            Ok(output) if output.status.success() => return Ok(()),
            output => {
                if let Ok(result) = output {
                    let stderr = String::from_utf8_lossy(&result.stderr);
                    if !stderr.trim().is_empty() {
                        let _ = std::fs::write(
                            staging.with_file_name("extract-tar.log"),
                            stderr.as_bytes(),
                        );
                    }
                }
                reset_staging();
            }
        }
    }

    // 2) 已安装的 7-Zip
    for seven_zip in [
        "C:\\Program Files\\7-Zip\\7z.exe",
        "C:\\Program Files (x86)\\7-Zip\\7z.exe",
    ] {
        let path = std::path::PathBuf::from(seven_zip);
        if !path.is_file() {
            continue;
        }
        let mut command = std::process::Command::new(&path);
        command
            .arg("x")
            .arg("-y")
            .arg(format!("-o{}", staging.display()))
            .arg(archive);
        match run_quiet(&mut command) {
            Ok(output) if output.status.success() => return Ok(()),
            _ => reset_staging(),
        }
    }

    // 3) 内置解压库兜底
    std::fs::create_dir_all(staging).map_err(|e| format!("无法创建暂存目录: {}", e))?;
    sevenz_rust2::decompress_file(archive, staging).map_err(|e| format!("解压失败: {}", e))
}

/// 检查 7z / zip 文件头，提前挡住损坏或非压缩包的下载内容
fn archive_signature_ok(path: &std::path::Path) -> Result<(), String> {
    use std::io::Read;
    let mut file = std::fs::File::open(path).map_err(|e| format!("无法打开运行时包: {}", e))?;
    let mut header = [0u8; 6];
    let read = file.read(&mut header).map_err(|e| format!("无法读取运行时包: {}", e))?;
    if read < 2 {
        return Err("运行时包为空或已损坏，请清除下载缓存后重新安装".to_string());
    }
    let is_7z = read >= 6 && header == [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C];
    let is_zip = header[0] == 0x50 && header[1] == 0x4B;
    if !is_7z && !is_zip {
        return Err("运行时包格式不正确（下载内容可能已损坏），请点“清除下载缓存”后重新安装".to_string());
    }
    Ok(())
}

fn ai_runtime_target_dir(paths: &AiPaths, runtime_id: &str, version: &str) -> std::path::PathBuf {
    std::path::PathBuf::from(&paths.runtime).join(format!("{}-{}", runtime_id, version))
}

#[tauri::command]
async fn install_ai_runtime(
    app: tauri::AppHandle,
    runtime_id: String,
    mode: String,
    archive_path: Option<String>,
    skip_sha: Option<bool>,
) -> Result<serde_json::Value, String> {
    let paths = ensure_ai_dirs()?;
    let catalog: serde_json::Value =
        serde_json::from_str(AI_CATALOG_JSON).map_err(|e| format!("内置运行时清单解析失败: {}", e))?;
    let runtime = catalog_runtime(&catalog, &runtime_id)?;
    let variant = catalog_variant(&runtime, &mode)?;
    let version = variant
        .get("version")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .to_string();

    AI_RUNTIME_CANCEL.store(false, Ordering::SeqCst);

    // 本地导入：直接使用已解压的 ComfyUI 便携包，不下载也不解压
    if mode == "local" {
        let source = std::path::PathBuf::from(archive_path.clone().unwrap_or_default());
        if !source.join("main.py").is_file() {
            return Err("请选择包含 main.py 的 ComfyUI 目录".to_string());
        }
        let python_exe = source
            .parent()
            .map(|parent| parent.join("python_embeded").join("python.exe"))
            .filter(|path| path.is_file())
            .or_else(|| {
                let local = source.join("python_embeded").join("python.exe");
                if local.is_file() { Some(local) } else { None }
            });
        let manifest = serde_json::json!({
            "runtimeId": runtime_id,
            "mode": "local",
            "version": version,
            "installedAt": chrono_like_now(),
            "comfyDir": source.to_string_lossy(),
            "pythonExe": python_exe.map(|p| p.to_string_lossy().to_string()),
            "sha256": null,
            "sizeBytes": null,
            "license": runtime.get("license"),
            "previous": null,
        });
        write_runtime_manifest(&paths, &manifest)?;
        return Ok(manifest);
    }

    // 归档来源：离线包（随安装包分发）优先，其次程序内下载
    let asset_name = variant.get("assetName").and_then(|v| v.as_str()).unwrap_or("runtime.7z");
    let archive = if let Some(path) = archive_path.as_deref().map(str::trim).filter(|p| !p.is_empty()) {
        let candidate = std::path::PathBuf::from(path);
        if !candidate.is_file() {
            return Err("离线运行时包不存在".to_string());
        }
        candidate
    } else {
        let mut url = variant
            .get("url")
            .and_then(|v| v.as_str())
            .ok_or("运行时缺少下载地址")?
            .to_string();
        let mut expected_sha = variant.get("sha256").and_then(|v| v.as_str()).map(str::to_string);
        let mut expected_size = variant.get("sizeBytes").and_then(|v| v.as_u64());

        // 在线方式：先向 GitHub Release API 询问最新版本与校验值
        if variant.get("resolveFromApi").and_then(|v| v.as_bool()).unwrap_or(false) {
            let api_url = catalog.get("releaseApi").and_then(|v| v.as_str()).unwrap_or_default();
            if !api_url.is_empty() {
                if let Some((latest_url, latest_size, latest_sha)) = resolve_latest_asset(api_url, asset_name).await {
                    url = latest_url;
                    if latest_size.is_some() { expected_size = latest_size; }
                    if latest_sha.is_some() { expected_sha = latest_sha; }
                }
            }
        }

        let target = std::path::PathBuf::from(&paths.cache).join(asset_name);
        // 校验失败时换一个源重下，最多试 3 次，避免用户反复手动重试
        let mut excluded: Vec<String> = Vec::new();
        let mut last_failure = String::new();
        for attempt in 0..3 {
            match download_runtime_archive(&app, &runtime_id, &url, &target, expected_size, &excluded).await {
                Err(message) => {
                    last_failure = message;
                    break; // 下载失败或用户取消，不再重试
                }
                Ok((size, used_source)) => {
                    let mut ok = true;
                    if let Some(expected) = expected_size.filter(|value| *value > 0) {
                        if expected != size {
                            last_failure = format!("运行时包大小不一致：期望 {} 字节，实际 {} 字节", expected, size);
                            ok = false;
                        }
                    }
                    if ok && !skip_sha.unwrap_or(false) {
                        if let Some(expected) = expected_sha.clone() {
                            emit_runtime_progress(&app, AiRuntimeProgress {
                                runtime_id: runtime_id.clone(),
                                phase: "verifying".to_string(),
                                downloaded_bytes: size,
                                total_bytes: size,
                                message: String::new(),
                            });
                            let actual = sha256_file(&target)?;
                            if !actual.eq_ignore_ascii_case(&expected) {
                                last_failure = format!(
                                    "下载内容与官方校验值不一致（第 {} 次），正在换一个下载源重试",
                                    attempt + 1
                                );
                                ok = false;
                            }
                        }
                    }
                    if ok {
                        last_failure.clear();
                        break;
                    }
                    // 这个源给的文件不对：清掉文件和续传记录，下次换源从头下
                    excluded.push(used_source);
                    let _ = std::fs::remove_file(&target);
                    let _ = std::fs::remove_file(runtime_state_path(&target));
                }
            }
        }
        if !last_failure.is_empty() {
            return Err(last_failure);
        }
        target
    };

    let actual_sha = sha256_file(&archive)?;
    let actual_size = std::fs::metadata(&archive).map(|value| value.len()).unwrap_or(0);

    // 解压前先认一下文件头，避免坏文件把解压库搞崩
    archive_signature_ok(&archive)?;

    // 解压到暂存目录，校验通过后再整体切换，避免半包运行时
    emit_runtime_progress(&app, AiRuntimeProgress {
        runtime_id: runtime_id.clone(),
        phase: "extracting".to_string(),
        downloaded_bytes: actual_size,
        total_bytes: actual_size,
        message: String::new(),
    });
    let staging = std::path::PathBuf::from(&paths.runtime).join(format!(".staging-{}-{}", runtime_id, version));
    if staging.exists() {
        let _ = std::fs::remove_dir_all(&staging);
    }
    std::fs::create_dir_all(&staging).map_err(|e| format!("无法创建暂存目录: {}", e))?;
    {
        let archive_clone = archive.clone();
        let staging_clone = staging.clone();
        let outcome = tokio::task::spawn_blocking(move || {
            extract_archive_best_effort(&archive_clone, &staging_clone)
        })
        .await
        .map_err(|e| {
            format!(
                "解压失败（{}）。运行时包可能已损坏，请点“清除下载缓存”后重新安装",
                e
            )
        })?;
        if let Err(message) = outcome {
            let _ = std::fs::remove_dir_all(&staging);
            return Err(message);
        }
    }

    let layout_comfy = runtime
        .get("extractLayout")
        .and_then(|v| v.get("comfyDir"))
        .and_then(|v| v.as_str())
        .unwrap_or("ComfyUI");
    let layout_python = runtime
        .get("extractLayout")
        .and_then(|v| v.get("pythonExe"))
        .and_then(|v| v.as_str())
        .unwrap_or("python_embeded/python.exe");

    let comfy_dir = staging.join(layout_comfy);
    if !comfy_dir.join("main.py").is_file() {
        let _ = std::fs::remove_dir_all(&staging);
        return Err("解压后未找到 ComfyUI 主程序，运行时包结构可能已变化".to_string());
    }
    let python_exe = staging.join(layout_python);
    if !python_exe.is_file() {
        let _ = std::fs::remove_dir_all(&staging);
        return Err("解压后未找到内置 Python，运行时包结构可能已变化".to_string());
    }

    // 切换：旧版本留作 previous 以便回滚
    let target_dir = ai_runtime_target_dir(&paths, &runtime_id, &version);
    let previous_dir = std::path::PathBuf::from(format!("{}.previous", target_dir.to_string_lossy()));
    let previous_manifest = read_runtime_manifest(&paths);
    if target_dir.exists() {
        if previous_dir.exists() {
            let _ = std::fs::remove_dir_all(&previous_dir);
        }
        std::fs::rename(&target_dir, &previous_dir).map_err(|e| format!("无法备份旧运行时: {}", e))?;
    }
    std::fs::rename(&staging, &target_dir).map_err(|e| format!("无法启用新运行时: {}", e))?;
    let _ = std::fs::remove_dir_all(&staging);
    write_extra_model_paths(&paths, &target_dir.join(layout_comfy))?;

    let manifest = serde_json::json!({
        "runtimeId": runtime_id,
        "mode": mode,
        "version": version,
        "installedAt": chrono_like_now(),
        "comfyDir": target_dir.join(layout_comfy).to_string_lossy(),
        "pythonExe": target_dir.join(layout_python).to_string_lossy(),
        "sha256": actual_sha,
        "sizeBytes": actual_size,
        "license": runtime.get("license"),
        "previous": previous_manifest.and_then(|value| {
            let dir = value.get("comfyDir").and_then(|v| v.as_str()).map(str::to_string);
            dir.filter(|path| std::path::Path::new(path).exists()).map(|path| {
                serde_json::json!({
                    "runtimeId": value.get("runtimeId").cloned(),
                    "version": value.get("version").cloned(),
                    "comfyDir": path,
                    "pythonExe": value.get("pythonExe").cloned(),
                })
            })
        }),
    });
    write_runtime_manifest(&paths, &manifest)?;

    emit_runtime_progress(&app, AiRuntimeProgress {
        runtime_id,
        phase: "done".to_string(),
        downloaded_bytes: actual_size,
        total_bytes: actual_size,
        message: String::new(),
    });
    Ok(manifest)
}

/// 让内置 ComfyUI 读取统一模型目录：在便携包内写入 extra_model_paths.yaml。
/// custom_nodes 暂随运行时目录，后续阶段再迁到 AI/data。
fn write_extra_model_paths(paths: &AiPaths, comfy_dir: &std::path::Path) -> Result<(), String> {
    if !comfy_dir.is_dir() {
        return Ok(());
    }
    let base = std::path::PathBuf::from(&paths.data).to_string_lossy().replace('\'', "");
    let content = format!(
        "karui_unified:\n    base_path: '{}'\n    checkpoints: models/checkpoints\n    diffusion_models: models/diffusion_models\n    text_encoders: models/text_encoders\n    clip_vision: models/clip_vision\n    vae: models/vae\n    loras: models/loras\n    controlnet: models/controlnet\n    clip_projections: models/clip_projections\n",
        base
    );
    std::fs::write(comfy_dir.join("extra_model_paths.yaml"), content)
        .map_err(|e| format!("无法写入模型路径配置: {}", e))
}

#[allow(dead_code)]
fn extract_zip_archive(archive: &std::path::Path, dest: &std::path::Path) -> Result<(), String> {
    let file = std::fs::File::open(archive).map_err(|e| format!("无法打开压缩包: {}", e))?;
    let mut zip = zip::ZipArchive::new(file).map_err(|e| format!("无法读取压缩包: {}", e))?;
    for index in 0..zip.len() {
        let mut entry = zip.by_index(index).map_err(|e| format!("压缩包条目读取失败: {}", e))?;
        let Some(enclosed) = entry.enclosed_name() else { continue };
        let output = dest.join(enclosed);
        if entry.is_dir() {
            std::fs::create_dir_all(&output).map_err(|e| format!("无法创建目录: {}", e))?;
        } else {
            if let Some(parent) = output.parent() {
                std::fs::create_dir_all(parent).map_err(|e| format!("无法创建目录: {}", e))?;
            }
            let mut target = std::fs::File::create(&output).map_err(|e| format!("无法写入文件: {}", e))?;
            std::io::copy(&mut entry, &mut target).map_err(|e| format!("解压失败: {}", e))?;
        }
    }
    Ok(())
}

fn read_runtime_manifest(paths: &AiPaths) -> Option<serde_json::Value> {
    let file = std::path::PathBuf::from(&paths.manifests).join("runtime-installed.json");
    std::fs::read_to_string(file)
        .ok()
        .and_then(|content| serde_json::from_str::<serde_json::Value>(&content).ok())
}

fn write_runtime_manifest(paths: &AiPaths, manifest: &serde_json::Value) -> Result<(), String> {
    let target = std::path::PathBuf::from(&paths.manifests).join("runtime-installed.json");
    let content = serde_json::to_string_pretty(manifest).map_err(|e| e.to_string())?;
    std::fs::write(&target, content).map_err(|e| format!("无法写入运行时清单: {}", e))
}

fn chrono_like_now() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|value| value.as_secs())
        .unwrap_or(0);
    format!("{}", now)
}

/// 清除运行时下载缓存（含断点续传记录），下次会重新完整下载
#[tauri::command]
fn clear_ai_runtime_cache() -> Result<String, String> {
    let paths = ensure_ai_dirs()?;
    let cache = std::path::PathBuf::from(&paths.cache);
    let mut removed = 0usize;
    let entries = std::fs::read_dir(&cache).map_err(|e| format!("无法读取缓存目录: {}", e))?;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let name = path.file_name().map(|value| value.to_string_lossy().to_string()).unwrap_or_default();
        if name.ends_with(".7z") || name.ends_with(".zip") || name.ends_with(".state.json") {
            if std::fs::remove_file(&path).is_ok() {
                removed += 1;
            }
        }
    }
    Ok(format!("已清除 {} 个缓存文件", removed))
}

/// 回滚到上一个可运行的运行时版本
#[tauri::command]
fn rollback_ai_runtime() -> Result<serde_json::Value, String> {
    let paths = ensure_ai_dirs()?;
    let current = read_runtime_manifest(&paths).ok_or("尚未安装内置运行时")?;
    let previous = current
        .get("previous")
        .cloned()
        .filter(|value| !value.is_null())
        .ok_or("没有可回滚的版本")?;
    let previous_dir = previous
        .get("comfyDir")
        .and_then(|v| v.as_str())
        .ok_or("可回滚版本缺少目录")?;
    if !std::path::Path::new(previous_dir).join("main.py").is_file() {
        return Err("可回滚版本已损坏".to_string());
    }
    write_runtime_manifest(&paths, &previous)?;
    Ok(previous)
}

#[tauri::command]
fn cancel_ai_runtime_install() {
    AI_RUNTIME_CANCEL.store(true, Ordering::SeqCst);
}

/// AI 离线版：查找随安装包分发在 resources/ai-runtime 下的运行时归档
#[tauri::command]
fn find_bundled_ai_runtime(runtime_id: String, mode: String) -> Result<Option<String>, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let dir = exe.parent().ok_or("Cannot find exe directory")?.to_path_buf();
    let catalog: serde_json::Value =
        serde_json::from_str(AI_CATALOG_JSON).map_err(|e| format!("内置运行时清单解析失败: {}", e))?;
    let runtime = catalog_runtime(&catalog, &runtime_id)?;
    let variant = catalog_variant(&runtime, &mode)?;
    let Some(asset_name) = variant.get("assetName").and_then(|v| v.as_str()) else {
        return Ok(None);
    };
    let candidate = dir.join("resources").join("ai-runtime").join(asset_name);
    if candidate.is_file() {
        Ok(Some(candidate.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct AiRuntimeStartInfo {
    running: bool,
    pid: u32,
    port: u16,
    base_url: String,
    version: String,
}

/// 启动内置运行时：使用统一模型目录（extra_model_paths.yaml）与统一输出目录。
/// 与 start_comfy_local 的区别是后者面向用户自己那份外部 ComfyUI。
#[tauri::command]
fn start_ai_runtime(port: Option<u16>, low_vram: Option<bool>) -> Result<AiRuntimeStartInfo, String> {
    let paths = ensure_ai_dirs()?;
    let manifest = read_runtime_manifest(&paths).ok_or("尚未安装内置运行时")?;
    let comfy_dir = std::path::PathBuf::from(
        manifest
            .get("comfyDir")
            .and_then(|v| v.as_str())
            .ok_or("运行时清单缺少目录")?,
    );
    if !comfy_dir.join("main.py").is_file() {
        return Err("内置运行时已损坏，请重新安装".to_string());
    }
    let python_exe = manifest
        .get("pythonExe")
        .and_then(|v| v.as_str())
        .filter(|path| !path.trim().is_empty())
        .map(std::path::PathBuf::from)
        .filter(|path| path.is_file())
        .ok_or("内置运行时缺少可用的 Python")?;

    let mut managed_child = COMFY_CHILD.lock().map_err(|_| "无法读取 ComfyUI 进程状态".to_string())?;
    if let Some(child) = managed_child.as_mut() {
        match child.try_wait() {
            Ok(None) => {
                return Ok(AiRuntimeStartInfo {
                    running: true,
                    pid: child.id(),
                    port: port.unwrap_or(8188),
                    base_url: format!("http://127.0.0.1:{}", port.unwrap_or(8188)),
                    version: manifest.get("version").and_then(|v| v.as_str()).unwrap_or("unknown").to_string(),
                });
            }
            Ok(Some(_)) => *managed_child = None,
            Err(error) => return Err(format!("无法检查 ComfyUI 进程状态: {}", error)),
        }
    }

    let start = port.unwrap_or(8188);
    let chosen = (start..start.saturating_add(40))
        .find(|candidate| {
            let address = std::net::SocketAddr::from(([127, 0, 0, 1], *candidate));
            std::net::TcpStream::connect_timeout(&address, std::time::Duration::from_millis(200)).is_err()
        })
        .ok_or("没有可用端口".to_string())?;

    std::fs::create_dir_all(&paths.logs).map_err(|e| format!("无法创建日志目录: {}", e))?;
    let log_path = std::path::PathBuf::from(&paths.logs).join("comfyui.log");
    let stdout = std::fs::File::create(&log_path).map_err(|e| format!("无法写入日志: {}", e))?;
    let stderr = stdout.try_clone().map_err(|e| format!("无法写入日志: {}", e))?;

    let mut command = std::process::Command::new(python_exe);
    command
        .current_dir(&comfy_dir)
        .arg("main.py")
        .args(["--listen", "127.0.0.1", "--port", &chosen.to_string(), "--disable-auto-launch"])
        .args(["--output-directory", &std::path::PathBuf::from(&paths.output).to_string_lossy()])
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::from(stdout))
        .stderr(std::process::Stdio::from(stderr));
    if low_vram.unwrap_or(false) {
        command.args(["--lowvram", "--fp16-vae"]);
    }
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    let child = command.spawn().map_err(|e| format!("启动内置运行时失败: {}", e))?;
    let pid = child.id();
    *managed_child = Some(child);

    Ok(AiRuntimeStartInfo {
        running: true,
        pid,
        port: chosen,
        base_url: format!("http://127.0.0.1:{}", chosen),
        version: manifest.get("version").and_then(|v| v.as_str()).unwrap_or("unknown").to_string(),
    })
}

/// 记录已安装运行时（安装/回滚后写入，供启动时自检）
#[tauri::command]
fn set_ai_runtime_installed(manifest: serde_json::Value) -> Result<String, String> {
    let paths = ensure_ai_dirs()?;
    let target = std::path::PathBuf::from(&paths.manifests).join("runtime-installed.json");
    let content = serde_json::to_string_pretty(&manifest).map_err(|e| e.to_string())?;
    std::fs::write(&target, content).map_err(|e| format!("无法写入运行时清单: {}", e))?;
    Ok(target.to_string_lossy().to_string())
}

// ===== Audio Conversion =====

use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};

static IS_CONVERTING: AtomicBool = AtomicBool::new(false);
static CANCEL_FLAG: AtomicBool = AtomicBool::new(false);
static CURRENT_CHILD_ID: AtomicU32 = AtomicU32::new(0);
static COMFY_CHILD: Mutex<Option<std::process::Child>> = Mutex::new(None);
static MODEL_DOWNLOAD_CANCEL: AtomicBool = AtomicBool::new(false);
static MODEL_DOWNLOAD_ACTIVE: AtomicBool = AtomicBool::new(false);

struct ModelDownloadGuard;

impl Drop for ModelDownloadGuard {
    fn drop(&mut self) {
        MODEL_DOWNLOAD_ACTIVE.store(false, Ordering::SeqCst);
    }
}

#[derive(serde::Serialize)]
struct ComfyProcessInfo {
    running: bool,
    pid: u32,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ModelDownloadProgress {
    filename: String,
    downloaded_bytes: u64,
    total_bytes: u64,
}

/// 模型分类键 → 统一模型目录名（8.2）
fn model_folder_name(folder: &str) -> Result<&'static str, String> {
    match folder {
        "checkpoints" => Ok("checkpoints"),
        "diffusion" => Ok("diffusion_models"),
        "clip" => Ok("text_encoders"),
        "vae" => Ok("vae"),
        "clipProjection" => Ok("clip_projections"),
        "loras" => Ok("loras"),
        "controlnet" => Ok("controlnet"),
        _ => Err("不支持的模型目录".to_string()),
    }
}

/// 外部 ComfyUI 目录存在时写入它的 models/，否则写入内置统一模型目录 AI/data/models
fn resolve_model_target_dir(comfy_path: Option<&str>, folder_key: &str) -> Result<std::path::PathBuf, String> {
    match comfy_path.map(str::trim).filter(|path| !path.is_empty()) {
        Some(path) => {
            let comfy_dir = std::path::PathBuf::from(path);
            if !comfy_dir.is_dir() || !comfy_dir.join("main.py").is_file() {
                return Err("请先选择包含 main.py 的 ComfyUI 目录".to_string());
            }
            Ok(comfy_dir.join("models").join(folder_key))
        }
        None => {
            let paths = ensure_ai_dirs()?;
            let base = std::path::PathBuf::from(&paths.data).join("models");
            match folder_key {
                "checkpoints" => Ok(base.join("checkpoints")),
                "diffusion_models" => Ok(base.join("diffusion_models")),
                "text_encoders" => Ok(base.join("text_encoders")),
                "vae" => Ok(base.join("vae")),
                "clip_projections" => Ok(base.join("clip_projections")),
                "loras" => Ok(base.join("loras")),
                "controlnet" => Ok(base.join("controlnet")),
                _ => Err("不支持的模型目录".to_string()),
            }
        }
    }
}

fn validate_model_download(url: &str, filename: &str, folder: &str) -> Result<(url::Url, &'static str), String> {
    let parsed = url::Url::parse(url).map_err(|_| "模型下载地址无效".to_string())?;
    let allowed = matches!(parsed.host_str(), Some("huggingface.co") | Some("hf-mirror.com"));
    if parsed.scheme() != "https" || !allowed {
        return Err("内置下载仅允许 Hugging Face 官方或其镜像 HTTPS 地址".to_string());
    }
    if !parsed.path().contains("/resolve/") || !parsed.path().ends_with(filename) {
        return Err("模型下载地址与文件名不匹配".to_string());
    }
    if filename.is_empty()
        || filename.chars().any(|ch| matches!(ch, '/' | '\\' | '\0'))
        || !matches!(std::path::Path::new(filename).extension().and_then(|value| value.to_str()), Some("safetensors" | "ckpt"))
    {
        return Err("模型文件名不安全".to_string());
    }
    let target_folder = model_folder_name(folder)?;
    Ok((parsed, target_folder))
}

fn build_download_client(proxy_addr: Option<&str>) -> Result<reqwest::Client, String> {
    let mut builder = reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(15))
        .redirect(reqwest::redirect::Policy::limited(10));
    if let Some(addr) = proxy_addr {
        let proxy = reqwest::Proxy::all(addr).map_err(|e| e.to_string())?;
        builder = builder.proxy(proxy);
    }
    builder.build().map_err(|e| e.to_string())
}

fn download_host(url: &str) -> String {
    url::Url::parse(url)
        .ok()
        .and_then(|parsed| parsed.host_str().map(str::to_string))
        .unwrap_or_else(|| "下载服务器".to_string())
}

#[tauri::command]
async fn download_comfy_model(
    app: tauri::AppHandle,
    comfy_path: Option<String>,
    url: String,
    filename: String,
    folder: String,
) -> Result<String, String> {
    use futures_util::StreamExt;
    use std::io::Write;
    use tauri::Emitter;

    let (download_url, target_folder) = validate_model_download(&url, &filename, &folder)?;
    let target_dir = resolve_model_target_dir(comfy_path.as_deref(), target_folder)?;
    std::fs::create_dir_all(&target_dir).map_err(|e| format!("无法创建模型目录: {}", e))?;
    let target = target_dir.join(&filename);
    if target.is_file() {
        return Ok(target.to_string_lossy().to_string());
    }
    MODEL_DOWNLOAD_ACTIVE
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .map_err(|_| "已有模型正在下载，请稍候".to_string())?;
    let _download_guard = ModelDownloadGuard;
    let partial = target_dir.join(format!("{}.part", filename));
    let existing = std::fs::metadata(&partial).map(|value| value.len()).unwrap_or(0);

    MODEL_DOWNLOAD_CANCEL.store(false, Ordering::SeqCst);

    // 候选顺序：官方直连 → hf-mirror 镜像 → 常见本地代理端口（Clash 7890 / v2rayN 10809 / SOCKS 类 1080）。
    // reqwest 开启 default-features = false 后不会读系统代理，必须显式尝试。
    let direct = download_url.to_string();
    let mirrored = direct.replace("huggingface.co", "hf-mirror.com");
    let env_proxy = ["HTTPS_PROXY", "https_proxy", "ALL_PROXY", "all_proxy"]
        .iter()
        .find_map(|key| std::env::var(key).ok().filter(|value| !value.trim().is_empty()));
    let mut candidates: Vec<(String, Option<String>)> = Vec::new();
    let push_candidate = |url: String, proxy: Option<String>, list: &mut Vec<(String, Option<String>)>| {
        if !list.iter().any(|(existing_url, existing_proxy)| *existing_url == url && *existing_proxy == proxy) {
            list.push((url, proxy));
        }
    };
    for base in [direct.clone(), mirrored.clone()] {
        push_candidate(base.clone(), env_proxy.clone(), &mut candidates);
    }
    for port in ["7890", "10809", "1080"] {
        let proxy = Some(format!("http://127.0.0.1:{port}"));
        push_candidate(direct.clone(), proxy.clone(), &mut candidates);
        push_candidate(mirrored.clone(), proxy, &mut candidates);
    }

    let mut last_error = String::new();
    let mut response = None;
    for (candidate_url, candidate_proxy) in &candidates {
        let client = match build_download_client(candidate_proxy.as_deref()) {
            Ok(value) => value,
            Err(error) => {
                last_error = error;
                continue;
            }
        };
        let mut request = client.get(candidate_url);
        if existing > 0 {
            request = request.header(reqwest::header::RANGE, format!("bytes={}-", existing));
        }
        match request.send().await {
            Ok(result) => {
                let status = result.status();
                if status == reqwest::StatusCode::PARTIAL_CONTENT || status.is_success() {
                    response = Some(result);
                    break;
                }
                last_error = format!("模型服务器返回 HTTP {}", status.as_u16());
            }
            Err(error) => {
                last_error = format!("连接 {} 失败: {}", download_host(candidate_url), error);
            }
        }
        if MODEL_DOWNLOAD_CANCEL.load(Ordering::SeqCst) {
            return Err("下载已取消".to_string());
        }
    }
    let response = response.ok_or_else(|| {
        format!(
            "{last_error}\n可能原因：① 当前网络无法直连 Hugging Face（国内通常需要镜像或代理）；② 代理软件未开启或端口不是 7890 / 10809；③ 防火墙拦截。已自动尝试官方地址、hf-mirror 镜像和常见本地代理。"
        )
    })?;
    let is_partial = response.status() == reqwest::StatusCode::PARTIAL_CONTENT;
    if !response.status().is_success() {
        return Err(format!("模型服务器返回 HTTP {}", response.status().as_u16()));
    }
    let resume_from = if is_partial { existing } else { 0 };    let total = response.content_length().unwrap_or(0).saturating_add(resume_from);
    let mut output = std::fs::OpenOptions::new()
        .create(true)
        .write(true)
        .append(is_partial)
        .truncate(!is_partial)
        .open(&partial)
        .map_err(|e| format!("无法写入模型文件: {}", e))?;
    let mut downloaded = resume_from;
    let mut stream = response.bytes_stream();
    let mut last_emit = std::time::Instant::now() - std::time::Duration::from_secs(1);

    let _ = app.emit("comfy-model-download-progress", ModelDownloadProgress {
        filename: filename.clone(),
        downloaded_bytes: downloaded,
        total_bytes: total,
    });
    while let Some(chunk) = stream.next().await {
        if MODEL_DOWNLOAD_CANCEL.load(Ordering::SeqCst) {
            output.flush().map_err(|e| e.to_string())?;
            return Err("下载已暂停，可再次点击继续".to_string());
        }
        let bytes = chunk.map_err(|e| format!("模型下载中断: {}", e))?;
        output.write_all(&bytes).map_err(|e| format!("写入模型失败: {}", e))?;
        downloaded = downloaded.saturating_add(bytes.len() as u64);
        if last_emit.elapsed() >= std::time::Duration::from_millis(500) {
            let _ = app.emit("comfy-model-download-progress", ModelDownloadProgress {
                filename: filename.clone(),
                downloaded_bytes: downloaded,
                total_bytes: total,
            });
            last_emit = std::time::Instant::now();
        }
    }
    output.flush().map_err(|e| format!("保存模型失败: {}", e))?;
    drop(output);
    std::fs::rename(&partial, &target).map_err(|e| format!("完成模型文件失败: {}", e))?;
    let _ = app.emit("comfy-model-download-progress", ModelDownloadProgress {
        filename,
        downloaded_bytes: downloaded,
        total_bytes: total.max(downloaded),
    });
    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
fn cancel_comfy_model_download() {
    MODEL_DOWNLOAD_CANCEL.store(true, Ordering::SeqCst);
}

fn validate_comfy_url(raw_url: &str) -> Result<url::Url, String> {
    let parsed = url::Url::parse(raw_url).map_err(|e| format!("无效的 ComfyUI 地址: {}", e))?;
    if !matches!(parsed.scheme(), "http" | "https") {
        return Err("ComfyUI 地址仅支持 http 或 https".to_string());
    }
    if !parsed.username().is_empty() || parsed.password().is_some() {
        return Err("请不要在 ComfyUI 地址中携带账号或密码".to_string());
    }
    Ok(parsed)
}

fn comfy_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(8))
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn comfy_http_json(
    method: String,
    url: String,
    body: Option<serde_json::Value>,
    api_key: Option<String>,
) -> Result<serde_json::Value, String> {
    let parsed = validate_comfy_url(&url)?;
    let client = comfy_client()?;
    let mut request = match method.to_uppercase().as_str() {
        "GET" => client.get(parsed),
        "POST" => client.post(parsed),
        "DELETE" => client.delete(parsed),
        _ => return Err("不支持的 ComfyUI 请求方法".to_string()),
    };
    if let Some(key) = api_key.filter(|key| !key.trim().is_empty()) {
        request = request.bearer_auth(key.trim());
    }
    if let Some(payload) = body {
        request = request.json(&payload);
    }
    let response = request.send().await.map_err(|e| format!("连接 ComfyUI 失败: {}", e))?;
    let status = response.status();
    let text = response.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        let detail: String = text.chars().take(600).collect();
        return Err(format!("ComfyUI 返回 {}: {}", status.as_u16(), detail));
    }
    if text.trim().is_empty() {
        return Ok(serde_json::json!({ "ok": true }));
    }
    serde_json::from_str(&text).map_err(|e| format!("ComfyUI 返回了无效 JSON: {}", e))
}

#[tauri::command]
async fn comfy_upload_image(
    url: String,
    filename: String,
    bytes: Vec<u8>,
    api_key: Option<String>,
) -> Result<serde_json::Value, String> {
    let parsed = validate_comfy_url(&url)?;
    if bytes.is_empty() {
        return Err("上传图片不能为空".to_string());
    }
    if bytes.len() > 30 * 1024 * 1024 {
        return Err("首尾帧图片不能超过 30 MB".to_string());
    }
    let safe_name: String = filename
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() || matches!(ch, '.' | '_' | '-') { ch } else { '_' })
        .collect();
    let part = reqwest::multipart::Part::bytes(bytes)
        .file_name(if safe_name.is_empty() { "karui_h3_frame.png".to_string() } else { safe_name });
    let form = reqwest::multipart::Form::new()
        .part("image", part)
        .text("type", "input")
        .text("overwrite", "true");
    let client = comfy_client()?;
    let mut request = client.post(parsed).multipart(form);
    if let Some(key) = api_key.filter(|key| !key.trim().is_empty()) {
        request = request.bearer_auth(key.trim());
    }
    let response = request.send().await.map_err(|e| format!("上传首尾帧失败: {}", e))?;
    let status = response.status();
    let text = response.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        let detail: String = text.chars().take(600).collect();
        return Err(format!("ComfyUI 上传返回 {}: {}", status.as_u16(), detail));
    }
    serde_json::from_str(&text).map_err(|e| format!("ComfyUI 上传返回了无效 JSON: {}", e))
}

#[tauri::command]
async fn comfy_download_output(
    app: tauri::AppHandle,
    url: String,
    output_path: String,
    api_key: Option<String>,
) -> Result<String, String> {
    let parsed = validate_comfy_url(&url)?;
    let target = std::path::PathBuf::from(&output_path);
    is_path_safe(&target)?;
    let client = comfy_client()?;
    let mut request = client.get(parsed);
    if let Some(key) = api_key.filter(|key| !key.trim().is_empty()) {
        request = request.bearer_auth(key.trim());
    }
    let response = request.send().await.map_err(|e| format!("下载生成结果失败: {}", e))?;
    if !response.status().is_success() {
        return Err(format!("下载生成结果失败: HTTP {}", response.status().as_u16()));
    }
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&target, &bytes).map_err(|e| e.to_string())?;
    app.asset_protocol_scope()
        .allow_file(&target)
        .map_err(|e| format!("无法授权预览生成结果: {}", e))?;
    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
async fn install_comfy_video_helper(comfy_path: String, python_path: String) -> Result<String, String> {
    let comfy_dir = std::path::PathBuf::from(comfy_path.trim());
    if !comfy_dir.is_dir() || !comfy_dir.join("main.py").is_file() {
        return Err("请选择包含 main.py 的 ComfyUI 目录".to_string());
    }

    let custom_nodes = comfy_dir.join("custom_nodes");
    let target = custom_nodes.join("ComfyUI-VideoHelperSuite");
    let already_installed = target.join("__init__.py").is_file();
    if target.exists() && !already_installed {
        return Err(format!("安装目录已存在但不完整，请先删除后重试：{}", target.display()));
    }

    if !already_installed {
        let response = reqwest::get("https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite/archive/refs/heads/main.zip")
            .await
            .map_err(|e| format!("下载 Video Helper Suite 失败: {}", e))?;
        if !response.status().is_success() {
            return Err(format!("下载 Video Helper Suite 失败: HTTP {}", response.status()));
        }
        let archive_bytes = response.bytes().await.map_err(|e| format!("读取下载内容失败: {}", e))?;
        let reader = std::io::Cursor::new(archive_bytes);
        let mut archive = zip::ZipArchive::new(reader).map_err(|e| format!("安装包格式无效: {}", e))?;
        std::fs::create_dir_all(&target).map_err(|e| format!("无法创建节点目录: {}", e))?;

        let extract_result = (|| -> Result<(), String> {
            for index in 0..archive.len() {
                let mut entry = archive.by_index(index).map_err(|e| e.to_string())?;
                let enclosed = entry.enclosed_name().ok_or("安装包包含不安全路径")?;
                let relative: std::path::PathBuf = enclosed.components().skip(1).collect();
                if relative.as_os_str().is_empty() {
                    continue;
                }
                let output = target.join(relative);
                if entry.is_dir() {
                    std::fs::create_dir_all(&output).map_err(|e| e.to_string())?;
                } else {
                    if let Some(parent) = output.parent() {
                        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                    }
                    let mut file = std::fs::File::create(&output).map_err(|e| e.to_string())?;
                    std::io::copy(&mut entry, &mut file).map_err(|e| e.to_string())?;
                }
            }
            Ok(())
        })();
        if let Err(error) = extract_result {
            let _ = std::fs::remove_dir_all(&target);
            return Err(format!("解压 Video Helper Suite 失败: {}", error));
        }
    }

    let executable = if !python_path.trim().is_empty() {
        std::path::PathBuf::from(python_path.trim())
    } else {
        comfy_dir.parent()
            .map(|parent| parent.join("python_embeded").join("python.exe"))
            .filter(|path| path.is_file())
            .unwrap_or_else(|| std::path::PathBuf::from("python"))
    };
    let requirements = target.join("requirements.txt");
    if requirements.is_file() {
        let mut command = std::process::Command::new(&executable);
        command.args(["-m", "pip", "install", "-r"]).arg(&requirements);
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000);
        }
        let output = command.output().map_err(|e| format!("无法启动 Python 安装依赖: {}", e))?;
        if !output.status.success() {
            let detail = String::from_utf8_lossy(&output.stderr);
            return Err(format!("节点已下载，但依赖安装失败: {}", detail.trim()));
        }
    }

    Ok("Video Helper Suite 安装完成，请重启 ComfyUI".to_string())
}

#[tauri::command]
async fn install_comfy_h3_nodes(comfy_path: String) -> Result<String, String> {
    let comfy_dir = std::path::PathBuf::from(comfy_path.trim());
    if !comfy_dir.is_dir() || !comfy_dir.join("main.py").is_file() {
        return Err("请选择包含 main.py 的 ComfyUI 目录".to_string());
    }
    let custom_nodes = comfy_dir.join("custom_nodes");
    std::fs::create_dir_all(&custom_nodes).map_err(|e| format!("无法创建节点目录: {}", e))?;
    let packages = [
        (
            "ComfyUI-ClipProj",
            "https://github.com/nicolab28/ComfyUI-ClipProj/archive/c01ba8fb8f41b4f2094dbd0b185cdc238fb6134c.zip",
        ),
        (
            "ComfyUI-Spectrum-MiniMax-H3",
            "https://github.com/xmarre/ComfyUI-Spectrum-MiniMax-H3/archive/5161f0457bc8c52535212d6783eee73f439e1537.zip",
        ),
    ];
    let client = comfy_client()?;
    for (folder_name, download_url) in packages {
        let target = custom_nodes.join(folder_name);
        if target.join("__init__.py").is_file() {
            continue;
        }
        if target.exists() {
            return Err(format!("H3 节点目录已存在但不完整，请检查：{}", target.display()));
        }
        let response = client
            .get(download_url)
            .send()
            .await
            .map_err(|e| format!("下载 {} 失败: {}", folder_name, e))?;
        if !response.status().is_success() {
            return Err(format!("下载 {} 失败: HTTP {}", folder_name, response.status()));
        }
        let archive_bytes = response.bytes().await.map_err(|e| format!("读取 {} 安装包失败: {}", folder_name, e))?;
        let reader = std::io::Cursor::new(archive_bytes);
        let mut archive = zip::ZipArchive::new(reader).map_err(|e| format!("{} 安装包格式无效: {}", folder_name, e))?;
        std::fs::create_dir_all(&target).map_err(|e| format!("无法创建 {}: {}", target.display(), e))?;
        for index in 0..archive.len() {
            let mut entry = archive.by_index(index).map_err(|e| e.to_string())?;
            let enclosed = entry.enclosed_name().ok_or("H3 节点安装包包含不安全路径")?;
            let relative: std::path::PathBuf = enclosed.components().skip(1).collect();
            if relative.as_os_str().is_empty() {
                continue;
            }
            let output = target.join(relative);
            if entry.is_dir() {
                std::fs::create_dir_all(&output).map_err(|e| e.to_string())?;
            } else {
                if let Some(parent) = output.parent() {
                    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                }
                let mut file = std::fs::File::create(&output).map_err(|e| e.to_string())?;
                std::io::copy(&mut entry, &mut file).map_err(|e| e.to_string())?;
            }
        }
    }
    Ok("H3 低显存节点安装完成，请重启 ComfyUI 后下载四个模型文件".to_string())
}

#[tauri::command]
fn start_comfy_local(comfy_path: String, python_path: String, port: u16, low_vram: Option<bool>) -> Result<ComfyProcessInfo, String> {
    if !(1024..=65535).contains(&port) {
        return Err("端口必须在 1024 到 65535 之间".to_string());
    }
    let mut managed_child = COMFY_CHILD.lock().map_err(|_| "无法读取 ComfyUI 进程状态".to_string())?;
    if let Some(child) = managed_child.as_mut() {
        match child.try_wait() {
            Ok(None) => return Ok(ComfyProcessInfo { running: true, pid: child.id() }),
            Ok(Some(_)) => *managed_child = None,
            Err(error) => return Err(format!("无法检查 ComfyUI 进程状态: {}", error)),
        }
    }

    let address = std::net::SocketAddr::from(([127, 0, 0, 1], port));
    if std::net::TcpStream::connect_timeout(&address, std::time::Duration::from_millis(400)).is_ok() {
        return Ok(ComfyProcessInfo { running: true, pid: 0 });
    }

    let comfy_dir = std::path::PathBuf::from(comfy_path.trim());
    if !comfy_dir.is_dir() || !comfy_dir.join("main.py").is_file() {
        return Err("请选择包含 main.py 的 ComfyUI 目录".to_string());
    }

    let executable = if !python_path.trim().is_empty() {
        let custom = std::path::PathBuf::from(python_path.trim());
        if !custom.is_file() {
            return Err("指定的 Python 可执行文件不存在".to_string());
        }
        custom
    } else {
        let parent_embedded = comfy_dir.parent().map(|p| p.join("python_embeded").join("python.exe"));
        let local_embedded = comfy_dir.join("python_embeded").join("python.exe");
        if let Some(candidate) = parent_embedded.filter(|p| p.is_file()) {
            candidate
        } else if local_embedded.is_file() {
            local_embedded
        } else {
            std::path::PathBuf::from("python")
        }
    };

    let log_dir = dirs::data_local_dir()
        .unwrap_or_else(std::env::temp_dir)
        .join("KaruiToolbox")
        .join("logs");
    std::fs::create_dir_all(&log_dir).map_err(|e| e.to_string())?;
    let stdout = std::fs::File::create(log_dir.join("comfyui.log")).map_err(|e| e.to_string())?;
    let stderr = stdout.try_clone().map_err(|e| e.to_string())?;

    let mut command = std::process::Command::new(executable);
    command
        .current_dir(&comfy_dir)
        .arg("main.py")
        .args(["--listen", "127.0.0.1", "--port", &port.to_string(), "--disable-auto-launch"])
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::from(stdout))
        .stderr(std::process::Stdio::from(stderr));
    if low_vram.unwrap_or(false) {
        command.args(["--lowvram", "--fp16-vae"]);
    }
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    let child = command.spawn().map_err(|e| format!("启动 ComfyUI 失败: {}", e))?;
    let pid = child.id();
    *managed_child = Some(child);
    Ok(ComfyProcessInfo { running: true, pid })
}

#[tauri::command]
fn stop_comfy_local() -> Result<ComfyProcessInfo, String> {
    terminate_comfy_process()?;
    Ok(ComfyProcessInfo { running: false, pid: 0 })
}

fn terminate_comfy_process() -> Result<(), String> {
    let mut managed_child = COMFY_CHILD.lock().map_err(|_| "无法读取 ComfyUI 进程状态".to_string())?;
    let Some(mut child) = managed_child.take() else {
        return Ok(());
    };
    let pid = child.id();
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let status = std::process::Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .creation_flags(0x08000000)
            .status()
            .map_err(|e| e.to_string())?;
        if !status.success() {
            return Err("无法停止 ComfyUI 进程".to_string());
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        child.kill().map_err(|e| e.to_string())?;
    }
    let _ = child.wait();
    Ok(())
}

fn terminate_managed_services() -> Result<(), String> {
    CANCEL_FLAG.store(true, Ordering::SeqCst);
    MODEL_DOWNLOAD_CANCEL.store(true, Ordering::SeqCst);
    let conversion_pid = CURRENT_CHILD_ID.swap(0, Ordering::SeqCst);
    if conversion_pid != 0 {
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            let _ = std::process::Command::new("taskkill")
                .args(["/PID", &conversion_pid.to_string(), "/T", "/F"])
                .creation_flags(0x08000000)
                .status();
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = std::process::Command::new("kill")
                .args(["-9", &conversion_pid.to_string()])
                .status();
        }
    }
    terminate_comfy_process()
}

#[tauri::command]
fn quit_application(app: tauri::AppHandle) {
    // Always stop processes started by Karui before terminating the WebView.
    // Network requests and sockets owned by the WebView are closed by the OS;
    // the frontend also aborts them before invoking this command.
    let _ = terminate_managed_services();
    app.exit(0);
}

#[tauri::command]
fn comfy_process_status() -> ComfyProcessInfo {
    let Ok(mut managed_child) = COMFY_CHILD.lock() else {
        return ComfyProcessInfo { running: false, pid: 0 };
    };
    let Some(child) = managed_child.as_mut() else {
        return ComfyProcessInfo { running: false, pid: 0 };
    };
    match child.try_wait() {
        Ok(None) => ComfyProcessInfo { running: true, pid: child.id() },
        _ => {
            *managed_child = None;
            ComfyProcessInfo { running: false, pid: 0 }
        }
    }
}

fn get_ffmpeg_dir() -> Result<std::path::PathBuf, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_dir = exe.parent().ok_or("Cannot find exe directory")?;

    // 优先使用打包内置的 resources/ffmpeg/ 目录。
    let bundled = exe_dir.join("resources").join("ffmpeg");
    if bundled.join("ffmpeg.exe").exists() {
        return Ok(bundled);
    }

    // 兼容：搜索 ffmpeg.exe in exe directory and parent directories (up to 4 levels)
    let mut search_dir = exe_dir;
    for _ in 0..4 {
        let candidate = search_dir.join("ffmpeg.exe");
        if candidate.exists() {
            return Ok(search_dir.to_path_buf());
        }
        match search_dir.parent() {
            Some(p) => search_dir = p,
            None => break,
        }
    }

    // Fallback 1: use install_path from install_config.json (user's chosen install directory)
    let mut search_dir2 = exe_dir;
    for _ in 0..4 {
        let candidate = search_dir2.join("install_config.json");
        if candidate.exists() {
            if let Ok(content) = std::fs::read_to_string(&candidate) {
                if let Ok(config) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(install_path) = config.get("installPath").and_then(|v| v.as_str()) {
                        if !install_path.is_empty() {
                            let ffmpeg_dir = std::path::Path::new(install_path).join("ffmpeg");
                            std::fs::create_dir_all(&ffmpeg_dir).map_err(|e| e.to_string())?;
                            return Ok(ffmpeg_dir);
                        }
                    }
                }
            }
        }
        match search_dir2.parent() {
            Some(p) => search_dir2 = p,
            None => break,
        }
    }

    // Fallback 2: use exe directory itself (ffmpeg will be downloaded here)
    let ffmpeg_dir = exe_dir.join("ffmpeg");
    std::fs::create_dir_all(&ffmpeg_dir).map_err(|e| e.to_string())?;
    Ok(ffmpeg_dir)
}

fn get_ffmpeg_path() -> Result<std::path::PathBuf, String> {
    let dir = get_ffmpeg_dir()?;
    let exe_name = if cfg!(target_os = "windows") { "ffmpeg.exe" } else { "ffmpeg" };
    let path = dir.join(exe_name);
    if !path.exists() {
        return Err(format!("ffmpeg not found at: {}. Please ensure ffmpeg is installed alongside the application.", path.display()));
    }
    Ok(path)
}

fn get_ffprobe_path() -> Result<std::path::PathBuf, String> {
    let dir = get_ffmpeg_dir()?;
    let exe_name = if cfg!(target_os = "windows") { "ffprobe.exe" } else { "ffprobe" };
    let bundled = dir.join(exe_name);
    if bundled.exists() {
        return Ok(bundled);
    }
    Ok(std::path::PathBuf::from(exe_name))
}

#[tauri::command]
fn check_ffmpeg() -> bool {
    get_ffmpeg_path().map(|p| p.exists()).unwrap_or(false)
}

#[derive(serde::Serialize, Clone)]
struct ConvertProgress {
    file_name: String,
    current: usize,
    total: usize,
    progress: f64,
    status: String,
}

#[derive(serde::Serialize)]
struct BatchConvertResult {
    success_count: usize,
    fail_count: usize,
    output_dir: String,
    errors: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    original_size: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    compressed_size: Option<u64>,
}

fn get_encoder_params<'a>(target_format: &str, quality: &Option<String>) -> (String, Vec<String>, &'a str) {
    // Returns (encoder, extra_args, extension)
    match target_format.to_uppercase().as_str() {
        "MP3" => {
            let q = quality.as_deref().unwrap_or("4");
            ("libmp3lame".to_string(), vec!["-q:a".to_string(), q.to_string()], ".mp3")
        }
        "AAC" => {
            let q = quality.as_deref().unwrap_or("192k");
            ("aac".to_string(), vec!["-b:a".to_string(), q.to_string(), "-movflags".to_string(), "+faststart".to_string()], ".m4a")
        }
        "WAV" => {
            let q = quality.as_deref().unwrap_or("pcm_s16le");
            (q.to_string(), vec![], ".wav")
        }
        "FLAC" => {
            let q = quality.as_deref().unwrap_or("5");
            ("flac".to_string(), vec!["-compression_level".to_string(), q.to_string()], ".flac")
        }
        "ALAC" => {
            ("alac".to_string(), vec!["-movflags".to_string(), "+faststart".to_string()], ".m4a")
        }
        "OGG" => {
            let q = quality.as_deref().unwrap_or("5");
            ("libvorbis".to_string(), vec!["-q:a".to_string(), q.to_string()], ".ogg")
        }
        _ => ("libmp3lame".to_string(), vec!["-q:a".to_string(), "4".to_string()], ".mp3")
    }
}

fn get_unique_output_path(output_dir: &std::path::Path, stem: &str, ext: &str) -> std::path::PathBuf {
    let mut path = output_dir.join(format!("{}{}", stem, ext));
    let mut counter = 1;
    while path.exists() {
        path = output_dir.join(format!("{}_{}{}", stem, counter, ext));
        counter += 1;
    }
    path
}

#[tauri::command]
async fn convert_audio_batch(
    app_handle: tauri::AppHandle,
    input_paths: Vec<String>,
    output_dir: String,
    target_format: String,
    quality: Option<String>,
) -> Result<BatchConvertResult, String> {
    if IS_CONVERTING.load(Ordering::SeqCst) {
        return Err("Conversion already in progress".to_string());
    }
    IS_CONVERTING.store(true, Ordering::SeqCst);
    CANCEL_FLAG.store(false, Ordering::SeqCst);

    let result = async {
        use tauri::Emitter;

        let ffmpeg_path = get_ffmpeg_path()?;
        let output_dir_path = std::path::Path::new(&output_dir);
        std::fs::create_dir_all(output_dir_path).map_err(|e| e.to_string())?;

        let (encoder, extra_args, ext) = get_encoder_params(&target_format, &quality);
        let total = input_paths.len();
        let mut success_count = 0usize;
        let mut fail_count = 0usize;
        let mut errors = Vec::new();

        for (i, input_path) in input_paths.iter().enumerate() {
            if CANCEL_FLAG.load(Ordering::SeqCst) {
                break;
            }

            let input = std::path::Path::new(input_path);
            let file_name = input.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| "unknown".to_string());
            let stem = input.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_else(|| "output".to_string());

            let output_path = get_unique_output_path(output_dir_path, &stem, ext);

            let _ = app_handle.emit("convert-progress", ConvertProgress {
                file_name: file_name.clone(),
                current: i + 1,
                total,
                progress: 0.0,
                status: "converting".to_string(),
            });

            let mut cmd = tokio::process::Command::new(&ffmpeg_path);
            cmd.arg("-y")
               .arg("-i").arg(input)
               .arg("-c:a").arg(&encoder)
               .args(&extra_args)
               .arg("-progress").arg("pipe:1")
               .arg("-nostats")
               .arg(&output_path)
               .stdin(std::process::Stdio::null())
               .stdout(std::process::Stdio::piped())
               .stderr(std::process::Stdio::piped());

            #[cfg(target_os = "windows")]
            {
                cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
            }

            let child = cmd.spawn().map_err(|e| format!("Failed to start ffmpeg: {}", e))?;
            if let Some(id) = child.id() {
                CURRENT_CHILD_ID.store(id, Ordering::SeqCst);
            }
            let output = child.wait_with_output().await.map_err(|e| format!("ffmpeg wait failed: {}", e))?;
            CURRENT_CHILD_ID.store(0, Ordering::SeqCst);

            if CANCEL_FLAG.load(Ordering::SeqCst) {
                let _ = std::fs::remove_file(&output_path);
                break;
            }

            if output.status.success() {
                success_count += 1;
                let _ = app_handle.emit("convert-progress", ConvertProgress {
                    file_name,
                    current: i + 1,
                    total,
                    progress: 1.0,
                    status: "done".to_string(),
                });
            } else {
                fail_count += 1;
                let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
                errors.push(format!("{}: {}", file_name, err_msg));
                let _ = std::fs::remove_file(&output_path);
                let _ = app_handle.emit("convert-progress", ConvertProgress {
                    file_name,
                    current: i + 1,
                    total,
                    progress: 1.0,
                    status: "error".to_string(),
                });
            }
        }

        CURRENT_CHILD_ID.store(0, Ordering::SeqCst);

        Ok(BatchConvertResult {
            success_count,
            fail_count,
            output_dir: output_dir_path.to_string_lossy().to_string(),
            errors,
            original_size: None,
            compressed_size: None,
        })
    }.await;

    IS_CONVERTING.store(false, Ordering::SeqCst);
    CANCEL_FLAG.store(false, Ordering::SeqCst);
    result
}

#[derive(serde::Serialize)]
struct TrimResult {
    success: bool,
    output_path: String,
    error: Option<String>,
}

#[tauri::command]
async fn trim_audio(
    input_path: String,
    output_dir: String,
    start_time: f64,
    end_time: f64,
) -> Result<TrimResult, String> {
    if output_dir.is_empty() {
        return Err("Output directory is empty".to_string());
    }
    if start_time >= end_time {
        return Err("Start time must be less than end time".to_string());
    }

    let ffmpeg_path = get_ffmpeg_path()?;
    let output_dir_path = std::path::Path::new(&output_dir);
    std::fs::create_dir_all(output_dir_path).map_err(|e| e.to_string())?;

    let input = std::path::Path::new(&input_path);
    let stem = input.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_else(|| "output".to_string());
    let original_ext = input.extension().map(|e| format!(".{}", e.to_string_lossy())).unwrap_or_else(|| ".mp3".to_string());

    let mut output_path = output_dir_path.join(format!("{}_clip{}", stem, original_ext));
    let mut counter = 1;
    while output_path.exists() {
        output_path = output_dir_path.join(format!("{}_clip_{}{}", stem, counter, original_ext));
        counter += 1;
    }

    let mut cmd = tokio::process::Command::new(&ffmpeg_path);
    cmd.arg("-y")
       .arg("-i").arg(&input)
       .arg("-ss").arg(start_time.to_string())
       .arg("-to").arg(end_time.to_string())
       .arg("-c").arg("copy")
       .arg(&output_path)
       .stdin(std::process::Stdio::null())
       .stdout(std::process::Stdio::piped())
       .stderr(std::process::Stdio::piped());

    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(0x08000000);
    }

    let child = cmd.spawn().map_err(|e| format!("Failed to start ffmpeg: {}", e))?;
    let output = child.wait_with_output().await.map_err(|e| format!("ffmpeg wait failed: {}", e))?;

    if output.status.success() {
        Ok(TrimResult {
            success: true,
            output_path: output_path.to_string_lossy().to_string(),
            error: None,
        })
    } else {
        // Clean up partial output from failed stream copy before retrying
        let _ = std::fs::remove_file(&output_path);
        // Retry with re-encoding to MP3 if stream copy failed
        // Use .mp3 extension since we're encoding with libmp3lame
        let mp3_output_path = output_dir_path.join(format!("{}_clip.mp3", stem));
        let mut mp3_path = mp3_output_path.clone();
        let mut counter2 = 1;
        while mp3_path.exists() {
            mp3_path = output_dir_path.join(format!("{}_clip_{}.mp3", stem, counter2));
            counter2 += 1;
        }
        let mut cmd2 = tokio::process::Command::new(&ffmpeg_path);
        cmd2.arg("-y")
            .arg("-i").arg(&input)
            .arg("-ss").arg(start_time.to_string())
            .arg("-t").arg((end_time - start_time).to_string())
            .arg("-c:a").arg("libmp3lame")
            .arg("-q:a").arg("2")
            .arg(&mp3_path)
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped());

        #[cfg(target_os = "windows")]
        {
            cmd2.creation_flags(0x08000000);
        }

        let child2 = cmd2.spawn().map_err(|e| format!("Failed to start ffmpeg: {}", e))?;
        let output2 = child2.wait_with_output().await.map_err(|e| format!("ffmpeg wait failed: {}", e))?;

        if output2.status.success() {
            Ok(TrimResult {
                success: true,
                output_path: mp3_path.to_string_lossy().to_string(),
                error: None,
            })
        } else {
            let _ = std::fs::remove_file(&mp3_path);
            Ok(TrimResult {
                success: false,
                output_path: String::new(),
                error: Some(String::from_utf8_lossy(&output2.stderr).to_string()),
            })
        }
    }
}

#[tauri::command]
fn cancel_convert() -> Result<(), String> {
    CANCEL_FLAG.store(true, Ordering::SeqCst);
    let pid = CURRENT_CHILD_ID.load(Ordering::SeqCst);
    if pid != 0 {
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            let _ = std::process::Command::new("taskkill")
                .args(["/F", "/PID", &pid.to_string()])
                .creation_flags(0x08000000) // CREATE_NO_WINDOW
                .spawn();
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = std::process::Command::new("kill")
                .arg("-9")
                .arg(pid.to_string())
                .spawn();
        }
        CURRENT_CHILD_ID.store(0, Ordering::SeqCst);
    }
    Ok(())
}

// ===== Image Conversion =====

#[tauri::command]
async fn convert_image_batch(
    app_handle: tauri::AppHandle,
    input_paths: Vec<String>,
    output_dir: String,
    target_format: String,
) -> Result<BatchConvertResult, String> {
    use tauri::Emitter;
    use image::ImageFormat;

    let output_dir_path = std::path::Path::new(&output_dir);
    std::fs::create_dir_all(output_dir_path).map_err(|e| e.to_string())?;

    let target_fmt = match target_format.to_uppercase().as_str() {
        "JPG" | "JPEG" => ImageFormat::Jpeg,
        "PNG" => ImageFormat::Png,
        "WEBP" => ImageFormat::WebP,
        "BMP" => ImageFormat::Bmp,
        "GIF" => ImageFormat::Gif,
        _ => return Err(format!("Unsupported target format: {}", target_format)),
    };
    let ext = match target_fmt {
        ImageFormat::Jpeg => ".jpg",
        ImageFormat::Png => ".png",
        ImageFormat::WebP => ".webp",
        ImageFormat::Bmp => ".bmp",
        ImageFormat::Gif => ".gif",
        _ => ".png",
    };

    let total = input_paths.len();
    let mut success_count = 0usize;
    let mut fail_count = 0usize;
    let mut errors = Vec::new();

    for (i, input_path) in input_paths.iter().enumerate() {
        if CANCEL_FLAG.load(Ordering::SeqCst) { break; }

        let input = std::path::Path::new(input_path);
        let file_name = input.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| "unknown".to_string());
        let stem = input.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_else(|| "output".to_string());
        let output_path = get_unique_output_path(output_dir_path, &stem, ext);

        let _ = app_handle.emit("convert-progress", ConvertProgress {
            file_name: file_name.clone(),
            current: i + 1,
            total,
            progress: 0.0,
            status: "converting".to_string(),
        });

        let result = image::open(input);
        match result {
            Ok(img) => {
                let save_result = img.save_with_format(&output_path, target_fmt);
                if save_result.is_ok() {
                    success_count += 1;
                    let _ = app_handle.emit("convert-progress", ConvertProgress {
                        file_name,
                        current: i + 1,
                        total,
                        progress: 1.0,
                        status: "done".to_string(),
                    });
                } else {
                    fail_count += 1;
                    let e = save_result.err().map(|e| e.to_string()).unwrap_or_default();
                    errors.push(format!("{}: {}", file_name, e));
                    let _ = std::fs::remove_file(&output_path);
                    let _ = app_handle.emit("convert-progress", ConvertProgress {
                        file_name,
                        current: i + 1,
                        total,
                        progress: 1.0,
                        status: "error".to_string(),
                    });
                }
            }
            Err(e) => {
                fail_count += 1;
                errors.push(format!("{}: {}", file_name, e));
                let _ = app_handle.emit("convert-progress", ConvertProgress {
                    file_name,
                    current: i + 1,
                    total,
                    progress: 1.0,
                    status: "error".to_string(),
                });
            }
        }
    }

    Ok(BatchConvertResult {
        success_count,
        fail_count,
        output_dir: output_dir_path.to_string_lossy().to_string(),
        errors,
        original_size: None,
        compressed_size: None,
    })
}

#[tauri::command]
async fn compress_image_batch(
    app_handle: tauri::AppHandle,
    input_paths: Vec<String>,
    output_dir: String,
    quality: String,
) -> Result<BatchConvertResult, String> {
    use tauri::Emitter;
    use image::ImageFormat;
    use image::codecs::jpeg::JpegEncoder;
    use image::codecs::png::{PngEncoder, CompressionType, FilterType};
    use std::io::BufWriter;

    let output_dir_path = std::path::Path::new(&output_dir);
    std::fs::create_dir_all(output_dir_path).map_err(|e| e.to_string())?;

    // Quality presets: (jpeg_quality, png_compression)
    let (jpeg_quality, png_compression) = match quality.as_str() {
        "high" => (90u8, CompressionType::Fast),
        "medium" => (65u8, CompressionType::Default),
        "low" => (35u8, CompressionType::Best),
        _ => (65u8, CompressionType::Default),
    };

    let total = input_paths.len();
    let mut success_count = 0usize;
    let mut fail_count = 0usize;
    let mut errors = Vec::new();
    let mut original_size: u64 = 0;
    let mut compressed_size: u64 = 0;

    for (i, input_path) in input_paths.iter().enumerate() {
        if CANCEL_FLAG.load(Ordering::SeqCst) { break; }

        let input = std::path::Path::new(input_path);
        let file_name = input.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| "unknown".to_string());
        let stem = input.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_else(|| "output".to_string());

        // Determine original format and extension
        let ext = input.extension().and_then(|e| e.to_str()).unwrap_or("png").to_lowercase();
        let (format, out_ext) = match ext.as_str() {
            "jpg" | "jpeg" => (ImageFormat::Jpeg, ".jpg"),
            "png" => (ImageFormat::Png, ".png"),
            "webp" => (ImageFormat::WebP, ".webp"),
            "bmp" => (ImageFormat::Bmp, ".bmp"),
            "gif" => (ImageFormat::Gif, ".gif"),
            _ => (ImageFormat::Png, ".png"),
        };

        let output_path = get_unique_output_path(output_dir_path, &stem, out_ext);

        let _ = app_handle.emit("convert-progress", ConvertProgress {
            file_name: file_name.clone(),
            current: i + 1,
            total,
            progress: 0.0,
            status: "converting".to_string(),
        });

        let result = image::open(input);
        match result {
            Ok(img) => {
                let save_result = match format {
                    ImageFormat::Jpeg => {
                        let file = std::fs::File::create(&output_path).map_err(|e| e.to_string())?;
                        let writer = BufWriter::new(file);
                        let mut encoder = JpegEncoder::new_with_quality(writer, jpeg_quality);
                        let rgb = img.to_rgb8();
                        encoder.encode(&rgb, img.width(), img.height(), image::ExtendedColorType::Rgb8)
                    },
                    ImageFormat::Png => {
                        let file = std::fs::File::create(&output_path).map_err(|e| e.to_string())?;
                        let writer = BufWriter::new(file);
                        let encoder = PngEncoder::new_with_quality(writer, png_compression, FilterType::Sub);
                        img.write_with_encoder(encoder)
                    },
                    _ => {
                        // For WebP, BMP, GIF �?just re-save in original format
                        img.save_with_format(&output_path, format)
                    }
                };

                if save_result.is_ok() {
                    success_count += 1;
                    if let Ok(meta) = std::fs::metadata(&output_path) {
                        compressed_size += meta.len();
                    }
                    if let Ok(meta) = std::fs::metadata(input) {
                        original_size += meta.len();
                    }
                    let _ = app_handle.emit("convert-progress", ConvertProgress {
                        file_name,
                        current: i + 1,
                        total,
                        progress: 1.0,
                        status: "done".to_string(),
                    });
                } else {
                    fail_count += 1;
                    let e = save_result.err().map(|e| e.to_string()).unwrap_or_default();
                    errors.push(format!("{}: {}", file_name, e));
                    let _ = std::fs::remove_file(&output_path);
                    let _ = app_handle.emit("convert-progress", ConvertProgress {
                        file_name,
                        current: i + 1,
                        total,
                        progress: 1.0,
                        status: "error".to_string(),
                    });
                }
            }
            Err(e) => {
                fail_count += 1;
                errors.push(format!("{}: {}", file_name, e));
                let _ = app_handle.emit("convert-progress", ConvertProgress {
                    file_name,
                    current: i + 1,
                    total,
                    progress: 1.0,
                    status: "error".to_string(),
                });
            }
        }
    }

    Ok(BatchConvertResult {
        success_count,
        fail_count,
        output_dir: output_dir_path.to_string_lossy().to_string(),
        errors,
        original_size: Some(original_size),
        compressed_size: Some(compressed_size),
    })
}

#[tauri::command]
async fn convert_video_batch(
    app_handle: tauri::AppHandle,
    input_paths: Vec<String>,
    output_dir: String,
    target_format: String,
    quality: Option<String>,
) -> Result<BatchConvertResult, String> {
    if IS_CONVERTING.load(Ordering::SeqCst) {
        return Err("Conversion already in progress".to_string());
    }
    IS_CONVERTING.store(true, Ordering::SeqCst);
    CANCEL_FLAG.store(false, Ordering::SeqCst);

    let result = async {
        use tauri::Emitter;
        use std::sync::Arc;
        use tokio::sync::Mutex;

        let ffmpeg_path = get_ffmpeg_path()?;
        let output_dir_path = std::path::Path::new(&output_dir);
        std::fs::create_dir_all(output_dir_path).map_err(|e| e.to_string())?;

        let fmt = target_format.to_uppercase();
        let fmt_str = fmt.as_str();

        // Determine encoders, extension, and extra args based on target format
        // Try NVENC hardware encoder first, fall back to CPU encoder
        let (hw_encoder, cpu_encoder, audio_encoder, ext, extra_vf_args): (&str, &str, &str, &str, Vec<&str>) = match fmt_str {
            "MP4" => ("h264_nvenc", "libx264", "aac", ".mp4", vec![]),
            "MKV" => ("h264_nvenc", "libx264", "aac", ".mkv", vec![]),
            "MOV" => ("h264_nvenc", "libx264", "aac", ".mov", vec![]),
            "AVI" => ("h264_nvenc", "libx264", "mp3", ".avi", vec![]),
            "WEBM" => ("h264_nvenc", "libvpx-vp9", "libopus", ".webm", vec!["-row-mt", "1"]),
            "FLV" => ("h264_nvenc", "libx264", "aac", ".flv", vec![]),
            "WMV" => ("", "wmv2", "wmav2", ".wmv", vec![]), // WMV has no NVENC equivalent
            "TS"  => ("h264_nvenc", "libx264", "aac", ".ts", vec![]),
            _ => return Err(format!("Unsupported target format: {}", target_format)),
        };

        // Probe NVENC availability by running a quick encode test
        let nvenc_available = if !hw_encoder.is_empty() {
            let mut probe = tokio::process::Command::new(&ffmpeg_path);
            probe.arg("-hide_banner")
                 .arg("-f").arg("lavfi")
                 .arg("-i").arg("nullsrc=s=64x64:d=0.1")
                 .arg("-c:v").arg(hw_encoder)
                 .arg("-f").arg("null")
                 .arg("-")
                 .stdin(std::process::Stdio::null())
                 .stdout(std::process::Stdio::null())
                 .stderr(std::process::Stdio::null());
            #[cfg(target_os = "windows")]
            { probe.creation_flags(0x08000000); }
            probe.status().await.map(|s| s.success()).unwrap_or(false)
        } else {
            false
        };

        let video_encoder = if nvenc_available { hw_encoder } else { cpu_encoder };

        // Output quality preset from the UI (source / 1080p / 720p / 480p)
        // Each entry: scale filter (None = keep original size), x264 CRF, NVENC CQ, VP9 CRF
        let q = quality.unwrap_or_else(|| "source".to_string()).to_lowercase();
        let (scale_filter, crf_x264, cq_nvenc, crf_vp9): (Option<String>, u32, u32, u32) = match q.as_str() {
            "1080p" | "p1080" => (
                Some("scale=1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2".to_string()),
                23, 26, 33,
            ),
            "720p" | "p720" => (
                Some("scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2".to_string()),
                26, 30, 36,
            ),
            "480p" | "p480" => (
                Some("scale=854:480:force_original_aspect_ratio=decrease:force_divisible_by=2".to_string()),
                29, 34, 40,
            ),
            // "source" and anything unexpected: keep the original resolution with high quality
            _ => (None, 20, 22, 30),
        };

        // Build encoder-specific extra args
        let encoder_args: Vec<String> = if nvenc_available {
            // NVENC: fast preset + zero-latency tuning for speed
            vec!["-preset".to_string(), "fast".to_string(),
                 "-tune".to_string(), "zerolatency".to_string(),
                 "-rc".to_string(), "vbr".to_string(),
                 "-cq".to_string(), cq_nvenc.to_string()]
        } else if video_encoder == "libx264" {
            // x264 CPU: fast preset + CRF from the selected quality level
            vec!["-preset".to_string(), "fast".to_string(),
                 "-crf".to_string(), crf_x264.to_string()]
        } else if video_encoder == "libvpx-vp9" {
            // VP9: speed 2 for faster encoding
            vec!["-speed".to_string(), "2".to_string(),
                 "-crf".to_string(), crf_vp9.to_string()]
        } else {
            vec![]
        };

        let total = input_paths.len();
        let success_count = Arc::new(Mutex::new(0usize));
        let fail_count = Arc::new(Mutex::new(0usize));
        let errors: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(Vec::new()));
        let completed = Arc::new(Mutex::new(0usize));

        // Process files in parallel (max 3 concurrent) using JoinSet
        let max_parallel = std::cmp::min(3, input_paths.len());
        let mut join_set: tokio::task::JoinSet<()> = tokio::task::JoinSet::new();

        for (i, input_path) in input_paths.into_iter().enumerate() {
            if CANCEL_FLAG.load(Ordering::SeqCst) { break; }

            let input = std::path::Path::new(&input_path);
            let file_name = input.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| "unknown".to_string());
            let stem = input.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_else(|| "output".to_string());
            let output_path = get_unique_output_path(output_dir_path, &stem, ext);

            let _ = app_handle.emit("convert-progress", ConvertProgress {
                file_name: file_name.clone(),
                current: i + 1,
                total,
                progress: 0.0,
                status: "converting".to_string(),
            });

            let ffmpeg_path = ffmpeg_path.clone();
            let video_encoder = video_encoder.to_string();
            let audio_encoder = audio_encoder.to_string();
            let encoder_args = encoder_args.clone();
            let extra_vf_args = extra_vf_args.clone();
            let scale_filter = scale_filter.clone();
            let app_handle = app_handle.clone();
            let success_count = Arc::clone(&success_count);
            let fail_count = Arc::clone(&fail_count);
            let errors = Arc::clone(&errors);
            let completed = Arc::clone(&completed);

            join_set.spawn(async move {
                if CANCEL_FLAG.load(Ordering::SeqCst) { return; }

                let input = std::path::Path::new(&input_path);
                let mut cmd = tokio::process::Command::new(&ffmpeg_path);
                cmd.arg("-i").arg(input)
                   .arg("-c:v").arg(&video_encoder);

                for arg in &encoder_args {
                    cmd.arg(arg);
                }

                cmd.arg("-c:a").arg(&audio_encoder);

                for arg in &extra_vf_args {
                    cmd.arg(arg);
                }

                // Downscale only when the user picked a lower output quality
                if let Some(sf) = &scale_filter {
                    cmd.arg("-vf").arg(sf);
                }

                cmd.arg("-progress").arg("pipe:1")
                   .arg("-nostats")
                   .arg("-y")
                   .arg(&output_path)
                   .stdin(std::process::Stdio::null())
                   .stdout(std::process::Stdio::piped())
                   .stderr(std::process::Stdio::piped());

                #[cfg(target_os = "windows")]
                { cmd.creation_flags(0x08000000); }

                let child = match cmd.spawn() {
                    Ok(c) => c,
                    Err(e) => {
                        errors.lock().await.push(format!("{}: Failed to start ffmpeg: {}", file_name, e));
                        *fail_count.lock().await += 1;
                        let mut done = completed.lock().await;
                        *done += 1;
                        let _ = app_handle.emit("convert-progress", ConvertProgress {
                            file_name, current: *done, total, progress: 1.0,
                            status: "error".to_string(),
                        });
                        return;
                    }
                };

                if let Some(id) = child.id() {
                    CURRENT_CHILD_ID.store(id, Ordering::SeqCst);
                }
                let output = child.wait_with_output().await;
                CURRENT_CHILD_ID.store(0, Ordering::SeqCst);

                let mut done = completed.lock().await;
                *done += 1;
                let current = *done;
                drop(done);

                if CANCEL_FLAG.load(Ordering::SeqCst) {
                    let _ = std::fs::remove_file(&output_path);
                    return;
                }

                match output {
                    Ok(out) if out.status.success() => {
                        *success_count.lock().await += 1;
                        let _ = app_handle.emit("convert-progress", ConvertProgress {
                            file_name, current, total, progress: 1.0,
                            status: "done".to_string(),
                        });
                    }
                    Ok(out) => {
                        *fail_count.lock().await += 1;
                        let err_msg = String::from_utf8_lossy(&out.stderr).to_string();
                        errors.lock().await.push(format!("{}: {}", file_name, err_msg));
                        let _ = std::fs::remove_file(&output_path);
                        let _ = app_handle.emit("convert-progress", ConvertProgress {
                            file_name, current, total, progress: 1.0,
                            status: "error".to_string(),
                        });
                    }
                    Err(e) => {
                        *fail_count.lock().await += 1;
                        errors.lock().await.push(format!("{}: ffmpeg wait failed: {}", file_name, e));
                        let _ = std::fs::remove_file(&output_path);
                        let _ = app_handle.emit("convert-progress", ConvertProgress {
                            file_name, current, total, progress: 1.0,
                            status: "error".to_string(),
                        });
                    }
                }
            });

            // Control concurrency: wait for one task to complete before spawning more
            while join_set.len() >= max_parallel {
                if let Some(_) = join_set.join_next().await {}
            }
        }

        // Wait for all remaining tasks
        while let Some(_) = join_set.join_next().await {}

        let success_count = *success_count.lock().await;
        let fail_count = *fail_count.lock().await;
        let errors = errors.lock().await.clone();

        CURRENT_CHILD_ID.store(0, Ordering::SeqCst);

        Ok(BatchConvertResult {
            success_count,
            fail_count,
            output_dir: output_dir_path.to_string_lossy().to_string(),
            errors,
            original_size: None,
            compressed_size: None,
        })
    }.await;

    IS_CONVERTING.store(false, Ordering::SeqCst);
    CANCEL_FLAG.store(false, Ordering::SeqCst);
    result
}

#[derive(serde::Serialize)]
struct ProbeResult {
    duration: f64,
    file_size: u64,
    audio_tracks: Vec<AudioTrack>,
}

#[derive(serde::Serialize)]
struct AudioTrack {
    index: usize,
    codec: String,
    language: String,
    channels: String,
}

#[derive(serde::Serialize, Debug)]
struct MediaProbeError {
    code: String,
    message: String,
    path: String,
    details: Option<String>,
}

impl MediaProbeError {
    fn new(code: &str, message: impl Into<String>, path: &str, details: Option<String>) -> Self {
        Self { code: code.to_string(), message: message.into(), path: path.to_string(), details }
    }
}

#[derive(serde::Serialize, Clone)]
struct RationalValue { num: u64, den: u64, value: f64 }

#[derive(serde::Serialize)]
struct MediaVideoStream {
    index: usize,
    codec: String,
    profile: Option<String>,
    width: u64,
    height: u64,
    frame_rate: Option<RationalValue>,
    rotation: i64,
    pixel_format: Option<String>,
    color_space: Option<String>,
    color_transfer: Option<String>,
    color_primaries: Option<String>,
}

#[derive(serde::Serialize)]
struct MediaAudioStream {
    index: usize,
    codec: String,
    sample_rate: Option<u64>,
    channels: Option<u64>,
    channel_layout: Option<String>,
    language: Option<String>,
}

#[derive(serde::Serialize)]
struct MediaSubtitleStream { index: usize, codec: String, language: Option<String> }

#[derive(serde::Serialize)]
struct MediaFingerprint { size: u64, modified_ms: u128, fast_id: String }

#[derive(serde::Serialize)]
struct MediaProbeResult {
    path: String,
    kind: String,
    container: Option<String>,
    duration: Option<f64>,
    size: u64,
    bit_rate: Option<u64>,
    start_time: Option<f64>,
    video_streams: Vec<MediaVideoStream>,
    audio_streams: Vec<MediaAudioStream>,
    subtitle_streams: Vec<MediaSubtitleStream>,
    fingerprint: MediaFingerprint,
}

fn value_string(value: &serde_json::Value, key: &str) -> Option<String> {
    value.get(key).and_then(|entry| entry.as_str()).filter(|entry| !entry.is_empty()).map(str::to_string)
}

fn value_u64(value: &serde_json::Value, key: &str) -> Option<u64> {
    value.get(key).and_then(|entry| entry.as_u64().or_else(|| entry.as_str()?.parse().ok()))
}

fn value_f64(value: &serde_json::Value, key: &str) -> Option<f64> {
    value.get(key).and_then(|entry| entry.as_f64().or_else(|| entry.as_str()?.parse().ok())).filter(|entry| entry.is_finite())
}

fn parse_rational(value: Option<String>) -> Option<RationalValue> {
    let (num, den) = value?.split_once('/').map(|(num, den)| (num.to_string(), den.to_string()))?;
    let num = num.parse::<u64>().ok()?;
    let den = den.parse::<u64>().ok()?;
    if num == 0 || den == 0 { return None; }
    Some(RationalValue { num, den, value: num as f64 / den as f64 })
}

fn stream_language(stream: &serde_json::Value) -> Option<String> {
    stream.get("tags").and_then(|tags| value_string(tags, "language"))
}

fn stream_rotation(stream: &serde_json::Value) -> i64 {
    if let Some(rotation) = stream.get("tags").and_then(|tags| value_string(tags, "rotate")).and_then(|value| value.parse().ok()) {
        return rotation;
    }
    stream.get("side_data_list")
        .and_then(|entry| entry.as_array())
        .and_then(|entries| entries.iter().find_map(|entry| entry.get("rotation").and_then(|value| value.as_i64())))
        .unwrap_or(0)
}

fn media_kind(path: &str, has_video: bool, has_audio: bool, has_subtitle: bool) -> String {
    let extension = std::path::Path::new(path).extension().and_then(|value| value.to_str()).unwrap_or("").to_ascii_lowercase();
    if matches!(extension.as_str(), "jpg" | "jpeg" | "png" | "webp" | "bmp" | "gif") { return "image".to_string(); }
    if matches!(extension.as_str(), "srt" | "vtt" | "ass" | "ssa") { return "subtitle".to_string(); }
    if has_video { "video".to_string() }
    else if has_audio { "audio".to_string() }
    else if has_subtitle { "subtitle".to_string() }
    else { "unknown".to_string() }
}

fn parse_media_probe(input_path: &str, root: serde_json::Value, metadata: &std::fs::Metadata) -> Result<MediaProbeResult, MediaProbeError> {
    let streams = root.get("streams").and_then(|entry| entry.as_array()).ok_or_else(|| {
        MediaProbeError::new("probe.invalid_output", "ffprobe 未返回有效的媒体流", input_path, None)
    })?;
    let format = root.get("format").unwrap_or(&serde_json::Value::Null);
    let mut video_streams = Vec::new();
    let mut audio_streams = Vec::new();
    let mut subtitle_streams = Vec::new();
    for stream in streams {
        let index = value_u64(stream, "index").unwrap_or(0) as usize;
        let codec = value_string(stream, "codec_name").unwrap_or_else(|| "unknown".to_string());
        match value_string(stream, "codec_type").as_deref() {
            Some("video") => video_streams.push(MediaVideoStream {
                index,
                codec,
                profile: value_string(stream, "profile"),
                width: value_u64(stream, "width").unwrap_or(0),
                height: value_u64(stream, "height").unwrap_or(0),
                frame_rate: parse_rational(value_string(stream, "avg_frame_rate")).or_else(|| parse_rational(value_string(stream, "r_frame_rate"))),
                rotation: stream_rotation(stream),
                pixel_format: value_string(stream, "pix_fmt"),
                color_space: value_string(stream, "color_space"),
                color_transfer: value_string(stream, "color_transfer"),
                color_primaries: value_string(stream, "color_primaries"),
            }),
            Some("audio") => audio_streams.push(MediaAudioStream {
                index,
                codec,
                sample_rate: value_u64(stream, "sample_rate"),
                channels: value_u64(stream, "channels"),
                channel_layout: value_string(stream, "channel_layout"),
                language: stream_language(stream),
            }),
            Some("subtitle") => subtitle_streams.push(MediaSubtitleStream { index, codec, language: stream_language(stream) }),
            _ => {}
        }
    }
    let modified_ms = metadata.modified().ok()
        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis()).unwrap_or(0);
    let size = metadata.len();
    let kind = media_kind(input_path, !video_streams.is_empty(), !audio_streams.is_empty(), !subtitle_streams.is_empty());
    Ok(MediaProbeResult {
        path: input_path.to_string(),
        kind,
        container: value_string(format, "format_name"),
        duration: value_f64(format, "duration"),
        size,
        bit_rate: value_u64(format, "bit_rate"),
        start_time: value_f64(format, "start_time"),
        video_streams,
        audio_streams,
        subtitle_streams,
        fingerprint: MediaFingerprint { size, modified_ms, fast_id: format!("{:x}-{:x}", size, modified_ms) },
    })
}

#[tauri::command]
async fn probe_media(input_path: String) -> Result<MediaProbeResult, MediaProbeError> {
    let metadata = std::fs::metadata(&input_path).map_err(|error| {
        MediaProbeError::new("probe.file_unavailable", "无法读取所选素材", &input_path, Some(error.to_string()))
    })?;
    if !metadata.is_file() {
        return Err(MediaProbeError::new("probe.not_a_file", "所选路径不是文件", &input_path, None));
    }
    let ffprobe_path = get_ffprobe_path().map_err(|error| {
        MediaProbeError::new("probe.ffprobe_missing", "未找到 ffprobe 媒体分析组件", &input_path, Some(error))
    })?;
    let mut command = tokio::process::Command::new(&ffprobe_path);
    command.args(["-v", "error", "-print_format", "json", "-show_format", "-show_streams"])
        .arg(&input_path)
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());
    #[cfg(target_os = "windows")]
    command.creation_flags(0x08000000);

    let output = command.output().await.map_err(|error| {
        MediaProbeError::new("probe.launch_failed", "无法启动媒体分析组件", &input_path, Some(error.to_string()))
    })?;
    if !output.status.success() {
        return Err(MediaProbeError::new(
            "probe.unsupported_or_corrupt",
            "素材无法分析，文件可能损坏或格式暂不支持",
            &input_path,
            Some(String::from_utf8_lossy(&output.stderr).trim().to_string()),
        ));
    }
    let root = serde_json::from_slice(&output.stdout).map_err(|error| {
        MediaProbeError::new("probe.invalid_json", "媒体分析结果无法解析", &input_path, Some(error.to_string()))
    })?;
    parse_media_probe(&input_path, root, &metadata)
}

#[tauri::command]
async fn probe_video(input_path: String) -> Result<ProbeResult, String> {
    let probe = probe_media(input_path).await.map_err(|error| error.message)?;
    let audio_tracks = probe.audio_streams.into_iter().map(|stream| AudioTrack {
        index: stream.index,
        codec: stream.codec.to_uppercase(),
        language: stream.language.unwrap_or_else(|| "default".to_string()),
        channels: stream.channel_layout.or_else(|| stream.channels.map(|value| value.to_string())).unwrap_or_else(|| "unknown".to_string()),
    }).collect();
    Ok(ProbeResult { duration: probe.duration.unwrap_or(0.0), file_size: probe.size, audio_tracks })
}

#[cfg(test)]
mod media_probe_tests {
    use super::*;

    #[test]
    fn parses_video_audio_subtitle_and_rotation() {
        let root = serde_json::json!({
            "streams": [
                { "index": 0, "codec_type": "video", "codec_name": "h264", "width": 1920,
                  "height": 1080, "avg_frame_rate": "30000/1001", "pix_fmt": "yuv420p",
                  "side_data_list": [{ "rotation": 90 }] },
                { "index": 1, "codec_type": "audio", "codec_name": "aac", "sample_rate": "48000",
                  "channels": 2, "channel_layout": "stereo", "tags": { "language": "zho" } },
                { "index": 2, "codec_type": "subtitle", "codec_name": "subrip", "tags": { "language": "eng" } }
            ],
            "format": { "format_name": "mov,mp4", "duration": "12.5", "bit_rate": "1000000" }
        });
        let metadata = std::fs::metadata("Cargo.toml").expect("fixture metadata");
        let result = parse_media_probe("D:/素材/测试.mp4", root, &metadata).expect("valid probe");
        assert_eq!(result.kind, "video");
        assert_eq!(result.video_streams[0].rotation, 90);
        assert_eq!(result.video_streams[0].frame_rate.as_ref().unwrap().num, 30_000);
        assert_eq!(result.audio_streams[0].language.as_deref(), Some("zho"));
        assert_eq!(result.subtitle_streams[0].codec, "subrip");
        assert_eq!(result.duration, Some(12.5));
    }

    #[test]
    fn classifies_still_images_by_extension() {
        assert_eq!(media_kind("D:/图片/参考图.png", true, false, false), "image");
    }
}

#[derive(serde::Serialize)]
struct ExtractResult {
    success: bool,
    output_path: String,
    error: Option<String>,
}

#[tauri::command]
async fn extract_audio(
    input_path: String,
    output_dir: String,
    target_format: String,
    track_index: Option<usize>,
) -> Result<ExtractResult, String> {
    if output_dir.is_empty() {
        return Err("Output directory is empty".to_string());
    }

    let ffmpeg_path = get_ffmpeg_path()?;
    let output_dir_path = std::path::Path::new(&output_dir);
    std::fs::create_dir_all(output_dir_path).map_err(|e| e.to_string())?;

    let input = std::path::Path::new(&input_path);
    let stem = input.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_else(|| "output".to_string());

    let (encoder, extra_args, ext) = get_encoder_params(&target_format, &None);

    let mut output_path = output_dir_path.join(format!("{}_audio{}", stem, ext));
    let mut counter = 1;
    while output_path.exists() {
        output_path = output_dir_path.join(format!("{}_audio_{}{}", stem, counter, ext));
        counter += 1;
    }

    let mut cmd = tokio::process::Command::new(&ffmpeg_path);
    cmd.arg("-y")
       .arg("-i").arg(&input)
       .arg("-vn");

    // Select specific audio track if specified
    if let Some(idx) = track_index {
        cmd.arg("-map").arg(format!("0:a:{}", idx));
    }

    cmd.arg("-c:a").arg(&encoder)
       .args(&extra_args)
       .arg(&output_path)
       .stdin(std::process::Stdio::null())
       .stdout(std::process::Stdio::piped())
       .stderr(std::process::Stdio::piped());

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }

    let child = cmd.spawn().map_err(|e| format!("Failed to start ffmpeg: {}", e))?;
    let output = child.wait_with_output().await.map_err(|e| format!("ffmpeg wait failed: {}", e))?;

    if output.status.success() {
        Ok(ExtractResult {
            success: true,
            output_path: output_path.to_string_lossy().to_string(),
            error: None,
        })
    } else {
        let _ = std::fs::remove_file(&output_path);
        let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
        // Extract a shorter error message
        let short_err = err_msg.lines()
            .filter(|l| l.contains("Error") || l.contains("error") || l.contains("Invalid"))
            .last()
            .unwrap_or("Extraction failed")
            .trim()
            .to_string();
        Ok(ExtractResult {
            success: false,
            output_path: String::new(),
            error: Some(short_err),
        })
    }
}

fn is_path_safe(path: &std::path::Path) -> Result<(), String> {
    // Try to canonicalize the path. If it doesn't exist (e.g. a new output file
    // or a not-yet-created subdirectory), walk up ancestors until one exists.
    let canonical = path.canonicalize().or_else(|_| {
        let mut ancestor = path.parent();
        while let Some(a) = ancestor {
            if let Ok(c) = a.canonicalize() {
                return Ok(c);
            }
            ancestor = a.parent();
        }
        Err(std::io::Error::new(std::io::ErrorKind::NotFound, "No existing ancestor"))
    }).map_err(|e| format!("Invalid path: {}", e))?;
    let docs = dirs::document_dir().ok_or("Cannot find Documents folder")?;
    let dl = dirs::download_dir().ok_or("Cannot find Download folder")?;
    let appdata = dirs::data_dir().ok_or("Cannot find AppData folder")?;
    let temp = std::env::temp_dir();
    // Canonicalize all comparison dirs so prefixes match (Windows \\?\ prefix)
    let docs_c = docs.canonicalize().unwrap_or(docs.clone());
    let dl_c = dl.canonicalize().unwrap_or(dl.clone());
    let appdata_c = appdata.canonicalize().unwrap_or(appdata.clone());
    let temp_c = temp.canonicalize().unwrap_or(temp.clone());
    // Also allow the exe's parent directory (install directory) for output files
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|e| e.parent().map(|p| p.to_path_buf()))
        .and_then(|p| p.canonicalize().ok().or(Some(p)));
    // Also allow the install_path from install_config.json (may differ from exe_dir if exe is in a subdirectory)
    let install_dir = {
        let exe = std::env::current_exe().ok();
        exe.and_then(|e| e.parent().and_then(|p| {
            let mut search = p.to_path_buf();
            for _ in 0..4 {
                let candidate = search.join("install_config.json");
                if candidate.exists() {
                    if let Ok(content) = std::fs::read_to_string(&candidate) {
                        if let Ok(config) = serde_json::from_str::<serde_json::Value>(&content) {
                            if let Some(ip) = config.get("installPath").and_then(|v| v.as_str()) {
                                let p = std::path::PathBuf::from(ip);
                                return p.canonicalize().ok().or(Some(p));
                            }
                        }
                    }
                }
                match search.parent() {
                    Some(p2) => search = p2.to_path_buf(),
                    None => break,
                }
            }
            None
        }))
    };
    let storage_dir = get_storage_override().map(std::path::PathBuf::from).map(|path| {
        path.canonicalize().unwrap_or(path)
    });
    let is_allowed = canonical.starts_with(&docs_c)
        || canonical.starts_with(&dl_c)
        || canonical.starts_with(&appdata_c)
        || canonical.starts_with(&temp_c)
        || exe_dir.as_ref().map_or(false, |d| canonical.starts_with(d))
        || install_dir.as_ref().map_or(false, |d| canonical.starts_with(d))
        || storage_dir.as_ref().map_or(false, |d| canonical.starts_with(d));
    if is_allowed {
        Ok(())
    } else {
        Err("Path outside allowed directories".to_string())
    }
}

#[tauri::command]
fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    // Reject files larger than 500MB to prevent OOM
    const MAX_FILE_SIZE: u64 = 500 * 1024 * 1024;
    if path.contains('\0') { return Err("Invalid path".to_string()); }
    let metadata = std::fs::metadata(&path).map_err(|e| format!("Failed to read file metadata: {}", e))?;
    if metadata.len() > MAX_FILE_SIZE {
        return Err(format!("File too large ({}MB, max 500MB)", metadata.len() / 1024 / 1024));
    }
    std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn write_file_bytes(path: String, bytes: Vec<u8>) -> Result<(), String> {
    use std::fs;
    use std::path::Path;
    let path = Path::new(&path);
    is_path_safe(path)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    fs::write(path, bytes).map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
fn write_file_chunk(path: String, offset: u64, bytes: Vec<u8>) -> Result<(), String> {
    use std::fs::OpenOptions;
    use std::io::{Seek, SeekFrom, Write};
    is_path_safe(std::path::Path::new(&path))?;
    if let Some(parent) = std::path::Path::new(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    let mut file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(offset == 0)
        .open(&path)
        .map_err(|e| format!("Failed to open file: {}", e))?;
    if offset > 0 {
        file.seek(SeekFrom::Start(offset)).map_err(|e| format!("Failed to seek: {}", e))?;
    }
    file.write_all(&bytes).map_err(|e| format!("Failed to write: {}", e))
}

#[tauri::command]
fn exists_path(path: String) -> Result<bool, String> {
    if path.contains('\0') { return Err("Invalid path".to_string()); }
    Ok(std::path::Path::new(&path).exists())
}

#[tauri::command]
fn get_file_size(path: String) -> Result<u64, String> {
    if path.contains('\0') { return Err("Invalid path".to_string()); }
    std::fs::metadata(&path).map(|m| m.len()).map_err(|e| format!("Failed to read file metadata: {}", e))
}

#[tauri::command]
fn reveal_in_folder(path: String) -> Result<(), String> {
    if path.contains('\0') { return Err("Invalid path".to_string()); }
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("explorer")
            .args(["/select,", &path])
            .creation_flags(0x08000000)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(std::path::Path::new(&path).parent().unwrap_or(std::path::Path::new(".")))
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn open_path(path: String) -> Result<(), String> {
    if path.contains('\0') { return Err("Invalid path".to_string()); }
    let requested_path = std::path::PathBuf::from(&path);
    if !requested_path.exists() {
        std::fs::create_dir_all(&requested_path).map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("explorer")
            .arg(&path)
            .creation_flags(0x08000000)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let app = tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
    open_url, get_documents_dir, get_download_dir, get_install_lang, get_install_config, set_storage_path,
      get_ai_paths, list_ai_runtime_catalog, get_ai_runtime_state, set_ai_runtime_installed,
      install_ai_runtime, cancel_ai_runtime_install, rollback_ai_runtime, start_ai_runtime,
      find_bundled_ai_runtime, clear_ai_runtime_cache,
      get_system_status,
      convert_audio_batch, cancel_convert, open_path, reveal_in_folder,
      read_file_bytes, write_file_bytes, write_file_chunk, exists_path, get_file_size,
      trim_audio, probe_video, probe_media, extract_audio,
      check_ffmpeg,
      convert_image_batch,
      compress_image_batch,
      convert_video_batch,
    comfy_http_json, comfy_upload_image, comfy_download_output, install_comfy_video_helper, install_comfy_h3_nodes,
      download_comfy_model, cancel_comfy_model_download,
      start_comfy_local, stop_comfy_local, comfy_process_status,
      quit_application,
      set_tray_lang,
    ])
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // 系统托盘
      let lang = read_initial_lang();
      let menu = build_tray_menu(app.handle(), &lang)?;

      let _tray = tauri::tray::TrayIconBuilder::with_id("main-tray")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
          "show" => {
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.show();
              let _ = window.set_focus();
            }
          }
          "quit" => {
            let _ = terminate_managed_services();
            app.exit(0);
          }
          _ => {}
        })
        .on_tray_icon_event(|tray, event| {
          if let tauri::tray::TrayIconEvent::Click { button, button_state, .. } = event {
            if button == tauri::tray::MouseButton::Left && button_state == tauri::tray::MouseButtonState::Up {
              if let Some(window) = tray.app_handle().get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
              }
            }
          }
        })
        .build(app)?;

      // 同步置顶状态到托盘菜单（可选）
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_always_on_top(false);
      }

      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application");

  app.run(|_app_handle, event| {
    if matches!(event, tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit) {
      let _ = terminate_managed_services();
    }
  });
}
