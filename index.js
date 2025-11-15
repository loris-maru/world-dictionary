const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Supported languages
const languages = [
  "korean",
  "english",
  "italian",
  "french",
  "german",
  "spanish",
];

// Dictionary storage (loaded once on startup)
const dictionaries = {};

// Load dictionaries into memory
languages.forEach((lang) => {
  const filePath = path.join(__dirname, "dictionaries", `${lang}.txt`);
  if (fs.existsSync(filePath)) {
    const words = fs
      .readFileSync(filePath, "utf8")
      .split("\n")
      .map((word) => word.trim())
      .filter((word) => word.length > 0); // Remove empty lines
    dictionaries[lang] = words;
    console.log(`Loaded ${words.length} words for ${lang}`);
  } else {
    console.warn(`Dictionary file for ${lang} not found: ${filePath}`);
  }
});

// Middleware for JSON parsing
app.use(express.json());

// API endpoint: /api/words/:language?chars=a,b,c&length=5&limit=10
app.get("/api/words/:language", (req, res) => {
  const { language } = req.params;
  const { chars, length, limit } = req.query;

  if (!languages.includes(language)) {
    return res
      .status(400)
      .json({
        error: `Unsupported language: ${language}. Supported: ${languages.join(
          ", "
        )}`,
      });
  }

  if (!dictionaries[language]) {
    return res
      .status(500)
      .json({ error: `Dictionary for ${language} not loaded` });
  }

  if (!chars) {
    return res
      .status(400)
      .json({
        error: 'Query param "chars" is required (comma-separated characters)',
      });
  }

  const charArray = chars
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter((c) => c.length > 0);
  if (charArray.length === 0) {
    return res.status(400).json({ error: 'Invalid "chars" param' });
  }

  const wordLength = length ? parseInt(length, 10) : null;
  const wordLimit = limit ? parseInt(limit, 10) : 10; // Default to 10

  if (wordLength !== null && (isNaN(wordLength) || wordLength <= 0)) {
    return res
      .status(400)
      .json({ error: 'Invalid "length" param (must be a positive integer)' });
  }
  if (isNaN(wordLimit) || wordLimit <= 0) {
    return res
      .status(400)
      .json({ error: 'Invalid "limit" param (must be a positive integer)' });
  }

  // Filter words
  let filteredWords = dictionaries[language].filter((word) => {
    const lowerWord = word.toLowerCase();
    const matchesChars = charArray.some((char) => lowerWord.includes(char));
    const matchesLength = wordLength === null || word.length === wordLength;
    return matchesChars && matchesLength;
  });

  // Shuffle and slice for random sampling if more than limit
  if (filteredWords.length > wordLimit) {
    filteredWords = filteredWords
      .sort(() => 0.5 - Math.random())
      .slice(0, wordLimit);
  }

  res.json({ words: filteredWords });
});

// Health check
app.get("/health", (req, res) => res.send("OK"));

app.listen(port, () => {
  console.log(`Word API service running on port ${port}`);
});
