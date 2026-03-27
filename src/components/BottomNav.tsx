import React, { useMemo } from 'react';
import { Radio, Circle, Tv, Heart, Info } from 'lucide-react';
import { Channel } from '../utils/m3uParser';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  channels?: Channel[];
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, channels = [] }) => {
  const logos = useMemo(() => {
    const liveLogo = channels.find(c => c.logo)?.logo;
    const sportsLogo = channels.find(c => c.group.toLowerCase().includes('sport') && c.logo)?.logo;
    return {
      live: liveLogo,
      sports: sportsLogo,
      categories: undefined
    };
  }, [channels]);

  const tabs = [
    { id: 'live', label: 'Live Events', icon: Radio },
    { id: 'sports', label: 'Sports', icon: Circle },
    { id: 'categories', label: 'Categories', icon: Tv },
    { id: 'favorites', label: 'Favorites', icon: Heart },
    { id: 'info', label: 'Info', icon: Info },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-white/10 flex justify-around items-center py-2 px-4 z-50">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const logoUrl = logos[tab.id as keyof typeof logos];

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${
              isActive ? 'text-[#00ff88]' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={tab.label} 
                className={`w-6 h-6 object-contain transition-all ${isActive ? '' : 'opacity-50 grayscale'}`} 
              />
            ) : (
              <Icon className="w-6 h-6" />
            )}
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
