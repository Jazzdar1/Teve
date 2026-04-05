import React, { useState } from 'react';
import { Channel } from '../utils/m3uParser';
import { Play, Tv, Heart } from 'lucide-react';

interface ChannelCardProps {
  channel: Channel;
  onClick: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
  searchQuery?: string;
  compact?: boolean;
}

const HighlightText = ({ text, highlight }: { text: string, highlight?: string }) => {
  if (!highlight || !highlight.trim()) {
    return <>{text}</>;
  }
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? <span key={i} className="bg-[#00ff88]/30 text-[#00ff88] rounded px-0.5">{part}</span> : <span key={i}>{part}</span>
      )}
    </>
  );
};

export const ChannelCard: React.FC<ChannelCardProps> = ({ channel, onClick, isFavorite, onToggleFavorite, searchQuery, compact }) => {
  const [imageError, setImageError] = useState(false);

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-2 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group relative h-32 w-full overflow-hidden"
      >
        <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center p-1 overflow-hidden group-hover:scale-105 transition-all duration-500 relative">
          {/* Animated Border Gradient - Always active or on hover */}
          <div className="absolute inset-0 rounded-full p-[2px] bg-gradient-to-tr from-[#00ff88] via-[#3b82f6] to-[#ff0088] animate-spin-slow opacity-40 group-hover:opacity-100 transition-opacity duration-500">
            <div className="w-full h-full rounded-full bg-[#1a1a1a]" />
          </div>

          <div className="relative z-10 w-full h-full flex items-center justify-center rounded-full overflow-hidden p-1.5">
            {channel.logo && !imageError ? (
              <img
                src={channel.logo}
                alt={channel.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain rounded-full group-hover:scale-110 transition-transform duration-500"
                onError={() => setImageError(true)}
              />
            ) : (
              <Tv className="w-6 h-6 text-gray-500 group-hover:text-[#00ff88] transition-colors" />
            )}
          </div>
          
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-full z-20">
            <Play className="w-6 h-6 fill-[#00ff88] text-[#00ff88] drop-shadow-[0_0_8px_rgba(0,255,136,0.6)]" />
          </div>
        </div>
        <h3 className="text-white font-bold text-[10px] line-clamp-2 text-center leading-tight group-hover:text-[#00ff88] transition-colors relative z-10 px-1">
          <HighlightText text={channel.name} highlight={searchQuery} />
        </h3>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="bg-[#1e1e1e] border border-gray-700 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-[#242424] hover:border-[#00ff88]/50 transition-all group relative h-44 shadow-lg hover:shadow-[#00ff88]/10"
    >
      {/* Tooltip */}
      <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-black/95 text-white text-xs rounded-xl py-2 px-4 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none z-50 shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col items-center min-w-[140px] max-w-[220px] backdrop-blur-md">
        <span className="font-bold truncate w-full text-center text-xs"><HighlightText text={channel.name} highlight={searchQuery} /></span>
        <span className="text-[#00ff88] truncate w-full text-center mt-1 text-[10px] font-semibold uppercase tracking-wider"><HighlightText text={channel.group || 'Uncategorized'} highlight={searchQuery} /></span>
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-black/95 border-b border-r border-white/10 rotate-45"></div>
      </div>

      {/* Favorite Button */}
      {onToggleFavorite && (
        <button
          onClick={onToggleFavorite}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white/70 hover:text-red-500 transition-all border border-white/5 backdrop-blur-md"
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
        </button>
      )}

      {/* Logo (Round with animated border) */}
      <div className="w-24 h-24 rounded-full bg-[#2a2a2a] flex items-center justify-center p-1 relative group-hover:scale-105 transition-all duration-500 shadow-2xl">
        {/* Animated Border Gradient */}
        <div className="absolute inset-0 rounded-full p-[3px] bg-gradient-to-br from-[#00ff88] via-[#3b82f6] to-[#ff0088] animate-spin-slow opacity-60 group-hover:opacity-100 transition-opacity duration-500">
          <div className="w-full h-full rounded-full bg-[#1e1e1e]" />
        </div>

        <div className="relative z-10 w-full h-full rounded-full overflow-hidden bg-[#1e1e1e] flex items-center justify-center p-3">
          {channel.logo && !imageError ? (
            <img
              src={channel.logo}
              alt={channel.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain rounded-full transition-transform duration-500 group-hover:scale-110"
              onError={() => setImageError(true)}
            />
          ) : (
            <Tv className="w-10 h-10 text-gray-500 group-hover:text-[#00ff88] transition-colors duration-500" />
          )}
        </div>
        
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-full z-20">
          <Play className="w-10 h-10 fill-[#00ff88] text-[#00ff88] ml-1 drop-shadow-[0_0_15px_rgba(0,255,136,0.6)]" />
        </div>
      </div>

      {/* Channel Name */}
      <div className="flex flex-col items-center w-full text-center px-2 relative z-10">
        <h3 className="text-white font-bold text-sm line-clamp-2 group-hover:text-[#00ff88] transition-colors w-full leading-tight tracking-tight">
          <HighlightText text={channel.name} highlight={searchQuery} />
        </h3>
      </div>
    </div>
  );
};
