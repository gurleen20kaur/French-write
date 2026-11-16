import { useEffect, useRef, useState } from 'react'
import { supabase, listEntries, saveEntry } from './db.js'

const ACCENTS = [...'éèêëàâîïôûùüçœæ\'«»·']
// Official TCF Canada word ranges per task.
const TARGETS = { T1: [60, 120], T2: [120, 150], T3: [120, 180] }
// TCF counts whatever sits between two spaces as one word ("c'est-à-dire" = 1).
const countWords = (s) => s.trim().split(/\s+/).filter(Boolean).length

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = still loading

  useEffect(() => {
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!supabase) return <Editor />
  if (session === undefined) return null
  return session ? <Editor /> : <SignIn />
}

function SignIn() {
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    const form = new FormData(e.target)
    const { error } = await supabase.auth.signInWithPassword({
      email: form.get('email'),
      password: form.get('password'),
    })
    setError(error?.message ?? '')
  }

  return (
    <form className="signin" onSubmit={submit}>
      <h1>TCF · Expression écrite</h1>
      <input name="email" type="email" placeholder="Email" autoComplete="email" required />
      <input name="password" type="password" placeholder="Password" autoComplete="current-password" required />
      <button className="primary">Sign in</button>
      {error && <p className="error">{error}</p>}
    </form>
  )
}

function Editor() {
  const [text, setText] = useState(() => localStorage.getItem('draft') ?? '')
  const [question, setQuestion] = useState(() => localStorage.getItem('question') ?? '')
  const [qOpen, setQOpen] = useState(false)
  const [saved, setSaved] = useState(['', '']) // [text, question] as last saved or loaded
  const [task, setTask] = useState('T1')
  const [entries, setEntries] = useState([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [caps, setCaps] = useState(false) // Maj toggle for the accent buttons
  const textarea = useRef(null)
  const drawer = useRef(null)

  // Draft survives a refresh or a closed tab (this device only).
  useEffect(() => localStorage.setItem('draft', text), [text])
  useEffect(() => localStorage.setItem('question', question), [question])
  useEffect(() => {
    listEntries().then(setEntries).catch((e) => setStatus(`History failed to load: ${e.message}`))
  }, [])

  const words = countWords(text)
  const [min, max] = TARGETS[task]
  const full = words >= max
  const dirty = words > 0 && (text !== saved[0] || question !== saved[1])

  function insert(ch) {
    const el = textarea.current
    el.focus()
    // execCommand keeps the browser's undo history intact; setRangeText is the fallback.
    if (!document.execCommand('insertText', false, ch)) {
      el.setRangeText(ch, el.selectionStart, el.selectionEnd, 'end')
      setText(el.value)
    }
  }

  async function save() {
    if (!dirty) return
    setStatus('Saving…')
    try {
      const row = await saveEntry({ task, question, content: text, word_count: words })
      setEntries((list) => [row, ...list])
      setSaved([text, question])
      setStatus('Saved ✓')
    } catch (e) {
      setStatus(`Not saved: ${e.message}`)
    }
  }

  // Swap the editor content (new page or a history entry), guarding unsaved text.
  function replace(content, nextTask = task, nextQuestion = '') {
    if (dirty && !confirm('Discard the unsaved text?')) return
    setText(content)
    setQuestion(nextQuestion)
    setSaved([content, nextQuestion])
    setTask(nextTask)
    setStatus('')
    drawer.current.close()
    textarea.current.focus()
  }

  const q = query.trim().toLowerCase()
  const shown = entries.filter((e) => !q || e.task.toLowerCase() === q || (e.content + ' ' + (e.question ?? '')).toLowerCase().includes(q))

  return (
    <main>
      <header className="bar">
        <select value={task} onChange={(e) => setTask(e.target.value)} aria-label="Task">
          {Object.keys(TARGETS).map((t) => <option key={t}>{t}</option>)}
        </select>
        <span className={words < min ? 'count' : full ? 'count over' : 'count ok'}>
          {words} / {min}–{max} words
        </span>
        <meter className={full ? 'full' : ''} value={words} min={0} max={max} low={min} high={max} optimum={(min + max) / 2} />
        <span className="status" role="status">
          {status || (!supabase && 'Local mode: not synced')}
        </span>
        <button onClick={() => replace('')}>New</button>
        <button onClick={() => drawer.current.showModal()}>History</button>
        <button className="primary" onClick={save} disabled={!dirty}>Save Entry</button>
      </header>

      <div className="accents" role="toolbar" aria-label="French characters">
        {/* preventDefault on mousedown keeps focus (and the cursor) in the textarea. */}
        <button className="maj" aria-pressed={caps} onMouseDown={(e) => e.preventDefault()} onClick={() => setCaps(!caps)}>
          Maj
        </button>
        {ACCENTS.map((lower) => {
          const ch = caps ? lower.toUpperCase() : lower // symbols have no uppercase, so they stay as they are
          return <button key={lower} onMouseDown={(e) => e.preventDefault()} onClick={() => insert(ch)}>{ch}</button>
        })}
      </div>

      <div className="question">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={qOpen ? 8 : 1}
          placeholder="Collez la question ici…"
          aria-label="Question"
          lang="fr"
          spellCheck={false}
        />
        <button onClick={() => setQOpen(!qOpen)} aria-expanded={qOpen} aria-label={qOpen ? 'Collapse question' : 'Expand question'}>
          {qOpen ? '▴' : '▾'}
        </button>
      </div>

      <textarea
        ref={textarea}
        value={text}
        onChange={(e) => { setText(e.target.value); setStatus('') }}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save() }
        }}
        placeholder="Écrivez ici…"
        lang="fr"
        autoFocus
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
      />

      <dialog ref={drawer} className="drawer" onClick={(e) => e.target === drawer.current && drawer.current.close()}>
        <div className="drawer-body">
          <header>
            <h2>History</h2>
            <button onClick={() => drawer.current.close()} aria-label="Close history">✕</button>
          </header>
          <input type="search" placeholder="Search text, or T1 / T2 / T3" value={query} onChange={(e) => setQuery(e.target.value)} />
          <ul>
            {shown.map((e) => (
              <li key={e.id}>
                <button onClick={() => replace(e.content, e.task, e.question ?? '')}>
                  <strong>{e.task}</strong> · {e.word_count} words · {new Date(e.created_at).toLocaleString()}
                  {e.question && <em>{e.question.slice(0, 100)}</em>}
                  <span>{e.content.slice(0, 140)}</span>
                </button>
              </li>
            ))}
          </ul>
          {!shown.length && <p className="muted">{entries.length ? 'No match.' : 'Nothing saved yet.'}</p>}
          {supabase && <button className="signout" onClick={() => supabase.auth.signOut()}>Sign out</button>}
        </div>
      </dialog>
    </main>
  )
}
