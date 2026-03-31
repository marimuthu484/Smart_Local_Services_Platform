import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { PaperAirplaneIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';

const Chat = () => {
    const { bookingId } = useParams();
    const { user } = useAuth();
    const { socket } = useSocket();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [chatInfo, setChatInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    // Fetch initial chat history
    useEffect(() => {
        const fetchChatHistory = async () => {
            try {
                const res = await api.get(`/chat/${bookingId}`);
                if (res.data.chat) {
                    setChatInfo(res.data.chat);
                    setMessages(res.data.chat.messages);
                }
            } catch (err) {
                console.error('Failed to load chat history', err);
            } finally {
                setLoading(false);
            }
        };

        fetchChatHistory();
    }, [bookingId]);

    // Handle socket connections
    useEffect(() => {
        if (!socket || !bookingId) return;

        // Join room
        socket.emit('join_chat', { bookingId });

        // Listen for new messages
        const handleReceiveMessage = ({ message }) => {
            setMessages((prev) => [...prev, message]);
        };

        socket.on('receive_message', handleReceiveMessage);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
        };
    }, [socket, bookingId]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket) return;

        // We send payload to server, server broadcasts to everyone.
        socket.emit('send_message', { bookingId, content: newMessage });
        setNewMessage('');
    };

    if (loading) return (
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        </div>
    );

    // Determine chat partner name
    const getPartnerName = () => {
        if (!chatInfo || !chatInfo.participants) return 'Chat';
        const partner = chatInfo.participants.find(p => p._id !== user.id);
        return partner ? partner.name : 'Unknown User';
    };

    return (
        <div className="mx-auto flex max-w-4xl flex-col h-[calc(100vh-64px)] p-4 sm:p-6 lg:p-8">
            <div className="glass-card flex h-full flex-col overflow-hidden">

                {/* Chat Header */}
                <div className="flex items-center border-b border-slate-700/50 bg-slate-800/80 px-6 py-4">
                    <Link to="/bookings" className="mr-4 text-slate-400 hover:text-white transition">
                        <ArrowLeftIcon className="h-5 w-5" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-bold text-white shadow-lg">
                            {getPartnerName().charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">{getPartnerName()}</h2>
                            <p className="text-xs text-indigo-300">Booking #{bookingId.slice(-6).toUpperCase()}</p>
                        </div>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-900/40">
                    {messages.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-slate-500">
                            <PaperAirplaneIcon className="h-12 w-12 opacity-20 mb-4" />
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {messages.map((msg, idx) => {
                                // Handle different object structures between initial load (populated sender) and socket real-time (unpopulated or partial sender)
                                const senderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;
                                const isMe = senderId === user.id;

                                return (
                                    <div key={msg._id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] rounded-2xl px-5 py-3 ${isMe
                                                ? 'bg-indigo-600 text-white rounded-br-none shadow-[0_4px_15px_rgba(99,102,241,0.3)]'
                                                : 'bg-slate-700 text-slate-100 rounded-bl-none shadow-lg'
                                            }`}>
                                            <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                                            <span className={`mt-1 block text-right text-[10px] ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="border-t border-slate-700/50 bg-slate-800/80 p-4">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="input-field flex-1 !rounded-full !bg-slate-900 focus:!border-indigo-500"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 shadow-lg"
                        >
                            <PaperAirplaneIcon className="h-5 w-5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Chat;
