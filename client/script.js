const wordInput = document.getElementById('word-input');
const startBtn = document.getElementById('start-btn');
const generateBtn = document.getElementById('generate-btn');
const difficultySelect = document.getElementById('difficulty-select');
const setupArea = document.getElementById('setup-area');
const practiceArea = document.getElementById('practice-area');
const resultsArea = document.getElementById('results-area');
const spellingInput = document.getElementById('spelling-input');
const submitBtn = document.getElementById('submit-btn');
const feedback = document.getElementById('feedback');
const currentIndexSpan = document.getElementById('current-index');
const totalCountSpan = document.getElementById('total-count');
const timerDisplay = document.getElementById('timer-display');
const restartBtn = document.getElementById('restart-btn');
const homeBtn = document.getElementById('home-btn');

let words = [];
let currentIndex = 0;
let correctCount = 0;
let incorrectCount = 0;
let sessionHistory = [];
let currentMode = 'word';
let currentVoice = null;
let typingTimer = null;
let isSpeaking = false;


function loadVoices() {
    const voices = window.speechSynthesis.getVoices();
    currentVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Samantha") || (v.lang === "en-US" && v.name.includes("Natural"))) || voices.find(v => v.lang.startsWith("en"));
}
window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

wordInput.addEventListener('input', () => {
    startBtn.disabled = parseWords(wordInput.value).length === 0;
});

generateBtn.addEventListener('click', async () => {
    const level = difficultySelect.value;
    try {
        const response = await fetch(`/api/words?level=${level}&count=15`);
        if (!response.ok) {
            throw new Error('Failed to fetch words from server');
        }
        const generatedWords = await response.json();
        
        wordInput.value = ""; 
        startPractice(generatedWords);
    } catch (error) {
        console.error('Error fetching words:', error);
        alert("No words available for this level! Make sure the server is running.");
    }
});

startBtn.addEventListener('click', () => startPractice());
submitBtn.addEventListener('click', () => {
    if (currentMode === 'letter') submitWord();
});

spellingInput.addEventListener('keypress', (e) => { 
    if (e.key === 'Enter') {
        if (currentMode === 'word') {
            clearTimeout(typingTimer);
            submitWord();
        } else if (currentMode === 'letter') {
            submitWord();
        }
    }
});

restartBtn.addEventListener('click', () => {
    startPractice([...words]); 
});

homeBtn.addEventListener('click', () => {
    resultsArea.classList.add('hidden');
    setupArea.classList.remove('hidden');
    wordInput.value = '';
    startBtn.disabled = true;
});

function parseWords(text) {
    return text.split(/[,\n]/).map(w => w.trim()).filter(w => w.length > 0);
}

function startPractice(generatedWords = null) {
    if (generatedWords) {
        words = generatedWords;
    } else {
        words = parseWords(wordInput.value);
    }

    if (words.length === 0) return;

    currentMode = document.querySelector('input[name="mode"]:checked').value;
    currentIndex = 0;
    correctCount = 0;
    incorrectCount = 0;
    sessionHistory = [];

    setupArea.classList.add('hidden');
    resultsArea.classList.add('hidden');
    practiceArea.classList.remove('hidden');

    
    if (currentMode === 'letter') {
        submitBtn.classList.remove('hidden');
    } else {
        submitBtn.classList.add('hidden');
    }
    
    nextWordSequence();
}

async function nextWordSequence() {
    if (currentIndex >= words.length) {
        showResults();
        return;
    }

    updateProgress();
    spellingInput.value = '';
    spellingInput.disabled = (currentMode === 'word'); 
    feedback.textContent = '';
    
    
    for (let i = 3; i > 0; i--) {
        timerDisplay.textContent = i;
        await new Promise(r => setTimeout(r, 1000));
    }
    
    
    timerDisplay.textContent = "Listen!";
    if (currentMode === 'letter') {
        spellingInput.disabled = false;
        spellingInput.focus();
        await speakCurrentWord();
        timerDisplay.textContent = "Type each letter!";
    } else {
        await speakCurrentWord();
        spellingInput.disabled = false;
        spellingInput.focus();
        startTypingTimer(6);
    }
}

async function startTypingTimer(seconds) {
    for (let i = seconds; i >= 0; i--) {
        if (spellingInput.disabled) return; 
        timerDisplay.textContent = `Type! (${i}s)`;
        if (i > 0) {
            await new Promise(r => {
                typingTimer = setTimeout(r, 1000);
            });
        }
    }
    submitWord();
}

function speakCurrentWord() {
    return new Promise((resolve) => {
        window.speechSynthesis.cancel();
        const word = words[currentIndex];
        isSpeaking = true;
        
        if (currentMode === 'letter') {
            const chars = word.split('');
            let spokenCount = 0;
            chars.forEach((char, index) => {
                const utterance = new SpeechSynthesisUtterance(char);
                if (currentVoice) utterance.voice = currentVoice;
                utterance.rate = 0.8;
                utterance.onend = () => {
                    spokenCount++;
                    if (spokenCount === chars.length) {
                        isSpeaking = false;
                        resolve();
                    }
                };
                window.speechSynthesis.speak(utterance);
            });
            
            setTimeout(() => { if (isSpeaking) { isSpeaking = false; resolve(); } }, word.length * 1000 + 500);
        } else {
            const utterance = new SpeechSynthesisUtterance(word);
            if (currentVoice) utterance.voice = currentVoice;
            utterance.rate = 0.9;
            utterance.onend = () => {
                isSpeaking = false;
                resolve();
            };
            window.speechSynthesis.speak(utterance);
            
            setTimeout(() => { if (isSpeaking) { isSpeaking = false; resolve(); } }, 2000);
        }
    });
}

function submitWord() {
    if (spellingInput.disabled) return;

    const userValue = spellingInput.value.trim();
    const targetValue = words[currentIndex];
    const isCorrect = userValue.toLowerCase() === targetValue.toLowerCase();

    sessionHistory.push({
        word: targetValue,
        answer: userValue || "(empty)",
        correct: isCorrect
    });

    spellingInput.disabled = true;

    if (isCorrect) {
        feedback.innerHTML = '<span class="correct-text">Correct!</span>';
        correctCount++;
    } else {
        feedback.innerHTML = `<span class="incorrect-text">Incorrect: ${targetValue}</span>`;
        incorrectCount++;
    }

    currentIndex++;
    setTimeout(nextWordSequence, 1500);
}

function updateProgress() {
    currentIndexSpan.textContent = currentIndex + 1;
    totalCountSpan.textContent = words.length;
}

function showResults() {
    practiceArea.classList.add('hidden');
    resultsArea.classList.remove('hidden');
    
    document.getElementById('res-total').textContent = words.length;
    document.getElementById('res-correct').textContent = correctCount;
    document.getElementById('res-incorrect').textContent = incorrectCount;

    const tbody = document.getElementById('results-body');
    tbody.innerHTML = '';
    sessionHistory.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.word}</td>
            <td>${item.answer}</td>
            <td class="${item.correct ? 'correct-text' : 'incorrect-text'}">${item.correct ? '✓' : '✗'}</td>
        `;
        tbody.appendChild(row);
    });
}
