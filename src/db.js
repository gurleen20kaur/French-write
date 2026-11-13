import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_KEY

// No env vars → local mode: entries stay in this browser's localStorage (no sync).
export const supabase = url && key ? createClient(url, key) : null

const localEntries = () => JSON.parse(localStorage.getItem('entries') || '[]')

export async function listEntries() {
  if (!supabase) return localEntries()
  // ponytail: loads the whole history in one query (Supabase caps at 1000 rows); paginate if it ever gets there.
  const { data, error } = await supabase.from('entries').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// entry: { task, content, word_count }. user_id and created_at are filled in by the database.
export async function saveEntry(entry) {
  if (!supabase) {
    const row = { ...entry, id: Date.now(), created_at: new Date().toISOString() }
    localStorage.setItem('entries', JSON.stringify([row, ...localEntries()]))
    return row
  }
  const { data, error } = await supabase.from('entries').insert(entry).select().single()
  if (error) throw error
  return data
}
