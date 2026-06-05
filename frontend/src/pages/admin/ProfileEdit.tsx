import { useState, useEffect } from 'react'
import api from '@/services/api'
import { Input } from '@/components/ui/Input'
import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'

export function ProfileEdit() {
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState('')
  const [experience, setExperience] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [twitterUrl, setTwitterUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api.get('/admin/profile').then((res) => {
      const p = res.data
      setName(p.name || '')
      setBio(p.bio || '')
      setInterests(p.interests || '')
      setExperience(p.experience || '')
      setGithubUrl(p.github_url || '')
      setTwitterUrl(p.twitter_url || '')
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await api.put('/admin/profile', { name, bio, interests, experience, github_url: githubUrl, twitter_url: twitterUrl })
    setSaving(false)
    setMsg('Saved!')
    setTimeout(() => setMsg(''), 2000)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Profile</h1>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea placeholder="Bio（支持 Markdown）" value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-[100px]" />
        {bio && (
          <div className="p-3 rounded border border-[var(--color-border)]/50 bg-[var(--color-surface)]/30 text-sm prose max-w-none prose-a:text-[var(--color-primary)]">
            <MarkdownRenderer>{bio}</MarkdownRenderer>
          </div>
        )}
        <Input placeholder="Interests (comma-separated)" value={interests} onChange={(e) => setInterests(e.target.value)} />
        <Textarea placeholder="Experience（支持 Markdown）" value={experience} onChange={(e) => setExperience(e.target.value)} className="min-h-[100px]" />
        {experience && (
          <div className="p-3 rounded border border-[var(--color-border)]/50 bg-[var(--color-surface)]/30 text-sm prose max-w-none prose-a:text-[var(--color-primary)]">
            <MarkdownRenderer>{experience}</MarkdownRenderer>
          </div>
        )}
        <Input placeholder="GitHub URL" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
        <Input placeholder="Twitter URL" value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} />
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          {msg && <span className="text-sm text-green-600">{msg}</span>}
        </div>
      </form>
    </div>
  )
}
