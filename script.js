let currentAyah, currentSurah, currentAyahNumber, currentSurahNumber;
let score = 0;
let bestScore = 0;
let timer;
let timeLeft;
let checkButtonClicked = false;
let audioPlayer;
let currentOrderMode = 'random'; // 'random' or 'ordered' (for verses within a surah)
let currentAyahIndex = 1; // To track the current verse number
let currentSelectedSurah = null; // To track the selected surah

// Function to normalize Quranic text
function normalizeQuranText(text) {
  const tashkeel = [
    '\u064B', '\u064C', '\u064D', '\u064E', '\u064F', '\u0650', '\u0651', '\u0652',
    '\u0653', '\u0654', '\u0655', '\u0656', '\u0657', '\u0658', '\u0659', '\u065A',
    '\u065B', '\u065C', '\u065D', '\u065E', '\u065F', '\u0670', '\u06DA'
  ];

  const quranMarks = [
    '\u06D6', '\u06D7', '\u06D8', '\u06D9', '\u06DA', '\u06DB', '\u06DC', '\u06DD',
    '\u06DE', '\u06DF', '\u06E0', '\u06E1', '\u06E2', '\u06E3', '\u06E4', '\u06E5',
    '\u06E6', '\u06E7', '\u06E8', '\u06E9', '\u06EA', '\u06EB', '\u06EC', '\u06ED','\u06DA'
  ];

  const punctuation = [
    '\u060C', '\u061B', '\u061F', '\u0640', '\u066A', '\u066B','\u06DA', '\u066C', '\u066D',
    '،', '؛', '؟'
  ];

  const stopMarks = [
    '\u06DA', '\u06DB', '\u06DC', '\u06DD', '\u06DE', '\u06DF', '\u06E0', '\u06E1',
    '\u06E2', '\u06E3', '\u06E4', '\u06E5', '\u06E6', '\u06E7', '\u06E8', '\u06E9',
    '\u06EA', '\u06EB', '\u06EC', '\u06ED'
  ];

  const letterVariants = {
    'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا',
    'ى': 'ي', 'ة': 'ه', 'ؤ': 'و', 'ئ': 'ي'
  };

  let normalized = text;

  const allMarks = [...tashkeel, ...quranMarks, ...punctuation];
  const markRegex = new RegExp(`[${allMarks.join('')}]`, 'g');
  normalized = normalized.replace(markRegex, '');

  Object.entries(letterVariants).forEach(([variant, standard]) => {
    normalized = normalized.replace(new RegExp(variant, 'g'), standard);
  });

  return normalized.replace(/\s+/g, ' ').trim();
}

// Fetch a random or specific ayah
async function fetchAyah() {
  const selectedSurah = document.getElementById('surahSelect').value;

  // If the mode is random for surahs
  if (selectedSurah === 'random') {
    currentSelectedSurah = Math.floor(Math.random() * 114) + 1;
  } else {
    currentSelectedSurah = parseInt(selectedSurah);
  }

  const response = await fetch(`https://api.alquran.cloud/v1/surah/${currentSelectedSurah}/ar.asad`);
  const data = await response.json();
  const surah = data.data;

  let ayahNumber;
  if (currentOrderMode === 'ordered') {
    ayahNumber = currentAyahIndex;
    currentAyahIndex = currentAyahIndex < surah.numberOfAyahs ? currentAyahIndex + 1 : 1;
  } else {
    ayahNumber = Math.floor(Math.random() * surah.numberOfAyahs) + 1;
  }

  return {
    text: surah.ayahs[ayahNumber - 1].text,
    surahName: surah.name,
    surahNumber: currentSelectedSurah,
    ayahNumber: ayahNumber
  };
}

// Filter valid words for the word cards
function filterValidWords(words) {
  return words.filter(word => {
    const trimmedWord = word.trim();
    const normalizedWord = normalizeQuranText(trimmedWord);
    const specialChars = ['ۖ', 'ۗ', 'ۘ', 'ۙ', 'ۚ', 'ۛ', 'ۜ', '۞', '۩'];
    if (trimmedWord.length === 1 && specialChars.includes(trimmedWord)) {
      return false;
    }
    return trimmedWord.length > 0;
  });
}

