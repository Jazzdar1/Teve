import React from 'react';
import { Channel } from '../utils/m3uParser';
import { Play, Image as ImageIcon, Heart } from 'lucide-react';

interface ChannelCardProps {
  channel: Channel;
  onClick: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
  searchQuery?: string;
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

export const ChannelCard: React.FC<ChannelCardProps> = ({ channel, onClick, isFavorite, onToggleFavorite, searchQuery }) => {
  return (
    <div
      onClick={onClick}
      className="bg-[#1e1e1e] border border-gray-700 rounded-2xl p-3 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-[#242424] hover:border-[#00ff88] transition-all group relative h-36"
    >
      {/* Tooltip */}
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/95 text-white text-xs rounded-lg py-1.5 px-3 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none z-50 shadow-[0_0_15px_rgba(0,255,136,0.2)] border border-[#00ff88]/30 flex flex-col items-center min-w-[120px] max-w-[200px]">
        <span className="font-bold truncate w-full text-center text-xs"><HighlightText text={channel.name} highlight={searchQuery} /></span>
        <span className="text-[#00ff88] truncate w-full text-center mt-0.5 text-[10px]"><HighlightText text={channel.group || 'Uncategorized'} highlight={searchQuery} /></span>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/95 border-b border-r border-[#00ff88]/30 rotate-45"></div>
      </div>

      {/* Favorite Button */}
      {onToggleFavorite && (
        <button
          onClick={onToggleFavorite}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/50 hover:bg-black/80 transition-colors"
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`} />
        </button>
      )}

      {/* Logo (Round and Small) */}
      <div className="w-16 h-16 rounded-full bg-[#2a2a2a] border-2 border-transparent group-hover:border-[#00ff88] flex items-center justify-center p-2.5 overflow-hidden group-hover:scale-110 transition-all duration-300 shadow-md group-hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] relative">
        {channel.logo ? (
          <img
            src={channel.logo}
            alt={channel.name}
            className="w-full h-full object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <ImageIcon className={`w-6 h-6 text-gray-500 group-hover:scale-110 transition-transform duration-300 ${channel.logo ? 'hidden' : ''}`} />
        
        {/* Play Overlay on Logo */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-full">
          <Play className="w-6 h-6 fill-[#00ff88] text-[#00ff88] ml-0.5" />
        </div>
      </div>

      {/* Channel Name */}
      <div className="flex flex-col items-center w-full text-center px-1">
        <h3 className="text-white font-medium text-xs line-clamp-2 group-hover:text-[#00ff88] transition-colors w-full leading-tight">
          <HighlightText text={channel.name} highlight={searchQuery} />
        </h3>
      </div>
    </div>
  );
};
