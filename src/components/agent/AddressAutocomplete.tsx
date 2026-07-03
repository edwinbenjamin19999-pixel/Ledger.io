import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";

interface AddressAutocompleteProps { value: string;
  onChange: (value: string, lat?: number, lon?: number) => void;
  placeholder?: string;
}

interface NominatimResult { display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

export function AddressAutocomplete({ value, onChange, placeholder }: AddressAutocompleteProps) { const [query, setQuery] = useState(value);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value);
  }, [value]);

  useEffect(() => { const handleClickOutside = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) { setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = (q: string) => { if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 3) { setResults([]);
      setIsOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => { setLoading(true);
      try { const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=se&limit=5&addressdetails=1`,
          { headers: { "Accept-Language": "sv" } }
        );
        const data: NominatimResult[] = await res.json();
        setResults(data);
        setIsOpen(data.length > 0);
      } catch { setResults([]);
      } finally { setLoading(false);
      }
    }, 400);
  };

  const handleSelect = (r: NominatimResult) => { const shortName = r.display_name.split(",").slice(0, 3).join(",").trim();
    setQuery(shortName);
    setIsOpen(false);
    onChange(shortName, parseFloat(r.lat), parseFloat(r.lon));
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value);
            onChange(e.target.value);
            search(e.target.value);
          }}
          placeholder={placeholder}
          className="pr-8"
        />
        {loading ? (
          <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <MapPin className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        )}
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-auto">
          {results.map((r) => (
            <button
              key={r.place_id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors border-b last:border-b-0"
              onClick={() => handleSelect(r)}
            >
              {r.display_name.split(",").slice(0, 3).join(",").trim()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export async function calculateRouteDistance(
  fromLat: number, fromLon: number,
  toLat: number, toLon: number
): Promise<number | null> { try { const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=false`
    );
    const data = await res.json();
    if (data.routes && data.routes.length > 0) { return Math.round(data.routes[0].distance / 1000 * 10) / 10; // km with 1 decimal
    }
    return null;
  } catch { return null;
  }
}
