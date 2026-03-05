// Embedded Helper: Google AI simplified logic (Mock or Local handled)
// Note: In a real production environment, you'd use a bundler. 
// For this local-first app, we'll use the global object if available or handle imports via CDN correctly.

const flashcardsData = [
    { theme: "ML Foundations", question: "Explain the transformer architecture. Why does self-attention scale well?", answer: "Transformers use an encoder-decoder structure based on self-attention mechanisms. It scales well because it allows for massive parallelization across the sequence length, unlike sequential models like RNNs." },
    { theme: "ML Foundations", question: "Explain how attention scales with sequence length and how to mitigate quadratic complexity.", answer: "Standard self-attention is O(n²) where n is sequence length. Mitigation strategies include Sparse Attention (only attending to fixed patterns), FlashAttention (memory-efficient IO aware), or Linear Attention (using kernels)." },
    { theme: "ML Foundations", question: "How do transformers differ from RNNs conceptually and practically?", answer: "Conceptually: RNNs process tokens one-by-one (sequential), while Transformers see the whole sequence at once (global). Practically: Transformers are highly parallelizable on GPUs and handle long-range dependencies far better via attention." },
    { theme: "ML Foundations", question: "How do pretraining and fine-tuning differ in large language models?", answer: "Pretraining is self-supervised learning on massive unlabeled datasets (like the web) to learn general knowledge. Fine-tuning is supervised learning on a smaller, specific dataset to adapt the model to a particular task or domain." },
    { theme: "ML Foundations", question: "When would you fine-tune vs. train from scratch?", answer: "Fine-tune when you have a limited domain-specific dataset and a relevant base model exists. Train from scratch when your data is vastly different (e.g., specialized medical code) or you are testing a novel architecture." },
    { theme: "ML Foundations", question: "Compare LoRA, full fine-tuning, adapters, and prompt tuning.", answer: "LoRA: Updates low-rank decompositions of weights. Full: Updates all parameters (expensive). Adapters: Inserts small trainable layers between existing ones. Prompt Tuning: Optimizes continuous 'soft' prompt embeddings." },
    { theme: "ML Foundations", question: "What are the tradeoffs between model size, data quality, and compute?", answer: "Scaling laws (Chinchilla) show that to optimize performance, model size and data must scale proportionally. Better data quality allows for smaller models to outperform larger ones trained on noisy data." },
    { theme: "ML Foundations", question: "Why do larger models sometimes generalize better despite being overparameterized?", answer: "This is known as 'Double Descent.' Beyond a certain threshold of parameters, models move from overfitting to finding smoother, simpler solutions that generalize better across the data manifold." },
    { theme: "ML Foundations", question: "Explain bias–variance tradeoff in the context of large neural networks.", answer: "Larger networks decrease bias (ability to fit complex data) but can increase variance (overfitting). Modern LLMs manage this via massive scale data and implicit regularization from SGD and dropout." },
    { theme: "ML Foundations", question: "What is label smoothing and why might it help?", answer: "It replaces hard labels (0 or 1) with soft versions (e.g., 0.1 and 0.9). It prevents the model from becoming overconfident, improving generalization and robustness against noisy labels." },
    { theme: "ML Foundations", question: "What’s the difference between generative and discriminative models?", answer: "Generative models learn the joint probability P(X,Y) and can create new data samples. Discriminative models learn the conditional probability P(Y|X) to classify or predict boundaries between classes." },
    { theme: "ML Foundations", question: "What are the failure modes of cross-entropy loss?", answer: "It is highly sensitive to outliers, can lead to vanishing gradients if the model becomes overconfident (probabilities near 0 or 1), and doesn't explicitly optimize for ranking or class margins." },
    { theme: "ML Foundations", question: "Why does batch normalization help training?", answer: "It stabilizes the distribution of layer inputs (reducing internal covariate shift), allows for higher learning rates, and provides a slight regularization effect by adding small noise to each batch." },

    { theme: "Infrastructure", question: "How would you design a training pipeline for a trillion-parameter model?", answer: "A trillion-parameter model requires 3D parallelism (Data, Model/Tensor, and Pipeline parallelism). Use ZeRO redundancy optimizations (DeepSpeed/Megatron-LM) to partition optimizer states and gradients. Leverage high-bandwidth interconnects like InfiniBand/NVLink and overlap computation with communication." },
    { theme: "Infrastructure", question: "What bottlenecks arise in distributed training, and how do you mitigate them?", answer: "Bottlenecks: Communication overhead (All-Reduce throughput), Memory wall (weights/gradients/states), and Stragglers. Mitigation: Gradient accumulation, mixed-precision (BF16), gradient checkpointing, and asynchronous execution to hide communication latency." },
    { theme: "Infrastructure", question: "Explain data parallelism vs model parallelism vs pipeline parallelism.", answer: "Data: Replicates model across GPUs, different data per batch. Model (Tensor): Splits individual layers/tensors across GPUs. Pipeline: Splits different layers across GPUs in a sequence, using micro-batching to maximize throughput and minimize 'bubbles'." },
    { theme: "Infrastructure", question: "How does distributed data parallelism work in practice?", answer: "DDP replicates the model on each process. During the backward pass, it uses a Ring All-Reduce or hierarchical All-Reduce to average gradients across all replicas. The synchronized gradients are then applied by the optimizer to keep all copies identical." },
    { theme: "Infrastructure", question: "Why does Adam often converge faster than SGD, and when does SGD outperform Adam?", answer: "Adam uses adaptive learning rates and momentum for faster convergence in complex loss landscapes. SGD + Momentum often generalizes better and finds 'flatter' minima, making it superior for final fine-tuning or high-accuracy requirements." },
    { theme: "Infrastructure", question: "What causes training instability in deep networks, and how do you debug exploding gradients?", answer: "Causes: High learning rates, vanishing/exploding gradients, or poor initialization. Debugging: Monitor gradient norms, weight/activation distributions. Fixes: Proper init (He/Xavier), LayerNorm/RMSNorm, and gradient clipping." },
    { theme: "Infrastructure", question: "What is gradient clipping and when is it necessary?", answer: "Gradient clipping limits the norm or value of gradients during backprop. It's necessary in architectures prone to spikes (like RNNs or deep Transformers) to prevent the optimizer from taking excessively large, unstable steps." },
    { theme: "Infrastructure", question: "What is mixed precision training and why does it help?", answer: "Mixed precision uses FP16/BF16 for tensors and compute while maintaining FP32 master weights. It reduces memory footprint (allowing larger batches), increases throughput via Tensor Cores, and speeds up training with negligible accuracy loss." },
    { theme: "Infrastructure", question: "What are the bottlenecks in serving large transformer models?", answer: "Memory bandwidth (memory-bound decoding), VRAM capacity (KV cache size), and high latency from the sequential nature of autoregressive generation. Communication overhead also impacts multi-GPU inference." },
    { theme: "Infrastructure", question: "How does KV caching work in autoregressive decoding?", answer: "KV caching stores the Keys and Values of previously processed tokens in memory. This avoids redundant recomputation of the entire attention matrix at each step, reducing the per-token cost from O(N^2) to O(N)." },
    { theme: "Infrastructure", question: "How would you optimize inference latency without sacrificing quality?", answer: "FlashAttention/FlashDecoding for memory efficiency, Speculative Decoding with a smaller draft model, Quantization (INT4/FP8), weight pruning, and kernel fusion to reduce kernel launch overhead." },
    { theme: "Infrastructure", question: "What tradeoffs exist between on-device inference and server-side inference?", answer: "On-device: Low latency, high privacy, zero server cost; limited by device VRAM/compute. Server-side: High compute (trillion+ models), shared load; limited by network latency, high operational cost, and privacy risks." },
    { theme: "Infrastructure", question: "How do you monitor and debug large-scale ML systems in production?", answer: "Track data/concept drift, log throughput/latency distributions, monitor p99 latency, use shadow/canary deployments for A/B testing, and implement robust observability for distributed traces." },
    { theme: "General Knowledge", question: "Which planet is known as the Red Planet?", answer: "Mars" },
    { theme: "General Knowledge", question: "What is the largest ocean on Earth?", answer: "Pacific Ocean" },
    { theme: "General Knowledge", question: "Who wrote 'Romeo and Juliet'?", answer: "William Shakespeare" },
    { theme: "General Knowledge", question: "How many continents are there?", answer: "Seven" },

    { theme: "Space", question: "What is the largest planet in our solar system?", answer: "Jupiter" },
    { theme: "Space", question: "What is the closest star to Earth?", answer: "The Sun" },
    { theme: "Space", question: "Which galaxy is Earth located in?", answer: "Milky Way" },
    { theme: "Space", question: "What is the term for a star that has exploded?", answer: "Supernova" }
];

