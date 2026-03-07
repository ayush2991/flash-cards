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
        const response = await fetch(bank.path);
        flashcardsData = await response.json();
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

    if (window.marked) {
        return marked.parse(preprocessed);
    }
    // Fallback if marked is not yet loaded
    return preprocessed.replace(/\n/g, '<br>');
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
    currentCardIndex = 0;
    filteredCards = flashcardsData.filter(card => card.theme === theme);

    // Update active state in UI
    const buttons = els.themeNav.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });

    renderCard();
}

// Logic: Rendering
async function renderCard() {
    if (filteredCards.length === 0) return;
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
    els.progressIndicator.textContent = `Card ${current} of ${total}`;

    const progressPercent = (current / total) * 100;
    els.progressBarFill.style.width = `${progressPercent}%`;
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
    const apiKey = localStorage.getItem('gemini_api_key');
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

    // Use shared helper
    await ensureMarkedLoaded();

    const cacheKey = `ai_cache_${currentCard.question}`;
    const cachedResponse = localStorage.getItem(cacheKey);

    if (cachedResponse && !forceRefresh) {
        try {
            const parsed = JSON.parse(cachedResponse);
            els.aiResponseContainer.innerHTML = formatAIResponse(parsed.text);
            renderMath(els.aiResponseContainer);
            els.aiLoading.classList.add('hidden');
            els.aiResponseContainer.classList.remove('hidden');
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
        alert('Cache cleared successfully.');
    }
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
            regenerateBtn: document.getElementById('regenerate-btn')
        };

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

        if (els.saveSettingsBtn) {
            els.saveSettingsBtn.addEventListener('click', () => {
                const key = els.geminiApiKeyInput.value.trim();
                if (key) {
                    localStorage.setItem('gemini_api_key', key);
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

        const savedKey = localStorage.getItem('gemini_api_key');
        if (savedKey && els.geminiApiKeyInput) els.geminiApiKeyInput.value = savedKey;

        document.addEventListener('keydown', (e) => {
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
