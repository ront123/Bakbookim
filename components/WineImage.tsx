'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Wine, ImageOff } from 'lucide-react'

interface WineImageProps {
  wineName: string
  size?: number
}

// Cache in memory to avoid re-fetching during session
const imageCache: Record<string, string | null> = {}

export default function WineImage({ wineName, size = 32 }: WineImageProps) {
  const [url, setUrl]       = useState<string | null | undefined>(imageCache[wineName])
  const [loading, setLoading] = useState(imageCache[wineName] === undefined)
  const [error, setError]   = useState(false)
  const [showModal, setShowModal] = useState(false)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (imageCache[wineName] !== undefined || fetchedRef.current) {
      setUrl(imageCache[wineName])
      setLoading(false)
      return
    }
    fetchedRef.current = true

    fetch(`/api/wines/image?name=${encodeURIComponent(wineName)}`)
      .then(r => r.json())
      .then(data => {
        imageCache[wineName] = data.url || null
        setUrl(data.url || null)
        setLoading(false)
      })
      .catch(() => { setLoading(false); imageCache[wineName] = null })
  }, [wineName])

  const placeholder = (
    <div style={{
      width: size, height: size, borderRadius: 6, flexShrink: 0,
      background: 'rgba(124,58,237,0.12)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Wine size={size * 0.5} style={{ color: 'var(--color-accent)', opacity: 0.6 }} />
    </div>
  )

  if (loading) return (
    <div className="skeleton" style={{ width: size, height: size, borderRadius: 6, flexShrink: 0 }} />
  )
  if (!url || error) return placeholder

  return (
    <>
      <img
        src={url}
        alt={wineName}
        title={wineName}
        onClick={() => setShowModal(true)}
        onError={() => setError(true)}
        style={{
          width: size, height: size, objectFit: 'cover', borderRadius: 6, flexShrink: 0,
          cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
          border: '1px solid var(--color-border)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.12)'
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.5)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />

      {/* Modal */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem',
          }}
          className="animate-fade-in"
        >
          <div className="glass" onClick={e => e.stopPropagation()} style={{ padding: '1.5rem', maxWidth: 360, width: '100%', textAlign: 'center' }}>
            <img src={url} alt={wineName} onError={() => setError(true)}
              style={{ width: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 10, marginBottom: '1rem' }}
            />
            <p style={{ fontWeight: 600, fontSize: '1rem' }}>{wineName}</p>
          </div>
        </div>
      )}
    </>
  )
}
