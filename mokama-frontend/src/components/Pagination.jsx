export default function Pagination({ page, totalPages, total, limit, onPage }) {
  if (totalPages <= 1) return null

  const from = (page - 1) * limit + 1
  const to   = Math.min(page * limit, total)

  return (
    <div className="flex items-center justify-between pt-3 border-t border-[#1e1e1e]">
      <span className="text-xs text-[#4a4a4a]">
        Showing <span className="text-[#a3a3a3]">{from}–{to}</span> of <span className="text-[#a3a3a3]">{total}</span>
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(1)}
          disabled={page === 1}
          className="btn-ghost text-xs px-2 py-1 disabled:opacity-30">«</button>
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="btn-ghost text-xs px-2.5 py-1 disabled:opacity-30">‹ Prev</button>

        {/* Page number pills */}
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p
          if (totalPages <= 5)         p = i + 1
          else if (page <= 3)          p = i + 1
          else if (page >= totalPages - 2) p = totalPages - 4 + i
          else                         p = page - 2 + i

          return (
            <button key={p} onClick={() => onPage(p)}
              className={`w-7 h-7 rounded-lg text-xs font-medium transition-all
                ${p === page
                  ? 'bg-[#f97316] text-white'
                  : 'btn-ghost text-[#6b6b6b] hover:text-white'}`}>
              {p}
            </button>
          )
        })}

        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="btn-ghost text-xs px-2.5 py-1 disabled:opacity-30">Next ›</button>
        <button
          onClick={() => onPage(totalPages)}
          disabled={page === totalPages}
          className="btn-ghost text-xs px-2 py-1 disabled:opacity-30">»</button>
      </div>
    </div>
  )
}
