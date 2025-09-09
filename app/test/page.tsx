"use client"

import { useState, useEffect } from "react"

export default function TestPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const testAPI = async () => {
      try {
        console.log('Testing API...')
        const response = await fetch('/api/fonts?families=true')
        console.log('Response:', response)
        
        if (response.ok) {
          const jsonData = await response.json()
          console.log('Data:', jsonData)
          setData(jsonData)
        } else {
          setError(`HTTP Error: ${response.status}`)
        }
      } catch (err) {
        console.error('Error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    
    testAPI()
  }, [])

  if (loading) return <div>Loading API test...</div>
  if (error) return <div>Error: {error}</div>
  if (!data) return <div>No data</div>

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>API Test Results</h1>
      <p><strong>Success:</strong> {data.success ? 'Yes' : 'No'}</p>
      <p><strong>Families Count:</strong> {data.families?.length || 0}</p>
      <p><strong>Total Fonts:</strong> {data.families?.reduce((acc: number, fam: any) => acc + (fam.fonts?.length || 0), 0) || 0}</p>
      
      <h2>Sample Family:</h2>
      {data.families && data.families.length > 0 && (
        <div>
          <p><strong>Name:</strong> {data.families[0].name}</p>
          <p><strong>Fonts in family:</strong> {data.families[0].fonts?.length || 0}</p>
          <p><strong>Collection:</strong> {data.families[0].collection}</p>
        </div>
      )}
    </div>
  )
}