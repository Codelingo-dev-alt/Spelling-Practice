import { useState, useEffect, useRef, useCallback } from 'react'
import type { Mode, SpellingMode, PracticeResult, PracticeSession } from './types'
import { fetchItems } from './services/api'
import { useSpeech } from './hooks/useSpeech'
import './App.css'

function App() {
  const [view, setView] = useState<'setup' | 'practice' | 'results'>('setup')
  const [mode, setMode] = useState<Mode>('words')
  const [spellingMode, setSpellingMode] = useState<SpellingMode>('word')
  const [difficulty, setDifficulty] = useState(1)
  const [wordInput, setWordInput] = useState('')
  const [session, setSession] = useState<PracticeSession>({
    words: [],
    results: [],
    currentIndex: 0,
    correctCount: 0,
    incorrectCount: 0
  })

  const [userInput, setUserInput] = useState('')
  const [timerText, setTimerText] = useState('Ready...')
  const [isInputDisabled, setIsInputDisabled] = useState(true)
  const [isSubmitEnabled, setIsSubmitEnabled] = useState(false)
  
  const { speak, speakTokens } = useSpeech()
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isRunningRef = useRef(false)
  const isInputDisabledRef = useRef(true)
  const isSubmitEnabledRef = useRef(false)

  const startPractice = useCallback(async (wordsToUse?: string[]) => {
    const finalWords = wordsToUse || wordInput.split(/[,\n]/).map(w => w.trim()).filter(w => w.length > 0)
    if (finalWords.length === 0) return

    setSession({
      words: finalWords,
      results: [],
      currentIndex: 0,
      correctCount: 0,
      incorrectCount: 0
    })
    setView('practice')
    setUserInput('')
    setTimerText('Ready...')
    setIsInputDisabled(true)
    setIsSubmitEnabled(false)
  }, [wordInput])

  const handleGenerate = async () => {
    try {
      const generated = await fetchItems(mode, difficulty)
      startPractice(generated)
    } catch (err) {
      alert("Failed to fetch items. Is the server running?")
    }
  }

  const submitAnswer = useCallback(() => {
    if (isInputDisabledRef.current || !isSubmitEnabledRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    setIsInputDisabled(true)
    setIsSubmitEnabled(false)

    const target = session.words[session.currentIndex]
    const cleanedTarget = target.trim().replace(/,+$/, '')
    const cleanedInput = userInput.trim().replace(/,+$/, '')
    let isCorrect = cleanedInput.toLowerCase() === cleanedTarget.toLowerCase()
    if (mode === 'names' && cleanedInput.length > 0) {
      const firstInput = cleanedInput[0]
      const firstTarget = cleanedTarget[0]
      if (firstTarget && firstInput !== firstTarget.toUpperCase()) {
        isCorrect = false
      }
    }

    const newResult: PracticeResult = {
      word: target,
      answer: userInput.trim() || "(empty)",
      correct: isCorrect
    }

    setSession(prev => ({
      ...prev,
      results: [...prev.results, newResult],
      correctCount: prev.correctCount + (isCorrect ? 1 : 0),
      incorrectCount: prev.incorrectCount + (isCorrect ? 0 : 1),
      currentIndex: prev.currentIndex + 1
    }))

    setTimerText('Ready...')
  }, [userInput, session])

  const startTypingTimer = useCallback((seconds: number) => {
    let timeLeft = seconds
    setTimerText(`Type! (${timeLeft}s)`)
    
    const tick = () => {
      if (isInputDisabledRef.current) return
      timeLeft -= 1
      if (timeLeft < 0) {
        submitAnswer()
      } else {
        setTimerText(`Type! (${timeLeft}s)`)
        timerRef.current = setTimeout(tick, 1000)
      }
    }
    timerRef.current = setTimeout(tick, 1000)
  }, [submitAnswer])

  const buildSpellingTokens = useCallback((text: string) => {
    const chunks = text.match(/[A-Za-z0-9]+/g) || []
    const tokens: string[] = []

    chunks.forEach((chunk, idx) => {
      const chars = chunk.split('')
      let i = 0
      while (i < chars.length) {
        const current = chars[i].toLowerCase()
        let j = i + 1
        while (j < chars.length && chars[j].toLowerCase() === current) {
          j++
        }
        const runLen = j - i
        if (runLen === 2) {
          tokens.push(`double ${current}`)
        } else if (runLen === 3) {
          tokens.push(`triple ${current}`)
        } else {
          for (let k = i; k < j; k++) tokens.push(chars[k].toLowerCase())
        }
        i = j
      }
      if (idx < chunks.length - 1) tokens.push('__PAUSE__')
    })

    return tokens
  }, [])

  const runSequence = useCallback(async () => {
    if (isRunningRef.current) return
    isRunningRef.current = true
    const startIndex = session.currentIndex
    if (session.currentIndex >= session.words.length) {
      setView('results')
      isRunningRef.current = false
      return
    }

    setUserInput('')
    setIsInputDisabled(true)
    setIsSubmitEnabled(false)

    for (let i = 3; i > 0; i--) {
      setTimerText(i.toString())
      await new Promise(r => setTimeout(r, 1000))
    }

    setTimerText("Listen!")
    const word = session.words[startIndex]
    
    const effectiveMode = mode === 'numbers' ? 'letter' : spellingMode

    if (effectiveMode === 'letter') {
      setIsInputDisabled(false)
      setTimeout(() => inputRef.current?.focus(), 10)
      if (mode === 'numbers') {
        const tokens = buildSpellingTokens(word)
        await speakTokens(tokens, 0.8)
        setTimerText("Type each character!")
      } else {
        const tokens = buildSpellingTokens(word)
        await speakTokens(tokens, 0.8)
        setTimerText("Type each letter!")
      }
      setIsSubmitEnabled(true)
    } else {
      setIsInputDisabled(false)
      setTimeout(() => inputRef.current?.focus(), 10)
      await speak(word, 'word')
      setIsSubmitEnabled(true)
      startTypingTimer(6)
    }
    isRunningRef.current = false
  }, [session, spellingMode, mode, speak, speakTokens, buildSpellingTokens, startTypingTimer])

  useEffect(() => {
    if (view === 'practice' && isInputDisabled) {
      runSequence()
    }
  }, [view, session.currentIndex, isInputDisabled, runSequence])

  useEffect(() => {
    isInputDisabledRef.current = isInputDisabled
  }, [isInputDisabled])

  useEffect(() => {
    isSubmitEnabledRef.current = isSubmitEnabled
  }, [isSubmitEnabled])

  if (view === 'setup') {
    return (
      <div className="container">
        <h1>Spelling Practice</h1>
        <div id="setup-area">
          <p>Select mode and generate or enter items below:</p>
          
          <div className="options-grid">
            <div className="option-item">
              <label>Practice Mode:</label>
              <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
                <option value="words">Words</option>
                <option value="numbers">Numbers</option>
                <option value="names">Names</option>
              </select>
            </div>
            <div className="option-item">
              <label>Difficulty:</label>
              <select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))}>
                <option value="1">Level 1 (4-5 chars)</option>
                <option value="2">Level 2 (6-10 chars)</option>
                <option value="3">Level 3 (11-20 chars)</option>
              </select>
            </div>
          </div>

          {mode !== 'numbers' && (
            <div className="option-item">
              <label>Spelling Mode:</label>
              <div className="radio-group">
                <label><input type="radio" checked={spellingMode === 'word'} onChange={() => setSpellingMode('word')} /> Word</label>
                <label><input type="radio" checked={spellingMode === 'letter'} onChange={() => setSpellingMode('letter')} /> Letter</label>
              </div>
            </div>
          )}

          <textarea 
            placeholder="Or enter custom items here (comma separated)..." 
            value={wordInput} 
            onChange={(e) => setWordInput(e.target.value)}
          />
          
          <div className="button-group" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button id="generate-btn" onClick={handleGenerate}>Generate {mode.charAt(0).toUpperCase() + mode.slice(1)}</button>
            <button onClick={() => startPractice()} disabled={!wordInput.trim()}>Start Custom</button>
          </div>
        </div>
        <div className="footer" style={{ marginTop: '20px', fontSize: '0.8rem' }}>
          <a href="https://t.me/ieltswithAKBAR" target="_blank" rel="noopener noreferrer">
              Shemukhamedov | 09.03.2026 | @ieltswithAKBAR
          </a>
        </div>
      </div>
    )
  }

  if (view === 'practice') {
    return (
      <div className="container">
        <h1>{mode.charAt(0).toUpperCase() + mode.slice(1)} Practice</h1>
        <div id="timer-display" className="timer">{timerText}</div>
        <div className="stats">
            Item {session.currentIndex + 1} / {session.words.length}
        </div>
        <div className="practice-box" style={{ margin: '20px 0' }}>
            <input 
              type="text" 
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={isInputDisabled}
              ref={inputRef}
              placeholder="Type here..." 
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isSubmitEnabled && userInput.trim().length > 0) {
                  submitAnswer()
                }
              }}
            />
            <button
              onClick={submitAnswer}
              disabled={isInputDisabled || !isSubmitEnabled || userInput.trim().length === 0}
            >
              Submit
            </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <h2>Results Summary</h2>
      <div className="result-stats">
          <p>Total Items: {session.words.length}</p>
          <p>Correct: <span className="correct-text">{session.correctCount}</span></p>
          <p>Incorrect: <span className="incorrect-text">{session.incorrectCount}</span></p>
      </div>
      
      <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table>
              <thead>
                  <tr>
                      <th>#</th>
                      <th>Target</th>
                      <th>Your Answer</th>
                      <th>Result</th>
                  </tr>
              </thead>
              <tbody>
                {session.results.map((res, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{res.word}</td>
                    <td>{res.answer}</td>
                    <td className={res.correct ? 'correct-text' : 'incorrect-text'}>
                      {res.correct ? '✓' : '✗'}
                    </td>
                  </tr>
                ))}
              </tbody>
          </table>
      </div>

      <div className="result-button-group" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
          <button onClick={() => {
            setSession(prev => ({ ...prev, currentIndex: 0, results: [], correctCount: 0, incorrectCount: 0 }))
            setView('practice')
          }}>Practice Again</button>
          <button className="secondary-btn" onClick={() => setView('setup')}>Back to Setup</button>
      </div>
    </div>
  )
}

export default App
