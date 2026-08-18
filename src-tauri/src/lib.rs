mod commands;
mod contracts;
mod domains;

use std::path::Path;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

use contracts::{MonitorPhase, MonitorSnapshot};
use parking_lot::Mutex;
use tauri::{AppHandle, Emitter};

pub struct MonitorState {
    running: Arc<AtomicBool>,
    snapshot: Arc<Mutex<MonitorSnapshot>>,
}

impl Default for MonitorState {
    fn default() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            snapshot: Arc::new(Mutex::new(MonitorSnapshot::default())),
        }
    }
}

impl MonitorState {
    fn start(&self, app: AppHandle) -> Result<MonitorSnapshot, String> {
        if self.running.swap(true, Ordering::SeqCst) {
            return Ok(self.snapshot.lock().clone());
        }

        let starting = MonitorSnapshot {
            running: true,
            phase: MonitorPhase::Starting,
            message: "正在连接默认播放设备…".into(),
            current_track: self.snapshot.lock().current_track.clone(),
        };
        *self.snapshot.lock() = starting.clone();
        app.emit("monitor-status", &starting).ok();

        let running = Arc::clone(&self.running);
        let snapshot = Arc::clone(&self.snapshot);
        std::thread::Builder::new()
            .name("echo-island-monitor".into())
            .spawn(move || run_monitor_loop(app, running, snapshot))
            .map_err(|error| {
                self.running.store(false, Ordering::SeqCst);
                error.to_string()
            })?;

        Ok(starting)
    }

    fn stop(&self) -> MonitorSnapshot {
        self.running.store(false, Ordering::SeqCst);
        let stopped = MonitorSnapshot {
            running: false,
            phase: MonitorPhase::Idle,
            message: "已停止监听".into(),
            current_track: self.snapshot.lock().current_track.clone(),
        };
        *self.snapshot.lock() = stopped.clone();
        stopped
    }
}

fn run_monitor_loop(
    app: AppHandle,
    running: Arc<AtomicBool>,
    snapshot: Arc<Mutex<MonitorSnapshot>>,
) {
    if let Err(error) =
        domains::audio_capture::run(app.clone(), Arc::clone(&running), Arc::clone(&snapshot))
    {
        running.store(false, Ordering::SeqCst);
        let failed = MonitorSnapshot {
            running: false,
            phase: MonitorPhase::Error,
            message: error,
            current_track: snapshot.lock().current_track.clone(),
        };
        *snapshot.lock() = failed.clone();
        app.emit("monitor-status", failed).ok();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(MonitorState::default())
        .setup(|app| {
            let window_config = app
                .config()
                .app
                .windows
                .first()
                .ok_or("missing main window configuration")?;
            let project_root = Path::new(env!("CARGO_MANIFEST_DIR"))
                .parent()
                .ok_or("failed to resolve the EchoIsland project root")?;
            let webview_data_dir = project_root.join(".cache").join("webview-profile-v2");

            tauri::WebviewWindowBuilder::from_config(app, window_config)?
                .data_directory(webview_data_dir)
                .build()?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::monitor::get_monitor_snapshot,
            commands::monitor::start_monitoring,
            commands::monitor::stop_monitoring,
        ])
        .run(tauri::generate_context!())
        .expect("error while running EchoIsland");
}
