// Global variables
let recognition = null;
let isSoundEnabled = true;
let isListening = false;
let voices = [];
let voicesLoaded = false;
let micPermissionGranted = false;

// Language mapping for speech recognition and synthesis
const languageMap = {
    'en': { code: 'en-IN', name: 'English' },
    'hi': { code: 'hi-IN', name: 'Hindi' },
    'ta': { code: 'ta-IN', name: 'Tamil' },
    'te': { code: 'te-IN', name: 'Telugu' },
    'kn': { code: 'kn-IN', name: 'Kannada' },
    'ml': { code: 'ml-IN', name: 'Malayalam' }
};

// Get DOM elements
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const soundBtn = document.getElementById('sound-btn');
const inputDisplay = document.getElementById('input-text');
const translatedDisplay = document.getElementById('translated-text');
const inputLangSelect = document.getElementById('input-lang');
const outputLangSelect = document.getElementById('output-lang');

// Initialize Speech Recognition
async function initSpeechRecognition() {
    try {
        // Check browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            throw new Error('Speech recognition not supported in this browser');
        }

        // Request microphone permission early
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            micPermissionGranted = true;
            showFeedback('Microphone access granted');
        } catch (error) {
            console.error('Microphone permission denied:', error);
            showError('Please allow microphone access to use speech recognition');
            return;
        }

        recognition = new SpeechRecognition();
        
        // Configure recognition settings
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        // Set initial language
        updateRecognitionLanguage();

        recognition.onstart = () => {
            isListening = true;
            startBtn.innerHTML = '<span class="icon">🎤</span>Listening...';
            startBtn.classList.add('listening', 'active');
            inputDisplay.classList.add('listening');
            inputDisplay.value = 'Listening...';
            showFeedback('Listening... Speak now');
        };

        recognition.onend = () => {
            isListening = false;
            startBtn.innerHTML = '<span class="icon">🎤</span>Start Speaking';
            startBtn.classList.remove('listening', 'active');
            inputDisplay.classList.remove('listening');
        };

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            inputDisplay.value = transcript;
            await handleTranslation(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Recognition error:', event.error);
            showError('Speech recognition error: ' + event.error);
            isListening = false;
            startBtn.innerHTML = '<span class="icon">🎤</span>Start Speaking';
            startBtn.classList.remove('listening', 'active');
            inputDisplay.classList.remove('listening');
        };

    } catch (error) {
        console.error('Speech recognition initialization error:', error);
        showError('Speech recognition not supported in this browser');
        startBtn.disabled = true;
    }
}

// Update recognition language based on selection
function updateRecognitionLanguage() {
    if (recognition) {
        const selectedLang = inputLangSelect.value;
        recognition.lang = languageMap[selectedLang].code;
    }
}

// Translate text using Google Translate API
async function translateText(text, sourceLang, targetLang) {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Translation failed');
        }

        const data = await response.json();
        if (!data || !data[0]) {
            throw new Error('Invalid translation response');
        }

        // Extract translated text from response
        let translatedText = '';
        data[0].forEach(item => {
            if (item[0]) {
                translatedText += item[0];
            }
        });

        return translatedText;
    } catch (error) {
        console.error('Translation error:', error);
        throw error;
    }
}

// Handle translation process
async function handleTranslation(text) {
    try {
        const targetLang = outputLangSelect.value;
        const sourceLang = inputLangSelect.value;
        
        translatedDisplay.value = 'Translating...';
        showFeedback('Translating...');
        
        // Get translation
        const translation = await translateText(text, sourceLang, targetLang);
        
        // Display translated text
        translatedDisplay.value = translation;
        
        // Speak the translation if sound is enabled
        if (isSoundEnabled) {
            await speakTranslation(translation, targetLang);
        }
        
        showFeedback('Translation complete');
    } catch (error) {
        console.error('Translation error:', error);
        showError('Translation failed. Please try again.');
        translatedDisplay.value = '';
    }
}

// Speak the translated text
async function speakTranslation(text, lang) {
    return new Promise((resolve, reject) => {
        try {
            const synth = window.speechSynthesis;
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Set language code
            utterance.lang = languageMap[lang].code;
            
            // Load voices if not already loaded
            if (!voices.length) {
                voices = synth.getVoices();
            }
            
            // Find appropriate voice
            const voice = voices.find(v => v.lang === utterance.lang) ||
                         voices.find(v => v.lang.startsWith(lang)) ||
                         voices.find(v => v.default);
            
            if (voice) {
                utterance.voice = voice;
            }
            
            // Configure speech
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            // Event handlers
            utterance.onstart = () => showFeedback('Speaking...');
            utterance.onend = () => {
                showFeedback('Finished speaking');
                resolve();
            };
            utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event);
                reject(event);
            };
            
            // Cancel any ongoing speech and start new one
            synth.cancel();
            synth.speak(utterance);
            
        } catch (error) {
            console.error('Speech synthesis error:', error);
            reject(error);
        }
    });
}

// Show feedback message
function showFeedback(message) {
    const feedbackEl = document.createElement('div');
    feedbackEl.className = 'feedback';
    feedbackEl.textContent = message;
    document.body.appendChild(feedbackEl);
    
    setTimeout(() => {
        feedbackEl.remove();
    }, 2000);
}

// Show error message
function showError(message) {
    const existingErrors = document.querySelectorAll('.error');
    existingErrors.forEach(error => error.remove());
    
    const errorElement = document.createElement('div');
    errorElement.className = 'error';
    errorElement.textContent = message;
    document.body.appendChild(errorElement);
    
    setTimeout(() => {
        errorElement.style.opacity = '0';
        setTimeout(() => errorElement.remove(), 300);
    }, 3000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize speech recognition
    initSpeechRecognition();
    
    // Initialize speech synthesis voices
    if (window.speechSynthesis) {
        voices = window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
            voices = window.speechSynthesis.getVoices();
        };
    }
    
    // Start button click handler
    startBtn.addEventListener('click', async () => {
        if (!micPermissionGranted) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
                micPermissionGranted = true;
                await initSpeechRecognition();
            } catch (error) {
                showError('Please allow microphone access to use speech recognition');
                return;
            }
        }

        if (!isListening && recognition) {
            recognition.start();
        } else if (isListening) {
            recognition.stop();
        }
    });

    // Reset button click handler
    resetBtn.addEventListener('click', () => {
        inputDisplay.value = '';
        translatedDisplay.value = '';
        if (isListening) {
            recognition.stop();
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    });

    // Sound toggle button click handler
    soundBtn.addEventListener('click', () => {
        isSoundEnabled = !isSoundEnabled;
        soundBtn.innerHTML = `<span class="icon">${isSoundEnabled ? '🔊' : '🔇'}</span>${isSoundEnabled ? 'Mute' : 'Unmute'}`;
        showFeedback(isSoundEnabled ? 'Sound enabled' : 'Sound disabled');
    });

    // Language change handlers
    inputLangSelect.addEventListener('change', () => {
        updateRecognitionLanguage();
        showFeedback(`Input language changed to ${languageMap[inputLangSelect.value].name}`);
    });

    outputLangSelect.addEventListener('change', () => {
        showFeedback(`Output language changed to ${languageMap[outputLangSelect.value].name}`);
    });
});