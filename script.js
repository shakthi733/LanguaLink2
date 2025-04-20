const recognition = new webkitSpeechRecognition() || new SpeechRecognition();
recognition.continuous = false;
recognition.lang = 'en-US';

const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const soundBtn = document.getElementById('sound-btn');
const inputDisplay = document.getElementById('input-text');
const translatedDisplay = document.getElementById('translated-text');

let isSoundEnabled = true;

// 🔁 Background color animation
let colors = ['#f2f2f2', '#e0e0e0', '#d1d8e0', '#f3e5f5', '#fce4ec', '#e8f5e9'];
let i = 0;
setInterval(() => {
  document.body.style.background = colors[i % colors.length];
  i++;
}, 3000);

// ▶️ Start button
// Update recognition language when input language changes
document.getElementById('input-lang').addEventListener('change', (e) => {
  const langMap = {
    'en': 'en-US',
    'hi': 'hi-IN',
    'ta': 'ta-IN',
    'te': 'te-IN',
    'kn': 'kn-IN',
    'ml': 'ml-IN'
  };
  recognition.lang = langMap[e.target.value] || 'en-US';
});

startBtn.addEventListener('click', () => {
  inputDisplay.innerText = 'Listening...';
  recognition.start();
});

// 🔄 Reset button
resetBtn.addEventListener('click', () => {
  inputDisplay.innerText = 'Welcome';
  translatedDisplay.innerText = '';
  const audio = document.getElementById('audio');
  if (audio) {
    audio.pause();
    audio.remove();
  }
});

// 🔊 Toggle Output Sound
soundBtn.addEventListener('click', () => {
  isSoundEnabled = !isSoundEnabled;
  soundBtn.textContent = `Output Sound: ${isSoundEnabled ? 'ON' : 'OFF'}`;
});

// 🎙️ Speech Recognition result
recognition.onresult = async (event) => {
  const spokenText = event.results[0][0].transcript;
  inputDisplay.innerText = spokenText;

  // Get selected languages from dropdowns
  const inputLang = document.getElementById('input-lang').value;
  const outputLang = document.getElementById('output-lang').value;
  
  const translatedText = await translateText(spokenText, outputLang);
  translatedDisplay.innerText = translatedText;
  
  if (isSoundEnabled) {
    speakText(translatedText, outputLang, translatedText);
  }
};

// Remove the prompt from translateText function
async function translateText(text, targetLang) {
  const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
  const data = await response.json();
  return data[0][0][0];
}

// 🌍 Translate using Google Translate API
async function translateText(text, targetLang) {
  const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
  const data = await response.json();
  const translatedText = data[0][0][0];
  // Removed speakText call from translation function
  return translatedText;
}

// 🔈 Text-to-Speech using Web Speech API
let voices = [];
let voicesLoaded = false;

function loadVoices() {
  voices = window.speechSynthesis.getVoices();
  voicesLoaded = true;
  console.log('Available voices:', voices);
  
  // Specific check for Telugu
  const teluguVoice = voices.find(v => v.lang === 'te-IN');
  if (!teluguVoice) {
    console.error('Telugu voice not found. Complete these steps:');
    console.error('1. Chrome Settings → Languages → Add Telugu (India)');
    console.error('2. Enable "Text-to-Speech" and install voice pack');
    console.error('3. Restart Chrome completely');
  }
}

// More robust voice loading initialization
window.speechSynthesis.onvoiceschanged = () => {
  loadVoices();
  if (!voices.length) {
    setTimeout(loadVoices, 2000);
  }
};

// Initial load with retries
loadVoices();
setTimeout(loadVoices, 1000);
setTimeout(loadVoices, 3000);

function speakText(text, lang, translatedText) {
  if (lang === 'ml') { // Malayalam
    const audio = new Audio();
    audio.src = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ml&client=tw-ob`;
    audio.play();
    return;
  }

  if (!voicesLoaded) {
    console.error('Voices not loaded yet. Waiting...');
    setTimeout(() => speakText(text, lang, translatedText), 1000);
    return;
  }

  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);

  // South Indian language mapping
  const langMap = {
    'ta': 'ta-IN', // Tamil
    'te': 'te-IN', // Telugu
    'kn': 'kn-IN', // Kannada
    'ml': 'ml-IN'  // Malayalam
  };
  
  const langCode = langMap[lang] || lang;
  utterance.lang = langCode;

  // Find voice with multiple fallbacks
  const voice = voices.find(v => v.lang === langCode) ||
               voices.find(v => v.lang.startsWith(langCode)) ||
               voices.find(v => v.name.includes(langCode));

  if (voice) {
    utterance.voice = voice;
    synth.speak(utterance);
  } else {
    console.error(`Missing ${langCode} voice. Required steps...`);
    
    // Use parameter instead of undefined variable
    translatedDisplay.innerHTML = `
      ${text}
      <div class="error">Install ${langCode} voice pack in browser settings</div>
    `;
  }
}