import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Users, Send, LogOut, MessageSquare } from 'lucide-react';
import { Channel } from '../utils/m3uParser';

interface WatchPartyPanelProps {
  roomId: string;
  userName: string;
  onLeave: () => void;
  playingChannel: Channel | null;
  onChannelSync: (channel: Channel) => void;
}

interface ChatMessage {
  userName: string;
  message: string;
  timestamp: number;
}

export const WatchPartyPanel: React.FC<WatchPartyPanelProps> = ({ 
  roomId, 
  userName, 
  onLeave, 
  playingChannel,
  onChannelSync 
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [users, setUsers] = useState<{id: string, name: string}[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSentChannelRef = useRef<string | null>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.emit('join_room', { roomId, userName });

    newSocket.on('room_state', (state: any) => {
      setUsers(state.users);
      if (state.playingChannel && (!playingChannel || playingChannel.url !== state.playingChannel.url)) {
        onChannelSync(state.playingChannel);
      }
    });

    newSocket.on('user_joined', (user: any) => {
      setUsers(prev => [...prev, user]);
      setMessages(prev => [...prev, { userName: 'System', message: `${user.name} joined the party`, timestamp: Date.now() }]);
    });

    newSocket.on('user_left', (userId: string) => {
      setUsers(prev => {
        const user = prev.find(u => u.id === userId);
        if (user) {
          setMessages(msgs => [...msgs, { userName: 'System', message: `${user.name} left the party`, timestamp: Date.now() }]);
        }
        return prev.filter(u => u.id !== userId);
      });
    });

    newSocket.on('channel_changed', (channel: Channel) => {
      if (!playingChannel || playingChannel.url !== channel.url) {
        onChannelSync(channel);
        setMessages(prev => [...prev, { userName: 'System', message: `Channel changed to ${channel.name}`, timestamp: Date.now() }]);
      }
    });

    newSocket.on('chat_message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomId, userName]);

  useEffect(() => {
    if (socket && playingChannel && playingChannel.url !== lastSentChannelRef.current) {
      lastSentChannelRef.current = playingChannel.url;
      socket.emit('change_channel', { roomId, channel: playingChannel });
    }
  }, [playingChannel, socket, roomId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExpanded]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      socket.emit('chat_message', { roomId, userName, message: newMessage.trim() });
      setNewMessage('');
    }
  };

  if (!isExpanded) {
    return (
      <button 
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-20 right-4 z-[150] bg-[#00ff88] text-black p-3 rounded-full shadow-lg hover:bg-[#00cc6a] transition-colors flex items-center gap-2 font-bold"
      >
        <Users className="w-6 h-6" />
        <span className="hidden sm:inline">Watch Party ({users.length})</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-[150] w-80 bg-[#1e1e1e] border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: '400px', maxHeight: '60vh' }}>
      {/* Header */}
      <div className="bg-[#2a2a2a] p-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#00ff88]" />
          <h3 className="font-bold text-white">Room: {roomId}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-black/50 px-2 py-1 rounded-full text-gray-300">
            {users.length} online
          </span>
          <button onClick={() => setIsExpanded(false)} className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
            <MessageSquare className="w-4 h-4" />
          </button>
          <button onClick={onLeave} className="p-1 hover:bg-red-500/20 rounded-full text-red-400 hover:text-red-500">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 bg-[#121212]">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.userName === 'System' ? 'items-center' : msg.userName === userName ? 'items-end' : 'items-start'}`}>
            {msg.userName === 'System' ? (
              <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full my-1">
                {msg.message}
              </span>
            ) : (
              <div className={`max-w-[85%] rounded-xl px-3 py-1.5 ${msg.userName === userName ? 'bg-[#00ff88] text-black rounded-tr-sm' : 'bg-[#2a2a2a] text-white rounded-tl-sm'}`}>
                {msg.userName !== userName && <span className="text-[10px] font-bold opacity-70 block mb-0.5">{msg.userName}</span>}
                <span className="text-sm break-words">{msg.message}</span>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-2 bg-[#1e1e1e] border-t border-gray-700 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-[#2a2a2a] text-white text-sm rounded-full px-4 py-2 outline-none focus:border-[#00ff88] border border-transparent transition-colors"
        />
        <button 
          type="submit"
          disabled={!newMessage.trim()}
          className="p-2 bg-[#00ff88] text-black rounded-full hover:bg-[#00cc6a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