// Display the ayah and set up the word cards
async function displayAyah() {
  document.getElementById('ayah').innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
  document.getElementById('ayahInfo').textContent = '';
  document.getElementById('audioButton').style.display = 'none';
  document.getElementById('wordCards').innerHTML = '';

  const ayahData = await fetchAyah();
  currentAyah = ayahData.text;
  currentSurah = ayahData.surahName;
  currentAyahNumber = ayahData.ayahNumber;
  currentSurahNumber = ayahData.surahNumber;

  updateAyahDisplay();

  document.getElementById('ayahInfo').textContent = `${currentSurah} - الآية ${currentAyahNumber}`;
  document.getElementById('result').textContent = '';
  document.getElementById('tafsir').textContent = '';

  document.getElementById('checkButton').disabled = false;
  checkButtonClicked = false;

  document.getElementById('audioButton').onclick = toggleAudio;
  document.getElementById('audioButton').classList.remove('playing');
  document.getElementById('audioButton').innerHTML = '<i class="fas fa-volume-up"></i> استمع إلى الآية';

  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer = null;
  }

  startTimer();

  const words = currentAyah.split(' ');
  const validWords = filterValidWords(words);
  const middleIndex = Math.floor(validWords.length / 2);
  const missingWords = validWords.slice(middleIndex);

  const wordCardsContainer = document.getElementById('wordCards');
  for (const word of missingWords) {
    if (word.trim() === '') continue;

    const card = document.createElement('div');
    card.className = 'word-card';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '...';
    card.appendChild(input);

    const wordLength = word.length;
    const cardWidth = Math.max(wordLength * 10, 60);
    card.style.width = `${cardWidth}px`;

    wordCardsContainer.appendChild(card);
  }

  const inputs = document.querySelectorAll('.word-card input');
  inputs.forEach((input, index) => {
    input.addEventListener('keydown', (event) => {
      if (event.keyCode === 32) {
        event.preventDefault();
        if (index < inputs.length - 1) {
          inputs[index + 1].focus();
        }
      }
    });
  });
}

// Update the displayed ayah
function updateAyahDisplay() {
  const words = currentAyah.split(' ');
  const validWords = filterValidWords(words);
  const middleIndex = Math.floor(validWords.length / 2);

  let originalWordsCount = 0;
  let targetIndex = 0;
  for (let i = 0; i < words.length; i++) {
    if (filterValidWords([words[i]]).length > 0) {
      if (originalWordsCount === middleIndex) {
        targetIndex = i;
        break;
      }
      originalWordsCount++;
    }
  }

  const visiblePart = words.slice(0, targetIndex).join(' ');
  const displayText = document.getElementById('tashkilToggle').checked ?
    visiblePart : normalizeQuranText(visiblePart);

  document.getElementById('ayah').innerHTML = `${displayText} <span class="incomplete">...</span>`;
}

