import React, { useState } from 'react';
import { Copy, Link2 } from 'lucide-react';

interface ShareTripLinkProps {
  tripId: string;
}

const ShareTripLink: React.FC<ShareTripLinkProps> = ({ tripId }) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/my-trips?invitation=${tripId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  };

  return (
    <div className="pixel-card bg-gray-900 border-2 border-purple-500/20">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-purple-400" />
          <h3 className="pixel-text text-purple-400 text-sm sm:text-base">SHARE TRIP</h3>
        </div>
        <button
          onClick={copyToClipboard}
          aria-label="Copy shareable link"
          className="pixel-button-secondary text-xs flex items-center gap-1"
        >
          <Copy className="w-3 h-3" />
          {copied ? 'COPIED!' : 'COPY LINK'}
        </button>
      </div>
      <p className="outfit-text text-gray-300 text-xs sm:text-sm mt-2 break-all">{shareUrl}</p>
    </div>
  );
};

export default ShareTripLink;
