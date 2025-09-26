import { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, authService as result } from '../services/authService.js';
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
            }, (frame) => {
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

                const PrivateChat = stompClient.current.subscribe('/user/${username}/queue/user', (msg) => {
                    const privateMessage = JSON.parse(msg.body);
                    const otherUser = privateMessage.sender === username ? privateMessage.recepient : privateMessage.sender;

                    const handler = privateMessageHandlers.current.get(otherUser);

                    if (handler) {
                        try {
                            handler(privateMessage);
                        } catch (error) {
                            console.error("Error in private message handler:", error);
                        }
                    } else if(privateMessage.recepient === username){
                        setUnreadMessages(prev => {
                            const newUnread = new Map();
                            const currentCount = newUnread.get(otherUser) || 0;
                            newUnread.set(otherUser, currentCount + 1);
                            return newUnread;
                        });
                    }
                });           
                
                stompClient.current.send("/app/chat.addUser", {}, JSON.stringify({
                    username: username, 
                    type: 'JOIN',
                    color: userColor
                }));
                
                authService.getOnlineUsers().then(data => {
                    const fetchedUsers = Object.keys(data);
                    setOnlineUsers(prev => {
                        const mergeSet = new Set(prev);
                        fetchedUsers.forEach(user => mergeSet.add(user));
                        mergeSet.add(username);
                        return mergeSet;
                    });
                })
                    .catch(err => {
                        console.error("Error fetching online users:", err);
                    });
                }, (error) => {
                    console.error("STOMP connection error:", error);
                    if(!reconnectInterval){
                        reconnectInterval = setInterval(() => {
                            connectAndFetch();
                        }, 5000);
                    }
                });
        };

        connectAndFetch();

        return () => {
            if(stompClient.current && stompClient.current.connected){
                stompClient.current.disconnect();
            }
            clearTimeout(typingTimeoutRef.current);
            clearInterval(reconnectInterval);

        };

    }, [username, userColor, registerPrivateMessageHandler, unregisterPrivateMessageHandler]);


    return (
        <div className="chat-container">
            <div className="sidebar">
                <div className="sidebar-header">
                    <h2>Users</h2>
                </div>

                <div className="user-list">
                    {Array.from(onlineUsers).map((user) => (
                        <div 
                        key={user} 
                        className={"user-item ${user === username ? 'current-user' : ''}"}
                        onclick={() => openPrivateChat(user)}>

                            <div className="user-avatar" style={{backgroundColor: user===username ? userColor : `#007bff`}}>
                                {user.charAt(0).toUpperCase()}
                            </div>
                            <span>{user}</span>
                            {user===username && <span className="you-label">(You)</span>}
                            {unreadMessages.has(user) && (
                                <span className="unread-count">{unreadMessages.get(user)}</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="main-chat">
                <div className="chat-header">
                    <h4>Welcome, {username}</h4>
                </div>
                
                <div className="message-container">
                    {messages.map((msg) => (
                        <div key={msg.id} className={"message ${msg.type.toLowerCase()"}> 
                            {msg.type === 'JOIN' && (
                                <div className="system-message">
                                    {msg.sender} joined the group.
                                </div>
                            )}

                            {
                                msg.type === 'LEAVE' && (
                                    <div className="system-message">
                                        {msg.sender} left the group.
                                    </div>
                                )
                            }

                            {
                                msg.type === 'CHAT' && (
                                    <div className={"chat-message ${msg.sender === username ? 'own-message' : ''}"}>
                                        <div className="message-info">
                                            <span className='sender' style={{color: msg.color || '#007bff'}}>
                                                {msg.sender}
                                            </span>
                                            <span className="timestamp">{formatTime(msg.timestamp)}</span>
                                        </div>
                                        <div className="message-text">{msg.content}</div>
                                    </div>
                                )
                            }

                        </div>
                    ))}

                    {isTyping && isTyping !== username && (
                        <div className="typing-indicator">
                            {isTyping} is typing...
                        </div>
                    )}

                    <div ref={messageEndRef} />

                </div>

                <div className="input-area">
                    {showEmojiPicker && (
                        <div className="emoji-picker">
                            {emojis.map((emoji) => (
                                <button key={emojis} onclick={() => addEmoji(emoji)}>{emoji}</button>
                            ))}
                        </div>
                    )}

                    <form onSubmit={sendMessage} className='message-form'>
                        <button type='button' onclick={() => setShowEmojiPicker(!showEmojiPicker)} className='emoji-btn'>
                            😊
                        </button>


                        <input type='text' placeholder='type a message' value={message} onChange={handleTyping} className='message-input' maxLength={500} />

                        <button type='submit' className='send-btn' disabled={!message.trim()}></button>
                    </form>

                </div>

            </div>

            {Array.from}

        </div>
    )

}