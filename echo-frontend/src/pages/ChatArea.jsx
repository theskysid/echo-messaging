import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import { authService, api } from '../services/authService';
import { friendService } from '../services/friendService';
import DirectMessageChat from './DirectMessageChat';
import FindFriendsModal from './FindFriendsModal';
import '../styles/ChatArea.css';

const ChatArea = () => {
    const navigate = useNavigate();
    const [currentUser] = useState(() => authService.getCurrentUser());

    useEffect(() => {
        if (!currentUser) {
            navigate('/login');
            return;
        }
    }, [currentUser, navigate]);

    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isTyping, setIsTyping] = useState('');

    // Multi-section chat state (up to 3 sections total)
    const [showGlobalChat, setShowGlobalChat] = useState(true);
    const [openChats, setOpenChats] = useState([]); // Array of { username: string }

    // Friend System & Ephemeral DM states
    const [sidebarTab, setSidebarTab] = useState('friends'); // 'friends' | 'users'
    const [friendsList, setFriendsList] = useState([]);
    const [incomingRequestsCount, setIncomingRequestsCount] = useState(0);
    const [showFindFriendsModal, setShowFindFriendsModal] = useState(false);
    const [unreadDms, setUnreadDms] = useState(new Map());
    const [isSidebarRefreshing, setIsSidebarRefreshing] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [removingFriendId, setRemovingFriendId] = useState(null);
    const [contextMenuFriendId, setContextMenuFriendId] = useState(null);

    const dmHandlers = useRef(new Map());
    const stompClient = useRef(null);
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const isMountedRef = useRef(true);
    const friendsListRef = useRef([]);
    const notificationTimeoutsRef = useRef(new Set());
    const longPressTimerRef = useRef(null);
    const isLongPressTriggeredRef = useRef(false);

    const emojis = ['😀', '😂', '😍', '🤔', '👍', '❤️', '🎉', '🔥', '😎', '⭐', '✨', '💯'];
    const username = currentUser?.username ?? '';
    const userColor = currentUser?.color ?? '#007bff';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    useEffect(() => {
        const handleDocumentClick = () => setContextMenuFriendId(null);
        window.addEventListener('click', handleDocumentClick);
        return () => window.removeEventListener('click', handleDocumentClick);
    }, []);

    const registerDmHandler = useCallback((otherUser, handler) => {
        dmHandlers.current.set(otherUser, handler);
    }, []);

    const unregisterDmHandler = useCallback((otherUser) => {
        dmHandlers.current.delete(otherUser);
    }, []);

    const pushNotification = useCallback((messageText, tone = 'info') => {
        const id = Date.now() + Math.random();
        setNotifications((prev) => [...prev, { id, messageText, tone }]);

        const timeoutId = window.setTimeout(() => {
            notificationTimeoutsRef.current.delete(timeoutId);
            setNotifications((prev) => prev.filter((notification) => notification.id !== id));
        }, 4000);

        notificationTimeoutsRef.current.add(timeoutId);
    }, []);

    const loadFriendsData = useCallback(async (showSpin = false) => {
        if (!isMountedRef.current) return;
        if (showSpin) setIsSidebarRefreshing(true);
        try {
            const [friends, incoming] = await Promise.all([
                friendService.getFriends(),
                friendService.getIncomingRequests()
            ]);
            if (isMountedRef.current) {
                setFriendsList(friends || []);
                setIncomingRequestsCount(incoming ? incoming.length : 0);
            }
        } catch (error) {
            console.error('Error loading friends data:', error);
        } finally {
            if (showSpin && isMountedRef.current) {
                setTimeout(() => setIsSidebarRefreshing(false), 400);
            }
        }
    }, []);

    useEffect(() => {
        loadFriendsData();
        const interval = setInterval(() => {
            loadFriendsData();
        }, 15000);
        return () => clearInterval(interval);
    }, [loadFriendsData]);

    useEffect(() => {
        friendsListRef.current = friendsList;
    }, [friendsList]);

    useEffect(() => {
        isMountedRef.current = true;
        const notificationTimeouts = notificationTimeoutsRef.current;

        const cleanupConnection = () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            if (stompClient.current) {
                try {
                    stompClient.current.disconnect();
                } catch (error) {
                    console.error('Error disconnecting STOMP client:', error);
                }
            }

            if (socketRef.current) {
                try {
                    socketRef.current.close();
                } catch (error) {
                    console.error('Error closing SockJS socket:', error);
                }
            }

            stompClient.current = null;
            socketRef.current = null;
        };

        const connectAndFetch = async () => {
            if (!isMountedRef.current || !username) return;

            setOnlineUsers(prev => {
                const newSet = new Set(prev);
                newSet.add(username);
                return newSet;
            });

            cleanupConnection();

            socketRef.current = new SockJS(`${import.meta.env.VITE_API_URL}/ws`);
            stompClient.current = Stomp.over(socketRef.current);

            stompClient.current.connect({
                'client-id': username,
                'session-id': Date.now().toString(),
                'username': username
            }, () => {
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = null;
                }

                stompClient.current.subscribe('/topic/public', (msg) => {
                    const chatMessage = JSON.parse(msg.body);

                    setOnlineUsers(prev => {
                        const newUsers = new Set(prev);
                        if (chatMessage.type === 'JOIN') {
                            newUsers.add(chatMessage.sender);
                        } else if (chatMessage.type === 'LEAVE') {
                            newUsers.delete(chatMessage.sender);
                        }
                        return newUsers;
                    });

                    if (chatMessage.type === 'TYPING') {
                        setIsTyping(chatMessage.sender);
                        clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => {
                            setIsTyping('');
                        }, 2000);
                        return;
                    }

                    if (
                        chatMessage.type === 'JOIN'
                        && chatMessage.sender !== username
                        && friendsListRef.current.some((friend) => friend.username === chatMessage.sender)
                    ) {
                        pushNotification(`${chatMessage.sender} is online now`);
                    }

                    setMessages(prev => [...prev, {
                        ...chatMessage,
                        timestamp: chatMessage.timestamp || new Date(),
                        id: chatMessage.id || (Date.now() + Math.random())
                    }]);
                });

                // New Ephemeral DM queue subscription
                stompClient.current.subscribe(`/user/${username}/queue/dm`, (msg) => {
                    const dmMessage = JSON.parse(msg.body);
                    const otherUser = dmMessage.senderUsername === username ? dmMessage.recipientUsername : dmMessage.senderUsername;
                    const handler = dmHandlers.current.get(otherUser);

                    if (handler) {
                        try {
                            handler(dmMessage);
                        } catch (error) {
                            console.error('Error calling DM handler:', error);
                        }
                    } else if (dmMessage.senderUsername !== username && dmMessage.content !== 'TYPING') {
                        setUnreadDms(prev => {
                            const newUnread = new Map(prev);
                            const currentCount = newUnread.get(otherUser) || 0;
                            newUnread.set(otherUser, currentCount + 1);
                            return newUnread;
                        });
                        pushNotification(`New private message from ${otherUser}`);
                    }
                });

                // Real-time notifications for Friend System updates
                stompClient.current.subscribe(`/user/${username}/queue/friends`, (msg) => {
                    const event = JSON.parse(msg.body);
                    if (event?.type === 'FRIEND_REQUEST_RECEIVED') {
                        pushNotification(`New friend request from ${event.username}`);
                    } else if (event?.type === 'FRIEND_REQUEST_ACCEPTED') {
                        pushNotification(`${event.username} accepted your friend request`);
                    } else if (event?.type === 'FRIEND_REMOVED') {
                        pushNotification(`${event.username} is no longer in your friends list`);
                    }
                    loadFriendsData();
                    setRefreshTrigger(prev => prev + 1);
                });

                stompClient.current.send("/app/chat.addUser", {}, JSON.stringify({
                    sender: username,
                    type: 'JOIN',
                    color: userColor
                }));

                authService.getOnlineUsers()
                    .then(data => {
                        if (isMountedRef.current && Array.isArray(data)) {
                            setOnlineUsers(prev => {
                                const mergedSet = new Set(prev);
                                data.forEach(user => mergedSet.add(user));
                                mergedSet.add(username);
                                return mergedSet;
                            });
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching initial online users:', error);
                    });

                api.get('/api/messages/global')
                    .then(response => {
                        if (isMountedRef.current && Array.isArray(response.data)) {
                            setMessages(response.data);
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching global chat history:', error);
                    });

            }, (error) => {
                console.error('STOMP connection error:', error);
                if (isMountedRef.current && !reconnectTimeoutRef.current) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connectAndFetch();
                    }, 5000);
                }
            });
        };

        connectAndFetch();

        return () => {
            isMountedRef.current = false;
            cleanupConnection();
            clearTimeout(typingTimeoutRef.current);
            notificationTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
            notificationTimeouts.clear();
        };
    }, [username, userColor, loadFriendsData, pushNotification]);

    const openDmChat = (otherUser) => {
        if (otherUser === username) return;

        setOpenChats(prev => {
            if (prev.some(c => c.username === otherUser)) return prev;
            const maxLimit = showGlobalChat ? 2 : 3;
            const next = [...prev, { username: otherUser }];
            if (next.length > maxLimit) {
                return next.slice(next.length - maxLimit);
            }
            return next;
        });

        setUnreadDms(prev => {
            const newUnread = new Map(prev);
            newUnread.delete(otherUser);
            return newUnread;
        });
    };

    const closeDmChat = (otherUser) => {
        setOpenChats(prev => prev.filter(c => c.username !== otherUser));
        unregisterDmHandler(otherUser);
    };

    const handleRemoveFriend = async (friend) => {
        if (!friend.friendshipId) {
            return;
        }

        const confirmed = window.confirm(`Remove ${friend.username} from your friends list?`);
        if (!confirmed) {
            return;
        }

        setRemovingFriendId(friend.friendshipId);
        try {
            await friendService.removeFriend(friend.friendshipId);
            setOpenChats((prev) => prev.filter((chat) => chat.username !== friend.username));
            setUnreadDms((prev) => {
                const nextUnread = new Map(prev);
                nextUnread.delete(friend.username);
                return nextUnread;
            });
            pushNotification(`${friend.username} was removed from your friends list`);
            await loadFriendsData();
        } catch (error) {
            const errorMessage = error.response?.data?.error || error.message || 'Could not remove friend';
            window.alert(errorMessage);
        } finally {
            setRemovingFriendId(null);
        }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (message.trim() && stompClient.current && stompClient.current.connected) {
            const chatMessage = {
                sender: username,
                content: message,
                type: 'CHAT',
                color: userColor
            };

            stompClient.current.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
            setMessage('');
            setShowEmojiPicker(false);
        }
    };

    const handleTyping = (e) => {
        setMessage(e.target.value);

        if (stompClient.current && stompClient.current.connected && e.target.value.trim()) {
            stompClient.current.send("/app/chat.sendMessage", {}, JSON.stringify({
                sender: username,
                type: 'TYPING'
            }));
        }
    };

    const addEmoji = (emoji) => {
        setMessage(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            timeZone: 'Asia/Kolkata',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const totalColumns = (showGlobalChat ? 1 : 0) + openChats.length;
    const gridClass = totalColumns <= 1 ? 'columns-1' : totalColumns === 2 ? 'columns-2' : 'columns-3';

    if (!currentUser) {
        return null;
    }

    return (
        <div className="chat-container">
            {notifications.length > 0 && (
                <div className="friend-notifications">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`friend-notification ${notification.tone === 'error' ? 'error' : ''}`}
                        >
                            {notification.messageText}
                        </div>
                    ))}
                </div>
            )}

            <div className="sidebar">
                <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Users & Friends</h3>
                    <button
                        onClick={() => loadFriendsData(true)}
                        className={`sidebar-refresh-icon ${isSidebarRefreshing ? 'spin' : ''}`}
                        title="Live Refresh Friends & Requests"
                    >
                        🔄
                    </button>
                </div>

                {!showGlobalChat && (
                    <button
                        onClick={() => {
                            setShowGlobalChat(true);
                            if (openChats.length >= 3) {
                                setOpenChats(prev => prev.slice(prev.length - 2));
                            }
                        }}
                        className="open-global-chat-btn"
                    >
                        + Open Global Chat
                    </button>
                )}

                <div className="sidebar-tabs">
                    <button
                        className={`sidebar-tab-btn ${sidebarTab === 'friends' ? 'active' : ''}`}
                        onClick={() => setSidebarTab('friends')}
                    >
                        👥 Friends
                        {incomingRequestsCount > 0 && (
                            <span className="unread-count" style={{ marginLeft: '6px' }}>{incomingRequestsCount}</span>
                        )}
                    </button>
                    <button
                        className={`sidebar-tab-btn ${sidebarTab === 'users' ? 'active' : ''}`}
                        onClick={() => setSidebarTab('users')}
                    >
                        🌐 Global Users
                    </button>
                </div>

                <div className="users-list">
                    {sidebarTab === 'friends' ? (
                        <>
                            <button
                                className="add-friend-trigger-btn"
                                onClick={() => setShowFindFriendsModal(true)}
                            >
                                🔍 Find / Add Friends
                                {incomingRequestsCount > 0 && (
                                    <span className="unread-count">{incomingRequestsCount}</span>
                                )}
                            </button>

                            {friendsList.length === 0 ? (
                                <div style={{ padding: '20px 10px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
                                    No friends added yet. Click above to search and add friends!
                                </div>
                            ) : (
                                friendsList.map((friend) => {
                                    const isOnline = onlineUsers.has(friend.username) || friend.online;
                                    const friendKey = friend.friendshipId || friend.id;
                                    const isMenuOpen = contextMenuFriendId === friendKey;

                                    const handleStartPress = () => {
                                        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                                        longPressTimerRef.current = setTimeout(() => {
                                            isLongPressTriggeredRef.current = true;
                                            setContextMenuFriendId(friendKey);
                                        }, 550);
                                    };

                                    const handleCancelPress = () => {
                                        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                                    };

                                    return (
                                        <div
                                            key={friendKey}
                                            className={`friend-sidebar-item ${isMenuOpen ? 'menu-active' : ''}`}
                                            onClick={(e) => {
                                                if (isLongPressTriggeredRef.current) {
                                                    isLongPressTriggeredRef.current = false;
                                                    return;
                                                }
                                                openDmChat(friend.username);
                                            }}
                                            onContextMenu={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setContextMenuFriendId(friendKey);
                                            }}
                                            onMouseDown={handleStartPress}
                                            onMouseUp={handleCancelPress}
                                            onMouseLeave={handleCancelPress}
                                            onTouchStart={handleStartPress}
                                            onTouchEnd={handleCancelPress}
                                            style={{ position: 'relative' }}
                                        >
                                            <div className="friend-sidebar-user">
                                                <div className="user-avatar" style={{ backgroundColor: '#1e3c72' }}>
                                                    {friend.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>
                                                        {friend.username}
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: isOnline ? '#00e676' : '#999' }}>
                                                        {isOnline ? '🟢 Online' : '⚪ Offline'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {unreadDms.has(friend.username) && (
                                                    <span className="unread-count">{unreadDms.get(friend.username)}</span>
                                                )}
                                                <span style={{ fontSize: '16px', title: 'Open Ephemeral DM' }}>💬</span>
                                                <button
                                                    type="button"
                                                    className="friend-menu-trigger-btn"
                                                    title="More Options (or Long Press)"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setContextMenuFriendId(isMenuOpen ? null : friendKey);
                                                    }}
                                                >
                                                    ⋮
                                                </button>
                                            </div>

                                            {isMenuOpen && (
                                                <div
                                                    className="friend-longpress-menu"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        type="button"
                                                        className="delete-friend-btn"
                                                        disabled={removingFriendId === friend.friendshipId}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setContextMenuFriendId(null);
                                                            handleRemoveFriend(friend);
                                                        }}
                                                    >
                                                        🗑️ {removingFriendId === friend.friendshipId ? 'Removing...' : 'Delete Friend'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="close-menu-btn"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setContextMenuFriendId(null);
                                                        }}
                                                        title="Close menu"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </>
                    ) : (
                        <>
                            <div className="global-users-hint">
                                Private chat is available only from the Friends tab.
                            </div>
                            {Array.from(onlineUsers).map(user => {
                                const isFriend = friendsList.some((friend) => friend.username === user);
                                return (
                                    <div
                                        key={user}
                                        className={`user-item ${user === username ? 'current-user' : ''} ${isFriend ? 'friend-user-item' : ''}`}
                                        onClick={() => {
                                            if (isFriend && user !== username) {
                                                openDmChat(user);
                                            }
                                        }}
                                    >
                                        <div className="user-avatar" style={{ backgroundColor: user === username ? userColor : '#007bff' }}>
                                            {user.charAt(0).toUpperCase()}
                                        </div>
                                        <span>{user}</span>
                                        {user === username && <span className="you-label">(You)</span>}
                                        {user !== username && (
                                            <span className="global-user-tag">
                                                {isFriend ? 'Friend' : 'Global'}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            </div>

            <div className={`chat-workspace-grid ${gridClass}`}>
                {showGlobalChat && (
                    <div className="chat-panel-card global-chat-panel">
                        <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '17px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    🌐 Global Chat
                                    <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '12px', fontWeight: '500' }}>
                                        {onlineUsers.size} Online
                                    </span>
                                </h2>
                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#e2e8f0' }}>Welcome, {username}!</p>
                            </div>
                            <button
                                onClick={() => setShowGlobalChat(false)}
                                className="panel-close-btn"
                                title="Hide Global Chat to make room for 3 private chats"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="messages-container">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`message ${msg.type.toLowerCase()}`}>
                                    {msg.type === 'JOIN' && (
                                        <div className="system-message">
                                            {msg.sender} joined the chat
                                        </div>
                                    )}
                                    {msg.type === 'LEAVE' && (
                                        <div className="system-message">
                                            {msg.sender} left the chat
                                        </div>
                                    )}
                                    {msg.type === 'CHAT' && (
                                        <div className={`chat-message ${msg.sender === username ? 'own-message' : ''}`}>
                                            <div className="message-info">
                                                <span className="sender" style={{ color: msg.color || '#007bff' }}>
                                                    {msg.sender}
                                                </span>
                                                <span className="time">{formatTime(msg.timestamp)}</span>
                                            </div>
                                            <div className="message-text">{msg.content}</div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {isTyping && isTyping !== username && (
                                <div className="typing-indicator">
                                    {isTyping} is typing...
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        <div className="input-area">
                            {showEmojiPicker && (
                                <div className="emoji-picker">
                                    {emojis.map(emoji => (
                                        <button key={emoji} type="button" onClick={() => addEmoji(emoji)}>
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <form onSubmit={sendMessage} className="message-form">
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="emoji-btn"
                                >
                                    😀
                                </button>
                                <input
                                    type="text"
                                    placeholder="Type a message to global chat..."
                                    value={message}
                                    onChange={handleTyping}
                                    className="message-input"
                                    maxLength={500}
                                />
                                <button type="submit" disabled={!message.trim()} className="send-btn">
                                    Send
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {openChats.map((chatItem) => (
                    <div key={`dm-${chatItem.username}`} className="chat-panel-card">
                        <DirectMessageChat
                            currentUser={username}
                            recipientUsername={chatItem.username}
                            stompClient={stompClient}
                            onClose={() => closeDmChat(chatItem.username)}
                            registerDmHandler={registerDmHandler}
                            unregisterDmHandler={unregisterDmHandler}
                            isEmbedded={true}
                        />
                    </div>
                ))}
            </div>

            {showFindFriendsModal && (
                <FindFriendsModal
                    onClose={() => setShowFindFriendsModal(false)}
                    onFriendsChange={() => loadFriendsData(true)}
                    refreshTrigger={refreshTrigger}
                />
            )}
        </div>
    );
};

export default ChatArea;
