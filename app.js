// Embedded Helper: Google AI simplified logic (Mock or Local handled)
// Note: In a real production environment, you'd use a bundler. 
// For this local-first app, we'll use the global object if available or handle imports via CDN correctly.

// State
let questionBanksRegistry = [];
let flashcardsData = [];
let currentBankId = null;
let currentTheme = null;
let currentCardIndex = 0;
let filteredCards = [];
let els = {};
const FONT_LIMITS = { min: 0.95, max: 1.9, step: 0.1 };
const SWIPE = { threshold: 50, restraint: 60 };

// Logic: Dynamic Loading
async function loadRegistry() {
    try {
        const response = await fetch('data/banks.json');
        questionBanksRegistry = await response.json();

        if (els.bankSelect) {
            els.bankSelect.innerHTML = '';
            questionBanksRegistry.forEach(bank => {
                const option = document.createElement('option');
                option.value = bank.id;
                option.textContent = bank.name;
                els.bankSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Failed to load registry:", error);
    }
}

async function loadQuestionBank(bankId) {
    const bank = questionBanksRegistry.find(b => b.id === bankId);
    if (!bank) return;

    try {
        if (bank.data) {
            flashcardsData = bank.data;
        } else {
            const response = await fetch(bank.path);
            flashcardsData = await response.json();
        }
        currentBankId = bankId;
        localStorage.setItem('last_bank_id', bankId);

        // Build themes
        const themes = [...new Set(flashcardsData.map(card => card.theme))];
        if (els.themeNav) {
            els.themeNav.innerHTML = ''; // Clear
            themes.forEach(theme => {
                const btn = document.createElement('button');
                const span = document.createElement('span');
                span.textContent = theme;
                btn.appendChild(span);
                btn.dataset.theme = theme;
                btn.addEventListener('click', () => setTheme(theme));
                els.themeNav.appendChild(btn);
            });
        }

        // Set first theme
        if (themes.length > 0) setTheme(themes[0]);
    } catch (error) {
        console.error(`Failed to load bank: ${bankId}`, error);
    }
}

// Helper: Format AI markdown
function formatAIResponse(text) {
    if (!text) return '';
    // Enhanced pre-processing: Add newlines before numerical points (e.g., "1.", "2.")
    // to ensure 'marked' detects them as proper list items even in single-line strings.
    const preprocessed = text.replace(/([.!?])\s+(\d+\.\s+)/g, '$1\n$2');

    let html = preprocessed.replace(/\n/g, '<br>');
    if (window.marked) {
        html = marked.parse(preprocessed);
    }

    if (window.DOMPurify) {
        return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
    }
    return html;
}

// Helper: Render LaTeX math
function renderMath(element) {
    if (window.renderMathInElement) {
        renderMathInElement(element, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false },
                { left: '\\[', right: '\\]', display: true }
            ],
            throwOnError: false
        });
    }
}

// Logic: Theme Switching
function setTheme(theme) {
    currentTheme = theme;
    filteredCards = flashcardsData.filter(card => card.theme === theme);
    currentCardIndex = getSavedCardIndex();

    // Update active state in UI
    const buttons = els.themeNav.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });

    renderCard();
}

// Logic: Rendering
async function renderCard() {
    if (filteredCards.length === 0) {
        els.questionText.innerHTML = "Choose a theme above to start practicing. Your progress will be saved per theme.";
        els.answerText.innerHTML = "";
        els.prevBtn.disabled = true;
        els.nextBtn.disabled = true;
        els.progressIndicator.textContent = "No cards loaded";
        els.progressBarFill.style.width = "0%";
        return;
    }
    const currentCard = filteredCards[currentCardIndex];

    els.flashcard.classList.remove('flipped');

    // Ensure marked is ready for rendering
    await ensureMarkedLoaded();

    // Reset scroll positions
    const front = document.querySelector('.flashcard-front');
    const back = document.querySelector('.flashcard-back');
    if (front) front.scrollTop = 0;
    if (back) back.scrollTop = 0;

    // Content update with Markdown + Math support
    els.questionText.innerHTML = formatAIResponse(currentCard.question);
    els.answerText.innerHTML = formatAIResponse(currentCard.answer);

    renderMath(els.questionText);
    renderMath(els.answerText);

    // Update progress
    updateControls();
}

