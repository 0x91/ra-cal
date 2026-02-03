import { useState, useEffect, useRef, memo } from "preact/compat";
import { getPopularVenues, searchVenues, APIError, type Venue } from "../lib/ra-api";
import { cn } from "../lib/utils";
import { Search, Loader2, AlertCircle, RefreshCw } from "lucide-preact";

// Memoized venue button to prevent unnecessary re-renders
const VenueButton = memo(function VenueButton({
  venue,
  isSelected,
  onToggle,
}: {
  venue: Venue;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2 pl-1 pr-3 py-1 rounded-full text-sm transition-all",
        isSelected
          ? "bg-white text-zinc-900"
          : "bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800"
      )}
    >
      {venue.logoUrl ? (
        <img
          src={venue.logoUrl}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          className={cn(
            "w-7 h-7 rounded-full object-cover",
            !isSelected && "opacity-80"
          )}
        />
      ) : (
        <div
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
            isSelected
              ? "bg-zinc-200 text-zinc-600"
              : "bg-zinc-700 text-zinc-400"
          )}
        >
          {venue.name.charAt(0)}
        </div>
      )}
      <span className="font-medium">{venue.name}</span>
    </button>
  );
});

interface VenueSelectorProps {
  areaId: string;
  areaName?: string;
  selectedVenues: string[];
  onSelectionChange: (venueIds: string[]) => void;
  allVenues: boolean;
  onAllVenuesChange: (all: boolean) => void;
}

export function VenueSelector({
  areaId,
  areaName,
  selectedVenues,
  onSelectionChange,
  allVenues,
  onAllVenuesChange,
}: VenueSelectorProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [searchResults, setSearchResults] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const searchTimeout = useRef<number>();

  // Load popular venues for the area
  useEffect(() => {
    if (!areaId) return;

    setLoading(true);
    setError(null);
    setVenues([]);
    setSearchResults([]);
    setSearch("");
    getPopularVenues(areaId, 20)
      .then(setVenues)
      .catch((e) => setError(e instanceof APIError ? e.message : e.message))
      .finally(() => setLoading(false));
  }, [areaId]);

  // Search for venues when typing
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (search.length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchVenues(search, areaName);
        // Filter out venues already in the popular list
        const newResults = results.filter(
          (r) => !venues.some((v) => v.id === r.id)
        );
        setSearchResults(newResults);
      } catch {
        // Search failed - ignore, user can retry
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [search, venues]);

  const filteredVenues = venues.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAllVenues = () => {
    if (allVenues) {
      onAllVenuesChange(false);
    } else {
      onAllVenuesChange(true);
      onSelectionChange([]); // Clear individual selections
    }
  };

  const toggleVenue = (venue: Venue) => {
    // Clear "All Venues" when selecting individual venues
    if (allVenues) {
      onAllVenuesChange(false);
    }

    if (selectedVenues.includes(venue.id)) {
      onSelectionChange(selectedVenues.filter((id) => id !== venue.id));
    } else {
      onSelectionChange([...selectedVenues, venue.id]);
      // Add to venues list if from search
      if (!venues.some((v) => v.id === venue.id)) {
        setVenues((prev) => [...prev, venue]);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-wrap gap-2">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-10 w-32 bg-zinc-800 rounded-full animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            getPopularVenues(areaId, 20)
              .then(setVenues)
              .catch((e) => setError(e instanceof APIError ? e.message : e.message))
              .finally(() => setLoading(false));
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search all venues..."
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
          className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 text-sm"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 animate-spin" />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={toggleAllVenues}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm border transition-colors",
            allVenues
              ? "bg-zinc-100 text-zinc-900 border-zinc-100"
              : "bg-zinc-900 border-zinc-600 border-dashed hover:border-zinc-400"
          )}
        >
          All Venues
        </button>
        {filteredVenues.map((venue) => (
          <VenueButton
            key={venue.id}
            venue={venue}
            isSelected={selectedVenues.includes(venue.id)}
            onToggle={() => toggleVenue(venue)}
          />
        ))}
      </div>

      {searchResults.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500">Search results:</p>
          <div className="flex flex-wrap gap-2">
            {searchResults.map((venue) => (
              <VenueButton
                key={venue.id}
                venue={venue}
                isSelected={selectedVenues.includes(venue.id)}
                onToggle={() => toggleVenue(venue)}
              />
            ))}
          </div>
        </div>
      )}

      {selectedVenues.length > 0 && (
        <p className="text-xs text-zinc-500">
          {selectedVenues.length} venue{selectedVenues.length > 1 ? "s" : ""}{" "}
          selected
        </p>
      )}
    </div>
  );
}
