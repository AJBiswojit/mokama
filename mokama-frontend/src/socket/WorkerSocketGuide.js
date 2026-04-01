import { useState, useEffect, useCallback } from 'react'
import useSocket from '../../socket/useSocket'
import { api } from '../../api/AuthContext'
import toast from 'react-hot-toast'

export function ActiveWorkWithSocket() {
  const [job,     setJob]     = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/jobs/worker?status=WORKING,ACCEPTED,PAYMENT_PENDING')
      setJob(res.data.jobs?.[0] || null)
    } catch { toast.error('Failed to load active job') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Socket listeners ──
  useSocket({
    workStarted: (data) => {
      toast.success(`✅ Work started: ${data.jobTitle}`)
      setJob(prev => prev?._id?.toString() === data.jobId?.toString()
        ? { ...prev, status: 'WORKING', workStartedAt: data.startedAt }
        : prev
      )
    },
    paymentConfirmed: (data) => {
      toast.success(`💰 Payment sent by employer!`)
      load()
    },
  })

  if (loading) return <div>Loading...</div>
  if (!job)    return <div>No active job</div>

  return (
    <div>
      <h2>{job.title}</h2>
      <p>Status: {job.status}</p>
    </div>
  )
}