import { X } from "lucide-preact";

interface AboutModalProps {
  onClose: () => void;
}

export function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold">About</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="space-y-3 text-sm text-zinc-300">
          <p>
            RA → Cal pulls event listings from Resident Advisor and exports them
            to your calendar. Pick your city, select venues you care about, and
            download an .ics file—or subscribe to a live feed that updates
            automatically.
          </p>

          <p>
            <strong className="text-zinc-100">Download</strong> gives you a
            one-time snapshot. <strong className="text-zinc-100">Subscribe</strong>{" "}
            gives you a URL that your calendar app fetches periodically, so new
            events show up without you doing anything.
          </p>

          <p className="text-zinc-500">
            Not affiliated with Resident Advisor. Data belongs to them.
          </p>
        </div>

        <div className="pt-2 border-t border-zinc-800">
          <a
            href="https://github.com/0x91/ra-cal"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            View source on GitHub →
          </a>
        </div>
      </div>
    </div>
  );
}