// Check the user's answer
async function checkAnswer() {
  if (checkButtonClicked) return;

  checkButtonClicked = true;
  document.getElementById('checkButton').disabled = true;
  clearInterval(timer);

  const words = currentAyah.split(' ');
  const validWords = filterValidWords(words);
  const middleIndex = Math.floor(validWords.length / 2);
  const correctAnswer = validWords.slice(middleIndex).join(' ');

  const userInput = Array.from(document.querySelectorAll('.word-card input'))
    .map(input => input.value.trim())
    .join(' ');

  const normalizedUserInput = normalizeQuranText(userInput);
  const normalizedCorrectAnswer = normalizeQuranText(correctAnswer);

  if (normalizedUserInput === normalizedCorrectAnswer) {
    document.getElementById('result').innerHTML = '<i class="fas fa-check-circle"></i> أحسنت! إجابة صحيحة';
    document.getElementById('result').style.color = '#4CAF50';
    score += 5;
    if (score > bestScore) {
      bestScore = score;
      document.getElementById('bestScoreValue').textContent = bestScore;
      localStorage.setItem('bestScore', bestScore);
    }
  } else {
    const correctWords = correctAnswer.split(' ');
    const userWords = normalizedUserInput.split(' ');
    let highlightedAnswer = '';

    for (let i = 0; i < correctWords.length; i++) {
      const normalizedCorrectWord = normalizeQuranText(correctWords[i]);
      if (userWords[i] === normalizedCorrectWord) {
        highlightedAnswer += `<span style="color: green;">${correctWords[i]}</span> `;
      } else {
        highlightedAnswer += `<span style="color: red;">${correctWords[i]}</span> `;
      }
    }

    document.getElementById('result').innerHTML = `<i class="fas fa-times-circle"></i> للأسف، إجابة خاطئة. الإجابة الصحيحة هي: ${highlightedAnswer}`;
    document.getElementById('result').style.color = '#F44336';
    score = 0;
  }

  document.getElementById('scoreValue').textContent = score;
  document.getElementById('audioButton').style.display = 'block';

  try {
    const tafsirResponse = await fetch(`https://api.alquran.cloud/v1/ayah/${currentSurahNumber}:${currentAyahNumber}/ar.muyassar`);
    const tafsirData = await tafsirResponse.json();
    if (tafsirData.code === 200 && tafsirData.data && tafsirData.data.text) {
      document.getElementById('tafsir').innerHTML = `<strong>تفسير الآية:</strong><br>${tafsirData.data.text}`;
      
      // Scroll to the bottom after Tafsir is displayed
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth' // Smooth scrolling
      });
    } else {
      throw new Error('Invalid response from Tafsir API');
    }
  } catch (error) {
    console.error('Error fetching Tafsir:', error);
    document.getElementById('tafsir').innerHTML = 'عذرًا، لم نتمكن من جلب التفسير في هذه اللحظة.';
  }
}

// Toggle audio playback
function toggleAudio() {
  const audioButton = document.getElementById('audioButton');

  if (audioPlayer && !audioPlayer.paused) {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    audioButton.innerHTML = '<i class="fas fa-volume-up"></i> استمع إلى الآية';
    audioButton.classList.remove('playing');
  } else {
    const audioUrl = `https://api.alquran.cloud/v1/ayah/${currentSurahNumber}:${currentAyahNumber}/ar.alafasy`;
    fetch(audioUrl)
      .then(response => response.json())
      .then(data => {
        audioPlayer = new Audio(data.data.audio);
        audioPlayer.play();
        audioButton.innerHTML = '<i class="fas fa-stop"></i> إيقاف الصوت';
        audioButton.classList.add('playing');

        audioPlayer.onended = function() {
          audioButton.innerHTML = '<i class="fas fa-volume-up"></i> استمع إلى الآية';
          audioButton.classList.remove('playing');
        };
      })
      .catch(error => console.error('Error playing audio:', error));
  }
}

// Move to the next ayah
function nextAyah() {
  displayAyah();
}

// Start the timer
function startTimer() {
  clearInterval(timer);
  timeLeft = getSelectedTime();
  updateTimerDisplay();
  timer = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(timer);
      checkAnswer();
    }
  }, 1000);
}

// Update the timer display
function updateTimerDisplay() {
  document.getElementById('timeLeft').textContent = timeLeft;
  const timerElement = document.getElementById('timer');
  timerElement.classList.toggle('pulse', timeLeft <= 10);
}

// Toggle the theme
function toggleTheme() {
  document.body.classList.toggle('light-theme');
  const themeIcon = document.querySelector('#themeToggle i');
  themeIcon.classList.toggle('fa-sun');
  themeIcon.classList.toggle('fa-moon');
  saveThemeMode(document.body.classList.contains('light-theme'));
}

// Save the theme mode to localStorage
function saveThemeMode(isLightTheme) {
  localStorage.setItem('themeMode', isLightTheme ? 'light' : 'dark');
}

