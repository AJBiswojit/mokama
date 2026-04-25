import { Link } from 'react-router-dom'
import { CheckCircle, Clock, Mail, Shield, ArrowLeft } from 'lucide-react'

/**
 * Shown immediately after successful registration (worker or employer).
 * Routes:
 *   /worker/pending
 *   /employer/pending
 *
 * Pass `role` prop: 'worker' | 'employer'
 */
export default function PendingVerification({ role = 'worker' }) {
  const isWorker = role === 'worker'

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4 py-10">

      {/* Card */}
      <div className="w-full max-w-md bg-[#141414] border border-[#2a2a2a] rounded-3xl p-8 text-center animate-slide-up">

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
              <CheckCircle size={36} className="text-emerald-400" />
            </div>
            <div className="absolute -top-1.5 -right-1.5 w-7 h-7 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center">
              <Clock size={13} className="text-amber-400" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-extrabold text-white mb-2">
          Registration Successful! 🎉
        </h1>
        <p className="text-[#6b6b6b] text-sm mb-8 leading-relaxed">
          Your {isWorker ? 'worker' : 'employer'} account has been created. Please wait while our team verifies your details.
        </p>

        {/* Status steps */}
        <div className="space-y-3 mb-8 text-left">
          {[
            {
              icon: CheckCircle,
              color: 'emerald',
              title: 'Registration Complete',
              desc: 'Your details have been submitted successfully.',
              done: true,
            },
            {
              icon: Shield,
              color: 'amber',
              title: 'Admin Verification',
              desc: 'Our team is reviewing your account. This usually takes 24–48 hours.',
              done: false,
            },
            {
              icon: Mail,
              color: '#6b6b6b',
              title: 'Email Notification',
              desc: `You'll receive an email once your account is approved or if any action is needed.`,
              done: false,
            },
          ].map((step, i) => {
            const Icon = step.icon
            return (
              <div key={i} className={`flex gap-4 p-4 rounded-2xl border transition-all
                ${step.done
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : i === 1
                    ? 'bg-amber-500/5 border-amber-500/20'
                    : 'bg-[#1a1a1a] border-[#2a2a2a]'
                }`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0
                  ${step.done
                    ? 'bg-emerald-500/10'
                    : i === 1
                      ? 'bg-amber-500/10'
                      : 'bg-[#2a2a2a]'
                  }`}>
                  <Icon size={15} className={
                    step.done ? 'text-emerald-400' :
                    i === 1   ? 'text-amber-400'   :
                                'text-[#6b6b6b]'
                  } />
                </div>
                <div>
                  <div className={`text-sm font-semibold
                    ${step.done ? 'text-emerald-400' :
                      i === 1   ? 'text-amber-400'   :
                                  'text-[#6b6b6b]'}`}>
                    {step.title}
                    {i === 1 && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-amber-500">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                        In progress
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6b6b6b] mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* What you can't do yet */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 mb-6 text-left">
          <p className="text-xs text-[#6b6b6b] font-semibold uppercase tracking-wide mb-2">
            Until approved, you cannot:
          </p>
          <ul className="space-y-1 text-xs text-[#6b6b6b]">
            {isWorker ? (
              <>
                <li className="flex items-center gap-2"><span className="text-[#ff2400]">✕</span> Toggle availability status</li>
                <li className="flex items-center gap-2"><span className="text-[#ff2400]">✕</span> Accept job requests</li>
                <li className="flex items-center gap-2"><span className="text-[#ff2400]">✕</span> View or respond to job offers</li>
              </>
            ) : (
              <>
                <li className="flex items-center gap-2"><span className="text-[#ff2400]">✕</span> Post jobs</li>
                <li className="flex items-center gap-2"><span className="text-[#ff2400]">✕</span> Search or hire workers</li>
                <li className="flex items-center gap-2"><span className="text-[#ff2400]">✕</span> Send job requests</li>
              </>
            )}
            <li className="flex items-center gap-2"><span className="text-[#ff2400]">✕</span> Edit profile details</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            to={`/${role}/dashboard`}
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#ff2400] hover:bg-[#ff3a1a] text-white font-bold rounded-2xl text-sm transition-all active:scale-95">
            Go to Dashboard
          </Link>
          <Link
            to="/"
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#1a1a1a] border border-[#2a2a2a] text-[#a3a3a3] hover:text-white font-semibold rounded-2xl text-sm transition-all">
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>
      </div>

      {/* Branding */}
      <p className="text-xs text-[#3a3a3a] mt-8">
        MoKama · <span className="text-[#ff2400]">Kaam Ko Mukam Tak</span>
      </p>
    </div>
  )
}
