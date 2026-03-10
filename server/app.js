const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

let data = {
    words: { 1: [], 2: [], 3: [] },
    numbers: { 1: [], 2: [], 3: [] },
    names: { 1: [], 2: [], 3: [] }
};

function loadList(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`${filePath} not found.`);
        return [];
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split(/\r?\n/).map(w => w.trim()).filter(w => w.length > 0);
}

function loadAllData() {
    try {
        data.words[1] = loadList(path.join(__dirname, 'words/level1.txt')).map(w => w.toLowerCase());
        data.words[2] = loadList(path.join(__dirname, 'words/level2.txt')).map(w => w.toLowerCase());
        data.words[3] = loadList(path.join(__dirname, 'words/level3.txt')).map(w => w.toLowerCase());

        data.numbers[1] = loadList(path.join(__dirname, 'numbers/level1.txt'));
        data.numbers[2] = loadList(path.join(__dirname, 'numbers/level2.txt'));
        data.numbers[3] = loadList(path.join(__dirname, 'numbers/level3.txt'));

        data.names[1] = loadList(path.join(__dirname, 'names/level1.txt'));
        data.names[2] = loadList(path.join(__dirname, 'names/level2.txt'));
        data.names[3] = loadList(path.join(__dirname, 'names/level3.txt'));

        console.log(`Loaded ${data.words[1].length + data.words[2].length + data.words[3].length} words.`);
        console.log(`Loaded ${data.numbers[1].length + data.numbers[2].length + data.numbers[3].length} numbers.`);
        console.log(`Loaded ${data.names[1].length + data.names[2].length + data.names[3].length} names.`);
    } catch (err) {
        console.error('Error loading data:', err);
    }
}

loadAllData();

app.get('/api/words', (req, res) => {
    const mode = req.query.mode || 'words';
    const level = parseInt(req.query.level) || 1;
    const count = parseInt(req.query.count) || 15;
    
    let pool = [];
    if (mode === 'words') {
        pool = data.words[level] || [];
    } else if (mode === 'numbers') {
        pool = data.numbers[level] || [];
    } else if (mode === 'names') {
        pool = data.names[level] || [];
    }

    if (pool.length === 0) {
        return res.status(404).json({ error: `No items available for mode: ${mode}` });
    }

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);
    
    res.json(selected);
});

module.exports = app;
