export const GUEST_COLORS = [
  // Vibrant Reds & Pinks
  '#ef4444', // Tailwind red-500
  '#f43f5e', // Tailwind rose-500
  '#ec4899', // Tailwind pink-500
  '#d946ef', // Tailwind fuchsia-500
  
  // Vibrant Purples & Indigos
  '#a855f7', // Tailwind purple-500
  '#8b5cf6', // Tailwind violet-500
  '#6366f1', // Tailwind indigo-500
  
  // Vibrant Blues & Cyans
  '#3b82f6', // Tailwind blue-500
  '#0ea5e9', // Tailwind sky-500
  '#06b6d4', // Tailwind cyan-500
  
  // Vibrant Teals & Greens
  '#14b8a6', // Tailwind teal-500
  '#10b981', // Tailwind emerald-500
  '#22c55e', // Tailwind green-500
  '#84cc16', // Tailwind lime-500
  
  // Vibrant Yellows & Oranges
  '#eab308', // Tailwind yellow-500
  '#f59e0b', // Tailwind amber-500
  '#f97316', // Tailwind orange-500
  
  // Neons / Extra Brights
  '#00ffcc', // Neon Cyan
  '#ff007f', // Neon Pink
  '#ccff00', // Neon Lime
] as const

export type GuestColor = (typeof GUEST_COLORS)[number]
