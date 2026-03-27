import React, { useState, useEffect } from 'react';
import { Menu, Bell, Star, RefreshCw, Search, X, Plus, Users } from 'lucide-react';

interface TopBarProps {
  onSearch: (query: string) => void;
  onManagePlaylists: () => void;
  onWatchParty: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onSearch, onManagePlaylists, onWatchParty }) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, onSearch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[#1e1e1e] text-white sticky top-0 z-50 shadow-md h-14">
      {!isSearching ? (
        <>
          <div className="flex items-center gap-4">
            <button className="p-1 hover:bg-white/10 rounded-full transition-colors">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-semibold tracking-wide">DarTv</h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onWatchParty}
              className="p-1.5 hover:bg-[#00ff88]/20 text-[#00ff88] rounded-full transition-colors"
              title="Watch Party"
            >
              <Users className="w-5 h-5" />
            </button>
            <button 
              onClick={onManagePlaylists}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
              title="Manage Playlists"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
              <Star className="w-5 h-5" />
            </button>
            <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsSearching(true)}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center w-full gap-2 transition-all duration-200">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search channels..."
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-400"
          />
          <button 
            onClick={clearSearch}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
