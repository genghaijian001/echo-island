use crate::contracts::{MusicSource, RecognizedTrack};
use songrec::{Config, SongRec};

pub struct SongRecProvider {
    client: SongRec,
}

impl SongRecProvider {
    pub fn new() -> Self {
        let config = Config::default()
            .with_quiet_mode(true)
            .with_network_timeout(18)
            .with_sensitivity(0.65);
        Self {
            client: SongRec::new(config),
        }
    }

    pub fn recognize(&self, samples: &[i16], sample_rate: u32) -> Result<RecognizedTrack, String> {
        let result = self
            .client
            .recognize_from_samples(samples, sample_rate)
            .map_err(|error| error.to_string())?;

        let raw = &result.raw_response;
        let track = raw.get("track");
        let artwork_url = track
            .and_then(|value| value.pointer("/images/coverarthq"))
            .or_else(|| track.and_then(|value| value.pointer("/images/coverart")))
            .and_then(serde_json::Value::as_str)
            .map(str::to_owned);

        let youtube_id = find_youtube_id(raw);
        let search_terms = format!("{} {}", result.artist_name, result.song_name);
        let query = urlencoding::encode(&search_terms);
        let youtube_url = youtube_id
            .as_ref()
            .map(|id| format!("https://music.youtube.com/watch?v={id}"))
            .unwrap_or_else(|| format!("https://music.youtube.com/search?q={query}"));

        Ok(RecognizedTrack {
            id: result.track_key,
            title: result.song_name,
            artist: result.artist_name,
            album: result.album_name,
            artwork_url,
            recognized_at: result.recognition_timestamp.to_rfc3339(),
            sources: vec![
                MusicSource {
                    platform: "youtube".into(),
                    label: "YouTube Music".into(),
                    available: youtube_id.is_some(),
                    url: Some(youtube_url),
                    embed_url: youtube_id
                        .map(|id| format!("https://www.youtube.com/embed/{id}?playsinline=1")),
                    note: None,
                },
                MusicSource {
                    platform: "netease".into(),
                    label: "网易云音乐".into(),
                    available: false,
                    url: Some(format!("https://music.163.com/#/search/m/?s={query}")),
                    embed_url: None,
                    note: Some("等待受支持的播放 API".into()),
                },
                MusicSource {
                    platform: "qq".into(),
                    label: "QQ 音乐".into(),
                    available: false,
                    url: Some(format!("https://y.qq.com/n/ryqq/search?w={query}")),
                    embed_url: None,
                    note: Some("等待受支持的播放 API".into()),
                },
            ],
        })
    }
}

fn find_youtube_id(raw: &serde_json::Value) -> Option<String> {
    raw.pointer("/track/youtubeurl")
        .and_then(serde_json::Value::as_str)
        .and_then(extract_video_id)
        .or_else(|| {
            raw.pointer("/track/hub/actions")?
                .as_array()?
                .iter()
                .filter_map(|action| action.get("uri")?.as_str())
                .find_map(extract_video_id)
        })
}

fn extract_video_id(url: &str) -> Option<String> {
    if let Some((_, id)) = url.split_once("youtu.be/") {
        return Some(id.split(['?', '&']).next()?.to_owned());
    }
    let query = url.split_once('?')?.1;
    query.split('&').find_map(|pair| {
        let (key, value) = pair.split_once('=')?;
        (key == "v").then(|| value.to_owned())
    })
}

#[cfg(test)]
mod tests {
    use super::extract_video_id;

    #[test]
    fn extracts_supported_youtube_urls() {
        assert_eq!(
            extract_video_id("https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share"),
            Some("dQw4w9WgXcQ".into())
        );
        assert_eq!(
            extract_video_id("https://youtu.be/dQw4w9WgXcQ?t=10"),
            Some("dQw4w9WgXcQ".into())
        );
    }
}
