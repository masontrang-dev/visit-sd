'use client'

type Props = {
  cuisines: string[]
  active: string
  onChange: (f: string) => void
  onAdd?: () => void
  showAdmin?: boolean
}

export default function FilterBar({ cuisines, active, onChange, onAdd, showAdmin }: Props) {
  const btnBase: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 13, fontWeight: 500,
    padding: '6px 14px', borderRadius: 20,
    border: '1.5px solid var(--brd)',
    background: 'transparent', cursor: 'pointer',
    color: 'var(--txt2)', transition: 'all 0.12s',
    whiteSpace: 'nowrap',
  }
  const btnActive: React.CSSProperties = {
    ...btnBase, background: 'var(--txt)', color: 'var(--bg)', borderColor: 'var(--txt)'
  }

  return (
    <div style={{
      display: 'flex', gap: 6, padding: '0.875rem 1.5rem',
      borderBottom: '0.5px solid var(--brd)',
      flexWrap: 'wrap', alignItems: 'center', overflowX: 'auto'
    }}>
      <button style={active === 'all' ? btnActive : btnBase} onClick={() => onChange('all')}>All</button>
      {cuisines.map(c => (
        <button key={c} style={active === c ? btnActive : btnBase} onClick={() => onChange(c)}>{c}</button>
      ))}
      {onAdd && (
        <button
          onClick={onAdd}
          style={{
            fontFamily: 'var(--font-body)', marginLeft: 'auto',
            fontSize: 13, fontWeight: 500, padding: '6px 18px',
            borderRadius: 20, border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer',
          }}
        >
          + Add restaurant
        </button>
      )}
      {showAdmin && (
        <a
          href="/admin"
          style={{
            marginLeft: 'auto', fontFamily: 'var(--font-body)',
            fontSize: 12, color: 'var(--txt2)', textDecoration: 'none',
            padding: '6px 0', opacity: 0.5
          }}
        >
          Admin ↗
        </a>
      )}
    </div>
  )
}
