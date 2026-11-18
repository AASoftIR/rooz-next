//! Linux microphone fallback for Tauri/WebKitGTK AppImages.
//! Uses the system PulseAudio/PipeWire compatibility stream (parec), not WebKit.
//! No temporary audio files are written; raw PCM is kept in memory and sent to STT.
use std::{io::Read,process::Stdio,sync::{atomic::{AtomicU64,Ordering},mpsc},thread,time::{Duration,Instant}};

static SESSION:AtomicU64=AtomicU64::new(0);
const RATE:usize=16000;
const MAX_LENGTH:Duration=Duration::from_secs(27);
const INITIAL_SILENCE:Duration=Duration::from_secs(8);
const END_SILENCE:Duration=Duration::from_millis(1050);

pub fn cancel() { SESSION.fetch_add(1,Ordering::SeqCst); }

fn rms_i16(bytes:&[u8])->f64 {
    let mut sum=0.0;
    let mut count=0;
    for pair in bytes.chunks_exact(2) {
        let sample=i16::from_le_bytes([pair[0],pair[1]]) as f64/32768.0;
        sum+=sample*sample;
        count+=1;
    }
    if count==0 {0.0}else{(sum/count as f64).sqrt()}
}
fn wav(pcm:&[u8])->Vec<u8>{
    let mut result=Vec::with_capacity(44+pcm.len());
    result.extend_from_slice(b"RIFF");
    result.extend_from_slice(&(36u32+pcm.len() as u32).to_le_bytes());
    result.extend_from_slice(b"WAVEfmt ");
    result.extend_from_slice(&16u32.to_le_bytes());
    result.extend_from_slice(&1u16.to_le_bytes());
    result.extend_from_slice(&1u16.to_le_bytes());
    result.extend_from_slice(&(RATE as u32).to_le_bytes());
    result.extend_from_slice(&((RATE*2) as u32).to_le_bytes());
    result.extend_from_slice(&2u16.to_le_bytes());
    result.extend_from_slice(&16u16.to_le_bytes());
    result.extend_from_slice(b"data");
    result.extend_from_slice(&(pcm.len() as u32).to_le_bytes());
    result.extend_from_slice(pcm);
    result
}

pub fn capture()->Result<Vec<u8>,String> {
    let id=SESSION.fetch_add(1,Ordering::SeqCst)+1;
    // parec ships with Arch libpulse, and works with both PulseAudio and pipewire-pulse.
    // Explicit @DEFAULT_SOURCE@ avoids a previously cached per-application input.
    let mut child=crate::host_command::command("parec")
       .args(["--raw","--format=s16le","--rate=16000","--channels=1","--device=@DEFAULT_SOURCE@"])
       .stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped())
       .spawn().map_err(|e|format!("Native microphone requires 'parec' (sudo pacman -S libpulse) and a running PulseAudio/PipeWire service: {e}"))?;
    let stdout=child.stdout.take().ok_or("Cannot access microphone capture stream")?;
    let (tx,rx)=mpsc::sync_channel::<Vec<u8>>(8);
    // Reading in another thread lets the main capture loop enforce timeouts and cancellation
    // even when a microphone exists but the audio server provides no samples.
    thread::spawn(move||{
        let mut reader=stdout;
        let mut buffer=[0u8;4096];
        loop {
            match reader.read(&mut buffer) {
                Ok(0)|Err(_)=>break,
                Ok(n)=>{if tx.send(buffer[..n].to_vec()).is_err(){break;}}
            }
        }
    });
    let started=Instant::now();let mut first_speech=None;let mut last_speech=None;
    let mut raw=Vec::with_capacity(16000*2*8);
    let mut pre_roll:Vec<u8>=Vec::with_capacity(RATE);
    let mut speech_chunks=0u32;
    while id==SESSION.load(Ordering::SeqCst) && started.elapsed()<MAX_LENGTH {
        if let Ok(bytes)=rx.recv_timeout(Duration::from_millis(120)) {
            let amplitude=rms_i16(&bytes);
            // Drop leading room noise; retain a short pre-roll to avoid clipping words.
            // Silences shorter than 800ms keep an utterance together.
            let speaking=amplitude>0.010;
            if speaking {
                if first_speech.is_none(){first_speech=Some(Instant::now());raw.extend_from_slice(&pre_roll);}
                last_speech=Some(Instant::now());speech_chunks+=1;
            }
            if first_speech.is_some(){raw.extend_from_slice(&bytes);}
            else {
                pre_roll.extend_from_slice(&bytes);
                if pre_roll.len()>RATE/2 {let discard=pre_roll.len()-RATE/2;pre_roll.drain(..discard);}
            }
        }
        if first_speech.is_none() && started.elapsed()>INITIAL_SILENCE {break;}
        if let (Some(first),Some(last))=(first_speech,last_speech){
            if first.elapsed()>Duration::from_millis(380) && last.elapsed()>END_SILENCE {break;}
        }
        if raw.len()>RATE*2*27 {break;}
        // Report a dead audio server immediately instead of looping forever
        // with a "still listening" message after parec has exited.
        if let Ok(Some(status))=child.try_wait() {
            if raw.len()<RATE*2/2 {
                let mut stderr=String::new();
                if let Some(mut pipe)=child.stderr.take(){let _=pipe.read_to_string(&mut stderr);}
                return Err(format!("Native audio recorder exited ({status}): {}. Check 'wpctl status' and 'pactl info'.",stderr.trim().chars().take(250).collect::<String>()));
            }
            break;
        }
    }
    let cancelled=id!=SESSION.load(Ordering::SeqCst);
    let _=child.kill();let _=child.wait();
    if cancelled {return Ok(Vec::new());}
    if first_speech.is_none() || speech_chunks<2 {return Ok(Vec::new());}
    // Output is a mono 16 kHz WAV consumed only by the persistent Vosk worker.
    raw.truncate(raw.len()&!1);
    Ok(wav(&raw))
}

#[cfg(test)]
mod tests{
 use super::*;
 #[test]fn silence_has_zero_rms(){assert_eq!(rms_i16(&[0;100]),0.0);}
 #[test]fn voice_level_is_detected(){assert!(rms_i16(&[0xff,0x7f,0,0])>0.6);}
 #[test]fn wav_file_header_is_valid(){let b=wav(&[0,0,1,0]);assert_eq!(&b[..4],b"RIFF");assert_eq!(&b[8..12],b"WAVE");assert_eq!(u32::from_le_bytes(b[24..28].try_into().unwrap()),16000);assert_eq!(b.len(),48);}
}
