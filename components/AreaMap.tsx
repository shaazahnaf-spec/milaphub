// FILE: components/AreaMap.tsx

type Props = { lat: number | null; lng: number | null; locality: string | null; cityName: string }

// Shows only an approximate area (~1 km), never the exact address
export default function AreaMap({ lat, lng, locality, cityName }: Props) {
  const place = [locality, cityName].filter(Boolean).join(', ')

  if (lat === null || lng === null) {
    return (
      <div className="rounded-2xl border border-[#e5eceb] p-4">
        <p className="text-sm text-[#5d7776]">Item location</p>
        <p className="font-bold">{place || 'Location not shared'}</p>
        {place && (
          <a
            href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(place)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-sm font-semibold text-[#0f5c5a] underline"
          >
            View this area on the map
          </a>
        )}
      </div>
    )
  }

  const d = 0.012
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lng}`

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e5eceb]">
      <iframe
        title={`Map of ${place}`}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="h-56 w-full border-0"
      />
      <div className="p-3">
        <p className="font-bold">{place}</p>
        <p className="text-xs text-[#5d7776]">
          Approximate area only. The exact address is shared only if you and the other person agree.
        </p>
      </div>
    </div>
  )
}
