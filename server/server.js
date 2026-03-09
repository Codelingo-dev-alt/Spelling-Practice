const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../client')));

let categorizedWords = {
    1: [], 
    2: [], 
    3: []  
};


function loadWords() {
    try {
        const filePath = path.join(__dirname, 'words.txt');
        if (!fs.existsSync(filePath)) {
            console.log('words.txt not found. Please create it and paste your words.');
            return;
        }

        const data = fs.readFileSync(filePath, 'utf8');
        const allWords = data.split(/\r?\n/).map(w => w.trim()).filter(w => w.length > 0);
        
        
        categorizedWords = { 1: [], 2: [], 3: [] };

        allWords.forEach(word => {
            const len = word.length;
            if (len >= 4 && len <= 5) categorizedWords[1].push(word.toLowerCase());
            else if (len >= 6 && len <= 10) categorizedWords[2].push(word.toLowerCase());
            else if (len >= 11) categorizedWords[3].push(word.toLowerCase());
        });

        console.log(`Loaded ${allWords.length} words total.`);
        console.log(`Level 1: ${categorizedWords[1].length} words`);
        console.log(`Level 2: ${categorizedWords[2].length} words`);
        console.log(`Level 3: ${categorizedWords[3].length} words`);
    } catch (err) {
        console.error('Error loading words:', err);
    }
}


loadWords();


app.get('/api/words', (req, res) => {
    const level = parseInt(req.query.level) || 1;
    const count = parseInt(req.query.count) || 15;
    
    const pool = categorizedWords[level] || [];
    if (pool.length === 0) {
        return res.status(404).json({ error: 'No words available for this level.' });
    }

    
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);
    
    res.json(selected);
});


app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Open your browser to http://localhost:${PORT} to practice!`);
});
