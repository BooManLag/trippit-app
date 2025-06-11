import React, { useState } from 'react';
import { Copy } from 'lucide-react';

interface CopyLinkButtonProps {
  tripId: string;
  className?: string;
}

const CopyLinkButton: React.FC<CopyLinkButtonProps> = ({ tripId, className }) => {
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
    <button
      onClick={copyToClipboard}
      aria-label="Copy shareable link"
      className={`pixel-button-secondary text-xs flex items-center gap-1 ${className ?? ''}`}
    >
      <Copy className="w-3 h-3" />
      {copied ? 'COPIED!' : 'COPY LINK'}
    </button>
  );
};

export default CopyLinkButton;
