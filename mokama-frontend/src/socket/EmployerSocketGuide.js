import { useState, useEffect, useCallback } from 'react'
import useSocket from '../../socket/useSocket'
import { api } from '../../api/AuthContext'
import toast from 'react-hot-toast'

export function ActiveJobsWithSocket() {
  const [jobs,    setJobs]    = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/jobs/employer')
      setJobs(res.data.jobs || [])
    } catch { toast.error('Failed to load jobs') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Socket listeners ──
  useSocket({
    requestAccepted: (data) => {
      toast.success(`✅ ${data.workerName} accepted your request!`)
      load()
    },
    requestRejected: (data) => {
      toast.error(`${data.workerName} rejected your request`)
      load()
    },
    workCompleted: (data) => {
      toast.success(`🏁 Work completed by ${data.workerName}. Please confirm payment.`)
      setJobs(prev => prev.map(j =>
        j._id?.toString() === data.jobId?.toString()
          ? { ...j, status: 'PAYMENT_PENDING' }
          : j
      ))
    },
    paymentReceived: (data) => {
      toast.success(`${data.workerName} confirmed payment received`)
      if (data.isCompleted) load()
    },
  })

  if (loading) return <div>Loading...</div>

  return (
    <div>
      {jobs.map(job => (
        <div key={job._id}>
          <h3>{job.title}</h3>
          <p>Status: {job.status}</p>
        </div>
      ))}
    </div>
  )
}