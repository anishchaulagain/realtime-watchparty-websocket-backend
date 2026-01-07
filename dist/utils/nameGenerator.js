"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRandomName = void 0;
const ADJECTIVES = ['Gojangri', 'Cutie', 'Pitum', 'Lovely', 'Mayalu', "Adey", "Gwache", "Chill", "Majdoor", "Makkha"];
const NOUNS = ['Bhai', 'Don', 'Topper', 'Corporate', 'Chasmis', 'Motu', 'Baini', 'Er.', 'Katikuti', 'Baccha', 'Babe'];
const generateRandomName = () => {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `${adj} ${noun}`;
};
exports.generateRandomName = generateRandomName;
