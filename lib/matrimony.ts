// FILE: lib/matrimony.ts
// Currently Muslim Matrimony only. Extend these lists when adding another community.

export const MASLAKS = [
  'Sunni (Barelvi)',
  'Sunni (Deobandi)',
  'Sunni (Hanafi, other)',
  'Ahle Hadith',
  'Shia (Ithna Ashari)',
  'Bohra',
  'Ismaili',
  'Other or just Muslim',
]

export const SUB_COMMUNITIES = [
  'Syed', 'Sheikh', 'Pathan', 'Mughal', 'Ansari', 'Qureshi', 'Siddiqui', 'Khan',
  'Malik', 'Memon', 'Mansoori', 'Saifi', 'Raeen', 'Other', 'Prefer not to say',
]

export const EDUCATION = [
  'Below 10th', '10th or 12th', 'Diploma', 'Graduate', 'Post graduate', 'Doctorate',
  'Alim or Hafiz', 'Professional (CA, MBBS, LLB and similar)',
]

export const INCOME = [
  'Below ₹2 lakh a year', '₹2 to 5 lakh', '₹5 to 10 lakh', '₹10 to 20 lakh', 'Above ₹20 lakh', 'Prefer not to say',
]

export const MARITAL = [
  { id: 'never_married', label: 'Never married' },
  { id: 'divorced', label: 'Divorced' },
  { id: 'widowed', label: 'Widowed' },
]

export const CREATED_BY = [
  { id: 'self', label: 'Myself' },
  { id: 'parent', label: 'Parent or guardian, for my son, daughter or sibling' },
]

export const DOC_TYPES = [
  { id: 'aadhaar', label: 'Aadhaar' },
  { id: 'pan', label: 'PAN card' },
  { id: 'passport', label: 'Passport' },
  { id: 'voter', label: 'Voter ID' },
  { id: 'driving', label: 'Driving licence' },
]

export const HEIGHTS = Array.from({ length: 91 }, (_, i) => 140 + i)

// All three plans include 20 unlocks per month. During beta everyone starts free on "normal".
export const TIERS = [
  {
    id: 'normal', name: 'Normal', price: '₹299 a month',
    perks: ['20 profile unlocks every month', 'Use them all in one day or spread across the month', 'General brand ads'],
  },
  {
    id: 'gold', name: 'Gold', price: '₹999 a month',
    perks: ['20 profile unlocks every month', 'Mid-premium brand ads'],
  },
  {
    id: 'premium', name: 'Premium', price: '₹4,999 a month',
    perks: ['20 profile unlocks every month', 'Elite luxury brand ads', 'Profile Highlight: your profile is shown first with a Featured badge'],
  },
]

// Which brands' ads each tier of user sees
export const tierToAudience = (tier: string) =>
  tier === 'premium' ? 'luxury' : tier === 'gold' ? 'mid' : 'general'

export const MATRI_SLOTS = ['matri_1', 'matri_2', 'matri_3', 'matri_4']

export const STATUS_INFO: Record<string, { label: string; cls: string; text: string }> = {
  draft: { label: 'Draft', cls: 'bg-[#f3f7f6] text-[#5d7776]', text: 'Complete your profile and submit it for verification.' },
  submitted: { label: 'Under verification', cls: 'bg-[#fff4d6] text-[#7a5600]', text: 'Our team is checking your details and ID proof. This usually takes a day or two.' },
  verified: { label: 'Verified', cls: 'bg-[#e3f6e8] text-[#1c7a37]', text: 'Your profile is verified.' },
  rejected: { label: 'Needs changes', cls: 'bg-[#fdecea] text-[#c0392b]', text: 'Please fix the issue and submit again.' },
  suspended: { label: 'Suspended', cls: 'bg-[#fdecea] text-[#c0392b]', text: 'This profile is suspended. Please contact support.' },
}

export const cmToFt = (cm: number) => {
  const inches = Math.round(cm / 2.54)
  return `${Math.floor(inches / 12)} ft ${inches % 12} in`
}

export function ageFromDob(dob: string): number {
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return 0
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age
}

// A tiny (24 px) blurred version in which the face cannot be recognised
export async function makeBlurThumb(blob: Blob): Promise<string> {
  const bmp = await createImageBitmap(blob)
  const w = 24
  const h = Math.max(1, Math.round((bmp.height / bmp.width) * w))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  return canvas.toDataURL('image/jpeg', 0.5)
}

export type BrowseRow = {
  profile_id: string
  owner_id: string
  first_name: string
  age_years: number
  city_name: string | null
  education: string | null
  blur_thumb: string | null
  created_by: string
  unlocked: boolean
  interest_status: string | null
  featured: boolean
}

export type ViewData = {
  profile_id: string
  owner_id: string
  is_owner: boolean
  first_name: string
  age_years: number
  city_name: string | null
  education: string | null
  blur_thumb: string | null
  created_by: string
  featured: boolean
  unlocked: boolean
  accepted: boolean
  interest: { id: string; status: string; sent_by_me: boolean } | null
  full_name: string | null
  gender: string | null
  height_cm: number | null
  maslak: string | null
  sub_community: string | null
  marital_status: string | null
  occupation: string | null
  income_range: string | null
  about: string | null
  family_details: string | null
  partner_prefs: string | null
  photo_paths: string[] | null
}

export type InterestRow = {
  interest_id: string
  direction: 'sent' | 'received'
  status: string
  other_user: string
  profile_id: string
  first_name: string
  age_years: number
  city_name: string | null
  blur_thumb: string | null
  message: string | null
  created_at: string
  conversation_id: string | null
}

export type Quota = {
  monthly_left: number
  monthly_total: number
  credits: number
  tier: string
}
