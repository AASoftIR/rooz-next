//! Offline neural speech for Linux. Android TextToSpeech cannot run in an AppImage,
//! so Rooz uses Piper's downloadable local voices and streams PCM straight to ALSA.
//! No text or audio is sent to a speech service, and no temporary WAV is written.
use std::{fs,io::{Read,Write},path::PathBuf,process::{Child,ExitStatus,Stdio},sync::{Arc,Mutex,OnceLock,atomic::{AtomicU64,Ordering}},thread,time::{Duration,Instant}};
use crate::host_command;

static SPEECH_SESSION: AtomicU64 = AtomicU64::new(0);
type SharedChild=Arc<Mutex<Child>>;
type ActiveSpeech=(u64,SharedChild,SharedChild);
static ACTIVE_SPEECH:OnceLock<Mutex<Option<ActiveSpeech>>>=OnceLock::new();

fn active_slot()->&'static Mutex<Option<ActiveSpeech>> {
    ACTIVE_SPEECH.get_or_init(||Mutex::new(None))
}
fn kill_child(child:&SharedChild) {
    if let Ok(mut process)=child.lock() {let _=process.kill();}
}

fn finish_child(child:&SharedChild,timeout:Duration)->Result<ExitStatus,String> {
    let started=Instant::now();
    loop {
        if let Some(status)=child.lock().map_err(|_|"Speech process lock poisoned")?
            .try_wait().map_err(|e|e.to_string())? {return Ok(status);}
        if started.elapsed()>=timeout {
            kill_child(child);
            return child.lock().map_err(|_|String::from("Speech process lock poisoned"))?
                .wait().map_err(|e|e.to_string());
        }
        thread::sleep(Duration::from_millis(40));
    }
}

fn voice_name(language: &str) -> &'static str {
    if language == "fa" { "fa_IR-reza_ibrahim-medium" } else { "en_US-lessac-high" }
}

fn model_path(language: &str) -> PathBuf {
    let override_key = if language == "fa" { "ROOZ_PIPER_VOICE_FA" } else { "ROOZ_PIPER_VOICE_EN" };
    if let Some(path) = std::env::var_os(override_key).filter(|s| !s.is_empty()) {
        return PathBuf::from(path);
    }
    dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."))
        .join("rooz").join("voices").join(format!("{}.onnx", voice_name(language)))
}

fn config_path(model: &std::path::Path) -> PathBuf {
    model.with_extension("onnx.json")
}

fn sample_rate(model: &std::path::Path) -> Result<u32,String> {
    let config = fs::read(config_path(model)).map_err(|e| format!("Piper voice configuration missing: {e}"))?;
    let value: serde_json::Value = serde_json::from_slice(&config).map_err(|e| format!("Piper voice configuration is invalid: {e}"))?;
    let rate = value.pointer("/audio/sample_rate").and_then(|r| r.as_u64()).unwrap_or(0);
    if !(8000..=48000).contains(&rate) { return Err("Invalid Piper voice sample rate".into()); }
    Ok(rate as u32)
}

fn executable_in_path(name: &str) -> bool {
    std::env::split_paths(&std::env::var_os("PATH").unwrap_or_default())
        .any(|dir| dir.join(name).is_file())
}

fn piper_bin() -> Option<&'static str> {
    if executable_in_path("piper") {Some("piper")}
    else if executable_in_path("piper-tts") {Some("piper-tts")}
    else {None}
}

pub(crate) fn model_location(language: &str) -> String {
    model_path(language).to_string_lossy().into_owned()
}

pub(crate) fn ready(language: &str) -> bool {
    let model=model_path(language);
    model.is_file() && sample_rate(&model).is_ok() && piper_bin().is_some() && executable_in_path("aplay")
}

pub(crate) fn stop() {
    SPEECH_SESSION.fetch_add(1,Ordering::SeqCst);
    if let Ok(active)=active_slot().lock() {
        if let Some((_,synth,player))=active.as_ref(){
            // Kill both processes, including the case where Piper has not
            // produced its first audio frame and the reader is blocked.
            kill_child(synth);
            kill_child(player);
        }
    }
}

