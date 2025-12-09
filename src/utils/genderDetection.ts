/**
 * Gender Detection Utility
 * Detects gender from Romanian first names using heuristic matching
 */

// ~100 common Romanian male first names
const MALE_NAMES = new Set([
  // Very common
  'andrei', 'alexandru', 'ion', 'mihai', 'gheorghe', 'stefan', 'vasile', 'florin',
  'adrian', 'cristian', 'daniel', 'marius', 'gabriel', 'lucian', 'bogdan', 'razvan',
  'ciprian', 'george', 'laurentiu', 'dragos', 'ionut', 'catalin', 'vlad', 'paul',
  'petru', 'radu', 'dan', 'mircea', 'sorin', 'eugen', 'ovidiu', 'dumitru',
  'nicolae', 'cosmin', 'alin', 'liviu', 'sergiu', 'claudiu', 'viorel', 'marcel',
  // Common
  'dorin', 'cornel', 'octavian', 'horatiu', 'silviu', 'traian', 'tudor', 'victor',
  'valentin', 'florian', 'ilie', 'danut', 'costel', 'romeo', 'leonard', 'robert',
  'denis', 'darius', 'alex', 'cristi', 'mihnea', 'matei', 'luca', 'david',
  'antonio', 'sebastian', 'raul', 'kevin', 'edward', 'patrick', 'eric', 'mark',
  // Less common but recognizable
  'aurel', 'benone', 'calin', 'emil', 'felix', 'grigore', 'horia', 'iulian',
  'jean', 'konstantin', 'leontin', 'manuel', 'nelu', 'oleg', 'pompiliu', 'remus',
  'sandu', 'tiberiu', 'urban', 'valeriu', 'wilhelm', 'zenon', 'zoltan', 'francisc',
  'andrian', 'adi', 'bebe', 'costi', 'dani', 'fane', 'gabi', 'johnny',
  'lavi', 'mitica', 'nicu', 'petrut', 'relu', 'sile', 'tavi', 'vali'
]);

// ~100 common Romanian female first names
const FEMALE_NAMES = new Set([
  // Very common
  'maria', 'ana', 'elena', 'ioana', 'andreea', 'cristina', 'alexandra', 'mihaela',
  'georgiana', 'florina', 'diana', 'laura', 'raluca', 'alina', 'simona', 'daniela',
  'gabriela', 'adriana', 'monica', 'roxana', 'carmen', 'rodica', 'nicoleta', 'catalina',
  'denisa', 'iulia', 'bianca', 'oana', 'irina', 'corina', 'loredana', 'madalina',
  'claudia', 'paula', 'teodora', 'luminita', 'silvia', 'camelia', 'anca', 'delia',
  // Common
  'valentina', 'larisa', 'daria', 'antonia', 'stefania', 'victoria', 'ecaterina', 'elisabeta',
  'marinela', 'petronela', 'aurelia', 'florentina', 'ramona', 'veronica', 'violeta', 'livia',
  'mirela', 'sorina', 'adina', 'lavinia', 'adelina', 'sabina', 'nadia', 'sonia',
  'patricia', 'eva', 'emma', 'sara', 'sophia', 'maya', 'carina', 'dora',
  // Less common but recognizable
  'agata', 'beatrice', 'cecilia', 'doina', 'elvira', 'felicia', 'geta', 'hortensia',
  'ida', 'jana', 'karina', 'liana', 'mariana', 'nela', 'otilia', 'petra',
  'rebeca', 'sanda', 'tania', 'ursula', 'viorica', 'wanda', 'xenia', 'zenovia',
  'ani', 'bety', 'cati', 'didi', 'ema', 'flori', 'gina', 'ina',
  'lili', 'mimi', 'nina', 'pufi', 'riri', 'sisi', 'tina', 'vivi'
]);

// Names that could be either gender (ambiguous)
const AMBIGUOUS_NAMES = new Set([
  'alex', 'gabi', 'adi', 'sasha', 'nicusor', 'jean', 'dominic', 'nico'
]);

/**
 * Extracts the first name from a full name string
 */
function extractFirstName(fullName: string): string {
  if (!fullName || typeof fullName !== 'string') {
    return '';
  }
  
  // Clean and normalize
  const cleaned = fullName.trim().toLowerCase();
  
  // Get first word (usually the first name in Romanian naming convention)
  const parts = cleaned.split(/\s+/);
  return parts[0] || '';
}

/**
 * Detects gender from a full name string
 * @param fullName - The full name to analyze
 * @returns 'male' | 'female' | 'unknown'
 */
export function detectGender(fullName: string): 'male' | 'female' | 'unknown' {
  const firstName = extractFirstName(fullName);
  
  if (!firstName) {
    return 'unknown';
  }
  
  // Check ambiguous names first
  if (AMBIGUOUS_NAMES.has(firstName)) {
    return 'unknown';
  }
  
  // Check male names
  if (MALE_NAMES.has(firstName)) {
    return 'male';
  }
  
  // Check female names
  if (FEMALE_NAMES.has(firstName)) {
    return 'female';
  }
  
  // Heuristic: Romanian female names often end in 'a' or 'i'
  // Male names often end in consonants or 'u', 'e', 'o'
  const lastChar = firstName.slice(-1);
  const lastTwoChars = firstName.slice(-2);
  
  // Strong female indicators
  if (lastTwoChars === 'na' || lastTwoChars === 'la' || lastTwoChars === 'ta' || 
      lastTwoChars === 'ca' || lastTwoChars === 'da' || lastTwoChars === 'ra') {
    return 'female';
  }
  
  // Names ending in 'a' are usually female in Romanian
  if (lastChar === 'a' && firstName.length > 2) {
    return 'female';
  }
  
  // Names ending in 'u' or consonants are usually male
  if (lastChar === 'u' || /[bcdfghjklmnpqrstvwxz]$/.test(firstName)) {
    return 'male';
  }
  
  return 'unknown';
}

/**
 * Extracts the first name (preferred name) from full name
 * Capitalizes properly
 */
export function extractPreferredName(fullName: string): string {
  const firstName = extractFirstName(fullName);
  
  if (!firstName) {
    return '';
  }
  
  // Capitalize first letter
  return firstName.charAt(0).toUpperCase() + firstName.slice(1);
}

/**
 * Gets a friendly greeting based on gender and time of day
 */
export function getGenderedGreeting(gender: 'male' | 'female' | 'unknown'): string {
  const hour = new Date().getHours();
  
  let timeGreeting: string;
  if (hour < 12) {
    timeGreeting = 'Bună dimineața';
  } else if (hour < 18) {
    timeGreeting = 'Bună ziua';
  } else {
    timeGreeting = 'Bună seara';
  }
  
  // Gender doesn't change the Romanian greeting, but we can add subtle differences
  return timeGreeting;
}
