import type {Note,Snapshot} from './backend.js';
import {backend} from './backend.js';
import type {UIState} from './views.js';
import {icon,esc,categories,t} from './views.js';

const safeUrl=(x:string):string=>{try{const u=new URL(x);return ['https:','http:'].includes(u.protocol)?u.toString():'';}catch{return '';}};
export function sanitizedHTML(raw:string):string {
  const root=document.createElement('div');root.innerHTML=raw;
  const allowed=new Set(['P','BR','STRONG','B','EM','I','U','S','MARK','H1','H2','H3','UL','OL','LI','BLOCKQUOTE','PRE','CODE','A','DIV','SPAN','HR']);
  const blocked=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','FORM','VIDEO','AUDIO','IMG','META','LINK']);
  function walk(parent:Element){
    for(const child of Array.from(parent.children)){
      if(blocked.has(child.tagName)){child.remove();continue;}
      if(!allowed.has(child.tagName)){child.replaceWith(document.createTextNode(child.textContent||''));continue;}
      for(const a of Array.from(child.attributes)){
        if(a.name==='href'&&child.tagName==='A'){
          const ok=safeUrl(a.value);if(ok){child.setAttribute('href',ok);child.setAttribute('rel','noreferrer noopener');}else{child.removeAttribute('href');}
        }else if(a.name==='style'&&child.tagName==='SPAN'){
          const value=a.value;
          if(/^\s*background-color:\s*(#[\da-fA-F]{3,8}|rgb\([\d\s,.%]+\))\s*;?\s*$/.test(value)){}
          else child.removeAttribute('style');
        }else child.removeAttribute(a.name);
      }
      walk(child);
    }
  }
  walk(root);return root.innerHTML;
}
function inlineMd(s:string):string {
  return esc(s)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,(_match,name,url)=>`<a href="${esc(url)}" target="_blank" rel="noreferrer noopener">${name}</a>`)
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g,'<em>$1</em>')
    .replace(/`([^`]+)`/g,'<code>$1</code>');
}
export function fromMarkdown(source:string):string {
  const lines=source.split(/\r?\n/);let html='';let list:string='';
  function close(){if(list){html+=`</${list}>`;list='';}}
  for(const line of lines){
    if(/^\s*[-*] /.test(line)){if(list!=='ul'){close();html+='<ul>';list='ul';}html+=`<li>${inlineMd(line.replace(/^\s*[-*] /,''))}</li>`;continue;}
    if(/^\s*\d+\. /.test(line)){if(list!=='ol'){close();html+='<ol>';list='ol';}html+=`<li>${inlineMd(line.replace(/^\s*\d+\. /,''))}</li>`;continue;}
    close();
    if(/^### /.test(line))html+=`<h3>${inlineMd(line.slice(4))}</h3>`;
    else if(/^## /.test(line))html+=`<h2>${inlineMd(line.slice(3))}</h2>`;
    else if(/^# /.test(line))html+=`<h1>${inlineMd(line.slice(2))}</h1>`;
    else if(/^> /.test(line))html+=`<blockquote>${inlineMd(line.slice(2))}</blockquote>`;
    else if(line.trim())html+=`<p>${inlineMd(line)}</p>`;
    else html+='<p><br></p>';
  }
  close();return sanitizedHTML(html);
}
export function toMarkdown(html:string):string{
 const root=document.createElement('div');root.innerHTML=sanitizedHTML(html);
 function translate(node:Node):string{
  if(node.nodeType===Node.TEXT_NODE)return node.textContent||'';
  if(!(node instanceof HTMLElement))return '';
  const content=Array.from(node.childNodes).map(translate).join('');
  switch(node.tagName){
   case 'H1':return '# '+content+'\n\n';case 'H2':return '## '+content+'\n\n';case 'H3':return '### '+content+'\n\n';
   case 'P':case 'DIV':return content+'\n\n';case 'BR':return '\n';
   case 'B':case 'STRONG':return `**${content}**`;case 'EM':case 'I':return `*${content}*`;
   case 'CODE':return '`'+content+'`';case 'A':return `[${content}](${node.getAttribute('href')||''})`;
   case 'LI':return '- '+content+'\n';case 'UL':case 'OL':return content+'\n';
   case 'BLOCKQUOTE':return '> '+content+'\n\n';default:return content;
  }
 }
 return Array.from(root.childNodes).map(translate).join('').replace(/\n{3,}/g,'\n\n').trim();
}
export function editorView(note:Note,s:UIState,snapshot:Snapshot):string {
 return `<section class="editor-screen" id="note-editor" aria-label="Note editor">
   <div class="editor-header"><button class="icon-button editor-back" data-action="close-note" title="Back">${icon('chevronLeft',20)}</button><div class="editor-head-center"><span class="eyebrow">YOUR THOUGHTS, SAFE HERE</span><strong>Editor</strong></div><div class="editor-actions"><span class="save-indicator" id="editor-save-indicator">Saved</span><button class="icon-button" data-action="export-note" title="Export Markdown">${icon('download',19)}</button><button class="icon-button" data-action="delete-note" title="Delete note">${icon('trash',18)}</button></div></div>
   <div class="editor-properties"><div class="property-tag">${icon('notes',16)} <select id="note-category">${categories(snapshot).map(c=>`<option ${note.category===c?'selected':''}>${esc(c)}</option>`).join('')}</select></div><button class="editor-mode-toggle" data-action="toggle-markdown" id="markdown-toggle">${icon('command',15)} Markdown</button></div>
   <input id="note-title" class="note-title-input" placeholder="${t('title',s)}…" maxlength="250" value="${esc(note.title)}"/>
   <div class="editor-tool-strip"><button class="format-button" data-format="bold" title="Bold (Ctrl+B)">${icon('bold',18)}</button><button class="format-button" data-format="italic" title="Italic (Ctrl+I)">${icon('italic',18)}</button><button class="format-button" data-format="underline" title="Underline">${icon('underline',17)}</button><span class="strip-divider"></span><button class="format-button" data-format="formatBlock" data-value="h2" title="Heading">${icon('heading',18)}</button><button class="format-button" data-format="insertUnorderedList" title="List">${icon('list',18)}</button><button class="format-button" data-format="hiliteColor" data-value="#ad9cff" title="Highlight">${icon('highlight',18)}</button><button class="format-button" data-format="link" title="Link (Ctrl+K)">${icon('link',18)}</button></div>
   <div class="editor-body-scroll" dir="auto"><div class="editor-prose" id="rich-editor" contenteditable="true" spellcheck="true" data-placeholder="${esc(t('editorPlaceholder',s))}"></div><textarea class="markdown-source hidden" id="markdown-editor" spellcheck="false" placeholder="# Markdown"></textarea><div class="note-links" id="note-links"></div></div>
   <div class="selection-bubble" id="selection-bubble" hidden><button class="format-button" data-format="bold">${icon('bold',15)}</button><button class="format-button" data-format="italic">${icon('italic',15)}</button><button class="format-button" data-format="hiliteColor" data-value="#ad9cff">${icon('highlight',15)}</button><button class="format-button" data-format="link">${icon('link',15)}</button></div>
   <div class="link-flyout hidden" id="link-flyout"><span>Add a URL</span><input id="link-input" type="url" placeholder="https://example.com"/><button data-action="apply-link" class="primary-button">${icon('check',16)}</button><button data-action="cancel-link" class="icon-button">${icon('x',16)}</button></div>
   <div class="editor-footer"><span>${icon('sparkles',16)} Every thought deserves a place.</span><span><kbd>Ctrl</kbd> + <kbd>S</kbd> to save</span></div>
 </section>`;
}

let sourceMode=false;let pending:number|undefined;let savedRange:Range|null=null;let currentNote:Note|null=null;
let parentSnapshot:Snapshot|null=null;
let onChange:()=>void=()=>{};
export function setupEditor(snapshot:Snapshot,s:UIState,changed:()=>void):void {
 const note=s.editingNote!;currentNote={...note};parentSnapshot=snapshot;onChange=changed;sourceMode=false;
 const content=document.querySelector<HTMLElement>('#rich-editor')!;
 const source=document.querySelector<HTMLTextAreaElement>('#markdown-editor')!;
 content.innerHTML=note.body_format==='markdown'?fromMarkdown(note.body):sanitizedHTML(note.body);
 source.value=toMarkdown(content.innerHTML);
 refreshLinks();
 const title=document.querySelector<HTMLInputElement>('#note-title')!;
 const cat=document.querySelector<HTMLSelectElement>('#note-category')!;
 const schedule=()=>{const badge=document.querySelector('#editor-save-indicator');if(badge)badge.textContent='Editing…';window.clearTimeout(pending);pending=window.setTimeout(()=>{void flushEditor();},650);};
 content.addEventListener('input',schedule);source.addEventListener('input',schedule);title.addEventListener('input',schedule);cat.addEventListener('change',schedule);
 content.addEventListener('paste',event=>{event.preventDefault();const plain=event.clipboardData?.getData('text/plain')||'';document.execCommand('insertText',false,plain);});
 const showBubble=()=>{
  const bubble=document.querySelector<HTMLElement>('#selection-bubble')!;
  if(sourceMode){bubble.hidden=true;return;}
  const sel=window.getSelection();if(!sel||sel.isCollapsed||!content.contains(sel.anchorNode)){bubble.hidden=true;return;}
  const rect=sel.getRangeAt(0).getBoundingClientRect();const host=document.querySelector<HTMLElement>('#note-editor')!;const bounds=host.getBoundingClientRect();
  bubble.hidden=false;bubble.style.left=Math.max(15,Math.min(bounds.width-180,rect.left-bounds.left+rect.width/2-88))+'px';bubble.style.top=Math.max(55,rect.top-bounds.top-48)+'px';
 };
 content.addEventListener('mouseup',()=>window.setTimeout(showBubble,10));content.addEventListener('keyup',()=>window.setTimeout(showBubble,10));
 document.querySelectorAll<HTMLButtonElement>('[data-format]').forEach(button=>{
  button.addEventListener('mousedown',e=>e.preventDefault());
  button.addEventListener('click',()=>{
   if(sourceMode)return;
   const fmt=button.dataset.format||'bold';
   if(fmt==='link'){const selection=window.getSelection();if(selection&&!selection.isCollapsed)savedRange=selection.getRangeAt(0).cloneRange();document.querySelector('#link-flyout')?.classList.remove('hidden');document.querySelector<HTMLInputElement>('#link-input')?.focus();return;}
   content.focus();document.execCommand(fmt,false,button.dataset.value||undefined);schedule();
   document.querySelector<HTMLElement>('#selection-bubble')!.hidden=true;
  });
 });
 const flyout=document.querySelector<HTMLInputElement>('#link-input');flyout?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyLink();}});
}
function refreshLinks(){
 const links=document.querySelector<HTMLElement>('#note-links');if(!links)return;
 const text=document.querySelector<HTMLElement>('#rich-editor')?.textContent||'';
 const matches=Array.from(new Set(text.match(/https?:\/\/[^\s<>()]+/gi)||[])).slice(0,5);
 if(!matches.length){links.innerHTML='';return;}
 links.innerHTML=`<div class="link-previews-header">${icon('link',15)} LINKS IN THIS NOTE</div>${matches.map(x=>{const safe=safeUrl(x);if(!safe)return '';const host=new URL(safe).hostname;return `<button class="link-preview-card" data-action="open-url" data-url="${esc(safe)}"><span class="link-favicon">${icon('globe',18)}</span><span><strong>${esc(host)}</strong><small>${esc(safe).slice(0,95)}</small></span>${icon('external',16)}</button>`;}).join('')}`;
}
export async function flushEditor():Promise<void> {
 window.clearTimeout(pending);if(!currentNote||!parentSnapshot)return;
 const root=document.querySelector('#note-editor');if(!root)return;
 const rich=document.querySelector<HTMLElement>('#rich-editor')!;
 const source=document.querySelector<HTMLTextAreaElement>('#markdown-editor')!;
 currentNote={...currentNote,title:document.querySelector<HTMLInputElement>('#note-title')!.value,
  category:document.querySelector<HTMLSelectElement>('#note-category')!.value,
  body:sourceMode?source.value:sanitizedHTML(rich.innerHTML),body_format:sourceMode?'markdown':'html'};
 try{
  const saved=await backend.saveNote(currentNote);
  if(!document.querySelector('#note-editor'))return;
  currentNote=saved;parentSnapshot.notes=parentSnapshot.notes.filter(n=>n.id!==saved.id);
  parentSnapshot.notes.unshift(saved);onChange();refreshLinks();
  const badge=document.querySelector('#editor-save-indicator');if(badge)badge.textContent='Saved ✓';
 }catch(err){const badge=document.querySelector('#editor-save-indicator');if(badge)badge.textContent=`Save failed`;console.error(err);}
}
export async function leaveEditor():Promise<void>{await flushEditor();currentNote=null;parentSnapshot=null;}
export function toggleMarkdown():void {
 const rich=document.querySelector<HTMLElement>('#rich-editor')!;const source=document.querySelector<HTMLTextAreaElement>('#markdown-editor')!;
 if(sourceMode){rich.innerHTML=fromMarkdown(source.value);rich.classList.remove('hidden');source.classList.add('hidden');sourceMode=false;}
 else {source.value=toMarkdown(rich.innerHTML);rich.classList.add('hidden');source.classList.remove('hidden');sourceMode=true;}
 document.querySelector('#markdown-toggle')?.classList.toggle('is-active',sourceMode);
 window.clearTimeout(pending);pending=window.setTimeout(()=>void flushEditor(),400);
}
export function applyLink():void{
 const url=safeUrl(document.querySelector<HTMLInputElement>('#link-input')!.value.trim());if(!url)return;
 const rich=document.querySelector<HTMLElement>('#rich-editor')!;rich.focus();if(savedRange){const sel=window.getSelection()!;sel.removeAllRanges();sel.addRange(savedRange);}
 document.execCommand('createLink',false,url);document.querySelector('#link-flyout')?.classList.add('hidden');savedRange=null;
 window.clearTimeout(pending);pending=window.setTimeout(()=>void flushEditor(),400);
}
export function cancelLink():void{document.querySelector('#link-flyout')?.classList.add('hidden');savedRange=null;}
export function downloadNote():void{
 const title=document.querySelector<HTMLInputElement>('#note-title')?.value||'Untitled';
 const body=sourceMode?document.querySelector<HTMLTextAreaElement>('#markdown-editor')!.value:toMarkdown(document.querySelector<HTMLElement>('#rich-editor')!.innerHTML);
 const blob=new Blob([`# ${title}\n\n${body}\n`],{type:'text/markdown;charset=utf-8'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(title.trim()||'note').replace(/[\\/:*?"<>|]/g,'_').slice(0,90)+'.md';a.click();window.setTimeout(()=>URL.revokeObjectURL(url),2000);
}
