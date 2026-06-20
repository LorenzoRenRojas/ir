export function LogoRune({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  const h = size
  const w = Math.round(size * 0.72)
  return (
    <svg
      viewBox="0 0 18 26"
      width={w}
      height={h}
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, overflow: 'visible' }}
    >
      <line x1="5" y1="1" x2="5" y2="25" />
      <line x1="5" y1="3" x2="15" y2="10" />
      <line x1="15" y1="10" x2="5" y2="16" />
      <line x1="5" y1="16" x2="13" y2="24" />
    </svg>
  )
}
