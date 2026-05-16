'use client'

import { useState, useEffect } from 'react'

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function PoliticianPhoto({
  src,
  name,
  className,
  initialsFontSize,
}: {
  src: string | null | undefined
  name: string
  className?: string
  initialsFontSize?: string
}) {
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    setErrored(false)
  }, [src])

  const showFallback = !src || errored

  if (showFallback) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 ${className ?? ''}`}>
        <span
          className="font-black text-gray-400"
          style={{
            fontFamily: 'var(--font-barlow-condensed)',
            fontSize: initialsFontSize ?? '2.25rem',
          }}
        >
          {initials(name)}
        </span>
      </div>
    )
  }

  return (
    <img
      src={src!}
      alt={name}
      onError={() => setErrored(true)}
      className={`object-cover object-top ${className ?? ''}`}
    />
  )
}
