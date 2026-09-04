use tauri::Manager;

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

// ===== Audio Conversion =====

use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Mutex;

static IS_CONVERTING: AtomicBool = AtomicBool::new(false);
static CANCEL_FLAG: AtomicBool = AtomicBool::new(false);
static CURRENT_CHILD_ID: AtomicU32 = AtomicU32::new(0);
static COMFY_CHILD: Mutex<Option<std::process::Child>> = Mutex::new(None);

#[derive(serde::Serialize)]
struct ComfyProcessInfo {
    running: bool,
    pid: u32,
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
fn start_comfy_local(comfy_path: String, python_path: String, port: u16) -> Result<ComfyProcessInfo, String> {
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
    let mut managed_child = COMFY_CHILD.lock().map_err(|_| "无法读取 ComfyUI 进程状态".to_string())?;
    let Some(mut child) = managed_child.take() else {
        return Ok(ComfyProcessInfo { running: false, pid: 0 });
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
    Ok(ComfyProcessInfo { running: false, pid: 0 })
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

        // Build encoder-specific extra args
        let encoder_args: Vec<String> = if nvenc_available {
            // NVENC: fast preset + zero-latency tuning for speed
            vec!["-preset".to_string(), "fast".to_string(),
                 "-tune".to_string(), "zerolatency".to_string(),
                 "-rc".to_string(), "vbr".to_string(),
                 "-cq".to_string(), "28".to_string()]
        } else if video_encoder == "libx264" {
            // x264 CPU: fast preset + CRF 28 for speed
            vec!["-preset".to_string(), "fast".to_string(),
                 "-crf".to_string(), "28".to_string()]
        } else if video_encoder == "libvpx-vp9" {
            // VP9: speed 2 for faster encoding
            vec!["-speed".to_string(), "2".to_string(),
                 "-crf".to_string(), "32".to_string()]
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

#[tauri::command]
async fn probe_video(input_path: String) -> Result<ProbeResult, String> {
    let ffmpeg_path = get_ffmpeg_path()?;
    let mut cmd = tokio::process::Command::new(&ffmpeg_path);
    cmd.arg("-i").arg(&input_path)
       .arg("-hide_banner")
       .stdin(std::process::Stdio::null())
       .stdout(std::process::Stdio::piped())
       .stderr(std::process::Stdio::piped());

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }

    let output = cmd.spawn().map_err(|e| format!("Failed to run ffmpeg: {}", e))?
        .wait_with_output().await.map_err(|e| format!("ffmpeg wait failed: {}", e))?;

    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    // Parse duration
    let mut duration: f64 = 0.0;
    for line in stderr.lines() {
        if line.contains("Duration:") {
            let start = line.find("Duration:").map(|i| i + 9);
            if let Some(s) = start {
                let dur_str = line[s..].trim();
                let end = dur_str.find(',').unwrap_or(dur_str.len());
                let parts: Vec<&str> = dur_str[..end].trim().split(':').collect();
                if parts.len() == 3 {
                    let h: f64 = parts[0].trim().parse().unwrap_or(0.0);
                    let m: f64 = parts[1].trim().parse().unwrap_or(0.0);
                    let s: f64 = parts[2].trim().parse().unwrap_or(0.0);
                    duration = h * 3600.0 + m * 60.0 + s;
                }
            }
            break;
        }
    }

    // Parse audio tracks
    let mut audio_tracks = Vec::new();
    for line in stderr.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("Stream #") && trimmed.contains("Audio:") {
            let index = audio_tracks.len();
            let codec = if trimmed.contains("mp3") { "MP3" }
                else if trimmed.contains("aac") { "AAC" }
                else if trimmed.contains("ac3") { "AC3" }
                else if trimmed.contains("vorbis") { "Vorbis" }
                else if trimmed.contains("opus") { "Opus" }
                else if trimmed.contains("flac") { "FLAC" }
                else if trimmed.contains("pcm") { "PCM" }
                else { "Unknown" };
            let language = if trimmed.contains("(") {
                let lang_start = trimmed.rfind("(").map(|i| i + 1);
                let lang_end = trimmed.rfind(")").unwrap_or(trimmed.len());
                if let Some(s) = lang_start {
                    trimmed[s..lang_end].to_string()
                } else { "default".to_string() }
            } else { "default".to_string() };
            let channels = if trimmed.contains("mono") { "mono" }
                else if trimmed.contains("stereo") { "stereo" }
                else if trimmed.contains("5.1") { "5.1" }
                else if trimmed.contains("7.1") { "7.1" }
                else { "unknown" };
            audio_tracks.push(AudioTrack {
                index,
                codec: codec.to_string(),
                language,
                channels: channels.to_string(),
            });
        }
    }

    let file_size = std::fs::metadata(&input_path).map(|m| m.len()).unwrap_or(0);

    Ok(ProbeResult {
        duration,
        file_size,
        audio_tracks,
    })
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
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
    open_url, get_documents_dir, get_download_dir, get_install_lang, get_install_config, set_storage_path,
      convert_audio_batch, cancel_convert, open_path, reveal_in_folder,
      read_file_bytes, write_file_bytes, write_file_chunk, exists_path, get_file_size,
      trim_audio, probe_video, extract_audio,
      check_ffmpeg,
      convert_image_batch,
      compress_image_batch,
      convert_video_batch,
    comfy_http_json, comfy_download_output, install_comfy_video_helper,
      start_comfy_local, stop_comfy_local, comfy_process_status,
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
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
