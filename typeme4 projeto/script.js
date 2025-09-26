// DOM Elements
const passageDisplay = document.getElementById('passage-display');
const typingInput = document.getElementById('typing-input');
const timerDisplay = document.getElementById('timer-display');
const wpmDisplay = document.getElementById('wpm-display');
const accuracyDisplay = document.getElementById('accuracy-display');
const startButton = document.getElementById('start-button');
const resetButton = document.getElementById('reset-button');
const resultsTableBody = document.getElementById('results-table-body');
const customTextButton = document.getElementById('custom-text-button');
const customTextModal = document.getElementById('custom-text-modal');
const customTextArea = document.getElementById('custom-text-area');
const setPassageButton = document.getElementById('set-passage-button');
const cancelCustomTextButton = document = document.getElementById('cancel-custom-text-button');
const wpmChartCanvas = document.getElementById('wpmChart');
const wpmChartCtx = wpmChartCanvas.getContext('2d');
const overallAverageWpmDisplay = document.getElementById('overall-average-wpm');
const deleteHistoryButton = document.getElementById('delete-history-button'); // New DOM element for the delete button
const bestWpmDisplay = document.getElementById('best-wpm-display'); // New DOM element for the best WPM display
const generateAiButton = document.getElementById('generate-ai-button'); // New DOM element for the AI button
const aiLoadingMessage = document.getElementById('ai-loading-message'); // New DOM element for the loading message

// Typing Test Variables
const bookQuotes = [
    "A long time ago in a galaxy far, far away... It is a period of civil war. Rebel spaceships, striking from a hidden base, have won their first victory against the evil Galactic Empire. During the battle, Rebel spies managed to steal secret plans to the Empire's ultimate weapon, the DEATH STAR, a space station with enough power to destroy an entire planet."
];

// Updated AI-generated passages array with more variety
const aiPassages = {
    beginner: [
        "The quick brown fox jumps over the lazy dog.",
        "A quiet day in the city brings a calm stillness.",
        "The stars shine bright at night for everyone to see."
    ],
    intermediate: [
        "The digital realm buzzes with unseen data, connections forming a vibrant, tangled web. Ideas travel at the speed of light, transforming how we learn, work, and create.",
        "Beneath the old library's grand, vaulted ceiling, a lone reader finds solace in a forgotten tome. Dust motes dance in the sunbeams that stream through the windows, illuminating centuries of human thought.",
        "A symphony of city sounds echoes through the canyon, blending the hum of traffic with distant chatter. Every street corner holds a unique story, waiting to be heard by those who listen closely."
    ],
    advanced: [
        "In the quantum superposition of a particle, all potential states exist simultaneously until observation collapses the wave function. This fundamental principle challenges our classical understanding of reality and forms the bedrock of quantum computing.",
        "The symbiotic relationship between mycorrhizal fungi and plant roots is a marvel of ecological cooperation, facilitating nutrient exchange and enhancing resilience across diverse biomes, a testament to the intricate ballet of life beneath our feet."
    ]
};

let passageText;
let startTime = null;
let timerInterval;
let testActive = false;
let typedCharactersCount = 0;
let correctCharactersCount = 0;
let errorsCount = 0;
let resultsHistory = [];
let wpmChartInstance;
let characterErrorMap = {}; // New variable to track character errors

// Function to get a random book quote
function getRandomBookQuote() {
    const randomIndex = Math.floor(Math.random() * bookQuotes.length);
    return bookQuotes[randomIndex];
}

// Function to initialize the test display
function initializePassageDisplay() {
    passageDisplay.innerHTML = '';
    characterErrorMap = {}; // Reset error map for new test

    const storedCustomPassage = localStorage.getItem('customTypingPassage');
    const isCustomTextActive = localStorage.getItem('isCustomTextActive') === 'true';

    if (isCustomTextActive && storedCustomPassage) {
        passageText = storedCustomPassage;
        typingInput.dataset.customTextSet = 'true';
    } else {
        passageText = getRandomBookQuote();
        typingInput.dataset.customTextSet = '';
    }

    passageText.split('').forEach((char, index) => {
        const span = document.createElement('span');
        span.textContent = char;
        span.classList.add('passage-char');
        span.dataset.index = index;
        passageDisplay.appendChild(span);
    });
    if (passageText.length > 0) {
        passageDisplay.children[0].classList.add('cursor');
    }
}