function updateControls() {
    els.prevBtn.disabled = currentCardIndex === 0;
    els.nextBtn.disabled = currentCardIndex === filteredCards.length - 1;

    const current = currentCardIndex + 1;
    const total = filteredCards.length;
    const themeLabel = currentTheme || 'Theme';
    els.progressIndicator.textContent = `${themeLabel} · Card ${current} of ${total}`;

    const progressPercent = (current / total) * 100;
    els.progressBarFill.style.width = `${progressPercent}%`;

    saveCardIndex();
}

// Logic: Theme (Light/Dark)
function initTheme() {
    const savedTheme = localStorage.getItem('app_theme');
    const hasOverride = localStorage.getItem('app_theme_override') === 'true';
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (theme) => {
        if (theme === 'light') {
            document.documentElement.classList.add('light-mode');
            els.sunIcon?.classList.add('hidden');
            els.moonIcon?.classList.remove('hidden');
        } else {
            document.documentElement.classList.remove('light-mode');
            els.sunIcon?.classList.remove('hidden');
            els.moonIcon?.classList.add('hidden');
        }
    };

    if (hasOverride && savedTheme) {
        applyTheme(savedTheme);
    } else {
        applyTheme(systemPrefersDark.matches ? 'dark' : 'light');
    }

    // Listen for system changes
    systemPrefersDark.addEventListener('change', (e) => {
        if (!localStorage.getItem('app_theme')) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });
}

function toggleTheme() {
    const isLight = document.documentElement.classList.toggle('light-mode');
    const newTheme = isLight ? 'light' : 'dark';
    localStorage.setItem('app_theme', newTheme);
    localStorage.setItem('app_theme_override', 'true');

    // Update icons
    if (isLight) {
        els.sunIcon?.classList.add('hidden');
        els.moonIcon?.classList.remove('hidden');
    } else {
        els.sunIcon?.classList.remove('hidden');
        els.moonIcon?.classList.add('hidden');
    }
}

function getProgressKey() {
    if (!currentBankId || !currentTheme) return null;
    return `progress_${currentBankId}_${currentTheme}`;
}

function saveCardIndex() {
    const key = getProgressKey();
    if (!key) return;
    localStorage.setItem(key, String(currentCardIndex));
}

function getSavedCardIndex() {
    const key = getProgressKey();
    if (!key) return 0;
    const raw = localStorage.getItem(key);
    const idx = raw ? parseInt(raw, 10) : 0;
    if (Number.isNaN(idx)) return 0;
    return Math.min(Math.max(idx, 0), Math.max(filteredCards.length - 1, 0));
}

function applyFontSizes(questionSize, answerSize) {
    const root = document.documentElement;
    root.style.setProperty('--question-size', `${questionSize}rem`);
    root.style.setProperty('--answer-size', `${answerSize}rem`);
}

function loadFontSizes() {
    const q = parseFloat(localStorage.getItem('question_font_size'));
    const a = parseFloat(localStorage.getItem('answer_font_size'));
    if (!Number.isNaN(q) && !Number.isNaN(a)) {
        applyFontSizes(q, a);
    }
}

function adjustFontSizes(delta) {
    const styles = getComputedStyle(document.documentElement);
    const q = parseFloat(styles.getPropertyValue('--question-size')) || 1.55;
    const a = parseFloat(styles.getPropertyValue('--answer-size')) || 1.25;
    const nextQ = Math.min(Math.max(q + delta, FONT_LIMITS.min), FONT_LIMITS.max);
    const nextA = Math.min(Math.max(a + delta, FONT_LIMITS.min), FONT_LIMITS.max);
    applyFontSizes(nextQ, nextA);
    localStorage.setItem('question_font_size', String(nextQ));
    localStorage.setItem('answer_font_size', String(nextA));
}

function toggleFocusMode() {
    const isOn = document.body.classList.toggle('focus-mode');
    localStorage.setItem('focus_mode', isOn ? 'true' : 'false');
    if (els.focusModeBtn) els.focusModeBtn.classList.toggle('active', isOn);
}

