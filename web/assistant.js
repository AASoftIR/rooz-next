import { backend, newTask, native } from './backend.js';
import { esc, icon } from './views.js';
import { routineDraft } from './routines.js';
let root;
let open = false;
let mode = 'chat';
let lang = 'en';
let data;
let onDataUpdate = async ()=>{};
let onNavigate = ()=>{};
let messages = [];
let aiStatus = {
    has_keys: {},
    has_whisper: false,
    has_vosk: false,
    local_stt_ready: false,
    stt_model_path: null,
    local_tts_ready: false,
    local_tts_en_ready: false,
    local_tts_fa_ready: false,
    tts_model_path: ''
};
let models = [];
let busy = false;
let showModels = false;
let error = '';
let info = '';
let flow = 'idle';
let draft = [];
let candidate = null;
let routineCandidate = null;
let draftKind = 'task';
let recording = false;
let level = 0;
let runID = 0;
let lastAsk = 0;
let captureErrors = 0;
let speechWarned = false;
const t = (en, fa)=>lang === 'fa' ? fa : en;
const setting = (key, def = '')=>data?.settings?.[key] ?? def;
function row(role, text) {
    messages.push({
        role,
        text
    });
    if (messages.length > 60) messages.splice(0, messages.length - 60);
}
export function aiIsOpen() {
    return open;
}
export function mountAssistant(container, snapshot, language, refresh, navigate) {
    root = container;
    data = snapshot;
    lang = language;
    onDataUpdate = refresh;
    onNavigate = navigate;
    if (open) {
        render();
    }
}
function markdown(text) {
    return esc(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
}
function button(name, title, body, selected = false) {
    return `<button type="button" data-ai-action="${name}" class="ai-tab ${selected ? 'selected' : ''}" aria-label="${title}">${body}</button>`;
}
function voiceStatus() {
    return recording ? t('Listening naturally…', 'در حال شنیدن…') : busy ? t('Processing speech…', 'در حال پردازش گفتار…') : flow === 'wake' ? t('Say “help” to activate', 'برای شروع «help» بگویید') : flow === 'collect' ? t('Describe the task, then say “finish”', 'کار را توضیح دهید و سپس بگویید «finish»') : flow === 'confirm_add' || flow === 'confirm_add_routine' || flow === 'confirm_delete' || flow === 'confirm_complete' ? t('Say “OK”, “wrong”, or “stop”', 'بگویید «تأیید»، «اشتباه» یا «توقف»') : t('Ready to start', 'آماده برای شروع');
}
function notices() {
    return `${error ? `<div class="ai-error" role="alert">${esc(error)}</div>` : ''}${info ? `<div class="ai-info">${esc(info)}</div>` : ''}`;
}
function render(force = false) {
    if (!open) return;
    const existing = root.querySelector('.ai-overlay');
    if (existing && !force && existing.dataset.mode === mode) {
        const notice = existing.querySelector('.ai-notices');
        if (notice) {
            const markup = notices();
            if (notice.innerHTML !== markup) notice.innerHTML = markup;
        }
        if (mode === 'voice') {
            const heading = existing.querySelector('.ai-voice-stage h2');
            if (heading) heading.textContent = voiceStatus();
            const mic = existing.querySelector('.ai-mic-disc');
            mic?.classList.toggle('active', recording);
            mic?.style.setProperty('--mic-level', `${Math.round(level * 100)}%`);
            const control = existing.querySelector('.ai-voice-start');
            if (control) {
                const isRunning = recording || flow !== 'idle';
                const action = isRunning ? 'stop-voice' : 'start-voice';
                const label = isRunning ? t('Stop session', 'پایان گفتگو') : t('Start voice assistant', 'شروع دستیار صوتی');
                if (control.dataset.aiAction !== action) {
                    control.dataset.aiAction = action;
                    control.innerHTML = `${icon(isRunning ? 'x' : 'play', 17)} ${label}`;
                }
            }
            const recent = existing.querySelector('.ai-voice-recent');
            const markup = messages.slice(-3).map((m)=>`<p class="${m.role}">${markdown(m.text)}</p>`).join('');
            if (recent && recent.innerHTML !== markup) recent.innerHTML = markup;
        } else if (mode === 'chat') {
            const msgs = existing.querySelector('.ai-messages');
            const markup = messages.length ? messages.map((m)=>`<div class="ai-bubble ${m.role}">${m.role === 'assistant' ? icon('sparkles', 15) : ''}<div>${markdown(m.text)}</div></div>`).join('') : '';
            if (msgs && markup && msgs.innerHTML !== markup) {
                msgs.innerHTML = markup;
                msgs.scrollTop = msgs.scrollHeight;
            }
            const input = existing.querySelector('#ai-chat-form textarea');
            const send = existing.querySelector('.ai-send');
            if (input) input.disabled = busy;
            if (send) {
                send.disabled = busy;
                send.innerHTML = busy ? '<span class="ai-spinner"></span>' : icon('arrow', 20);
            }
        }
        return;
    }
    existing?.remove();
    let content = '';
    if (mode === 'settings') content = renderSettings();
    else if (mode === 'voice') content = renderVoice();
    else content = renderChat();
    const shell = root.querySelector('.shell');
    if (shell) shell.scrollLeft = 0;
    root.querySelector('.shell')?.insertAdjacentHTML('beforeend', `<section class="ai-overlay" data-mode="${mode}" aria-label="Rooz AI Assistant"><div class="ai-panel">
  <header class="ai-top"><div class="ai-symbol">${icon('sparkles', 22)}</div><span><strong>Rooz <em>Intelligence</em></strong><small>${t('Local context · Your choice of AI', 'اطلاعات محلی · انتخاب هوش مصنوعی با شما')} · v0.4.10</small></span><button type="button" class="icon-button" data-ai-action="close" title="Close">${icon('x', 19)}</button></header>
  <div class="ai-tabs">${button('chat', 'Chat', icon('notes', 15) + ' ' + t('Chat', 'گفتگو'), mode === 'chat')}${button('voice', 'Voice', icon('volume', 15) + ' ' + t('Voice', 'صدا'), mode === 'voice')}${button('settings', 'Settings', icon('settings', 15) + ' ' + t('Settings', 'تنظیمات'), mode === 'settings')}</div>
  ${content}
  <div class="ai-notices">${notices()}</div>
 </div></section>`);
    const transcript = root.querySelector('.ai-messages');
    if (transcript) transcript.scrollTop = transcript.scrollHeight;
}
function renderChat() {
    return `<div class="ai-intro"><span class="eyebrow">${t('ASK • PLAN • REFLECT', 'پرسش • برنامه‌ریزی • مرور')}</span><h2>${t('Think with your day.', 'همراه هوشمند روزت.')}</h2><p>${t('Ask about your schedule or brainstorm using your notes. Your private context is sent only if you enable RAG.', 'از برنامه‌ها و یادداشت‌ها بپرسید. اطلاعات خصوصی فقط در صورت فعال کردن RAG ارسال می‌شود.')}</p></div>
 <div class="ai-messages" aria-live="polite">${messages.length ? messages.map((m)=>`<div class="ai-bubble ${m.role}">${m.role === 'assistant' ? icon('sparkles', 15) : ''}<div>${markdown(m.text)}</div></div>`).join('') : `<div class="ai-empty">${icon('flower', 28)}<strong>${t('What shall we tackle?', 'از کجا شروع کنیم؟')}</strong><small>${t('Try “What should I prioritize today?” or open Voice.', 'مثلاً «امروز روی چه چیزی تمرکز کنم؟»')}</small></div>`}</div>
 <form id="ai-chat-form" class="ai-chat-form"><textarea name="message" rows="2" maxlength="3000" placeholder="${t('Ask Rooz…', 'از روز بپرس…')}" required ${busy ? 'disabled' : ''}></textarea><button class="ai-send" type="submit" ${busy ? 'disabled' : ''}>${busy ? '<span class="ai-spinner"></span>' : icon('arrow', 20)}</button></form>
 <footer class="ai-footer">${icon('info', 13)} ${t('Check AI answers before acting. Nothing is edited by chat replies.', 'پاسخ هوش مصنوعی را بررسی کنید؛ گفتگو چیزی را بدون تأیید تغییر نمی‌دهد.')}</footer>`;
}
function renderVoice() {
    const status = voiceStatus();
    return `<div class="ai-voice-stage"><div class="ai-orbit orbit-a"></div><div class="ai-orbit orbit-b"></div><div class="ai-mic-disc ${recording ? 'active' : ''}" style="--mic-level:${Math.round(level * 100)}%">${icon('mic', 34)}</div>
 <span class="ai-voice-label">${t('VOICE COMPANION', 'همراه صوتی')}</span><h2>${status}</h2><p>${t('Fast local recognition · Offline spoken replies', 'تشخیص سریع گفتار محلی · پاسخ صوتی آفلاین')}</p>
 <button class="primary-wide ai-voice-start" type="button" data-ai-action="${recording || flow !== 'idle' ? 'stop-voice' : 'start-voice'}">${recording || flow !== 'idle' ? icon('x', 16) + t('Stop session', 'پایان گفتگو') : icon('play', 17) + t('Start voice assistant', 'شروع دستیار صوتی')}</button>
 <div class="ai-voice-commands"><strong>${t('Speak commands naturally', 'فرمان‌های گفتاری')}</strong><span>“help” · “add time” · “finish” · “OK” · “wrong” · “stop”</span><span>${t('“Add routine”, “delete task”, “complete task”, “show routines”', '«حذف کار»، «انجام کار»، «نمایش روتین‌ها»، «برنامه امروز»')}</span></div>
 </div><div class="ai-voice-recent">${messages.slice(-3).map((m)=>`<p class="${m.role}">${markdown(m.text)}</p>`).join('')}</div>`;
}
function renderSettings() {
    const provider = setting('ai_provider', 'openrouter');
    const policy = setting('ai_policy', 'free');
    const selected = setting('ai_model', 'auto');
    const select = (name, opts, value)=>`<select name="${name}">${opts.map(([v, label])=>`<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select>`;
    return `<form id="ai-settings-form" class="ai-settings-form"><div class="ai-settings-scroll">
 <div class="ai-setting-title">${icon('sparkles', 17)} <strong>${t('Model routing', 'انتخاب هوشمند مدل')}</strong></div>
 <div class="ai-setting-row"><label>${t('Provider', 'سرویس‌دهنده')}${select('ai_provider', [
        [
            'auto',
            'Auto · available key'
        ],
        [
            'openrouter',
            'OpenRouter'
        ],
        [
            'groq',
            'Groq'
        ],
        [
            'nvidia',
            'NVIDIA NIM'
        ]
    ], provider)}</label><label>${t('Model policy', 'روش انتخاب')}${select('ai_policy', [
        [
            'free',
            'Verified free only'
        ],
        [
            'cheap',
            'Lowest published cost'
        ],
        [
            'best',
            'Largest known context'
        ]
    ], policy)}</label></div>
 <div class="ai-setting-row"><label>${t('Model ID', 'مدل')}${select('ai_model', [
        [
            'auto',
            'Auto select'
        ],
        ...models.map((m)=>[
                m.id,
                `${m.name.slice(0, 30)} ${m.free ? '· FREE' : m.output_price != null ? `· $${(m.output_price * 1e6).toFixed(3)}/1M` : '· price unknown'}`
            ])
    ], selected)}</label><button type="button" class="ai-discover" data-ai-action="models">${icon('search', 15)} ${t('Discover', 'جست‌وجوی مدل‌ها')}</button></div>
 <div class="ai-keys"><strong>${t('Provider API keys', 'کلیدهای API')}</strong><small>${t('Stored outside SQLite in a local 0600 file. Leave blank to keep existing key; clear with the remove control.', 'کلیدها در فایل محلی با دسترسی محدود نگهداری می‌شوند.')}</small>
 ${[
        'openrouter',
        'groq',
        'nvidia'
    ].map((p)=>`<label>${p.toUpperCase()} <span class="ai-key-status ${aiStatus.has_keys[p] ? 'ok' : ''}">${aiStatus.has_keys[p] ? t('Connected', 'متصل') : t('Not configured', 'تنظیم نشده')}</span><input type="password" autocomplete="off" name="key_${p}" placeholder="${t('Enter a new key', 'کلید جدید را وارد کنید')}"/><button type="button" class="ai-remove-key" data-ai-action="remove-key" data-provider="${p}" title="Remove saved key">${icon('x', 14)}</button></label>`).join('')}</div>
 <div class="ai-setting-title">${icon('globe', 17)} <strong>${t('Connection · V2Ray', 'اتصال · وی‌توری')}</strong></div>
 <label class="ai-checkbox"><input type="checkbox" name="ai_proxy_enabled" ${setting('ai_proxy_enabled') === 'true' ? 'checked' : ''}/> ${t('Use proxy for text-only AI requests', 'استفاده از پروکسی فقط برای درخواست‌های متنی هوش مصنوعی')}</label>
 <label class="ai-wide-field">${t('Proxy URL', 'نشانی پروکسی')}<input name="ai_proxy_url" value="${esc(setting('ai_proxy_url', 'socks5h://127.0.0.1:10808'))}" placeholder="socks5h://127.0.0.1:10808"/></label>
 <small class="ai-hint">${t('V2Ray common defaults: SOCKS 10808, HTTP 10809. Verify your local client ports.', 'پورت‌های رایج وی‌توری: SOCKS 10808 و HTTP 10809. پورت واقعی خود را بررسی کنید.')}</small>
 <div class="ai-setting-title">${icon('mic', 17)} <strong>${t('Fast offline speech · Vosk', 'تشخیص گفتار سریع و آفلاین · Vosk')}</strong></div>
 <small class="ai-hint">${aiStatus.local_stt_ready ? t('Vosk ready · Microphone audio stays local', 'ووسک آماده است · صدا فقط در رایانه پردازش می‌شود') : t('Run: bash scripts/setup-local-voice.sh english (or persian)', 'دستور نصب: bash scripts/setup-local-voice.sh english یا persian')}</small>
 <label class="ai-wide-field">${t('Recognition language (no automatic guessing)', 'زبان تشخیص گفتار؛ بدون تشخیص حدسی')}${select('ai_stt_language', [
        [
            'en',
            'English (fast, dedicated model)'
        ],
        [
            'fa',
            'فارسی (مدل مخصوص فارسی)'
        ]
    ], setting('ai_stt_language', 'en'))}</label>
 <label class="ai-checkbox"><input type="checkbox" name="ai_local_voice_reply" ${setting('ai_local_voice_reply', 'true') === 'true' ? 'checked' : ''}/> ${t('Read answers aloud using natural offline Piper voice', 'خواندن پاسخ‌ها با صدای طبیعی آفلاین پایپر')}</label>
 <small class="ai-hint">${t('Available voices', 'صداهای نصب‌شده')}: EN ${aiStatus.local_tts_en_ready ? '✓' : '—'} · FA ${aiStatus.local_tts_fa_ready ? '✓' : '—'}. ${t('Install: bash scripts/setup-local-voice.sh speaker-english (or speaker-persian)', 'نصب: bash scripts/setup-local-voice.sh speaker-english یا speaker-persian')}</small>
 <label class="ai-checkbox"><input type="checkbox" name="ai_rag_enabled" ${setting('ai_rag_enabled') === 'true' ? 'checked' : ''}/> ${t('Include relevant local data in AI requests (opt in)', 'ارسال اطلاعات مرتبط محلی به سرویس‌دهنده (با اجازه)')}</label>
 <small class="ai-hint">${t('Local full-text retrieval covers tasks, notes, routines and deletes recorded after this update. No semantic embeddings. Data is sent to the selected remote provider only when RAG is enabled.', 'جست‌وجوی متن محلی شامل کارها، یادداشت‌ها، روتین‌ها و حذف‌های بعد از این نسخه است. جست‌وجوی برداری نیست و تنها در صورت فعال بودن RAG داده ارسال می‌شود.')}</small>
 </div><div class="ai-settings-actions"><button class="primary-button" type="submit">${icon('check', 16)} ${t('Save AI preferences', 'ذخیره تنظیمات')}</button></div></form>`;
}
export async function openAssistant(voice = false) {
    if (!root) return;
    open = true;
    mode = voice ? 'voice' : 'chat';
    error = '';
    info = '';
    try {
        aiStatus = await backend.aiStatus();
        if (!messages.length) {
            const history = await backend.aiHistory();
            messages = history.map((m)=>({
                    role: m.role,
                    text: m.body
                }));
        }
    } catch (e) {
        error = String(e);
    }
    render();
    if (voice) await startVoice();
}
export function closeAssistant() {
    runID++;
    void backend.cancelNativeVoice();
    void backend.stopLocalSpeech();
    endCapture();
    flow = 'idle';
    open = false;
    root.querySelector('.ai-overlay')?.remove();
}
function setError(e) {
    error = String(e instanceof Error ? e.message : e);
    info = '';
    render();
}
async function saveSettings(form) {
    const fd = new FormData(form);
    busy = true;
    error = '';
    render();
    try {
        for (const key of [
            'ai_provider',
            'ai_policy',
            'ai_model',
            'ai_proxy_url',
            'ai_stt_language'
        ]){
            const val = String(fd.get(key) || '');
            await backend.saveSetting(key, val);
            data.settings[key] = val;
        }
        for (const key of [
            'ai_proxy_enabled',
            'ai_rag_enabled',
            'ai_local_voice_reply'
        ]){
            const value = String(fd.get(key) === 'on');
            await backend.saveSetting(key, value);
            data.settings[key] = value;
        }
        for (const provider of [
            'openrouter',
            'groq',
            'nvidia'
        ]){
            const key = String(fd.get('key_' + provider) || '').trim();
            if (key) await backend.aiSetKey(provider, key);
        }
        aiStatus = await backend.aiStatus();
        speechWarned = false;
        info = t('Settings saved.', 'تنظیمات ذخیره شد.');
    } catch (e) {
        error = String(e);
    } finally{
        busy = false;
        render(true);
    }
}
async function discover() {
    const selected = root.querySelector('#ai-settings-form select[name="ai_provider"]')?.value || setting('ai_provider', 'openrouter');
    if (selected === 'auto') {
        setError(t('Select a specific provider to list models.', 'برای نمایش مدل‌ها یک سرویس‌دهنده انتخاب کنید.'));
        return;
    }
    busy = true;
    info = '';
    error = '';
    render();
    try {
        models = await backend.aiModels(selected);
        info = `${models.length} ${t('text models found · prices shown when published', 'مدل متنی یافت شد')}`;
    } catch (e) {
        error = String(e);
    } finally{
        busy = false;
        render(true);
    }
}
async function chat(text) {
    if (busy) return;
    busy = true;
    error = '';
    row('user', text);
    render();
    try {
        const answer = await backend.aiChat(text);
        row('assistant', answer.answer);
        info = `${answer.provider} / ${answer.model} · ${answer.context.length} ${t('retrieved items', 'نتیجه بازیابی')}`;
    } catch (e) {
        error = String(e);
    } finally{
        busy = false;
        render();
    }
}
async function voiceResponse(text) {
    if (!native || !open || mode !== 'voice' || setting('ai_local_voice_reply', 'true') === 'false') return;
    const spoken = text.replace(/\[[^\]]+\]\([^)]*\)/g, '').replace(/[*_`#]/g, '').replace(/\s+/g, ' ').trim().slice(0, 240);
    const speechLanguage = /[\u0600-\u06ff]/.test(spoken) ? 'fa' : 'en';
    if (!(speechLanguage === 'fa' ? aiStatus.local_tts_fa_ready : aiStatus.local_tts_en_ready)) {
        if (!speechWarned) {
            speechWarned = true;
            info = t('Natural voice not installed. Run the speaker setup command in AI Settings.', 'صدای طبیعی نصب نیست؛ دستور نصب را در تنظیمات هوش مصنوعی ببینید.');
            render();
        }
        return;
    }
    let timeout = 0;
    try {
        const outcome = await Promise.race([
            backend.speakLocal(spoken, speechLanguage).then(()=>({
                    completed: true
                })),
            new Promise((resolve)=>{
                timeout = window.setTimeout(()=>resolve({
                        completed: false
                    }), 11000);
            })
        ]);
        if (!outcome.completed) {
            await backend.stopLocalSpeech();
            info = t('Speaker was too slow; listening again.', 'پخش صدا بیش از حد طول کشید؛ دوباره گوش می‌دهم.');
            render();
        }
    } catch (e) {
        if (!speechWarned) {
            speechWarned = true;
            info = t('Offline speech output unavailable: ', 'گفتار طبیعی آماده نیست: ') + String(e);
            render();
        }
    } finally{
        window.clearTimeout(timeout);
    }
}
async function say(text) {
    row('assistant', text);
    render();
    await voiceResponse(text);
}
async function startVoice() {
    if (!open) return;
    if (flow !== 'idle') return;
    try {
        if (!aiStatus.local_stt_ready) aiStatus = await backend.aiStatus();
    } catch (e) {
        setError(e);
        return;
    }
    if (native && !aiStatus.local_stt_ready) {
        setError(t('Local Vosk is not ready. Run bash scripts/setup-local-voice.sh english (or persian), then reopen Voice.', 'مدل محلی Vosk آماده نیست. اسکریپت setup-local-voice.sh را اجرا کنید.'));
        return;
    }
    runID++;
    captureErrors = 0;
    flow = 'wake';
    draft = [];
    candidate = null;
    routineCandidate = null;
    draftKind = 'task';
    error = '';
    info = t('Say “help” to wake Rooz.', 'برای شروع «help» بگویید.');
    render();
    void backend.warmLocalVoice().catch(()=>{});
    await beginCapture(runID);
}
function endCapture() {
    recording = false;
    level = 0;
}
async function beginCapture(id) {
    if (id !== runID || !open || mode !== 'voice') return;
    if (!native) {
        setError(t('Voice capture needs the installed desktop app.', 'برای ضبط صدا نسخه نصب‌شده برنامه را اجرا کنید.'));
        flow = 'idle';
        return;
    }
    recording = true;
    busy = false;
    render();
    let watchdog = 0;
    try {
        const recognition = (async ()=>await backend.captureLocalSpeech())();
        const raw = await Promise.race([
            recognition,
            new Promise((_, reject)=>{
                watchdog = window.setTimeout(()=>reject(Error('Microphone recognition timed out')), 33000);
            })
        ]);
        const spoken = raw.replace(/\s+/g, ' ').trim().replace(/\[(?:blank[_ ]audio|music|noise|silence)\]/gi, '').trim();
        if (id !== runID || !open || mode !== 'voice') return;
        captureErrors = 0;
        recording = false;
        busy = true;
        render();
        if (spoken) await handleSpoken(spoken, id);
        else info = t('Listening for “help”…', 'منتظر «help» هستم…');
    } catch (e) {
        if (id === runID) {
            void backend.cancelNativeVoice();
            captureErrors++;
            if (captureErrors < 2) {
                info = t('Microphone interrupted. Reconnecting…', 'میکروفون قطع شد؛ در حال تلاش دوباره…');
                render();
            } else {
                setError(t('Local microphone or speech recognition failed: ', 'خطا در ضبط یا تبدیل گفتار محلی: ') + String(e));
                flow = 'idle';
            }
        }
    } finally{
        window.clearTimeout(watchdog);
        if (id === runID) {
            recording = false;
            busy = false;
            render();
        }
        if (id === runID && open && mode === 'voice' && flow !== 'idle') {
            window.setTimeout(()=>{
                void beginCapture(id);
            }, 120);
        }
    }
}
function wordsLike(text, re) {
    return re.test(text.toLowerCase());
}
async function handleSpoken(text, id) {
    if (id !== runID) return;
    const clean = text.toLocaleLowerCase().replace(/[.!?،؛]/g, '').trim();
    row('user', text);
    render();
    if (wordsLike(clean, /^(stop|cancel|توقف|لغو|بس|بسه)\b|^(توقف|لغو)$/i)) {
        await say(t('Stopped.', 'متوقف شد.'));
        flow = 'idle';
        return;
    }
    if (flow === 'wake') {
        if (!wordsLike(clean, /(^|\s)(help|hey rooz|hi rooz|کمک|سلام روز)(\s|$)/i)) {
            info = t('Please say “help” to begin.', 'برای شروع «help» بگویید.');
            return;
        }
        flow = 'listening';
        const remainder = clean.replace(/(^|\s)(help|hey rooz|hi rooz|کمک|سلام روز)(\s|$)/i, ' ').trim();
        if (!remainder) {
            await say(t('I’m listening. What can I do?', 'گوش می‌دهم. چه کمکی می‌توانم بکنم؟'));
            return;
        }
        await processIntent(remainder);
        return;
    }
    if (flow === 'collect') {
        const finished = wordsLike(clean, /(\bfinish\b|پایان|تمام شد|تموم شد)/i);
        const fragment = text.replace(/\bfinish\b|پایان|تمام شد|تموم شد/gi, '').trim();
        if (fragment) draft.push(fragment);
        if (finished) {
            const title = draft.join(' ').trim();
            if (!title) {
                await say(t('I did not hear the task. Please describe it again.', 'عنوان کار را نشنیدم. دوباره بگویید.'));
                return;
            }
            if (draftKind === 'routine') {
                routineCandidate = parseRoutine(title);
                flow = 'confirm_add_routine';
                await say(t(`Create routine “${routineCandidate.title}” (${routineCandidate.schedule_kind})? Say OK, wrong, or stop.`, `روتین «${routineCandidate.title}» ساخته شود؟ تأیید، اشتباه یا توقف.`));
            } else {
                candidate = parseTask(title);
                flow = 'confirm_add';
                await say(t(`Add “${candidate.title}”? Say OK, wrong or stop.`, `کار «${candidate.title}» اضافه شود؟ بگویید تأیید، اشتباه یا توقف.`));
            }
        } else {
            info = t('Got it. Keep talking; say “finish” when done.', 'ثبت شد؛ ادامه دهید و در پایان finish بگویید.');
            render();
        }
        return;
    }
    if (flow === 'confirm_add' || flow === 'confirm_add_routine' || flow === 'confirm_delete' || flow === 'confirm_complete') {
        if (wordsLike(clean, /(^(ok|okay|yes|confirm|correct|sure|done)$|تأیید|بله|درسته|اوکی)/i)) {
            if (flow === 'confirm_add_routine' && routineCandidate) {
                try {
                    await backend.saveRoutine(routineCandidate);
                    await onDataUpdate();
                    await say(t('Routine saved.', 'روتین ثبت شد.'));
                } catch (e) {
                    await say(t('Could not save routine: ', 'ذخیره روتین موفق نشد: ') + String(e));
                }
            } else if (candidate) {
                try {
                    if (flow === 'confirm_add') {
                        await backend.saveTask(candidate);
                        await onDataUpdate();
                        await say(t('Task added successfully.', 'کار با موفقیت اضافه شد.'));
                    } else if (flow === 'confirm_delete') {
                        await backend.deleteTask(candidate.id);
                        await onDataUpdate();
                        await say(t('Task deleted.', 'کار حذف شد.'));
                    } else {
                        await backend.toggleTask(candidate.id);
                        await onDataUpdate();
                        await say(t('Marked complete.', 'انجام کار ثبت شد.'));
                    }
                } catch (e) {
                    await say(t('The action failed: ', 'عملیات موفق نبود: ') + String(e));
                }
            }
            candidate = null;
            routineCandidate = null;
            flow = 'listening';
            return;
        }
        if (wordsLike(clean, /(wrong|no|change|incorrect|اشتباه|نه|غلط|دوباره)/i)) {
            if (flow === 'confirm_add' || flow === 'confirm_add_routine') {
                draft = [];
                candidate = null;
                routineCandidate = null;
                flow = 'collect';
                await say(t('Okay, tell me the task again. Say finish when done.', 'دوباره کار را بگویید و در پایان finish بگویید.'));
            } else {
                candidate = null;
                flow = 'listening';
                await say(t('Cancelled. What next?', 'لغو شد. کار بعدی؟'));
            }
            return;
        }
        await say(t('Please say OK, wrong, or stop.', 'لطفاً بگویید تأیید، اشتباه یا توقف.'));
        return;
    }
    if (flow === 'delete_title' || flow === 'complete_title') {
        const found = chooseTask(clean);
        if (!found) {
            await say(t('I could not identify an exact task. Say the full title or stop.', 'کار مشخص نشد. عنوان دقیق را بگویید یا توقف را انتخاب کنید.'));
            return;
        }
        candidate = found;
        flow = flow === 'delete_title' ? 'confirm_delete' : 'confirm_complete';
        await say(t(`${flow === 'confirm_delete' ? 'Delete' : 'Complete'} “${found.title}”? Say OK to confirm.`, `کار «${found.title}» ${flow === 'confirm_delete' ? 'حذف' : 'انجام شده'} شود؟ برای تأیید بگویید اوکی.`));
        return;
    }
    await processIntent(clean);
}
function parseTask(title) {
    const task = newTask();
    task.title = title.trim();
    const when = task.title.match(/@([01]?\d|2[0-3]):([0-5]\d)/);
    if (when) {
        task.due_time = `${when[1].padStart(2, '0')}:${when[2]}`;
        task.title = task.title.replace(when[0], '').trim();
    }
    if (/\btomorrow\b|فردا/i.test(task.title)) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        task.due_date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        task.title = task.title.replace(/\btomorrow\b|فردا/ig, '').trim();
    }
    return task;
}
export function parseRoutine(description) {
    const base = routineDraft(newTask().due_date);
    let title = description.trim();
    base.schedule_kind = 'anytime';
    base.weekdays_mask = 127;
    if (/\b(every day|daily)\b|هر روز|روزانه/i.test(title)) {
        base.schedule_kind = 'daily';
        title = title.replace(/\b(every day|daily)\b|هر روز|روزانه/ig, '').trim();
    }
    if (/\b(weekends?)\b|آخر هفته/i.test(title)) {
        base.schedule_kind = 'daily';
        base.rule_json = JSON.stringify({
            day_class: 'weekend',
            weekend_days: [
                4
            ],
            calendar: 'jalali'
        });
        title = title.replace(/\b(weekends?)\b|آخر هفته/ig, '').trim();
    }
    const dayNames = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday'
    ];
    const bits = dayNames.flatMap((name, i)=>new RegExp(`\\b${name}\\b`, 'i').test(title) ? [
            i
        ] : []);
    if (bits.length) {
        base.schedule_kind = 'weekly';
        base.weekdays_mask = bits.reduce((m, i)=>m | 1 << i, 0);
        title = title.replace(/\b(on|every)\b|\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/ig, '').trim();
    }
    if (/\b(every month|monthly)\b|ماهانه/i.test(title)) {
        base.schedule_kind = 'monthly';
        base.month_day = 1;
        title = title.replace(/\b(every month|monthly)\b|ماهانه/ig, '').trim();
    }
    base.title = title || description.trim();
    return base;
}
function chooseTask(name) {
    const openTasks = data.tasks.filter((x)=>!x.done);
    let list = openTasks.filter((x)=>x.title.toLowerCase() === name.toLowerCase());
    if (list.length === 1) return list[0];
    list = openTasks.filter((x)=>x.title.toLowerCase().includes(name.toLowerCase()));
    return list.length === 1 ? list[0] : null;
}
async function processIntent(text) {
    const clean = text.toLocaleLowerCase();
    if (/\b(add routine|create routine|new routine)\b|روتین جدید|افزودن روتین|اضافه کردن روتین/.test(clean)) {
        draftKind = 'routine';
        flow = 'collect';
        draft = [];
        candidate = null;
        routineCandidate = null;
        await say(t('Describe the routine and its schedule. Say finish when done.', 'عنوان و زمان‌بندی روتین را بگویید و سپس finish بگویید.'));
        return;
    }
    if (/\b(add time|add task|new task|create task)\b|کار جدید|افزودن کار|اضافه کردن کار/.test(clean)) {
        draftKind = 'task';
        flow = 'collect';
        draft = [];
        candidate = null;
        routineCandidate = null;
        await say(t('What task shall I add? Speak freely, and say finish when done.', 'چه کاری اضافه کنم؟ توضیح دهید و در پایان finish بگویید.'));
        return;
    }
    if (/\b(delete task|remove task)\b|حذف کار/.test(clean)) {
        flow = 'delete_title';
        await say(t('Say the exact title of the task to delete.', 'عنوان دقیق کاری که می‌خواهید حذف شود را بگویید.'));
        return;
    }
    if (/\b(complete task|finish task|mark task)\b|انجام کار|تکمیل کار/.test(clean)) {
        flow = 'complete_title';
        await say(t('Tell me which task you completed.', 'بگویید کدام کار را انجام داده‌اید.'));
        return;
    }
    const sections = [
        [
            /\b(show|open|list|display|view|see|go to|bring up)(?: (?:me|my|the|all|our))* routines?\b|^routines?$|\b(my|today'?s) routines?\b|روتین‌ها را نشان بده|روتین ها را نشان بده|نمایش روتین|روتین(‌ها| ها)?/,
            'routines'
        ],
        [
            /\b(show|open|view|go to) (?:the |my )?calendar\b|نمایش تقویم/,
            'calendar'
        ],
        [
            /\b(show today|today view|open today)\b|نمایش امروز/,
            'today'
        ],
        [
            /\b(show|open|view) (?:the |my )?notes\b|یادداشت‌ها/,
            'notes'
        ]
    ];
    for (const [regex, view] of sections){
        if (regex.test(clean)) {
            onNavigate(view);
            const summary = data.routines.slice(0, 5).map((r)=>r.title).join(', ');
            await say(view === 'routines' ? t(data.routines.length ? `Showing ${data.routines.length} routines: ${summary}.` : 'You do not have any routines yet.', data.routines.length ? `${data.routines.length} روتین: ${summary}` : 'هنوز روتینی ندارید.') : t(`Opening ${view}.`, `بخش ${view} باز شد.`));
            return;
        }
    }
    if (/\b(what.*today|today.*tasks|daily agenda)\b|کارهای امروز|برنامه امروز/.test(clean)) {
        const date = newTask().due_date;
        const tasks = data.tasks.filter((x)=>x.due_date === date && !x.done);
        await say(tasks.length ? t(`You have ${tasks.length} remaining tasks: `, `${tasks.length} کار باقی مانده: `) + tasks.slice(0, 6).map((x)=>x.title).join('، ') : t('Your task list is clear today.', 'فهرست کارهای امروز خالی است.'));
        return;
    }
    if (/\b(what can you do|your commands|voice commands|how do i use you)\b|راهنما|چه کارهایی بلدی/.test(clean)) {
        await say(t('I can show routines, list today’s tasks, create routines, add tasks and complete tasks. Say a command to begin.', 'می‌توانم روتین‌ها را نمایش دهم، کارهای امروز را بگویم و روتین یا کار جدید ثبت کنم. دستور خود را بگویید.'));
        return;
    }
    if (clean.split(/\s+/).length <= 2 && !/[؟?]/.test(clean)) {
        await say(t('I am not sure what you mean. Try “show routines”, “add task”, or ask a full question.', 'منظورتان روشن نیست. مثلاً «نمایش روتین‌ها» بگویید یا سؤال کامل بپرسید.'));
        return;
    }
    flow = 'listening';
    busy = true;
    render();
    try {
        const reply = await backend.aiChat(text, true);
        row('assistant', reply.answer);
        render();
        await voiceResponse(reply.answer);
    } catch (e) {
        await say(t('That did not work. Check AI settings or rephrase your request.', 'پاسخ دریافت نشد. تنظیمات را بررسی کنید یا سؤال را واضح‌تر بگویید.'));
        error = String(e);
    } finally{
        busy = false;
    }
}
export function initAssistant(container) {
    root = container;
    container.addEventListener('click', (event)=>{
        const target = event.target.closest('[data-ai-action]');
        if (!target) return;
        const action = target.dataset.aiAction;
        if (action === 'close') {
            closeAssistant();
            return;
        }
        if (action === 'chat' || action === 'voice' || action === 'settings') {
            if (action !== 'voice' && flow !== 'idle') {
                runID++;
                void backend.cancelNativeVoice();
                void backend.stopLocalSpeech();
                endCapture();
                flow = 'idle';
            }
            mode = action;
            error = '';
            info = '';
            render();
            return;
        }
        if (action === 'start-voice') {
            void startVoice();
            return;
        }
        if (action === 'stop-voice') {
            runID++;
            void backend.cancelNativeVoice();
            void backend.stopLocalSpeech();
            endCapture();
            flow = 'idle';
            info = t('Voice session stopped.', 'گفتگوی صوتی پایان یافت.');
            render();
            return;
        }
        if (action === 'models') {
            void discover();
            return;
        }
        if (action === 'remove-key') {
            const provider = target.dataset.provider || '';
            if (confirm(t(`Remove ${provider} API key from this computer?`, `کلید ${provider} حذف شود؟`))) {
                void backend.aiSetKey(provider, '').then(async ()=>{
                    aiStatus = await backend.aiStatus();
                    render(true);
                }).catch(setError);
            }
            return;
        }
    });
    container.addEventListener('submit', (event)=>{
        const form = event.target;
        if (form.id === 'ai-chat-form') {
            event.preventDefault();
            const input = form.querySelector('textarea[name="message"]');
            const text = input.value.trim();
            if (text) {
                input.value = '';
                void chat(text);
            }
        }
        if (form.id === 'ai-settings-form') {
            event.preventDefault();
            void saveSettings(form);
        }
    });
    container.addEventListener('keydown', (event)=>{
        const target = event.target;
        if (target.closest('#ai-chat-form') && event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            target.closest('form')?.requestSubmit();
        }
    });
}