// Function to prepare the typing test (called by Start button)
function prepareTest() {
    if (testActive) return;

    testActive = true;
    startTime = null;
    typingInput.value = '';
    typingInput.disabled = false;
    typingInput.focus();
    startButton.disabled = true;
    startButton.classList.remove('blink-animation');
    customTextButton.disabled = true;
    generateAiButton.disabled = true; // Disable the new button during the test

    typedCharactersCount = 0;
    correctCharactersCount = 0;
    errorsCount = 0;
    wpmDisplay.textContent = '0';
    accuracyDisplay.textContent = '0%';
    timerDisplay.textContent = '0s';
    initializePassageDisplay();
}

// Function to update the timer display
function updateTimer() {
    const currentTime = new Date();
    const elapsedTime = Math.floor((currentTime - startTime) / 1000);
    timerDisplay.textContent = `${elapsedTime}s`;
    updateMetrics();
}

// Function to handle user input
function handleInput(event) {
    if (!testActive) {
        if (typingInput.value.length === 1 && typingInput.value[0] === passageText[0]) {
            prepareTest();
        } else if (typingInput.value.length === 1 && typingInput.value[0] !== passageText[0]) {
            typingInput.value = '';
            const firstCharSpan = passageDisplay.children[0];
            firstCharSpan.classList.add('incorrect');
            return;
        } else {
            return;
        }
    }

    if (startTime === null && typingInput.value.length === 1) {
        startTime = new Date();
        timerInterval = setInterval(updateTimer, 1000);
    }

    const typedText = typingInput.value;
    const passageChars = passageDisplay.children;

    typedCharactersCount = typedText.length;
    correctCharactersCount = 0;
    errorsCount = 0;

    for (let i = 0; i < passageText.length; i++) {
        const charSpan = passageChars[i];
        if (i < typedText.length) {
            if (typedText[i] === passageText[i]) {
                charSpan.classList.remove('incorrect');
                charSpan.classList.add('correct');
                correctCharactersCount++;
            } else {
                charSpan.classList.remove('correct');
                charSpan.classList.add('incorrect');
                errorsCount++;
                const incorrectChar = passageText[i];
                characterErrorMap[incorrectChar] = (characterErrorMap[incorrectChar] || 0) + 1;
            }
        } else {
            charSpan.classList.remove('correct', 'incorrect');
        }
        charSpan.classList.remove('cursor');
    }

    if (typedText.length < passageText.length) {
        passageChars[typedText.length].classList.add('cursor');
    }

    updateMetrics();

    if (typedText.length === passageText.length) {
        endTest();
    }
}

// Function to calculate and update WPM and Accuracy
function updateMetrics() {
    if (startTime === null) {
        wpmDisplay.textContent = '0';
        accuracyDisplay.textContent = '0%';
        return;
    }

    const currentTime = new Date();
    const elapsedTimeSeconds = (currentTime - startTime) / 1000;
    const elapsedTimeMinutes = elapsedTimeSeconds / 60;

    const wordsTyped = correctCharactersCount / 5;
    const wpm = elapsedTimeMinutes > 0 ? Math.round(wordsTyped / elapsedTimeMinutes) : 0;
    wpmDisplay.textContent = wpm;

    const accuracy = typedCharactersCount > 0
        ? Math.round((correctCharactersCount / typedCharactersCount) * 100)
        : 0;
    accuracyDisplay.textContent = `${accuracy}%`;
}

// Function to end the test
function endTest() {
    if (!testActive) return;

    testActive = false;
    clearInterval(timerInterval);
    timerInterval = null;
    typingInput.disabled = true;
    startButton.disabled = false;
    startButton.classList.add('blink-animation');
    customTextButton.disabled = false;
    generateAiButton.disabled = false; // Re-enable the AI button

    updateMetrics();

    const finalWPM = parseInt(wpmDisplay.textContent);
    const finalAccuracy = parseInt(accuracyDisplay.textContent);
    logResult(finalWPM, finalAccuracy);

    const passageChars = passageDisplay.children;
    if (passageChars.length > 0) {
        passageChars[passageText.length - 1].classList.remove('cursor');
    }
    updateChart();
    createStarAnimation();
    applyHeatmap(); // Apply the heatmap effect
}

