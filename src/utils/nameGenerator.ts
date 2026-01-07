const ADJECTIVES = ['Gojangri', 'Cutie', 'Pitum', 'Lovely', 'Mayalu', "Adey", "Gwache", "Chill", "Majdoor", "Makkha"];
const NOUNS = ['Bhai', 'Don', 'Topper', 'Corporate', 'Chasmis', 'Motu', 'Baini', 'Er.', 'Katikuti', 'Baccha', 'Babe'];

export const generateRandomName = (): string => {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const number = Math.floor(Math.random() * 1000);
    return `${adj} ${noun} #${number}`;
};
