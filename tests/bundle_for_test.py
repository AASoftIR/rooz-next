"""Bundle compiled dependency-free ES modules into one temporary classic script.
For headless testing only, since this runtime blocks local network navigation."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
text=[]
for name in ['backend','views','editor','app']:
 s=(root/'web'/f'{name}.js').read_text()
 s=re.sub(r'^import .*?;\s*$', '', s, flags=re.M)
 s=re.sub(r'^export \{.*?\};\s*$', '', s, flags=re.M)
 s=re.sub(r'\bexport\s+(?=(?:const|function|class|let|async))','',s)
 text.append(s)
(root/'tests'/'browser-bundle.js').write_text('\n'.join(text))
print('Assembled',sum(len(t) for t in text),'chars of app JS for headless local test')
