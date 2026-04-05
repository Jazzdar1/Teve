import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { ChannelCard } from './components/ChannelCard';
import { VideoPlayer } from './components/VideoPlayer';
import { WatchPartyPanel } from './components/WatchPartyPanel';
import { defaultPlaylists, PlaylistDef } from './data/playlists';
import { parseM3U, Channel } from './utils/m3uParser';
import { Play, Tv, X, AlertCircle, Loader2, Check, Plus, Trash2, Edit2, Radio, Info, Users, ExternalLink, Smartphone, RotateCw } from 'lucide-react';

const getProxiedUrl = (url: string) => {
  if (!url || url.startsWith('http://localhost') || url.startsWith('blob:') || url.startsWith('https://api.github.com')) {
    return url;
  }
  return `https://sports-proxy.darajazb.workers.dev/?${encodeURIComponent(url)}`;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('live');
  const [customPlaylists, setCustomPlaylists] = useState<PlaylistDef[]>(() => {
    try {
      const saved = localStorage.getItem('customPlaylists');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse customPlaylists from localStorage', e);
      return [];
    }
  });
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('favoriteChannels');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse favoriteChannels from localStorage', e);
      return [];
    }
  });
  
  const allPlaylists = useMemo(() => [...defaultPlaylists, ...customPlaylists], [customPlaylists]);
  
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistDef>(allPlaylists[0]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingChannel, setPlayingChannel] = useState<Channel | null>(null);
  const [showPlayerOverlay, setShowPlayerOverlay] = useState(true);
  const [playerOverlayTab, setPlayerOverlayTab] = useState<'suggested' | 'playlist'>('suggested');
  const [isLandscapeForced, setIsLandscapeForced] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState('All');

  // Modal state
  const [showPlaylistManager, setShowPlaylistManager] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<PlaylistDef | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
  const [isSavingPlaylist, setIsSavingPlaylist] = useState(false);
  const [playlistError, setPlaylistError] = useState<string | null>(null);

  // Watch Party state
  const [showWatchPartyModal, setShowWatchPartyModal] = useState(false);
  const [watchPartyRoom, setWatchPartyRoom] = useState('');
  const [watchPartyName, setWatchPartyName] = useState('');
  const [activeWatchParty, setActiveWatchParty] = useState<{roomId: string, userName: string} | null>(null);

  useEffect(() => {
    // Anti-inspect and F12 block
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I (Inspect)
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
        e.preventDefault();
        return false;
      }
      // Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+C (Inspect Element)
      if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
        e.preventDefault();
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    // Continuous debugger loop to deter inspection
    const debuggerInterval = setInterval(() => {
      try {
        Function('debugger')();
      } catch (e) {
        // Ignore EvalError if CSP blocks it
      }
    }, 100);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      clearInterval(debuggerInterval);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('customPlaylists', JSON.stringify(customPlaylists));
  }, [customPlaylists]);

  useEffect(() => {
    localStorage.setItem('favoriteChannels', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (channelUrl: string) => {
    setFavorites(prev => 
      prev.includes(channelUrl) 
        ? prev.filter(url => url !== channelUrl)
        : [...prev, channelUrl]
    );
  };

  const fetchPlaylist = async () => {
    setLoading(true);
    setError(null);
    
    if (selectedPlaylist.type === 'web') {
      setChannels([{
        name: selectedPlaylist.name,
        url: selectedPlaylist.url,
        group: selectedPlaylist.group,
        logo: '',
        type: 'web'
      }]);
      setLoading(false);
      return;
    }

    try {
      let response;
      try {
        response = await fetch(selectedPlaylist.url);
        if (!response.ok) throw new Error('Not ok');
      } catch (e) {
        response = await fetch(getProxiedUrl(selectedPlaylist.url));
        if (!response.ok) {
          throw new Error('Failed to fetch playlist');
        }
      }
      const text = await response.text();
      const parsedChannels = parseM3U(text, selectedPlaylist.name);
      setChannels(parsedChannels);
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading the playlist.');
      setChannels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylist();
  }, [selectedPlaylist]);

  const handleRefreshPlaylist = () => {
    fetchPlaylist();
  };

  const channelCategories = useMemo(() => {
    return Array.from(new Set(channels.map(c => c.group || 'Uncategorized')));
  }, [channels]);

  const filteredChannels = useMemo(() => {
    let result = channels;
    
    if (activeTab === 'favorites') {
      result = result.filter(c => favorites.includes(c.url));
    } else if (activeTab === 'sports') {
      result = result.filter(c => c.group.toLowerCase().includes('sport'));
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(lowerQuery) ||
          c.group.toLowerCase().includes(lowerQuery)
      );
    }
    return result;
  }, [channels, searchQuery, activeTab, favorites]);

  const groups = ['All', ...Array.from(new Set(allPlaylists.map((p) => p.group)))];
  const currentPlaylists = activeGroup === 'All' ? allPlaylists : allPlaylists.filter((p) => p.group === activeGroup);

  const handleSavePlaylist = async () => {
    if (!newPlaylistName || !newPlaylistUrl) return;
    
    setIsSavingPlaylist(true);
    setPlaylistError(null);

    try {
      // Validate the playlist URL
      let response;
      try {
        response = await fetch(newPlaylistUrl);
        if (!response.ok) throw new Error('Not ok');
      } catch (e) {
        response = await fetch(getProxiedUrl(newPlaylistUrl));
        if (!response.ok) {
          throw new Error('Failed to fetch playlist');
        }
      }
      const text = await response.text();
      const parsedChannels = parseM3U(text, 'My Playlists');
      
      if (parsedChannels.length === 0) {
        throw new Error('I did not find any channels');
      }

      if (editingPlaylist) {
        setCustomPlaylists(prev => prev.map(p => p === editingPlaylist ? { name: newPlaylistName, url: newPlaylistUrl, group: 'My Playlists' } : p));
        setEditingPlaylist(null);
        if (selectedPlaylist === editingPlaylist) {
          setSelectedPlaylist({ name: newPlaylistName, url: newPlaylistUrl, group: 'My Playlists' });
        }
      } else {
        setCustomPlaylists(prev => [...prev, { name: newPlaylistName, url: newPlaylistUrl, group: 'My Playlists' }]);
      }
      setNewPlaylistName('');
      setNewPlaylistUrl('');
      setShowPlaylistManager(false);
    } catch (err: any) {
      setPlaylistError(err.message || 'I did not find any channels');
    } finally {
      setIsSavingPlaylist(false);
    }
  };

  const handleDeletePlaylist = (playlist: PlaylistDef) => {
    setCustomPlaylists(prev => prev.filter(p => p !== playlist));
    if (selectedPlaylist === playlist) {
      setSelectedPlaylist(allPlaylists[0]);
    }
  };

  const handleEditPlaylist = (playlist: PlaylistDef) => {
    setEditingPlaylist(playlist);
    setNewPlaylistName(playlist.name);
    setNewPlaylistUrl(playlist.url);
  };

  const fetchChaupalPlaylists = async () => {
    setIsSavingPlaylist(true);
    setPlaylistError(null);
    try {
      const response = await fetch('https://api.github.com/repos/dartv-ajaz/chaupal/contents/');
      if (!response.ok) throw new Error('Failed to fetch from GitHub');
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error(data.message || 'Invalid response from GitHub');
      }
      
      const newPlaylists: PlaylistDef[] = [];
      for (const file of data) {
        if (file.name.endsWith('.json') || file.name.endsWith('.m3u') || file.name.endsWith('.m3u8')) {
          const formattedName = file.name
            .replace(/\.(json|m3u8?)$/, '')
            .split('_')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
            
          newPlaylists.push({
            name: formattedName,
            url: file.download_url,
            group: 'Chaupal',
            type: file.name.endsWith('.m3u') || file.name.endsWith('.m3u8') ? 'm3u' : undefined
          });
        }
      }
      
      if (newPlaylists.length > 0) {
        setCustomPlaylists(prev => {
          const existingUrls = new Set(prev.map(p => p.url));
          const uniqueNew = newPlaylists.filter(p => !existingUrls.has(p.url));
          return [...prev, ...uniqueNew];
        });
        setNewPlaylistName('');
        setNewPlaylistUrl('');
        setShowPlaylistManager(false);
      } else {
        setPlaylistError('No playlists found in the repository.');
      }
    } catch (err: any) {
      console.error(err);
      setPlaylistError('Failed to fetch Chaupal playlists.');
    } finally {
      setIsSavingPlaylist(false);
    }
  };

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (playingChannel && showPlayerOverlay) {
      timeout = setTimeout(() => {
        setShowPlayerOverlay(false);
      }, 5000);
    }
    return () => clearTimeout(timeout);
  }, [playingChannel, showPlayerOverlay]);

  const togglePlayerOverlay = () => {
    setShowPlayerOverlay(!showPlayerOverlay);
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans pb-20">
      <TopBar 
        onSearch={setSearchQuery} 
        onManagePlaylists={() => setShowPlaylistManager(true)} 
        onWatchParty={() => setShowWatchPartyModal(true)}
        onRefresh={handleRefreshPlaylist}
      />

      {/* Ticker / Banner */}
      <div className="bg-[#1a2f24] border-y border-[#00ff88]/30 px-4 py-1.5 overflow-hidden whitespace-nowrap">
        <p className="text-[#00ff88] text-sm animate-marquee inline-block">
          DarTv welcomes you
        </p>
      </div>

      {/* Sticky Top Player */}
      <AnimatePresence>
        {playingChannel && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="sticky top-0 z-40 w-full bg-black border-b border-[#00ff88]/20 shadow-2xl overflow-hidden"
          >
            <div className="max-w-7xl mx-auto relative group">
              <div className="aspect-video md:aspect-[21/9] max-h-[70vh] w-full">
                {playingChannel.type === 'web' ? (
                  <iframe
                    src={playingChannel.url}
                    className="w-full h-full border-0 bg-black"
                    allowFullScreen
                    allow="autoplay; encrypted-media"
                  />
                ) : (
                  <VideoPlayer 
                    url={playingChannel.url} 
                    drm={playingChannel.drm} 
                    headers={playingChannel.headers}
                    className="w-full h-full" 
                    onToggleOverlay={togglePlayerOverlay}
                  />
                )}
              </div>

              {/* Overlay UI (Simplified for sticky layout) */}
              <AnimatePresence>
                {showPlayerOverlay && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-transparent to-black/60 flex flex-col pointer-events-none"
                  >
                    {/* Top Bar */}
                    <div className="p-4 flex items-center justify-between pointer-events-auto">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-full p-1 flex items-center justify-center flex-shrink-0 border border-[#00ff88]">
                          {playingChannel.logo ? (
                            <img src={playingChannel.logo} alt={playingChannel.name} className="max-w-full max-h-full object-contain rounded-full" />
                          ) : (
                            <Tv className="w-4 h-4 text-gray-800" />
                          )}
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-white leading-tight line-clamp-1">{playingChannel.name}</h2>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-bold text-[#00ff88] uppercase tracking-wider">{playingChannel.group || 'Live'}</span>
                            <span className="text-[8px] font-bold text-blue-400 uppercase tracking-widest bg-blue-400/10 px-1.5 py-0.5 rounded-full border border-blue-400/20">
                              {localStorage.getItem('player_engine') || 'JWPlayer'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPlayingChannel(null)}
                          className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md border border-white/10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="p-4 max-w-7xl mx-auto">

        {/* Watch Party Modal */}
        {showWatchPartyModal && (
          <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#1e1e1e] border border-gray-700 rounded-2xl w-full max-w-sm p-6 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00ff88] to-blue-500"></div>
              
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Users className="w-6 h-6 text-[#00ff88]" />
                  Watch Party
                </h2>
                <button onClick={() => setShowWatchPartyModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex flex-col gap-4">
                <p className="text-sm text-gray-400">Join a room to watch streams in sync with your friends and chat in real-time.</p>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Alex" 
                    value={watchPartyName}
                    onChange={e => setWatchPartyName(e.target.value)}
                    className="bg-[#2a2a2a] border border-gray-600 rounded-xl px-4 py-3 text-white outline-none focus:border-[#00ff88] transition-colors"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Room Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. movie-night" 
                    value={watchPartyRoom}
                    onChange={e => setWatchPartyRoom(e.target.value)}
                    className="bg-[#2a2a2a] border border-gray-600 rounded-xl px-4 py-3 text-white outline-none focus:border-[#00ff88] transition-colors font-mono"
                  />
                </div>
                
                <button 
                  onClick={() => {
                    if (watchPartyName && watchPartyRoom) {
                      setActiveWatchParty({ roomId: watchPartyRoom, userName: watchPartyName });
                      setShowWatchPartyModal(false);
                    }
                  }}
                  disabled={!watchPartyName || !watchPartyRoom}
                  className="mt-2 bg-[#00ff88] text-black font-bold py-3 rounded-xl hover:bg-[#00cc6a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#00ff88]/20"
                >
                  Join Party
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Playlist Manager Modal */}
        {showPlaylistManager && (
          <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-[#1e1e1e] border border-gray-700 rounded-xl w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Manage Playlists</h2>
                <button onClick={() => { setShowPlaylistManager(false); setEditingPlaylist(null); setNewPlaylistName(''); setNewPlaylistUrl(''); setPlaylistError(null); }} className="p-2 hover:bg-white/10 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex flex-col gap-3">
                {playlistError && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p>{playlistError}</p>
                  </div>
                )}
                <input 
                  type="text" 
                  placeholder="Playlist Name" 
                  value={newPlaylistName}
                  onChange={e => setNewPlaylistName(e.target.value)}
                  disabled={isSavingPlaylist}
                  className="bg-[#2a2a2a] border border-gray-600 rounded-lg px-4 py-2 text-white outline-none focus:border-[#00ff88] disabled:opacity-50"
                />
                <input 
                  type="text" 
                  placeholder="Playlist URL (.m3u)" 
                  value={newPlaylistUrl}
                  onChange={e => setNewPlaylistUrl(e.target.value)}
                  disabled={isSavingPlaylist}
                  className="bg-[#2a2a2a] border border-gray-600 rounded-lg px-4 py-2 text-white outline-none focus:border-[#00ff88] disabled:opacity-50"
                />
                <button 
                  onClick={handleSavePlaylist}
                  disabled={isSavingPlaylist || !newPlaylistName || !newPlaylistUrl}
                  className="bg-[#00ff88] text-black font-semibold py-2 rounded-lg hover:bg-[#00cc6a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSavingPlaylist ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingPlaylist ? 'Update Playlist' : 'Add Playlist'
                  )}
                </button>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-600"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase font-semibold">Or</span>
                  <div className="flex-grow border-t border-gray-600"></div>
                </div>

                <button 
                  onClick={fetchChaupalPlaylists}
                  disabled={isSavingPlaylist}
                  className="bg-[#3b82f6] text-white font-semibold py-2 rounded-lg hover:bg-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSavingPlaylist ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                  Fetch Chaupal Playlists
                </button>
              </div>

              <div className="mt-4 max-h-60 overflow-y-auto flex flex-col gap-2 pr-1">
                <h3 className="text-sm text-gray-400 font-semibold mb-2">Your Custom Playlists</h3>
                {customPlaylists.length === 0 ? (
                  <p className="text-sm text-gray-500">No custom playlists added yet.</p>
                ) : (
                  customPlaylists.map((playlist, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-[#2a2a2a] p-3 rounded-lg border border-white/5">
                      <div className="flex flex-col overflow-hidden mr-2">
                        <span className="font-medium truncate text-sm">{playlist.name}</span>
                        <span className="text-xs text-gray-400 truncate">••••••••••••••••</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => handleEditPlaylist(playlist)} className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeletePlaylist(playlist)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Playlist Groups (Top Icons) */}
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide items-center">
          {groups.map((group, idx) => (
            <button
              key={group}
              onClick={() => setActiveGroup(group)}
              className={`flex flex-col items-center gap-1 min-w-[60px] relative group`}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${
                activeGroup === group ? 'border-[#00ff88] bg-[#1e1e1e]' : 'border-gray-600 bg-[#1e1e1e] group-hover:border-gray-400'
              }`}>
                <Tv className={`w-6 h-6 ${activeGroup === group ? 'text-[#00ff88]' : 'text-gray-400'}`} />
              </div>
              <span className={`text-xs font-medium ${activeGroup === group ? 'text-white' : 'text-gray-400'}`}>
                {group}
              </span>
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {allPlaylists.filter(p => p.group === group).length}
              </div>
            </button>
          ))}
        </div>

        {/* Playlists in Group (Filter Chips) */}
        <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide mt-2">
          {currentPlaylists.map((playlist) => (
            <button
              key={playlist.name}
              onClick={() => setSelectedPlaylist(playlist)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                selectedPlaylist.name === playlist.name
                  ? 'bg-transparent text-white border-[#00ff88]'
                  : 'bg-transparent text-gray-400 border-gray-600 hover:border-gray-400'
              }`}
            >
              {selectedPlaylist.name === playlist.name && <Check className="w-4 h-4 text-[#00ff88]" />}
              {playlist.name}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="mt-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Loader2 className="w-10 h-10 animate-spin text-[#00ff88] mb-4" />
              <p>Loading channels...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-red-400 bg-red-500/10 rounded-2xl border border-red-500/20">
              <AlertCircle className="w-12 h-12 mb-4" />
              <p className="text-center max-w-md">{error}</p>
              <button 
                onClick={() => setSelectedPlaylist({...selectedPlaylist})}
                className="mt-4 px-6 py-2 bg-[#242424] text-white rounded-full hover:bg-[#2a2a2a] transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : activeTab === 'categories' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {channelCategories.map((category, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSearchQuery(category);
                    setActiveTab('live');
                  }}
                  className="bg-[#1e1e1e] border border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-[#242424] hover:border-[#00ff88] transition-all group"
                >
                  <Tv className="w-8 h-8 text-gray-500 group-hover:text-[#00ff88] transition-colors" />
                  <span className="text-white font-semibold text-center line-clamp-2">{category}</span>
                  <span className="text-xs text-gray-500">
                    {channels.filter(c => (c.group || 'Uncategorized') === category).length} channels
                  </span>
                </button>
              ))}
            </div>
          ) : activeTab === 'info' ? (
            <div className="max-w-3xl mx-auto space-y-8 pb-20">
              <div className="bg-[#1e1e1e] border border-gray-700 rounded-2xl p-6 md:p-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Info className="w-6 h-6 text-[#00ff88]" />
                  About Us
                </h2>
                <div className="space-y-4 text-gray-300">
                  <p>
                    Welcome to our IPTV player application. We strive to provide the best streaming experience with support for multiple playback engines and seamless channel management.
                  </p>
                  <div className="bg-[#242424] p-4 rounded-xl border border-gray-700 mt-6">
                    <h3 className="text-lg font-semibold text-white mb-3">Contact Information</h3>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3">
                        <span className="text-gray-400 w-24">Email:</span>
                        <a href="mailto:darajazb@gmail.com" className="text-[#00ff88] hover:underline">darajazb@gmail.com</a>
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="text-gray-400 w-24">WhatsApp:</span>
                        <a href="https://wa.me/917006686584" target="_blank" rel="noopener noreferrer" className="text-[#00ff88] hover:underline">+91 7006686584</a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-[#1e1e1e] border border-gray-700 rounded-2xl p-6 md:p-8">
                <h2 className="text-2xl font-bold text-white mb-4">Privacy Policy</h2>
                <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
                  <p>
                    Your privacy is important to us. This application operates entirely within your browser. We do not collect, store, or transmit your personal data, viewing history, or custom playlists to any external servers.
                  </p>
                  <p>
                    <strong>Data Storage:</strong> All your custom playlists, favorites, and settings are stored locally on your device using your browser's local storage. If you clear your browser data, this information will be deleted.
                  </p>
                  <p>
                    <strong>Third-Party Content:</strong> This application acts as a player for M3U playlists. We do not host or provide any of the streaming content. When you play a stream, your device connects directly to the content provider's servers, which may have their own privacy policies.
                  </p>
                </div>
              </div>
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Tv className="w-16 h-16 mb-4 opacity-20" />
              <p>No channels found in this playlist.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {filteredChannels.map((channel, index) => (
                <ChannelCard
                  key={`${channel.name}-${index}`}
                  channel={channel}
                  onClick={() => setPlayingChannel(channel)}
                  isFavorite={favorites.includes(channel.url)}
                  onToggleFavorite={(e) => {
                    e.stopPropagation();
                    toggleFavorite(channel.url);
                  }}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} channels={channels} />

      {/* Watch Party Panel */}
      {activeWatchParty && (
        <WatchPartyPanel
          roomId={activeWatchParty.roomId}
          userName={activeWatchParty.userName}
          onLeave={() => setActiveWatchParty(null)}
          playingChannel={playingChannel}
          onChannelSync={(channel) => setPlayingChannel(channel)}
        />
      )}
    </div>
  );
}
