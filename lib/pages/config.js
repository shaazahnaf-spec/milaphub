// Shared config + helpers for the Pages module.

export const PAGE_CATEGORIES = [
  { id: "business", label: "Business / Shop", hint: "Dukaan, restaurant, showroom, clinic" },
  { id: "creator", label: "Creator / Influencer", hint: "Videos, art, music, content" },
  { id: "service", label: "Service", hint: "Tuition, repair, salon, photographer" },
  { id: "community", label: "Community", hint: "Committee, NGO, club, group" },
];

export const CATEGORY_LABEL = Object.fromEntries(PAGE_CATEGORIES.map((c) => [c.id, c.label]));

export const SUBCATEGORIES = {
  business: ["Grocery / Kirana", "Restaurant / Food", "Clothing", "Electronics", "Mobile Shop", "Furniture", "Real Estate", "Other"],
  creator: ["Video Creator", "Photographer", "Artist / Designer", "Musician", "Educator", "Comedy", "Other"],
  service: ["Salon / Beauty", "Photographer", "Mobile Repair", "Tuition / Coaching", "Tailoring", "Home Services", "Events / Catering", "Other"],
  community: ["Masjid / Committee", "NGO / Welfare", "Sports Club", "Student Group", "Other"],
};

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh",
  "Lakshadweep", "Puducherry",
];

// Suggestions only. City stays a free-text field so every town in India works.
export const CITY_SUGGESTIONS = {
  Telangana: ["Hyderabad", "Secunderabad", "Warangal", "Karimnagar", "Nizamabad", "Khammam"],
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Aurangabad", "Nashik", "Bhiwandi"],
  Karnataka: ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Aligarh", "Meerut"],
  Delhi: ["New Delhi", "Old Delhi", "Dwarka", "Okhla"],
  "West Bengal": ["Kolkata", "Howrah", "Siliguri"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
  Bihar: ["Patna", "Gaya", "Bhagalpur"],
  Kerala: ["Kochi", "Kozhikode", "Thiruvananthapuram", "Malappuram"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Vaniyambadi"],
};

export const MAX_PAGES_PER_ACCOUNT = 3;
export const MAX_IMAGE_MB = 5;
export const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

export function suggestUsername(name) {
  return (name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
}

// Accepts 10 digits, with or without +91 / 0 prefix. Returns a 10-digit string or null.
export function cleanPhone(raw) {
  let d = (raw || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9][0-9]{9}$/.test(d) ? d : null;
}

export async function uploadPageImage(supabase, userId, file, kind) {
  if (!file) return null;
  if (!file.type.startsWith("image/")) throw new Error("Sirf image file chuniye.");
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) throw new Error(`Image ${MAX_IMAGE_MB}MB se chhoti honi chahiye.`);
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/${kind}-${Date.now()}.${ext || "jpg"}`;
  const { error } = await supabase.storage.from("page-media").upload(path, file);
  if (error) throw error;
  return supabase.storage.from("page-media").getPublicUrl(path).data.publicUrl;
}

export function timeAgo(iso) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "abhi";
  if (s < 3600) return `${Math.floor(s / 60)} min pehle`;
  if (s < 86400) return `${Math.floor(s / 3600)} ghante pehle`;
  return `${Math.floor(s / 86400)} din pehle`;
}