// Load the theme mode from localStorage
function loadThemeMode() {
  const themeMode = localStorage.getItem('themeMode');
  if (themeMode === 'light') {
    document.body.classList.add('light-theme');
    const themeIcon = document.querySelector('#themeToggle i');
    themeIcon.classList.remove('fa-sun');
    themeIcon.classList.add('fa-moon');
  }
}

// Save the timer settings to localStorage
function saveTimerSettings(time) {
  localStorage.setItem('timerSettings', time);
}

// Load the timer settings from localStorage
function loadTimerSettings() {
  const timerSettings = localStorage.getItem('timerSettings');
  if (timerSettings) {
    const timerSelect = document.getElementById('timerSelect');
    const customTimerInput = document.getElementById('customTimerInput');
    if (timerSettings === 'custom') {
      timerSelect.value = 'custom';
      customTimerInput.style.display = 'inline-block';
      customTimerInput.value = localStorage.getItem('customTimerValue') || 60;
    } else {
      timerSelect.value = timerSettings;
      customTimerInput.style.display = 'none';
    }
  }
}

// Save the order mode to localStorage
function saveOrderMode(isOrdered) {
  localStorage.setItem('orderMode', isOrdered ? 'ordered' : 'random');
}

// Load the order mode from localStorage
function loadOrderMode() {
  const orderMode = localStorage.getItem('orderMode');
  const modeToggle = document.getElementById('modeToggle');
  if (orderMode === 'ordered') {
    modeToggle.checked = true;
    currentOrderMode = 'ordered';
  } else {
    modeToggle.checked = false;
    currentOrderMode = 'random';
  }
}

// Get the selected time from the timer dropdown
function getSelectedTime() {
  const timerSelect = document.getElementById('timerSelect');
  const selectedValue = timerSelect.value;
  if (selectedValue === 'custom') {
    return parseInt(document.getElementById('customTimerInput').value) || 60;
  }
  return parseInt(selectedValue);
}

// Populate the surah select dropdown
async function populateSurahSelect() {
  const response = await fetch('https://api.alquran.cloud/v1/meta');
  const data = await response.json();
  const surahs = data.data.surahs.references;
  const select = document.getElementById('surahSelect');

  surahs.forEach(surah => {
    const option = document.createElement('option');
    option.value = surah.number;
    option.textContent = surah.name;
    select.appendChild(option);
  });
}

// Show the share card
function showShareCard() {
  document.getElementById('overlay').style.display = 'block';
  document.getElementById('shareCard').style.display = 'block';
}

// Hide the share card
function hideShareCard() {
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('shareCard').style.display = 'none';
}

// Copy the link to the clipboard
function copyLink() {
  const shareText = 'تحدي إكمال الآيات القرآنية - اختبر حفظك للقرآن الكريم وأكمل الآيات في الوقت المحدد';
  const shareUrl = window.location.href;
  const fullText = `${shareText}\n${shareUrl}`;

  navigator.clipboard.writeText(fullText)
    .then(() => alert('تم نسخ الرابط بنجاح!'))
    .catch(err => console.error('Failed to copy: ', err));
}

// Share on Facebook
function shareOnFacebook() {
  const shareUrl = encodeURIComponent(window.location.href);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, '_blank');
}

// Share on Twitter
function shareOnTwitter() {
  const shareText = encodeURIComponent('تحدي إكمال الآيات القرآنية - اختبر حفظك للقرآن الكريم وأكمل الآيات في الوقت المحدد');
  const shareUrl = encodeURIComponent(window.location.href);
  window.open(`https://x.com/intent/tweet?text=${shareText}&url=${shareUrl}`, '_blank');
}

// Share on WhatsApp
function shareOnWhatsApp() {
  const shareText = encodeURIComponent(`تحدي إكمال الآيات القرآنية - اختبر حفظك للقرآن الكريم وأكمل الآيات في الوقت المحدد\n${window.location.href}`);
  window.open(`https://wa.me/?text=${shareText}`, '_blank');
}