// New function to apply heatmap
function applyHeatmap() {
    passageDisplay.innerHTML = ''; // Clear passage display
    passageText.split('').forEach(char => {
        const span = document.createElement('span');
        span.textContent = char;
        span.classList.add('passage-char');
        // Determine heatmap class based on error frequency
        const errorCount = characterErrorMap[char] || 0;
        if (errorCount > 2) {
            span.classList.add('heatmap-high');
        } else if (errorCount > 0) {
            span.classList.add('heatmap-low');
        }
        passageDisplay.appendChild(span);
    });
}

// Function to log results to the table and save to local storage
function logResult(wpm, accuracy) {
    const now = new Date();
    const timestamp = now.toLocaleString();

    const newResult = { timestamp, wpm, accuracy };
    resultsHistory.push(newResult);

    localStorage.setItem('typingTestResults', JSON.stringify(resultsHistory));

    addResultToTable(newResult);
}

// Function to add a single result to the table
function addResultToTable(result) {
    const newRow = resultsTableBody.insertRow();
    newRow.classList.add('hover:bg-gray-50');

    const cell1 = newRow.insertCell();
    cell1.textContent = result.timestamp;
    cell1.classList.add('px-6', 'py-4', 'whitespace-nowrap', 'text-sm', 'font-medium', 'text-gray-900');

    const cell2 = newRow.insertCell();
    cell2.textContent = result.wpm;
    cell2.classList.add('px-6', 'py-4', 'whitespace-nowrap', 'text-sm', 'text-gray-500');

    const cell3 = newRow.insertCell();
    cell3.textContent = `${result.accuracy}%`;
    cell3.classList.add('px-6', 'py-4', 'whitespace-nowrap', 'text-sm', 'text-gray-500');
}

// Function to load results from local storage and populate the table
function loadResults() {
    const storedResults = localStorage.getItem('typingTestResults');
    if (storedResults) {
        resultsHistory = JSON.parse(storedResults);
        resultsTableBody.innerHTML = '';
        resultsHistory.forEach(result => addResultToTable(result));
    }
}

// Function to sort results by WPM in descending order
function sortResultsByWPM() {
    resultsHistory.sort((a, b) => b.wpm - a.wpm);
}

// Function to reset the test state and display without affecting custom passage persistence
function resetTestStateAndDisplay() {
    testActive = false;
    clearInterval(timerInterval);
    timerInterval = null;
    startTime = null;
    typingInput.value = '';
    typingInput.disabled = true;
    timerDisplay.textContent = '0s';
    wpmDisplay.textContent = '0';
    accuracyDisplay.textContent = '0%';
    startButton.disabled = false;
    startButton.classList.add('blink-animation');
    customTextButton.disabled = false;
    generateAiButton.disabled = false; // Re-enable the AI button on reset
    initializePassageDisplay();
    updateChart();
}

// Function to reset the test completely (including clearing custom text)
function resetTest() {
    localStorage.removeItem('customTypingPassage');
    localStorage.removeItem('isCustomTextActive');
    typingInput.dataset.customTextSet = '';

    resetTestStateAndDisplay();
}

