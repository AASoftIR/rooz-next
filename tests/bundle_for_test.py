"""Offline ES module bundling into scoped modules for Chromium tests.
No network, Node module resolution, or external frontend runtime required.
"""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
modules=['backend','solar','routines','views','editor','assistant','transfer','app']
parts=['const __mods = Object.create(null);']
for name in modules:
    content=(root/'web'/f'{name}.js').read_text()
    imports=[]
    def import_repl(m):
        named=m.group(1).strip()
        dep=m.group(2)
        imports.append(f'const {{{named}}} = __mods.{dep};')
        return ''
    content=re.sub(r'^import\s*\{([^}]+)\}\s*from\s*[\'\"]\./([a-z]+)\.js[\'\"];?\s*$',import_repl,content,flags=re.M)
    content=re.sub(r'^import\s+[\'\"]\./[a-z]+\.js[\'\"];?\s*$', '', content, flags=re.M)
    exports=re.findall(r'\bexport\s+(?:async\s+)?(?:const|function|class|let)\s+([A-Za-z_$][\w$]*)',content)
    for m in re.findall(r'\bexport\s*\{([^}]+)\}\s*;?',content):
        exports+=re.findall(r'\b([A-Za-z_$][\w$]*)\b',m)
    content=re.sub(r'\bexport\s+(?=(?:async\s+)?(?:const|function|class|let)\s+)', '', content)
    content=re.sub(r'\bexport\s*\{[^}]+\}\s*;?', '', content)
    parts.append(f'(() => {{\n'+ '\n'.join(imports)+'\n'+content+f'\n__mods.{name} = {{'+','.join(dict.fromkeys(exports))+'};\n})();')
parts.append('Object.assign(window,__mods.routines,__mods.solar,{parseVoiceRoutine:__mods.assistant.parseRoutine});') # expose recurrence functions to existing browser tests
(root/'tests'/'browser-bundle.js').write_text('\n'.join(parts))
print('Assembled',len(parts)-1,'modules, total',sum(map(len,parts)),'chars')
