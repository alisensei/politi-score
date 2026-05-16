import type { PoliticianWithScores, Grade } from '@politi-score/types'
import { GRADE_COLORS, AXIS_SHORT } from '@politi-score/types'
import PoliticianPhoto from './PoliticianPhoto'

function GradeBadge({ grade, size = 'sm' }: { grade: Grade; size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 44 : 30
  const fontSize = size === 'lg' ? 26 : 16
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
      <div className="relative h-48 bg-gray-100">
        <PoliticianPhoto
          src={p.photo_url}
          name={p.full_name}
          className="w-full h-full"
          initialsFontSize="2.25rem"
        />
        <div className="absolute top-2 left-2 bg-black/80 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded">
          {p.party}
        </div>
        <div className="absolute bottom-2 right-2">
          <GradeBadge grade={p.grade_general} size="lg" />
        </div>
      </div>

      <div className="p-3">
        <div className="font-black text-lg leading-tight mb-1" style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
          {p.full_name}
        </div>
        <div className="text-xs text-gray-400 mb-3 leading-tight">{p.role}</div>

        <div className="grid grid-cols-6 gap-1">
          {[
            { grade: p.grade_probity,         label: AXIS_SHORT.probity },
            { grade: p.grade_conflicts,       label: AXIS_SHORT.conflicts },
            { grade: p.grade_opacity,         label: AXIS_SHORT.opacity },
            { grade: p.grade_sincerity,       label: AXIS_SHORT.sincerity },
            { grade: p.grade_harm,            label: AXIS_SHORT.harm },
            { grade: p.grade_speech_offenses, label: AXIS_SHORT.speech_offenses },
          ].map(({ grade, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span className="text-[8px] font-bold uppercase tracking-wide text-gray-400">{label}</span>
              <GradeBadge grade={grade as Grade} size="sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
