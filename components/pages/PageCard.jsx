import Link from "next/link";
import { CATEGORY_LABEL } from "@/lib/pages/config";

export default function PageCard({ page }) {
  return (
    <Link
      href={`/pages/${page.username}`}
      className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 hover:border-stone-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-stone-200">
        {page.avatar_url && <img src={page.avatar_url} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{page.name}</span>
          {page.is_verified && (
            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Verified Local</span>
          )}
        </div>
        <div className="truncate text-sm text-stone-500">
          @{page.username} - {page.subcategory || CATEGORY_LABEL[page.category]}
        </div>
        <div className="truncate text-sm text-stone-500">
          {page.city}, {page.state} - {page.followers_count} followers
        </div>
      </div>
    </Link>
  );
}
