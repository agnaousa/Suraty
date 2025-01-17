let currentAyah, currentSurah, currentAyahNumber, currentSurahNumber;
let score = 0;
let bestScore = 0;
let timer;
let timeLeft;
let checkButtonClicked = false;
let audioPlayer;

function normalizeQuranText(text) {
  // Remove Tashkeel (diacritics), including ٰ (Arabic Superscript Alef)
  const tashkeel = [
    '\u064B', '\u064C', '\u064D', '\u064E', '\u064F', '\u0650', '\u0651', '\u0652',
    '\u0653', '\u0654', '\u0655', '\u0656', '\u0657', '\u0658', '\u0659', '\u065A',
    '\u065B', '\u065C', '\u065D', '\u065E', '\u065F', '\u0670', '\u06DA' // ٰ (Arabic Superscript Alef)
  ];

  // Remove Quranic annotation marks
  const quranMarks = [
    '\u06D6', '\u06D7', '\u06D8', '\u06D9', '\u06DA', '\u06DB', '\u06DC', '\u06DD',
    '\u06DE', '\u06DF', '\u06E0', '\u06E1', '\u06E2', '\u06E3', '\u06E4', '\u06E5',
    '\u06E6', '\u06E7', '\u06E8', '\u06E9', '\u06EA', '\u06EB', '\u06EC', '\u06ED','\u06DA'
  ];

  // Remove punctuation marks
  const punctuation = [
    '\u060C', '\u061B', '\u061F', '\u0640', '\u066A', '\u066B','\u06DA', '\u066C', '\u066D',
    '،', '؛', '؟'
  ];

  // Remove stop marks (Waqf symbols)
  const stopMarks = [
    '\u06DA', '\u06DB', '\u06DC', '\u06DD', '\u06DE', '\u06DF', '\u06E0', '\u06E1',
    '\u06E2', '\u06E3', '\u06E4', '\u06E5', '\u06E6', '\u06E7', '\u06E8', '\u06E9',
    '\u06EA', '\u06EB', '\u06EC', '\u06ED'
  ];

  // Normalize letter variants
  const letterVariants = {
    'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا',
    'ى': 'ي', 'ة': 'ه', 'ؤ': 'و', 'ئ': 'ي'
  };

  let normalized = text;

  // Remove all diacritics, Quranic marks, and punctuation
  const allMarks = [...tashkeel, ...quranMarks, ...punctuation];
  const markRegex = new RegExp(`[${allMarks.join('')}]`, 'g');
  normalized = normalized.replace(markRegex, '');

  // Normalize letter variants
  Object.entries(letterVariants).forEach(([variant, standard]) => {
    normalized = normalized.replace(new RegExp(variant, 'g'), standard);
  });

  // Remove extra spaces and trim
  return normalized.replace(/\s+/g, ' ').trim();
}