pub(crate) fn speak(text: String, language: String) -> Result<(),String> {
    if text.chars().count()>800 || text.contains('\0') {return Err("Speech text must be 800 characters or fewer".into());}
    if text.trim().is_empty() {return Ok(());}
    let language=if language=="fa" {"fa"} else {"en"};
    let model=model_path(language);
    if !model.is_file() {return Err(format!("Natural voice not installed. Run: bash scripts/setup-local-voice.sh speaker-{}", if language=="fa" {"persian"} else {"english"}));}
    let rate=sample_rate(&model)?;
    let bin=piper_bin().ok_or("Piper is missing. Install piper-tts-bin (AUR) or piper-tts first")?;
    if !executable_in_path("aplay") {return Err("aplay is missing: sudo pacman -S alsa-utils".into());}
    stop(); // never allow an old reply to monopolize the next interaction
    let session=SPEECH_SESSION.fetch_add(1,Ordering::SeqCst)+1;

    let mut synth=host_command::command(bin)
        .arg("--model").arg(&model).arg("--output-raw")
        .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::null())
        .spawn().map_err(|e|format!("Cannot start Piper: {e}"))?;
    if let Some(mut input)=synth.stdin.take() {
        if let Err(e)=input.write_all(format!("{}\n",text.trim()).as_bytes()) {
            let _=synth.kill();let _=synth.wait();return Err(format!("Piper input failed: {e}"));
        }
    }
    let mut player=match host_command::command("aplay")
        .args(["-q","-t","raw","-f","S16_LE","-c","1","-r",&rate.to_string(),"-"])
        .stdin(Stdio::piped()).stdout(Stdio::null()).stderr(Stdio::null()).spawn() {
            Ok(child)=>child,
            Err(e)=>{let _=synth.kill();let _=synth.wait();return Err(format!("Audio playback unavailable: {e}"));}
        };
    let mut pcm=synth.stdout.take().ok_or("Piper produced no audio stream")?;
    let mut output=player.stdin.take().ok_or("Cannot stream audio to speaker")?;
    let synth=Arc::new(Mutex::new(synth));
    let player=Arc::new(Mutex::new(player));
    {
        let mut active=active_slot().lock().map_err(|_|"Speech session lock poisoned")?;
        *active=Some((session,synth.clone(),player.clone()));
    }
    let result=(|| -> Result<(),String> {
        let mut buffer=[0u8;16384];
        loop {
            if session!=SPEECH_SESSION.load(Ordering::SeqCst) {return Ok(());}
            let count=pcm.read(&mut buffer).map_err(|e|format!("Piper audio read error: {e}"))?;
            if count==0 {break;}
            output.write_all(&buffer[..count]).map_err(|e|format!("Speaker playback error: {e}"))?;
        }
        Ok(())
    })();
    drop(output);
    drop(pcm);
    if session!=SPEECH_SESSION.load(Ordering::SeqCst) || result.is_err() {
        kill_child(&synth);kill_child(&player);
    }
    let synth_result=finish_child(&synth,Duration::from_secs(3));
    let player_result=finish_child(&player,Duration::from_secs(12));
    if let Ok(mut active)=active_slot().lock(){
        if active.as_ref().is_some_and(|(id,_,_)|*id==session){*active=None;}
    }
    if session!=SPEECH_SESSION.load(Ordering::SeqCst) {return Ok(());}
    result?;
    if !synth_result?.success() {return Err("Piper could not synthesize this voice; check the model and piper installation".into());}
    if !player_result?.success() {return Err("The system audio player failed; check your output device".into());}
    Ok(())
}

#[cfg(test)] mod tests {
    use super::*;
    #[test] fn names_match_language() {
        assert_eq!(voice_name("en"),"en_US-lessac-high");
        assert_eq!(voice_name("fa"),"fa_IR-reza_ibrahim-medium");
    }
    #[test] fn refuses_missing_config() {
        assert!(sample_rate(std::path::Path::new("/nonexistent/voice.onnx")).is_err());
    }
}