function initFocusMode() {
    const isOn = localStorage.getItem('focus_mode') === 'true';
    if (isOn) document.body.classList.add('focus-mode');
    if (els.focusModeBtn) els.focusModeBtn.classList.toggle('active', isOn);
}

function showOnboardingIfNeeded() {
    if (localStorage.getItem('onboarding_seen') === 'true') return;
    toggleModal(els.onboardingModal, true);
}

function dismissOnboarding() {
    localStorage.setItem('onboarding_seen', 'true');
    toggleModal(els.onboardingModal, false);
}

function initSwipeNavigation() {
    if (!els.flashcard) return;
    let startX = 0;
    let startY = 0;
    let tracking = false;

    els.flashcard.addEventListener('touchstart', (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        tracking = true;
    }, { passive: true });

    els.flashcard.addEventListener('touchend', (e) => {
        if (!tracking || !e.changedTouches || e.changedTouches.length !== 1) return;
        const touch = e.changedTouches[0];
        const distX = touch.clientX - startX;
        const distY = touch.clientY - startY;
        tracking = false;

        if (Math.abs(distX) >= SWIPE.threshold && Math.abs(distY) <= SWIPE.restraint) {
            if (distX < 0) navigateCard(1);
            if (distX > 0) navigateCard(-1);
            hideSwipeHint();
        }
    }, { passive: true });

    showSwipeHint();
}

function showSwipeHint() {
    if (localStorage.getItem('swipe_hint_seen') === 'true') return;
    if (window.innerWidth >= 1024) return;
    els.swipeHint?.classList.add('visible');
    els.swipeHintBack?.classList.add('visible');
}

function hideSwipeHint() {
    if (localStorage.getItem('swipe_hint_seen') === 'true') return;
    localStorage.setItem('swipe_hint_seen', 'true');
    els.swipeHint?.classList.remove('visible');
    els.swipeHintBack?.classList.remove('visible');
}

function flipCard() {
    if (!currentTheme) return;
    els.flashcard.classList.toggle('flipped');
}

function navigateCard(direction) {
    if (!currentTheme) return;
    const newIndex = currentCardIndex + direction;
    if (newIndex >= 0 && newIndex < filteredCards.length) {
        currentCardIndex = newIndex;
        renderCard();
    }
}

