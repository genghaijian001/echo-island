use crate::{contracts::MonitorSnapshot, MonitorState};
use tauri::{AppHandle, State};

#[tauri::command]
pub fn get_monitor_snapshot(state: State<'_, MonitorState>) -> MonitorSnapshot {
    state.snapshot.lock().clone()
}

#[tauri::command]
pub fn start_monitoring(
    app: AppHandle,
    state: State<'_, MonitorState>,
) -> Result<MonitorSnapshot, String> {
    state.start(app)
}

#[tauri::command]
pub fn stop_monitoring(state: State<'_, MonitorState>) -> MonitorSnapshot {
    state.stop()
}
