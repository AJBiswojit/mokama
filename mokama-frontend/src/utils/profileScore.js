// Returns 0–100 completeness score and a list of missing fields
export const getWorkerProfileScore = (worker) => {
  const checks = [
    { done: !!worker?.name,             label: 'Full name' },
    { done: !!worker?.fatherName,       label: "Father's name" },
    { done: !!worker?.gender,           label: 'Gender' },
    { done: !!worker?.dob,              label: 'Date of birth' },
    { done: !!worker?.mobile,           label: 'Mobile number' },
    { done: !!worker?.email,            label: 'Email address' },
    { done: !!worker?.address,          label: 'Address' },
    { done: !!worker?.pincode,          label: 'Pincode' },
    { done: !!worker?.workerTypeName,   label: 'Work type / trade' },
    { done: (worker?.experience || 0) > 0, label: 'Years of experience' },
    { done: !!worker?.labourCardNumber, label: 'Labour card number' },
    { done: worker?.isEmailVerified,    label: 'Email verified' },
  ]

  const done    = checks.filter(c => c.done).length
  const missing = checks.filter(c => !c.done).map(c => c.label)
  const score   = Math.round((done / checks.length) * 100)

  return { score, done, total: checks.length, missing }
}

export const getEmployerProfileScore = (employer) => {
  const checks = [
    { done: !!employer?.name,                 label: 'Full name' },
    { done: !!employer?.mobile,               label: 'Mobile number' },
    { done: !!employer?.email,                label: 'Email address' },
    { done: !!employer?.address,              label: 'Address' },
    { done: !!employer?.pincode,              label: 'Pincode' },
    { done: !!employer?.employerCategoryName, label: 'Business category' },
    { done: employer?.isEmailVerified,        label: 'Email verified' },
  ]

  const done    = checks.filter(c => c.done).length
  const missing = checks.filter(c => !c.done).map(c => c.label)
  const score   = Math.round((done / checks.length) * 100)

  return { score, done, total: checks.length, missing }
}

// Returns colour based on score
export const getScoreColor = (score) => {
  if (score === 100) return { bg: 'bg-emerald-500',    text: 'text-emerald-400',    border: 'border-emerald-500/30' }
  if (score >= 70)  return { bg: 'bg-[#f97316]',       text: 'text-[#f97316]',      border: 'border-[#f97316]/30'  }
  if (score >= 40)  return { bg: 'bg-amber-500',        text: 'text-amber-400',      border: 'border-amber-500/30'  }
  return                   { bg: 'bg-red-500',          text: 'text-red-400',        border: 'border-red-500/30'    }
}
