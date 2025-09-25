import { use, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService as result } from '../services/authService.js';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

const ChatArea = () => {

    const navigate = useNavigate();
    const currentUser = result.getCurrentUser();

    useEffect(() => {
        if (!currentUser) {
            navigate('/login');
            return;
        }
    }, [currentUser, navigate]);

    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isTyping, setIsTyping] = useState('');
    const [privateChats, setPrivateChats] = useState(new Map());
    const [unreadMessages, setUnreadMessages] = useState(new Map());
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    
    const privateMessageHandlers = useRef(new Map());
    const stompClient = useRef(null);
    const messageEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const emojis = [
        "😀", "😂", "😍", "😎", "😭", "😡", "👍", "🙏", "🎉", "💔",
        "🔥", "🌟", "💯", "🎶", "🍕", "🍔", "⚽", "🏀", "🚗", "✈️"
    ];

    if (!currentUser) {
        return null; // or a loading spinner
    }

    const {username, color: userColor} = currentUser;

    const scrollToBottom = () => {
        messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }

    const registerPrivateMessageHandler = useCallback((otherUser, handler) => {
        privateMessageHandlers.current.set(otherUser, handler);
    }, []);

    const unregisterPrivateMessageHandler = useCallback((otherUser) => {
        privateMessageHandlers.current.delete(otherUser);
    }, []);
    

    useEffect(() => {
        let reconnectInterval;

        const connectAndFetch = async() => {
            if(!username) return;

            setOnlineUsers(prev => {
                const prevSet = new Set(prev);
                newSet.add(username);
                return prevSet;
            });

            const socket = new SockJS('https://localhost:8080/ws');
            stompClient.current = Stomp.over(socket);

            stompClient.current.connect({
                'client-id': username,
                'session-id': Date.now().toString(),
                'username': username
            }, async(frame) => {
                clearInterval(reconnectInterval);
                const GroupChat = stompClient.current.subscribe('/topic/public', (msg) => {
                    const chatMessage = JSON.parse(msg.body);

                    setOnlineUsers(prev => {
                       const newUsers = new Set(prev);
                       if(chatMessage.type === 'JOIN'){
                            newUsers.add(chatMessage.sender);
                       } else if(chatMessage.type === 'LEAVE'){
                            newUsers.delete(chatMessage.sender);
                       }
                       return newUsers;         

                    });

                    if(chatMessage.type === 'TYPING'){
                        setIsTyping(chatMessage.sender);
                        clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => {
                            setIsTyping('');
                        }, 2000);
                        return;
                    }

                    setMessage(prev => [...prev, {
                        ...chatMessage,
                        timestamp: chatMessage.timestamp || new Date().toISOString(),
                        id: chatMessage.id || (Date.now() + Math.random())
                    }]);

                });
        }
}