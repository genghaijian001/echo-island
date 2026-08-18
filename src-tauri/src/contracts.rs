use serde::Serialize;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioLevel {
    pub rms: f32,
    pub peak: f32,
    pub timestamp_ms: i64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum MonitorPhase {
    Idle,
    Starting,
    Listening,
    Recognizing,
    Matched,
    Error,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MusicSource {
    pub platform: String,
    pub label: String,
    pub available: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub embed_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecognizedTrack {
    pub id: String,
    pub title: String,
    pub artist: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub album: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub artwork_url: Option<String>,
    pub recognized_at: String,
    pub sources: Vec<MusicSource>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorSnapshot {
    pub running: bool,
    pub phase: MonitorPhase,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_track: Option<RecognizedTrack>,
}

impl Default for MonitorSnapshot {
    fn default() -> Self {
        Self {
            running: false,
            phase: MonitorPhase::Idle,
            message: "点击开始识别电脑声音".into(),
            current_track: None,
        }
    }
}
