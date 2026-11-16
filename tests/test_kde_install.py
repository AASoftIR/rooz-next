"""Test KWin installation flow using fake KDE CLIs without requiring a desktop."""
from pathlib import Path
import os, subprocess, tempfile, unittest
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/'scripts/install-kde-anchor.sh'
class KdeAnchorInstallerTests(unittest.TestCase):
    def install(self,upgrading=False,broken_upgrade=False):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);bins=root/'bin';bins.mkdir();data=root/'data';script=data/'kwin/scripts/roozanchor'
            if upgrading:
                (script/'contents/code').mkdir(parents=True)
                (script/'metadata.json').write_text('OLD')
            log=root/'calls.txt'
            pkg='''#!/bin/sh
 echo "kpackagetool6 $*" >> "$CALLS"
 case "$*" in
   *' -u '*)\n    if [ "$BROKEN_UPGRADE" = 1 ]; then exit 1; fi\n    ;;
 esac
 mkdir -p "$XDG_DATA_HOME/kwin/scripts/roozanchor/contents/code"
 cp "$SOURCE/metadata.json" "$XDG_DATA_HOME/kwin/scripts/roozanchor/metadata.json"
 cp "$SOURCE/contents/code/main.js" "$XDG_DATA_HOME/kwin/scripts/roozanchor/contents/code/main.js"
 '''
            for name,content in [('kpackagetool6',pkg),('kwriteconfig6','#!/bin/sh\necho "kwriteconfig6 $*" >> "$CALLS"\n'),('qdbus6','#!/bin/sh\necho "qdbus6 $*" >> "$CALLS"\n')]:
                f=bins/name;f.write_text(content);f.chmod(0o755)
            env={**os.environ,'PATH':str(bins)+':'+os.environ['PATH'],'CALLS':str(log),'SOURCE':str(ROOT/'packaging/kwin/roozanchor'),'XDG_DATA_HOME':str(data),'BROKEN_UPGRADE':'1' if broken_upgrade else '0'}
            result=subprocess.run(['bash',str(SCRIPT)],text=True,capture_output=True,env=env,timeout=15)
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertEqual((script/'metadata.json').read_text(),(ROOT/'packaging/kwin/roozanchor/metadata.json').read_text())
            calls=log.read_text()
            self.assertIn('kwriteconfig6 --file kwinrc',calls)
            self.assertIn('qdbus6 org.kde.KWin /KWin reconfigure',calls)
            if broken_upgrade:self.assertIn(' -i ',calls)
            elif upgrading:self.assertIn(' -u ',calls)
            else:self.assertIn(' -i ',calls)
    def test_first_install(self):self.install()
    def test_existing_installer_upgrade(self):self.install(upgrading=True)
    def test_old_raw_directory_repair(self):self.install(upgrading=True,broken_upgrade=True)
if __name__=='__main__':unittest.main(verbosity=2)
