const fs = require("fs");
const path = require("path");

// Cache words at cold-start so subsequent calls are fast
let categorizedWords = null;

function loadWords() {
  if (categorizedWords) return categorizedWords;

  const filePath = path.join(__dirname, 'wordlist.txt');
  const data = fs.readFileSync(filePath, "utf8");
  const allWords = data
    .split(/\r?\n/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);

  categorizedWords = { 1: [], 2: [], 3: [] };

  allWords.forEach((word) => {
    const len = word.length;
    if (len >= 4 && len <= 5) categorizedWords[1].push(word.toLowerCase());
    else if (len >= 6 && len <= 10)
      categorizedWords[2].push(word.toLowerCase());
    else if (len >= 11) categorizedWords[3].push(word.toLowerCase());
  });

  return categorizedWords;
}

module.exports = function handler(req, res) {
  // CORS headers (safe to allow all origins for a public hobby project)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    const words = loadWords();

    const level = parseInt(req.query.level) || 1;
    const count = parseInt(req.query.count) || 15;

    const pool = words[level] || [];
    if (pool.length === 0) {
      return res
        .status(404)
        .json({ error: "No words available for this level." });
    }

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    res.status(200).json(selected);
  } catch (err) {
    console.error("Error loading words:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};
