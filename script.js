// Global variables
let recognition = null;
let isSoundEnabled = true;
let isListening = false;
let voices = [];
let voicesLoaded = false;
let micPermissionGranted = false;

// Get DOM elements
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const soundBtn = document.getElementById('sound-btn');
const inputDisplay = document.getElementById('input-text');
const translatedDisplay = document.getElementById('translated-text');

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
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        // Set initial language
        const inputLang = document.getElementById('input-lang').value;
        const langMap = {
            'en': 'en-IN',
            'hi': 'hi-IN',
            'ta': 'ta-IN',
            'te': 'te-IN',
            'kn': 'kn-IN',
            'ml': 'ml-IN'
        };
        recognition.lang = langMap[inputLang] || 'en-IN';

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
            const result = event.results[event.results.length - 1];
            const transcript = result[0].transcript;
            
            if (result.isFinal) {
                inputDisplay.value = transcript;
                await handleTranslation(transcript);
            }
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

// Handle translation process
async function handleTranslation(text) {
    try {
        const targetLang = document.getElementById('output-lang').value;
        translatedDisplay.value = 'Translating...';
        
        // Direct translation API call
        const encodedText = encodeURIComponent(text);
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodedText}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Translation failed');
        
        const data = await response.json();
        if (!data || !data[0]) throw new Error('Invalid translation response');
        
        // Extract translation
        const translation = data[0].map(item => item[0]).join(' ');
        translatedDisplay.value = translation;
        
        // Speak the translation if sound is enabled
        if (isSoundEnabled) {
            await speakTranslation(translation, targetLang);
        }
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
            const langMap = {
                'en': 'en-IN',
                'hi': 'hi-IN',
                'ta': 'ta-IN',
                'te': 'te-IN',
                'kn': 'kn-IN',
                'ml': 'ml-IN'
            };
            utterance.lang = langMap[lang] || lang;
            
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
            const inputLang = document.getElementById('input-lang').value;
            const langMap = {
                'en': 'en-IN',
                'hi': 'hi-IN',
                'ta': 'ta-IN',
                'te': 'te-IN',
                'kn': 'kn-IN',
                'ml': 'ml-IN'
            };
            recognition.lang = langMap[inputLang] || 'en-IN';
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

    // Language change handler
    document.getElementById('input-lang').addEventListener('change', (e) => {
        if (recognition) {
            const langMap = {
                'en': 'en-IN',
                'hi': 'hi-IN',
                'ta': 'ta-IN',
                'te': 'te-IN',
                'kn': 'kn-IN',
                'ml': 'ml-IN'
            };
            recognition.lang = langMap[e.target.value] || 'en-IN';
            showFeedback(`Language changed to ${e.target.options[e.target.selectedIndex].text}`);
        }
    });
});