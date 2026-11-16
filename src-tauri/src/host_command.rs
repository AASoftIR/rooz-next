//! Isolate host binaries from AppImage-bundled dynamic libraries.
//! Tauri may set LD_LIBRARY_PATH to its mounted AppDir; host tools such as
//! `parec`, `spd-say`, and `whisper-cli` must load host libraries instead.
use std::{env,process::Command};

fn is_appimage_path(path: &str, appdir: Option<&str>) -> bool {
    let path=path.trim();
    if path.is_empty() {return false;}
    appdir.filter(|s| !s.is_empty()).is_some_and(|root| path == root || path.starts_with(&format!("{root}/")))
       || path.starts_with("/tmp/.mount_")
}

pub(crate) fn command(name: &str) -> Command {
    let mut cmd=Command::new(name);
    if env::var_os("APPDIR").is_some() || env::var_os("APPIMAGE").is_some() {
        let appdir=env::var("APPDIR").ok();
        for key in ["LD_LIBRARY_PATH", "LD_PRELOAD"] {
            if let Ok(paths)=env::var(key) {
                let clean=paths.split(':').filter(|entry| !is_appimage_path(entry,appdir.as_deref()))
                    .collect::<Vec<_>>().join(":");
                if clean.is_empty(){cmd.env_remove(key);}else{cmd.env(key,clean);}
            }
        }
        // These module paths point into the packaged GTK/WebKit runtime and can
        // interfere with external GStreamer/PipeWire and other system programs.
        for key in ["GST_PLUGIN_PATH", "GST_PLUGIN_SYSTEM_PATH", "GTK_PATH", "GIO_EXTRA_MODULES", "QT_PLUGIN_PATH", "PYTHONHOME", "PYTHONPATH"] {
            if let Ok(paths)=env::var(key) {
                let clean=paths.split(':').filter(|entry| !is_appimage_path(entry,appdir.as_deref()))
                    .collect::<Vec<_>>().join(":");
                if clean.is_empty(){cmd.env_remove(key);}else{cmd.env(key,clean);}
            }
        }
    }
    cmd
}

#[cfg(test)] mod tests {
    use super::*;
    #[test] fn filters_bundled_paths_only(){
        assert!(is_appimage_path("/tmp/.mount_RoozAB/usr/lib",Some("/tmp/.mount_RoozAB")));
        assert!(!is_appimage_path("/usr/lib",Some("/tmp/.mount_RoozAB")));
        assert!(!is_appimage_path("/home/me/libs",None));
    }
}
