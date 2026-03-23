import type { PoliticianWithScores, Grade } from '@politi-score/types'
import { GRADE_COLORS } from '@politi-score/types'

function GradeBadge({ grade, size = 'sm' }: { grade: Grade; size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 44 : 36
  const fontSize = size === 'lg' ? 26 : 20
  return (
    <div
      className="flex items-center justify-center font-black rounded-lg"
      style={{
        width: dim,
        height: dim,
        background: GRADE_COLORS[grade],
        color: grade === 'C' ? '#5a4800' : 'white',
        fontSize,
        fontFamily: 'var(--font-barlow-condensed)',
      }}
    >
      {grade}
    </div>
  )
}

export default function PoliticianCard({
  politician: p,
  onClick,
}: {
  politician: PoliticianWithScores
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden border border-black/10 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl"
    >
      {/* Photo */}
      <div className="relative h-48 bg-gray-100">
        {p.photo_url ? (
          <img
            src={p.photo_url}
            alt={p.full_name}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <span className="text-4xl font-black text-gray-400" style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
              {p.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
          </div>
        )}
        {/* Party badge */}
        <div className="absolute top-2 left-2 bg-black/80 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded">
          {p.party}
        </div>
        {/* General grade */}
        <div className="absolute bottom-2 right-2">
          <GradeBadge grade={p.grade_general} size="lg" />
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="font-black text-lg leading-tight mb-1" style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
          {p.full_name}
        </div>
        <div className="text-xs text-gray-400 mb-3 leading-tight">{p.role}</div>

        {/* 5 scores */}
        <div className="grid grid-cols-5 gap-1">
          {[
            { grade: p.grade_corruption, label: 'Corr.' },
            { grade: p.grade_lies, label: 'Mens.' },
            { grade: p.grade_conflicts, label: 'Conf.' },
            { grade: p.grade_patrimoine, label: 'Patr.' },
            { grade: p.grade_financement, label: 'Fin.' },
          ].map(({ grade, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span className="text-[9px] font-bold uppercase tracking-wide text-gray-400">{label}</span>
              <GradeBadge grade={grade as Grade} size="sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