async function fetchRandomAyah() {
  const selectedSurah = document.getElementById('surahSelect').value;
  const surahNumber = selectedSurah === 'random' ? Math.floor(Math.random() * 114) + 1 : parseInt(selectedSurah);
  const response = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/ar.asad`);
  const data = await response.json();
  const surah = data.data;
  const randomAyahNumber = Math.floor(Math.random() * surah.numberOfAyahs) + 1;
  return {
    text: surah.ayahs[randomAyahNumber - 1].text,
    surahName: surah.name,
    surahNumber: surah.number,
    ayahNumber: randomAyahNumber
  };
}

// Add this helper function at the top
function filterValidWords(words) {
  return words.filter(word => {
    // Remove surrounding spaces
    const trimmedWord = word.trim();
    // Check if the word is a single character (after normalization) and is a special Quranic character
    const normalizedWord = normalizeQuranText(trimmedWord);
    const specialChars = ['ۖ', 'ۗ', 'ۘ', 'ۙ', 'ۚ', 'ۛ', 'ۜ', '۞', '۩'];
    if (trimmedWord.length === 1 && specialChars.includes(trimmedWord)) {
      return false;
    }
    return trimmedWord.length > 0;
  });
}

// Update the displayAyah function
async function displayAyah() {
  document.getElementById('ayah').innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
  document.getElementById('ayahInfo').textContent = '';
  document.getElementById('audioButton').style.display = 'none';
  document.getElementById('wordCards').innerHTML = '';

  const ayahData = await fetchRandomAyah();
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

  // Split the verse and filter out special characters
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

  // Add event listeners to input fields for spacebar navigation
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

// Update the updateAyahDisplay function
function updateAyahDisplay() {
  const words = currentAyah.split(' ');
  const validWords = filterValidWords(words);
  const middleIndex = Math.floor(validWords.length / 2);
  
  // Find the actual index in the original text that corresponds to our middle valid word
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

// Update the checkAnswer function
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
    } else {
      throw new Error('Invalid response from Tafsir API');
    }
  } catch (error) {
    console.error('Error fetching Tafsir:', error);
    document.getElementById('tafsir').innerHTML = 'عذرًا، لم نتمكن من جلب التفسير في هذه اللحظة.';
  }
}

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

function nextAyah() {
  displayAyah();
}

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

function updateTimerDisplay() {
  document.getElementById('timeLeft').textContent = timeLeft;
  const timerElement = document.getElementById('timer');
  timerElement.classList.toggle('pulse', timeLeft <= 10);
}

function toggleTheme() {
  document.body.classList.toggle('light-theme');
  const themeIcon = document.querySelector('#themeToggle i');
  themeIcon.classList.toggle('fa-sun');
  themeIcon.classList.toggle('fa-moon');
}

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

function getSelectedTime() {
  const timerSelect = document.getElementById('timerSelect');
  const selectedValue = timerSelect.value;
  if (selectedValue === 'custom') {
    return parseInt(document.getElementById('customTimerInput').value) || 60;
  }
  return parseInt(selectedValue);
}

// Share functionality
function showShareCard() {
  document.getElementById('overlay').style.display = 'block';
  document.getElementById('shareCard').style.display = 'block';
}

function hideShareCard() {
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('shareCard').style.display = 'none';
}

function copyLink() {
  const shareText = 'تحدي إكمال الآيات القرآنية - اختبر حفظك للقرآن الكريم وأكمل الآيات في الوقت المحدد';
  const shareUrl = window.location.href;
  const fullText = `${shareText}\n${shareUrl}`;

  navigator.clipboard.writeText(fullText)
    .then(() => alert('تم نسخ الرابط بنجاح!'))
    .catch(err => console.error('Failed to copy: ', err));
}

function shareOnFacebook() {
  const shareUrl = encodeURIComponent(window.location.href);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, '_blank');
}

function shareOnTwitter() {
  const shareText = encodeURIComponent('تحدي إكمال الآيات القرآنية - اختبر حفظك للقرآن الكريم وأكمل الآيات في الوقت المحدد');
  const shareUrl = encodeURIComponent(window.location.href);
  window.open(`https://x.com/intent/tweet?text=${shareText}&url=${shareUrl}`, '_blank');
}

function shareOnWhatsApp() {
  const shareText = encodeURIComponent(`تحدي إكمال الآيات القرآنية - اختبر حفظك للقرآن الكريم وأكمل الآيات في الوقت المحدد\n${window.location.href}`);
  window.open(`https://wa.me/?text=${shareText}`, '_blank');
}

function shareOnLinkedIn() {
  const shareUrl = encodeURIComponent(window.location.href);
  const shareText = encodeURIComponent('تحدي إكمال الآيات القرآنية - اختبر حفظك للقرآن الكريم وأكمل الآيات في الوقت المحدد');
  window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${shareUrl}&title=${shareText}`, '_blank');
}

function shareOnTelegram() {
  const shareText = encodeURIComponent(`تحدي إكمال الآيات القرآنية - اختبر حفظك للقرآن الكريم وأكمل الآيات في الوقت المحدد\n${window.location.href}`);
  window.open(`https://t.me/share/url?url=${shareText}`, '_blank');
}

function shareGame() {
  showShareCard();
}

function toggleDropdown() {
  document.getElementById("myDropdown").classList.toggle("show");
}

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

// Event Listeners
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('surahSelect').addEventListener('change', displayAyah);
  document.getElementById('timerSelect').addEventListener('change', function () {
    const customInput = document.getElementById('customTimerInput');
    if (this.value === 'custom') {
      customInput.style.display = 'inline-block';
    } else {
      customInput.style.display = 'none';
    }
    startTimer();
  });
  document.getElementById('customTimerInput').addEventListener('change', startTimer);
  document.getElementById('tashkilToggle').addEventListener('change', updateAyahDisplay);
  document.getElementById('shareLink').addEventListener('click', shareGame);
  document.getElementById('mobileShareLink').addEventListener('click', shareGame);
  document.getElementById('closeShareCard').addEventListener('click', hideShareCard);
  document.getElementById('overlay').addEventListener('click', hideShareCard);
  document.getElementById('copyLink').addEventListener('click', copyLink);
  window.addEventListener('resize', adjustLayout);

  // Initialize
  bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
  document.getElementById('bestScoreValue').textContent = bestScore;
  populateSurahSelect();
  displayAyah();
  adjustLayout();
});

// Close dropdown when clicking outside
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