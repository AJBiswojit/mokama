import { getWorkerProfileScore, getEmployerProfileScore, getScoreColor } from '../utils/profileScore'
import { ChevronDown, ChevronUp, CheckCircle, Circle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function ProfileCompleteness({ user, role }) {
  const [expanded, setExpanded] = useState(false)

  if (!user) return null

  const { score, done, total, missing } =
    role === 'worker'
      ? getWorkerProfileScore(user)
      : getEmployerProfileScore(user)

  if (score === 100) return null  // hide when complete — no noise

  const { bg, text, border } = getScoreColor(score)
  const profilePath = role === 'worker'
    ? '/worker/dashboard/profile'
    : '/employer/dashboard/profile'

  return (
    <div className={`rounded-2xl border ${border} bg-[#141414] overflow-hidden`}>
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 p-4 hover:bg-[#1a1a1a] transition-colors">

        {/* Circular progress */}
        <div className="relative w-12 h-12 shrink-0">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="#2a2a2a" strokeWidth="4" />
            <circle cx="24" cy="24" r="20" fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 20}`}
              strokeDashoffset={`${2 * Math.PI * 20 * (1 - score / 100)}`}
              className={text}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${text}`}>
            {score}%
          </span>
        </div>

        <div className="flex-1 text-left">
          <div className="font-semibold text-white text-sm">
            Profile {score}% complete
          </div>
          <div className="text-xs text-[#6b6b6b] mt-0.5">
            {done}/{total} fields filled — {missing.length} missing
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
            <div
              className={`h-full ${bg} rounded-full transition-all duration-500`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        <div className="text-[#4a4a4a] shrink-0">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded: missing fields */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#2a2a2a] pt-3">
          <p className="text-xs text-[#6b6b6b] mb-2">Missing fields:</p>
          <div className="space-y-1.5 mb-4">
            {missing.map(field => (
              <div key={field} className="flex items-center gap-2 text-xs text-[#a3a3a3]">
                <Circle size={12} className="text-[#3a3a3a] shrink-0" />
                {field}
              </div>
            ))}
          </div>
          <Link
            to={profilePath}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ff2400] text-white
              text-xs font-semibold rounded-xl hover:bg-[#ff3a1a] transition-colors">
            Complete Profile →
          </Link>
        </div>
      )}
    </div>
  )
}