// State
let currentTheme = null;
let currentCardIndex = 0;
let filteredCards = [];
let els = {};

// Helper: Format AI markdown
function formatAIResponse(text) {
    if (window.marked) {
        return marked.parse(text);
    }
    // Fallback if marked is not yet loaded
    return text.replace(/\n/g, '<br>');
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
function renderCard() {
    if (filteredCards.length === 0) return;
    const currentCard = filteredCards[currentCardIndex];

    els.flashcard.classList.remove('flipped');

    // Reset scroll positions
    const front = document.querySelector('.flashcard-front');
    const back = document.querySelector('.flashcard-back');
    if (front) front.scrollTop = 0;
    if (back) back.scrollTop = 0;

    // Immediate content update
    els.questionText.textContent = currentCard.question;
    els.answerText.textContent = currentCard.answer;

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

    // Load marked library if not already present (ensure it's ready for cache or fresh responses)
    if (!window.marked) {
        try {
            const markedModule = await import("https://esm.run/marked");
            window.marked = markedModule.marked;
            window.marked.setOptions({ breaks: true, gfm: true });
        } catch (e) {
            console.error("Failed to load marked:", e);
        }
    }

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
        // Using the user-preferred @google/genai JS SDK syntax
        const { GoogleGenAI } = await import("https://esm.run/@google/genai");

        const ai = new GoogleGenAI({ apiKey });

        const result = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{
                role: 'user',
                parts: [{ text: `Explain this in detail for a staff-level interview: ${currentCard.question}` }]
            }],
            systemInstruction: "You are an expert technical interviewer providing Guided Answers. Deliver deep, technical, and comprehensive responses that focus on system design, trade-offs, and scalability. Always output your response in standardized, well-structured Markdown, utilizing appropriate headers (h2, h3), code blocks for technical examples, bold text for emphasis, and bulleted lists for clarity."
        });

        // The new SDK uses .text for the response content
        const text = result.text;

        // Cache the response
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
function init() {
    try {
        console.log("Initializing Knowledge Vault...");
        // DOM Element References
        els = {
            themeNav: document.getElementById('theme-nav'),
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

        // Build themes
        const themes = [...new Set(flashcardsData.map(card => card.theme))];
        if (els.themeNav) {
            els.themeNav.innerHTML = ''; // Clear
            themes.forEach(theme => {
                const btn = document.createElement('button');
                btn.textContent = theme;
                btn.dataset.theme = theme;
                btn.addEventListener('click', () => setTheme(theme));
                els.themeNav.appendChild(btn);
            });
        }

        // App Event Listeners
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

        // Auto-select first theme
        if (themes.length > 0) setTheme(themes[0]);
        console.log("Success: Themes loaded and app initialized.");
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