// Function to update or create the WPM chart
function updateChart() {
    sortResultsByWPM();

    if (wpmChartInstance) {
        wpmChartInstance.destroy();
    }

    const labels = resultsHistory.map(result => result.timestamp);
    const wpmData = resultsHistory.map(result => result.wpm);

    const totalWPM = wpmData.reduce((sum, wpm) => sum + wpm, 0);
    const averageWPM = wpmData.length > 0 ? (totalWPM / wpmData.length).toFixed(2) : 0;
    const bestWPM = wpmData.length > 0 ? wpmData[0] : 0;

    overallAverageWpmDisplay.textContent = wpmData.length > 0 ? `(Avg: ${averageWPM} WPM)` : '';
    bestWpmDisplay.textContent = wpmData.length > 0 ? `(Best: ${bestWPM} WPM)` : '';

    resultsTableBody.innerHTML = '';
    resultsHistory.forEach(result => addResultToTable(result));

    wpmChartInstance = new Chart(wpmChartCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'WPM per Test',
                    data: wpmData,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    fill: false,
                    pointBackgroundColor: 'rgb(75, 192, 192)',
                    pointBorderColor: 'rgb(75, 192, 192)',
                    pointRadius: 5,
                    pointHoverRadius: 8,
                },
                {
                    label: `Average WPM (${averageWPM})`,
                    data: Array(labels.length).fill(averageWPM),
                    borderColor: 'rgb(255, 99, 132)',
                    borderDash: [5, 5],
                    tension: 0,
                    fill: false,
                    pointRadius: 0,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Words Per Minute (WPM)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Test Date/Time'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return `Test: ${context[0].label}`;
                        },
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// Function to generate an AI passage
async function generateAiPassage() {
    aiLoadingMessage.classList.remove('hidden');
    generateAiButton.disabled = true;

    // Determine difficulty based on user's best WPM
    const bestWPM = resultsHistory.length > 0 ? resultsHistory[0].wpm : 0;
    let difficulty = 'beginner';
    if (bestWPM >= 40 && bestWPM < 70) {
        difficulty = 'intermediate';
    } else if (bestWPM >= 70) {
        difficulty = 'advanced';
    }

    // Simulate an API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const passages = aiPassages[difficulty];
    const randomIndex = Math.floor(Math.random() * passages.length);
    const newPassage = passages[randomIndex];

    passageText = newPassage;
    localStorage.setItem('customTypingPassage', newPassage);
    localStorage.setItem('isCustomTextActive', 'true');
    typingInput.dataset.customTextSet = 'true';

    resetTestStateAndDisplay();

    aiLoadingMessage.classList.add('hidden');
    generateAiButton.disabled = false;
}

// Function to create star animation
function createStarAnimation() {
    const numStars = 15;
    const animationDuration = 1500;

    const inputRect = typingInput.getBoundingClientRect();
    const startX = inputRect.left + inputRect.width / 2;
    const startY = inputRect.top + inputRect.height / 2;

    for (let i = 0; i < numStars; i++) {
        const star = document.createElement('div');
        star.textContent = '⭐';
        star.classList.add('star');

        const offsetX = (Math.random() - 0.5) * 50;
        const offsetY = (Math.random() - 0.5) * 50;

        star.style.left = `${startX + offsetX}px`;
        star.style.top = `${startY + offsetY}px`;
        star.style.opacity = '1';
        star.style.transform = 'scale(0.5)';

        document.body.appendChild(star);

        setTimeout(() => {
            const endX = startX + (Math.random() - 0.5) * 200;
            const endY = startY - 100 - (Math.random() * 100);

            star.style.transition = `transform ${animationDuration}ms ease-out, opacity ${animationDuration}ms ease-out`;
            star.style.transform = `translate(${endX - startX}px, ${endY - startY}px) scale(1.5) rotate(${Math.random() * 360}deg)`;
            star.style.opacity = '0';
        }, 50);

        setTimeout(() => {
            star.remove();
        }, animationDuration + 100);
    }
}

// Function to delete the entire typing history
function deleteHistory() {
    resultsHistory = [];
    localStorage.removeItem('typingTestResults');
    resultsTableBody.innerHTML = '';
    updateChart();
}


// Event Listeners
startButton.addEventListener('click', prepareTest);
resetButton.addEventListener('click', resetTest);
typingInput.addEventListener('input', handleInput);
deleteHistoryButton.addEventListener('click', deleteHistory);
generateAiButton.addEventListener('click', generateAiPassage); // Add event listener for the AI button

// Custom Text Modal Functions and Event Listeners
customTextButton.addEventListener('click', () => {
    customTextModal.classList.remove('hidden');
    customTextArea.value = passageText;
    customTextArea.focus();
});

setPassageButton.addEventListener('click', () => {
    const newPassage = customTextArea.value.trim();
    if (newPassage) {
        passageText = newPassage;
        localStorage.setItem('customTypingPassage', newPassage);
        localStorage.setItem('isCustomTextActive', 'true');
        typingInput.dataset.customTextSet = 'true';
        resetTestStateAndDisplay();
        customTextModal.classList.add('hidden');
    } else {
        console.log("Passage cannot be empty.");
    }
});

cancelCustomTextButton.addEventListener('click', () => {
    customTextModal.classList.add('hidden');
});

// Initialize the display and load results when the page loads
window.onload = function() {
    initializePassageDisplay();
    loadResults();
    updateChart();
    startButton.classList.add('blink-animation');
};

window.addEventListener('beforeunload', () => {
    clearInterval(timerInterval);
});
