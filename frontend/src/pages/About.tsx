import { useState, useEffect } from 'react'
import api from '@/services/api'

interface Profile {
  name: string
  bio: string | null
  avatar_url: string | null
  interests: string | null
  experience: string | null
  github_url: string | null
  twitter_url: string | null
}

export function About() {
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    api.get('/profile').then((res) => setProfile(res.data)).catch(() => {})
  }, [])

  if (!profile) return <div className="text-center text-[#c5c4bf] py-12">加载中...</div>

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl text-[#3a3a38] mb-8 font-light tracking-wide">关于</h1>

      <div className="space-y-8">
        {profile.bio && (
          <section>
            <h2 className="text-xs text-[#c5c4bf] tracking-[0.2em] mb-2">简介</h2>
            <p className="text-sm text-[#5a5a55] leading-loose">{profile.bio}</p>
          </section>
        )}

        {profile.interests && (
          <section>
            <h2 className="text-xs text-[#c5c4bf] tracking-[0.2em] mb-2">兴趣</h2>
            <div className="flex flex-wrap gap-2">
              {profile.interests.split(',').map((i) => (
                <span key={i.trim()} className="px-3 py-1 text-xs bg-[#f0eeea] text-[#8b7355]">
                  {i.trim()}
                </span>
              ))}
            </div>
          </section>
        )}

        {profile.experience && (
          <section>
            <h2 className="text-xs text-[#c5c4bf] tracking-[0.2em] mb-2">经历</h2>
            <div className="text-sm text-[#5a5a55] leading-loose whitespace-pre-wrap">{profile.experience}</div>
          </section>
        )}

        {(profile.github_url || profile.twitter_url) && (
          <section className="flex gap-4 pt-4 border-t border-[#e8e6e0]/50">
            {profile.github_url && (
              <a href={profile.github_url} target="_blank" rel="noopener" className="text-xs text-[#9a9996] hover:text-[#8b7355] transition-colors">GitHub</a>
            )}
            {profile.twitter_url && (
              <a href={profile.twitter_url} target="_blank" rel="noopener" className="text-xs text-[#9a9996] hover:text-[#8b7355] transition-colors">Twitter</a>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