// Modal handling
function toggleModal(modal, show) {
    if (show) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    } else {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Helper: Ensure marked is loaded
async function ensureMarkedLoaded() {
    if (window.marked) return;
    try {
        const markedModule = await import("https://esm.run/marked");
        window.marked = markedModule.marked;
        window.marked.setOptions({ breaks: true, gfm: true });
    } catch (e) {
        console.error("Failed to load marked:", e);
    }
}

// AI logic
async function showAIInsight(forceRefresh = false) {
    const apiKey = localStorage.getItem('gemini_api_key') || sessionStorage.getItem('gemini_api_key');
    if (!apiKey) {
        alert('Please provide a Gemini API Key in Settings first.');
        toggleModal(els.settingsModal, true);
        return;
    }

    if (!currentTheme || filteredCards.length === 0) return;

    const currentCard = filteredCards[currentCardIndex];
    if (window.innerWidth >= 1024) {
        els.aiPanel.classList.remove('hidden-panel');
    } else {
        els.aiPanel.classList.add('show-mobile');
        setTimeout(() => els.aiPanel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }

    if (els.aiPlaceholder) els.aiPlaceholder.classList.add('hidden');
    els.aiResponseContainer.innerHTML = ''; // Always clear previous content

    // Use shared helper
    await ensureMarkedLoaded();

    const cacheKey = await getCacheKey(currentCard.question);
    const cachedResponse = localStorage.getItem(cacheKey);

    if (cachedResponse && !forceRefresh) {
        try {
            const parsed = JSON.parse(cachedResponse);
            els.aiResponseContainer.innerHTML = formatAIResponse(parsed.text);
            renderMath(els.aiResponseContainer);
            els.aiLoading.classList.add('hidden');
            els.aiResponseContainer.classList.remove('hidden');
            if (els.aiPlaceholder) els.aiPlaceholder.classList.add('hidden'); // Redundant check for safety
            console.log("Serving from cache:", currentCard.question);
            return;
        } catch (e) {
            console.error("Cache parse error:", e);
            localStorage.removeItem(cacheKey);
        }
    }

    els.aiLoading.classList.remove('hidden');
    els.aiResponseContainer.classList.add('hidden');
    els.aiResponseContainer.innerHTML = '';

    try {
        const { GoogleGenAI } = await import("https://esm.run/@google/genai");

        const ai = new GoogleGenAI({ apiKey });
        const bank = questionBanksRegistry.find(b => b.id === currentBankId);
        const bankName = bank ? bank.name : 'Technical';

        const result = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{
                role: 'user',
                parts: [{
                    text: `I am studying for my "${bankName}" interview, specifically on the theme of "${currentTheme}". 

QUESTION: "${currentCard.question}"
REFERENCE ANSWER: "${currentCard.answer}"

Please provide a "Guided Answer" that builds on this reference. Explain the "why" and the broader implications that a Staff Engineer should be able to discuss fluently.`
                }]
            }],
            systemInstruction: `You are a friendly and expert technical mentor. Your goal is to help a candidate master staff-level concepts by providing clear, deep, and nuanced explanations. Focus on system design, trade-offs, and scalability in the context of ${bankName}. Always output your response in standardized, well-structured Markdown, utilizing appropriate headers (h2, h3), code blocks for technical examples, and bulleted lists for clarity. Use LaTeX ($$) for any mathematical formulas.`
        });

        const text = result.text;
        localStorage.setItem(cacheKey, JSON.stringify({
            text: text,
            timestamp: Date.now()
        }));
        updateCacheIndex(cacheKey);

        els.aiResponseContainer.innerHTML = formatAIResponse(text);
        renderMath(els.aiResponseContainer);
        els.aiLoading.classList.add('hidden');
        els.aiResponseContainer.classList.remove('hidden');
    } catch (error) {
        console.error("Gemini Unified SDK Error:", error);
        els.aiLoading.classList.add('hidden');
        els.aiResponseContainer.classList.remove('hidden');
        els.aiResponseContainer.innerHTML = `<p style="color: #ef4444;">Guided Answer Error: ${error.message}</p>`;
    }
}

// Generation Logic
async function fetchJobDescription(url) {
    if (!url.startsWith('http')) return url; // Treat as direct topic text if not a URL

    const maxRetries = 2;
    for (let i = 0; i < maxRetries; i++) {
        try {
            if (!localStorage.getItem('allorigins_ack')) {
                const ok = confirm("This will fetch the URL via a third-party proxy (allorigins.win). Continue?");
                if (!ok) throw new Error("Fetch cancelled by user.");
                localStorage.setItem('allorigins_ack', 'true');
            }

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, {
                signal: controller.signal
            });
            clearTimeout(timeout);
            if (!response.ok) throw new Error("Failed to fetch");
            const data = await response.json();
            const html = data.contents;

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const removes = doc.querySelectorAll('script, style, noscript, nav, footer, header, svg, img');
            removes.forEach(s => s.remove());

            const text = doc.body.textContent.replace(/\s+/g, ' ').trim();
            if (text.length > 100) return text;
            throw new Error("Text too short or missing");
        } catch (e) {
            console.error("Fetch try failed:", e);
            if (i === maxRetries - 1) throw new Error("Failed to securely fetch content from URL. You may need to paste the text directly.");
        }
    }
}

