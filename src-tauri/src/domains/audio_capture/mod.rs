//! Windows default render-endpoint capture boundary.

use std::{
    collections::VecDeque,
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc, Arc,
    },
    time::{Duration, Instant},
};

use auricle_capture::{drain_into, start_loopback, MonoResampler};
use chrono::Utc;
use parking_lot::Mutex;
use tauri::{AppHandle, Emitter};

use crate::{
    contracts::{AudioLevel, MonitorPhase, MonitorSnapshot},
    domains::recognition::songrec_provider::SongRecProvider,
};

pub const RECOGNITION_WINDOW_SECONDS: usize = 8;
pub const RECOGNITION_COOLDOWN_SECONDS: u64 = 10;
pub const SILENCE_RMS_THRESHOLD: f32 = 0.008;
const FINGERPRINT_SAMPLE_RATE: u32 = 16_000;
const LEVEL_EMIT_INTERVAL: Duration = Duration::from_millis(80);

pub fn run(
    app: AppHandle,
    running: Arc<AtomicBool>,
    snapshot: Arc<Mutex<MonitorSnapshot>>,
) -> Result<(), String> {
    let (capture_handle, mut consumer) =
        start_loopback("default").map_err(|error| format!("无法捕获默认播放设备：{error}"))?;
    let mut resampler = MonoResampler::new(consumer.native_rate_hz, FINGERPRINT_SAMPLE_RATE)
        .map_err(|error| format!("无法初始化音频重采样器：{error}"))?;

    publish_status(
        &app,
        &snapshot,
        MonitorPhase::Listening,
        format!("正在监听 {}", capture_handle.device_name),
    );

    let (recognition_tx, recognition_rx) = mpsc::sync_channel::<Vec<i16>>(1);
    let worker_running = Arc::clone(&running);
    let worker_snapshot = Arc::clone(&snapshot);
    let worker_app = app.clone();
    let recognition_worker = std::thread::Builder::new()
        .name("echo-island-recognition".into())
        .spawn(move || {
            recognition_worker_loop(worker_app, worker_running, worker_snapshot, recognition_rx)
        })
        .map_err(|error| format!("无法启动识别线程：{error}"))?;

    let max_samples = FINGERPRINT_SAMPLE_RATE as usize * RECOGNITION_WINDOW_SECONDS;
    let mut rolling = VecDeque::<f32>::with_capacity(max_samples);
    let mut native_chunk = Vec::<f32>::with_capacity(8_192);
    let mut fingerprint_chunk = Vec::<f32>::with_capacity(4_096);
    let mut last_level_emit = Instant::now() - LEVEL_EMIT_INTERVAL;
    let mut last_recognition = Instant::now() - Duration::from_secs(RECOGNITION_COOLDOWN_SECONDS);

    while running.load(Ordering::Relaxed) {
        native_chunk.clear();
        drain_into(&mut consumer.consumer, &mut native_chunk);
        if native_chunk.is_empty() {
            if let Some(error) = capture_handle.stream_error() {
                return Err(format!("播放设备已断开：{error}"));
            }
            std::thread::sleep(Duration::from_millis(12));
            continue;
        }

        let (rms, peak) = audio_levels(&native_chunk);
        if last_level_emit.elapsed() >= LEVEL_EMIT_INTERVAL {
            app.emit(
                "audio-level",
                AudioLevel {
                    rms,
                    peak,
                    timestamp_ms: Utc::now().timestamp_millis(),
                },
            )
            .ok();
            last_level_emit = Instant::now();
        }

        fingerprint_chunk.clear();
        resampler
            .process(&native_chunk, &mut fingerprint_chunk)
            .map_err(|error| format!("音频重采样失败：{error}"))?;
        rolling.extend(fingerprint_chunk.iter().copied());
        while rolling.len() > max_samples {
            rolling.pop_front();
        }

        if rolling.len() == max_samples
            && rms >= SILENCE_RMS_THRESHOLD
            && last_recognition.elapsed() >= Duration::from_secs(RECOGNITION_COOLDOWN_SECONDS)
        {
            let samples = rolling
                .iter()
                .map(|sample| (sample.clamp(-1.0, 1.0) * i16::MAX as f32) as i16)
                .collect();
            if recognition_tx.try_send(samples).is_ok() {
                publish_status(
                    &app,
                    &snapshot,
                    MonitorPhase::Recognizing,
                    "正在匹配音乐指纹…".into(),
                );
                last_recognition = Instant::now();
            }
        }
    }

    capture_handle.pause().ok();
    drop(recognition_tx);
    recognition_worker.join().ok();
    Ok(())
}

fn recognition_worker_loop(
    app: AppHandle,
    running: Arc<AtomicBool>,
    snapshot: Arc<Mutex<MonitorSnapshot>>,
    receiver: mpsc::Receiver<Vec<i16>>,
) {
    let provider = SongRecProvider::new();
    while let Ok(samples) = receiver.recv() {
        let result = provider.recognize(&samples, FINGERPRINT_SAMPLE_RATE);
        if !running.load(Ordering::Relaxed) {
            break;
        }

        match result {
            Ok(track) => {
                let changed = snapshot
                    .lock()
                    .current_track
                    .as_ref()
                    .is_none_or(|current| current.id != track.id);
                if changed {
                    {
                        let mut current = snapshot.lock();
                        current.running = true;
                        current.phase = MonitorPhase::Matched;
                        current.message = "已识别当前播放".into();
                        current.current_track = Some(track.clone());
                    }
                    app.emit("track-recognized", track).ok();
                } else {
                    publish_status(
                        &app,
                        &snapshot,
                        MonitorPhase::Matched,
                        "仍在播放当前歌曲".into(),
                    );
                }
            }
            Err(error) => publish_status(
                &app,
                &snapshot,
                MonitorPhase::Listening,
                format!("暂未识别，继续监听：{error}"),
            ),
        }
    }
}

fn publish_status(
    app: &AppHandle,
    snapshot: &Arc<Mutex<MonitorSnapshot>>,
    phase: MonitorPhase,
    message: String,
) {
    let status = {
        let mut current = snapshot.lock();
        current.running = true;
        current.phase = phase;
        current.message = message;
        current.clone()
    };
    app.emit("monitor-status", status).ok();
}

fn audio_levels(samples: &[f32]) -> (f32, f32) {
    let mut sum_squares = 0.0f64;
    let mut peak = 0.0f32;
    for sample in samples {
        let absolute = sample.abs();
        peak = peak.max(absolute);
        sum_squares += (*sample as f64) * (*sample as f64);
    }
    let rms = (sum_squares / samples.len() as f64).sqrt() as f32;
    (rms.clamp(0.0, 1.0), peak.clamp(0.0, 1.0))
}

#[cfg(test)]
mod tests {
    use super::audio_levels;

    #[test]
    fn level_measurement_is_bounded() {
        let (rms, peak) = audio_levels(&[0.5, -0.5, 0.5, -0.5]);
        assert!((rms - 0.5).abs() < 0.001);
        assert_eq!(peak, 0.5);
    }
}
