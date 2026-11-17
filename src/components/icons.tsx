/** Small inline SVG icons (no icon library). Decorative: hidden from screen readers. */
import type { ReactNode } from 'react'

function Icon({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export const SearchIcon = () => <Icon><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon>
export const PinIcon = () => <Icon><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></Icon>
export const BellIcon = () => <Icon size={20}><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" /><path d="M10 20a2 2 0 0 0 4 0" /></Icon>
export const ChevronDownIcon = ({ size = 18 }: { size?: number }) => <Icon size={size}><path d="m6 9 6 6 6-6" /></Icon>
export const ChevronRightIcon = () => <Icon><path d="m9 6 6 6-6 6" /></Icon>
export const CheckIcon = ({ size = 14 }: { size?: number }) => <Icon size={size}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>
export const CloseIcon = () => <Icon size={12}><path d="M6 6l12 12M18 6 6 18" /></Icon>
export const TargetIcon = () => <Icon><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.5" /></Icon>
export const ClockIcon = () => <Icon><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Icon>
export const SparkIcon = () => <Icon><path d="M12 3.5 13.8 9l5.7 1.5-5.7 1.6L12 17.5l-1.8-5.4L4.5 10.5 10.2 9Z" /></Icon>

export function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M6.5 3.5h11v17L12 16.5l-5.5 4Z" />
    </svg>
  )
}