// Share on LinkedIn
function shareOnLinkedIn() {
  const shareUrl = encodeURIComponent(window.location.href);
  const shareText = encodeURIComponent('تحدي إكمال الآيات القرآنية - اختبر حفظك للقرآن الكريم وأكمل الآيات في الوقت المحدد');
  window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${shareUrl}&title=${shareText}`, '_blank');
}

// Share on Telegram
function shareOnTelegram() {
  const shareText = encodeURIComponent(`تحدي إكمال الآيات القرآنية - اختبر حفظك للقرآن الكريم وأكمل الآيات في الوقت المحدد\n${window.location.href}`);
  window.open(`https://t.me/share/url?url=${shareText}`, '_blank');
}

// Toggle the dropdown menu
function toggleDropdown() {
  document.getElementById("myDropdown").classList.toggle("show");
}

// Adjust the layout based on screen size
function adjustLayout() {
  const dropdown = document.querySelector('.dropdown');
  const contactShare = document.querySelector('.contact-share');

  if (window.innerWidth <= 600) {
    dropdown.style.display = 'block';
    contactShare.style.display = 'none';
  } else {
    dropdown.style.display = 'none';
    contactShare.style.display = 'flex';
  }
}

// Function to toggle the visibility of the mode toggle
function toggleModeToggleVisibility() {
  const surahSelect = document.getElementById('surahSelect');
  const modeToggle = document.querySelector('.mode-toggle');

  if (surahSelect.value === 'random') {
    modeToggle.style.display = 'none'; // Hide the mode toggle when "عشوائي" is selected
  } else {
    modeToggle.style.display = 'block'; // Show the mode toggle when a specific surah is selected
  }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function () {
  // Load saved settings
  loadThemeMode();
  loadTimerSettings();
  loadOrderMode();

  // Initialize best score
  bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
  document.getElementById('bestScoreValue').textContent = bestScore;

  // Populate the surah select dropdown
  populateSurahSelect();

  // Display the first ayah
  displayAyah();

  // Adjust the layout
  adjustLayout();

  // Set the initial visibility of the mode toggle
  toggleModeToggleVisibility();

  // Event listeners
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('timerSelect').addEventListener('change', function () {
    const customInput = document.getElementById('customTimerInput');
    if (this.value === 'custom') {
      customInput.style.display = 'inline-block';
    } else {
      customInput.style.display = 'none';
    }
    saveTimerSettings(this.value);
    startTimer();
  });
  document.getElementById('customTimerInput').addEventListener('change', function () {
    localStorage.setItem('customTimerValue', this.value);
    saveTimerSettings('custom');
    startTimer();
  });
  document.getElementById('modeToggle').addEventListener('change', function () {
    currentOrderMode = this.checked ? 'ordered' : 'random';
    currentAyahIndex = 1;
    saveOrderMode(this.checked);
    displayAyah();
  });
  document.getElementById('tashkilToggle').addEventListener('change', updateAyahDisplay);
  document.getElementById('shareLink').addEventListener('click', showShareCard);
  document.getElementById('mobileShareLink').addEventListener('click', showShareCard);
  document.getElementById('closeShareCard').addEventListener('click', hideShareCard);
  document.getElementById('overlay').addEventListener('click', hideShareCard);
  document.getElementById('copyLink').addEventListener('click', copyLink);
  window.addEventListener('resize', adjustLayout);

  // Add event listener for surah select change
  document.getElementById('surahSelect').addEventListener('change', function () {
    toggleModeToggleVisibility(); // Update the visibility of the mode toggle
    currentSelectedSurah = this.value === 'random' ? null : parseInt(this.value);
    currentAyahIndex = 1; // Reset the ayah index when a new surah is selected
    displayAyah(); // Immediately display a new ayah from the selected surah
  });
});

// Close the dropdown if the user clicks outside of it
window.onclick = function (event) {
  if (!event.target.matches('.dropbtn')) {
    var dropdowns = document.getElementsByClassName("dropdown-content");
    for (var i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
      }
    }
  }
}