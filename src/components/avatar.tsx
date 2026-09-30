import { cn } from '@/lib/utils'

// Warm pastels with dark text (all WCAG AA), so avatars read in both themes
const COLORS = [
  'bg-[#F2A900] text-[#2B1D00]', // marigold
  'bg-[#FF8A65] text-[#3A1206]', // coral
  'bg-[#B7A4FF] text-[#1E1247]', // violet
  'bg-[#7FE0BC] text-[#06291D]', // mint
  'bg-[#8CC8FF] text-[#0A2540]', // sky
  'bg-[#FF9EC0] text-[#3D0A1E]', // rose
]

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

// The same name always gets the same colour
function colorFor(name: string) {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return COLORS[hash % COLORS.length]
}

// A round avatar with the first letter of a person's name
export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string
  size?: keyof typeof SIZES
  className?: string
}) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold select-none',
        SIZES[size],
        colorFor(name.trim().toLowerCase()),
        className,
      )}
    >
      {initial}
    </span>
  )
}