async function startJobUrlGeneration() {
    const apiKey = localStorage.getItem('gemini_api_key') || sessionStorage.getItem('gemini_api_key');
    if (!apiKey) {
        alert('Please provide a Gemini API Key in Settings first.');
        toggleModal(els.generateModal, false);
        toggleModal(els.settingsModal, true);
        return;
    }

    const inputVal = els.generateSourceInput.value.trim();
    if (!inputVal) {
        els.generateErrorMsg.textContent = "Please enter a URL or topic.";
        els.generateErrorMsg.classList.remove('hidden');
        return;
    }

    els.generateErrorMsg.classList.add('hidden');
    els.generateInputView.classList.add('hidden');
    els.generateLoadingView.classList.remove('hidden');
    els.generateStatusTitle.textContent = "Analyzing content...";
    els.generateStatusText.textContent = inputVal.startsWith('http') ? "Fetching URL..." : "Preparing topic...";
    els.generateProgressFill.style.width = "10%";

    try {
        const textContext = await fetchJobDescription(inputVal);
        let sourceName = inputVal;
        if (inputVal.startsWith('http')) {
            try { sourceName = new URL(inputVal).hostname.replace('www.', ''); } catch (e) { }
        } else {
            sourceName = inputVal.substring(0, 20);
        }

        els.generateStatusText.textContent = "Generating themes and questions...";
        els.generateProgressFill.style.width = "40%";

        const { GoogleGenAI } = await import("https://esm.run/@google/genai");
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `Based on the following job description or topic context, generate a study flashcard deck for an interview.
Create exactly 4 to 5 distinct technical or behavioral themes. For each theme, generate 8 to 12 flashcards.
Each flashcard must contain a challenging but realistic 'question' (that could be asked in an interview) and a detailed, comprehensive 'answer'.

The output MUST be a strict JSON array of objects, with NO surrounding markdown or text blocks like \`\`\`json.
Format EXACTLY like: [{"theme": "System Design", "question": "...", "answer": "..."}, ...]

CONTEXT:
${textContext.substring(0, 15000)}`;

        const result = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                systemInstruction: "You are an expert technical interviewer. Output valid raw JSON only.",
                responseMimeType: "application/json"
            }
        });

        els.generateProgressFill.style.width = "90%";
        els.generateStatusText.textContent = "Finalizing deck...";

        let jsonText = result.text.trim();
        if (jsonText.startsWith('```json')) jsonText = jsonText.replace(/^```json/, '');
        if (jsonText.endsWith('```')) jsonText = jsonText.replace(/```$/, '');
        jsonText = jsonText.trim();

        const newFlashcards = JSON.parse(jsonText);
        if (!Array.isArray(newFlashcards) || newFlashcards.length === 0) throw new Error("AI returned invalid format");

        const newBankId = 'custom_' + Date.now();
        const newBankName = `AI: ${sourceName}`;

        questionBanksRegistry.push({
            id: newBankId,
            name: newBankName,
            data: newFlashcards
        });

        const option = document.createElement('option');
        option.value = newBankId;
        option.textContent = newBankName;
        els.bankSelect.appendChild(option);

        els.bankSelect.value = newBankId;
        await loadQuestionBank(newBankId);

        toggleModal(els.generateModal, false);

        els.generateSourceInput.value = '';
        els.generateInputView.classList.remove('hidden');
        els.generateLoadingView.classList.add('hidden');

    } catch (e) {
        console.error("Generation error:", e);
        els.generateErrorMsg.textContent = "Error: " + e.message;
        els.generateErrorMsg.classList.remove('hidden');
        els.generateInputView.classList.remove('hidden');
        els.generateLoadingView.classList.add('hidden');
    }
}

function closeAIPanel() {
    if (window.innerWidth >= 1024) {
        els.aiPanel.classList.add('hidden-panel');
    } else {
        els.aiPanel.classList.remove('show-mobile');
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
    }
}

function clearCache() {
    const keys = Object.keys(localStorage);
    const aiKeys = keys.filter(key => key.startsWith('ai_cache_'));
    if (aiKeys.length === 0) {
        alert('Cache is already empty.');
        return;
    }
    if (confirm(`Are you sure you want to clear ${aiKeys.length} cached guided answers?`)) {
        aiKeys.forEach(key => localStorage.removeItem(key));
        localStorage.removeItem('ai_cache_index');
        alert('Cache cleared successfully.');
    }
}

async function getCacheKey(text) {
    if (window.crypto?.subtle) {
        const data = new TextEncoder().encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return `ai_cache_${hashHex}`;
    }
    // Fallback: simple stable hash
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0;
    }
    return `ai_cache_${Math.abs(hash)}`;
}

