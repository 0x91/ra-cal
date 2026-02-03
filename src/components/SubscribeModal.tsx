import { useState } from "preact/hooks";
import { X, Copy, Check, ExternalLink } from "lucide-preact";

interface SubscribeModalProps {
  url: string;
  onClose: () => void;
}

export function SubscribeModal({ url, onClose }: SubscribeModalProps) {
  const [copied, setCopied] = useState(false);

  // Convert https:// to webcal:// for native calendar app handling
  const webcalUrl = url.replace(/^https?:\/\//, "webcal://");

  // Google Calendar subscribe URL
  const googleCalUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold">Subscribe to Calendar</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <p className="text-sm text-zinc-400">
          Subscribe to keep your calendar synced with these events.
        </p>

        {/* Quick subscribe buttons */}
        <div className="space-y-2">
          <a
            href={webcalUrl}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-zinc-100 text-zinc-900 rounded-lg font-medium text-sm hover:bg-white transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Calendar (iOS/Mac)
          </a>
          <a
            href={googleCalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-zinc-800 text-zinc-100 rounded-lg font-medium text-sm hover:bg-zinc-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Add to Google Calendar
          </a>
        </div>

        {/* Manual copy option */}
        <div className="pt-3 border-t border-zinc-800 space-y-2">
          <p className="text-xs text-zinc-500">Or copy the URL:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              readOnly
              className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-400 truncate"
            />
            <button
              onClick={handleCopy}
              className="px-3 py-2 bg-zinc-700 text-zinc-200 rounded-lg text-sm hover:bg-zinc-600 transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
