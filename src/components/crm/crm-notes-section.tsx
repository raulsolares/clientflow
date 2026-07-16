'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { MessageSquare, Pin, PinOff, Plus, Trash2, Loader2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Note {
  id: string
  content: string
  pinned: boolean
  author_id: string | null
  created_at: string
  author?: { full_name: string | null } | null
}

export default function CrmNotesSection({ clientId }: { clientId: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadNotes()
  }, [clientId])

  async function loadNotes() {
    const supabase = createClient()
    const { data } = await supabase
      .from('client_notes')
      .select('*, author:author_id(full_name)')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
    if (data) setNotes(data as Note[])
    setLoading(false)
  }

  async function addNote() {
    if (!newNote.trim()) return
    setAdding(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('client_notes').insert({
      client_id: clientId,
      content: newNote.trim(),
      author_id: user?.id || null,
    })

    setNewNote('')
    setAdding(false)
    loadNotes()
  }

  async function togglePin(noteId: string, currentPinned: boolean) {
    const supabase = createClient()
    await supabase.from('client_notes').update({ pinned: !currentPinned }).eq('id', noteId)
    loadNotes()
  }

  async function deleteNote(noteId: string) {
    const supabase = createClient()
    await supabase.from('client_notes').update({ deleted_at: new Date().toISOString() }).eq('id', noteId)
    setNotes(prev => prev.filter(n => n.id !== noteId))
  }

  if (loading) {
    return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-gold-light" /></div>
  }

  return (
    <div className="space-y-3">
      {/* New note input */}
      <div className="flex gap-2">
        <Input
          placeholder="Agregar nota rápida..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addNote()}
        />
        <Button size="sm" variant="default" className="lime-glow" onClick={addNote} disabled={!newNote.trim() || adding}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Notes list */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin notas registradas</p>
        ) : (
          notes.map(note => (
            <div
              key={note.id}
              className={`p-3 rounded-lg border text-sm transition-all ${
                note.pinned
                  ? 'bg-gold/5 border-gold/20'
                  : 'bg-accent/5 border-border/30 hover:border-border/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-foreground flex-1 whitespace-pre-wrap">{note.content}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => togglePin(note.id, note.pinned)}
                    className={`p-1 rounded transition-colors ${
                      note.pinned
                        ? 'text-gold-light hover:text-gold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {note.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="p-1 rounded text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{note.author?.full_name || 'Anónimo'}</span>
                <span>•</span>
                <span>{new Date(note.created_at).toLocaleDateString('es-MX', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
