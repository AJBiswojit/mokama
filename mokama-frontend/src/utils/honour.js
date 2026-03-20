export const getHonourLabel = (score) => {
  if (score >= 85) return { label: 'Excellent', color: '#22c55e' }
  if (score >= 70) return { label: 'Good', color: '#84cc16' }
  if (score >= 50) return { label: 'Average', color: '#f59e0b' }
  if (score >= 30) return { label: 'Below Average', color: '#f97316' }
  return { label: 'Poor', color: '#ef4444' }
}

export const formatDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const timeAgo = (d) => {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
