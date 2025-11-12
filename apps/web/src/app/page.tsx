'use client'

import { useEffect, useState } from 'react'
import { getHealth } from '@/lib/api-client'
import type { HealthCheckResponse } from '@perrache/types'

export default function Home() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">Perrache</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Automated API catalog with semantic search
        </p>
        <div className="flex gap-4 justify-center">
          {loading ? (
            <p>Checking API status...</p>
          ) : health ? (
            <p>
              API Status:{' '}
              <span className={health.status === 'healthy' ? 'text-green-500' : 'text-red-500'}>
                {health.status}
              </span>
            </p>
          ) : (
            <p className="text-red-500">Could not connect to API</p>
          )}
        </div>
      </div>
    </main>
  )
}