function updateCacheIndex(cacheKey) {
    const now = Date.now();
    const maxEntries = 50;
    const ttlMs = 1000 * 60 * 60 * 24 * 14; // 14 days
    const indexRaw = localStorage.getItem('ai_cache_index');
    const index = indexRaw ? JSON.parse(indexRaw) : {};
    index[cacheKey] = now;

    const entries = Object.entries(index)
        .filter(([, ts]) => now - ts <= ttlMs)
        .sort((a, b) => b[1] - a[1]);

    const keep = entries.slice(0, maxEntries);
    const keepKeys = new Set(keep.map(([key]) => key));

    entries.slice(maxEntries).forEach(([key]) => localStorage.removeItem(key));
    Object.keys(index).forEach((key) => {
        if (!keepKeys.has(key)) delete index[key];
    });

    localStorage.setItem('ai_cache_index', JSON.stringify(index));
}

// Init Function
async function init() {
    try {
        console.log("Initializing Flash...");
        // DOM Element References
        els = {
            themeNav: document.getElementById('theme-nav'),
            bankSelect: document.getElementById('bank-select'),
            flashcard: document.getElementById('flashcard'),
            questionText: document.getElementById('question-text'),
            answerText: document.getElementById('answer-text'),
            swipeHint: document.getElementById('swipe-hint'),
            swipeHintBack: document.getElementById('swipe-hint-back'),
            prevBtn: document.getElementById('prev-btn'),
            nextBtn: document.getElementById('next-btn'),
            progressIndicator: document.getElementById('progress-indicator'),
            progressBarFill: document.getElementById('progress-bar-fill'),
            flipBtn: document.getElementById('flip-btn'),
            aiInsightBtn: document.getElementById('ai-insight-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            settingsModal: document.getElementById('settings-modal'),
            aiInsightModal: document.getElementById('ai-insight-modal'),
            geminiApiKeyInput: document.getElementById('gemini-api-key'),
            saveSettingsBtn: document.getElementById('save-settings'),
            aiLoading: document.getElementById('ai-loading'),
            aiResponseContainer: document.getElementById('ai-response-container'),
            clearCacheBtn: document.getElementById('clear-cache'),
            aiPanel: document.getElementById('ai-panel'),
            aiPlaceholder: document.getElementById('ai-placeholder'),
            closePanelBtn: document.getElementById('close-panel-btn'),
            regenerateBtn: document.getElementById('regenerate-btn'),
            jobUrlBtn: document.getElementById('job-url-btn'),
            generateModal: document.getElementById('generate-modal'),
            generateSourceInput: document.getElementById('generate-source-input'),
            generateStartBtn: document.getElementById('generate-start-btn'),
            generateErrorMsg: document.getElementById('generate-error-msg'),
            generateInputView: document.getElementById('generate-input-view'),
            generateLoadingView: document.getElementById('generate-loading-view'),
            generateStatusTitle: document.getElementById('generate-status-title'),
            generateStatusText: document.getElementById('generate-status-text'),
            generateProgressFill: document.getElementById('generate-progress-fill'),
            themeToggleBtn: document.getElementById('theme-toggle-btn'),
            sunIcon: document.querySelector('.sun-icon'),
            moonIcon: document.querySelector('.moon-icon'),
            rememberApiKey: document.getElementById('remember-api-key'),
            fontDecreaseBtn: document.getElementById('font-decrease'),
            fontIncreaseBtn: document.getElementById('font-increase'),
            focusModeBtn: document.getElementById('focus-mode-btn'),
            onboardingModal: document.getElementById('onboarding-modal'),
            onboardingStart: document.getElementById('onboarding-start'),
            onboardingClose: document.getElementById('onboarding-close')
        };

        // Initialize Theme
        initTheme();
        loadFontSizes();
        initFocusMode();
        initSwipeNavigation();

        // Pre-load marked for snappy first render
        ensureMarkedLoaded();

        // Load Bank Registry
        await loadRegistry();

        // App Event Listeners
        if (els.bankSelect) {
            els.bankSelect.addEventListener('change', (e) => loadQuestionBank(e.target.value));
        }

        if (els.flipBtn) els.flipBtn.addEventListener('click', flipCard);
        if (els.flashcard) els.flashcard.addEventListener('click', flipCard);
        if (els.prevBtn) els.prevBtn.addEventListener('click', () => navigateCard(-1));
        if (els.nextBtn) els.nextBtn.addEventListener('click', () => navigateCard(1));
        if (els.aiInsightBtn) els.aiInsightBtn.addEventListener('click', () => showAIInsight(false));
        if (els.settingsBtn) els.settingsBtn.addEventListener('click', () => toggleModal(els.settingsModal, true));
        if (els.clearCacheBtn) els.clearCacheBtn.addEventListener('click', clearCache);
        if (els.closePanelBtn) els.closePanelBtn.addEventListener('click', closeAIPanel);
        if (els.regenerateBtn) els.regenerateBtn.addEventListener('click', () => showAIInsight(true));
        if (els.themeToggleBtn) els.themeToggleBtn.addEventListener('click', toggleTheme);
        if (els.fontDecreaseBtn) els.fontDecreaseBtn.addEventListener('click', () => adjustFontSizes(-FONT_LIMITS.step));
        if (els.fontIncreaseBtn) els.fontIncreaseBtn.addEventListener('click', () => adjustFontSizes(FONT_LIMITS.step));
        if (els.focusModeBtn) els.focusModeBtn.addEventListener('click', toggleFocusMode);
        if (els.onboardingStart) els.onboardingStart.addEventListener('click', dismissOnboarding);
        if (els.onboardingClose) els.onboardingClose.addEventListener('click', dismissOnboarding);

        if (els.jobUrlBtn) els.jobUrlBtn.addEventListener('click', () => {
            els.generateErrorMsg.classList.add('hidden');
            els.generateInputView.classList.remove('hidden');
            els.generateLoadingView.classList.add('hidden');
            toggleModal(els.generateModal, true);
        });
        if (els.generateStartBtn) els.generateStartBtn.addEventListener('click', startJobUrlGeneration);

        if (els.saveSettingsBtn) {
            els.saveSettingsBtn.addEventListener('click', () => {
                const key = els.geminiApiKeyInput.value.trim();
                if (key) {
                    const remember = !!els.rememberApiKey?.checked;
                    if (remember) {
                        localStorage.setItem('gemini_api_key', key);
                        sessionStorage.removeItem('gemini_api_key');
                    } else {
                        sessionStorage.setItem('gemini_api_key', key);
                        localStorage.removeItem('gemini_api_key');
                    }
                    alert('Settings saved.');
                    toggleModal(els.settingsModal, false);
                } else {
                    alert('Please enter a valid API key.');
                }
            });
        }

        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                toggleModal(modal, false);
            });
        });

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) toggleModal(e.target, false);
        });

        const savedLocalKey = localStorage.getItem('gemini_api_key');
        const savedSessionKey = sessionStorage.getItem('gemini_api_key');
        const savedKey = savedLocalKey || savedSessionKey;
        if (savedKey && els.geminiApiKeyInput) els.geminiApiKeyInput.value = savedKey;
        if (els.rememberApiKey) els.rememberApiKey.checked = !!savedLocalKey;

        document.addEventListener('keydown', (e) => {
            const activeTag = document.activeElement?.tagName;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag) || document.activeElement?.isContentEditable) {
                return;
            }
            if (e.key === 'Escape' && document.body.classList.contains('focus-mode')) {
                toggleFocusMode();
                return;
            }
            if (e.key === ' ') { // More reliable check
                if (!document.querySelector('.modal.show')) {
                    e.preventDefault();
                    flipCard();
                }
            }
            if (e.key === 'ArrowRight') navigateCard(1);
            if (e.key === 'ArrowLeft') navigateCard(-1);
        });

        // Auto-select first bank or last used bank
        const lastBankId = localStorage.getItem('last_bank_id') || (questionBanksRegistry[0] ? questionBanksRegistry[0].id : null);
        if (lastBankId) {
            els.bankSelect.value = lastBankId;
            await loadQuestionBank(lastBankId);
        }

        showOnboardingIfNeeded();

        console.log("Success: App initialized with dynamic banks.");
    } catch (error) {
        console.error("Initialization failed:", error);
    }
}

// Run init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
