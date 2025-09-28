import { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ChatArea.css';
import { authService } from '../services/authService.js';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import PrivateChat from './PrivateChat.jsx';
const ChatArea = () => {

    const navigate = useNavigate();
    const currentUser = authService.getCurrentUser();
    const token = authService.getToken();

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

    const scrollToBottom = () => {
        messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }

    const registerPrivateMessageHandler = useCallback((otherUser, handler) => {
        privateMessageHandlers.current.set(otherUser, handler);
    }, []);

    const unregisterPrivateMessageHandler = useCallback((otherUser) => {
        privateMessageHandlers.current.delete(otherUser);
    }, []);

    if (!currentUser) {
        return null; // or a loading spinner
    }

    const {username, color: userColor} = currentUser;

    useEffect(() => {
        console.log("🚀 ChatArea useEffect triggered for user:", username);
        let reconnectInterval;

        const connectAndFetch = async() => {
            if(!username) {
                console.log("❌ No username found, aborting connection");
                return;
            }
            console.log("🔄 Starting connectAndFetch for user:", username);

            setOnlineUsers(prev => {
                const newSet = new Set(prev);
                newSet.add(username);
                return newSet;
            });

            console.log("🔌 Attempting to connect to WebSocket...");
            const socket = new SockJS('http://localhost:8080/ws');
            stompClient.current = Stomp.over(socket);

            // Include JWT token in connection headers
            const headers = {
                'Authorization': `Bearer ${token}`,
                'client-id': username,
                'session-id': Date.now().toString(),
                'username': username
            };
            console.log("🔑 Connection headers:", headers);

            stompClient.current.connect(headers, () => {
                console.log("✅ WebSocket connected successfully for user:", username);
                clearInterval(reconnectInterval);
                
                const GroupChat = stompClient.current.subscribe('/topic/public', (msg) => {
                    const chatMessage = JSON.parse(msg.body);
                    console.log("📨 Received public message:", chatMessage);

                    setOnlineUsers(prev => {
                       const newUsers = new Set(prev);
                       if(chatMessage.type === 'JOIN'){
                            console.log("User joined:", chatMessage.sender);
                            newUsers.add(chatMessage.sender);
                       } else if(chatMessage.type === 'LEAVE'){
                            console.log("User left:", chatMessage.sender);
                            newUsers.delete(chatMessage.sender);
                       }
                       console.log("Online users after JOIN/LEAVE:", Array.from(newUsers));
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

                    setMessages(prev => [...prev, {
                        ...chatMessage,
                        timestamp: chatMessage.timestamp || new Date().toISOString(),
                        id: chatMessage.id || (Date.now() + Math.random())
                    }]);

                });

                const PrivateChat = stompClient.current.subscribe(`/user/${username}/queue/user`, (msg) => {
                    const privateMessage = JSON.parse(msg.body);
                    const otherUser = privateMessage.sender === username ? privateMessage.recipient : privateMessage.sender;

                    const handler = privateMessageHandlers.current.get(otherUser);

                    if (handler) {
                        try {
                            handler(privateMessage);
                        } catch (error) {
                            console.error("Error in private message handler:", error);
                        }
                    } else if(privateMessage.recipient === username){
                        setUnreadMessages(prev => {
                            const newUnread = new Map(prev);
                            const currentCount = newUnread.get(otherUser) || 0;
                            newUnread.set(otherUser, currentCount + 1);
                            return newUnread;
                        });
                    }
                });           
                
                const joinMessage = {
                    username: username, 
                    type: 'JOIN',
                    color: userColor
                };
                
                console.log("🚀 Sending JOIN message:", joinMessage);
                stompClient.current.send("/app/chat.addUser", {}, JSON.stringify(joinMessage));
                console.log("✅ JOIN message sent for user:", username);
                
                // Fetch online users after a brief delay to allow server processing
                setTimeout(() => {
                    console.log("🔄 Fetching online users from API...");
                    console.log("🔑 Current user token:", token ? `${token.substring(0, 20)}...` : 'null');
                    authService.getOnlineUsers().then(data => {
                        console.log("📊 API Response - online users data:", data);
                        console.log("📊 Data type:", typeof data);
                        console.log("📊 Data keys:", Object.keys(data || {}));
                        
                        const fetchedUsers = Object.keys(data || {});
                        console.log("👥 Extracted usernames:", fetchedUsers);
                        
                        setOnlineUsers(prev => {
                            const mergeSet = new Set(prev);
                            fetchedUsers.forEach(user => mergeSet.add(user));
                            mergeSet.add(username);
                            console.log("✅ Updated online users:", Array.from(mergeSet));
                            return mergeSet;
                        });
                    })
                    .catch(err => {
                        console.error("❌ Error fetching online users:", err);
                        console.error("❌ Error details:", err.response?.data || err.message);
                        console.error("❌ Status code:", err.response?.status);
                    });
                }, 1000);
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

    }, [username, userColor, token, registerPrivateMessageHandler, unregisterPrivateMessageHandler]);


    //internal implementations of the functions 
    const openPrivateChat = (otherUser) => {
        if(otherUser === username) return;

        setPrivateChats(prev => {
            const newChats = new Map(prev);
            newChats.set(otherUser, true);
            return newChats;
        });

        setUnreadMessages(prev => {
            const newUnread = new Map(prev);
            newUnread.delete(otherUser);
            return newUnread;
        });
    }

    const closePrivateChat = (otherUser) => {
        setPrivateChats(prev => {
            const newChats = new Map(prev);
            newChats.delete(otherUser);
            return newChats;
        });
        unregisterPrivateMessageHandler(otherUser);
    }

    const sendMessage = (e) => {
        e.preventDefault();
        if(stompClient.current && stompClient.current.connected && message.trim()){
            const chatMessage = {
                sender: username,
                content: message,
                type: 'CHAT',
                color: userColor,
                // timestamp: new Date().toISOString()
            };

            stompClient.current.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
            setMessage("");
            setShowEmojiPicker(false);
        }
    }

    const handleTyping = (e) => {
        setMessage(e.target.value);

        if(stompClient.current && stompClient.current.connected && e.target.value.trim()){
            stompClient.current.send("/app/chat.sendMessage", {}, JSON.stringify({
                sender: username,
                type: 'TYPING'
            }));
        }
    };

    const addEmoji = (emoji) => {
        setMessage(prev => prev + emoji);
        setShowEmojiPicker(false);
    }

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            timeZone: 'Asia/Kolkata',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        } );
    };
    

    return (
        <div className="chat-container">
            <div className="sidebar">
                <div className="sidebar-header">
                    <h2>Users</h2>
                </div>

                <div className="users-list">
                    {(() => {
                        const usersList = Array.from(onlineUsers);
                        console.log("Rendering users list:", usersList);
                        return usersList.map((user) => (
                            <div 
                            key={user} 
                            className={`user-item ${user === username ? 'current-user' : ''}`}
                            onClick={() => openPrivateChat(user)}>

                                <div className="user-avatar" style={{backgroundColor: user===username ? userColor : `#007bff`}}>
                                    {user.charAt(0).toUpperCase()}
                                </div>
                                <span>{user}</span>
                                {user===username && <span className="you-label">(You)</span>}
                                {unreadMessages.has(user) && (
                                    <span className="unread-count">{unreadMessages.get(user)}</span>
                                )}
                            </div>
                        ));
                    })()}
                </div>
            </div>
            
            <div className="main-chat">
                <div className="chat-header">
                    <h4>Welcome, {username}</h4>
                    <button 
                        onClick={() => {
                            console.log("🧪 Manual test: Fetching online users...");
                            authService.getOnlineUsers()
                                .then(data => console.log("🧪 Manual test result:", data))
                                .catch(err => console.error("🧪 Manual test error:", err));
                        }}
                        style={{marginLeft: '10px', padding: '5px 10px', fontSize: '12px'}}
                    >
                        Test API
                    </button>
                </div>
                
                <div className="message-container">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`message ${msg.type.toLowerCase()}`}> 
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
                                    <div className={`chat-message ${msg.sender === username ? 'own-message' : ''}`}>
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
                                <button key={emoji} onClick={() => addEmoji(emoji)}>{emoji}</button>
                            ))}
                        </div>
                    )}

                    <form onSubmit={sendMessage} className='message-form'>
                        <button type='button' onClick={() => setShowEmojiPicker(!showEmojiPicker)} className='emoji-btn'>
                            😊
                        </button>


                        <input type='text' placeholder='type a message' value={message} onChange={handleTyping} className='message-input' maxLength={500} />

                        <button type='submit' className='send-btn' disabled={!message.trim()}></button>
                    </form>

                </div>

            </div>

            {Array.from(privateChats.keys()).map((otherUser) => (
                <PrivateChat 
                    key={otherUser}
                    currentUser={username}
                    recipientUser = {otherUser}
                    userColor = {userColor}
                    stompClient = {stompClient}
                    onClose = {() => {
                        closePrivateChat(otherUser);
                    }}
                    registerPrivateMessageHandler = {registerPrivateMessageHandler}
                    unregisterPrivateMessageHandler = {unregisterPrivateMessageHandler}
                />
            ))}

        </div>
    );

};

export default ChatArea;