import React, { useState, useRef, useEffect, use } from 'react'
import '../styles/PrivateChat.css';

const PrivateChat = ({
    currentUser,
    recipientUser,
    userColor,
    stompClient,
    onClose,
    registerPrivateMessageHandler,
    unregisterPrivateMessageHandler 
}) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const messageIdRef = useRef(new Set());

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const createMessageId = () => {
        return '${msg.sender} - ${msg.recipient} - ${msg.content} - ${msg.timestamp}';  
    };
    
    useEffect(() => {
        let isMounted = true;

        const loadMessageHistory = async () => {
            try{
                const response = await fetch(`http://localhost:8080/api/messages/private?user1=${currentUser}&user2=${recipientUser}`); 
                
                if(response.ok && isMounted){
                    
                    const history = await response.json();
                    const processedHistory = history.map(msg => {
                        const messageId = msg.id || createMessageId(msg);
                        return { 
                            ...msg, 
                            id: messageId 
                        };
                    });
                    messageIdRef.current.clear();
                    processedHistory.forEach(msg => messageIdRef.current.add(msg.id));
                    setMessages(processedHistory);
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error loading message history:", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        loadMessageHistory();
        registerPrivateMessageHandler(recipientUser, handleIncomingPrivateMessage);

        return () => {
            isMounted = false;
            unregisterPrivateMessageHandler(recipientUser);
        }
    }, [currentUser, recipientUser, registerPrivateMessageHandler, unregisterPrivateMessageHandler]);
    
    //implementing the functions

    const handleIncomingPrivateMessage = (priavateMessage) => { 

        const messageId = priavateMessage.id || createMessageId(priavateMessage);
        const isOwnMessage = priavateMessage.sender === currentUser;


        const isRelevantMessage = (priavateMessage.sender === currentUser && priavateMessage.recipient === recipientUser) ||
                                  (priavateMessage.sender === recipientUser && priavateMessage.recipient === currentUser);

        if (isRelevantMessage && !isOwnMessage) {
            if (!messageIdRef.current.has(messageId)) {
                const newMsg = { ...priavateMessage, id: messageId };
            }
            messageIdRef.current.add(messageId);
            setMessages((prevMessages) => [...prevMessages, newMessage]);
        }    
    };

    const sendPrivateMessage = (e) => {
        e.preventDefault();
        if (message.trim() && stompClient.current && stompClient.current.connected ) {
            const timestamp = new Date();
            const privateMessage = {
                sender: currentUser,
                recipient: recipientUser,
                content: message.trim(),
                type: "PRIVATE_MESSAGE",
                timestamp: timestamp,
                color: userColor
            };

            const messageId = createMessageId(privateMessage);
            const messageWithId = {
                ...privateMessage,
                id: messageId   
            };

            if(!messageIdRef.current.has(messageId)){
                messageIdRef.current.add(messageId);
                setMessages((prevMessages) => [...prevMessages, messageWithId]);
            }

            try{
                if(stompClient.current.connected){
                    stompClient.current.send("/app/chat.sendMessage", {}, JSON.stringify(privateMessage));
                    setMessage("");
                } else {
                    setMessages(prev => prev.filter(msg => msg.id !== messageId));
                    messageIdRef.current.delete(messageId);
                }
            } catch (error) {
                console.error("Error sending private message:", error);
                setMessages(prev => prev.filter(msg => msg.id !== messageId));
                messageIdRef.current.delete(messageId);
            }
        }
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            timeZone: 'Asia/Kolkata',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        } );
    };

    if (loading) {
        return (
            <div className="private-chat-window">
                <div className="private-chat-header">
                    <h3>{recipientUser}</h3>
                    <button onClick={onClose} className='close-btn'></button>
                </div>
                <div className="loading">
                    Loading Messages
                </div>
            </div>
        );

    }
    return (
        <div className="private-chat-window">
            <div className="private-chat-header">
                <div className="recipient-info">
                    <div className="recipient-avatar">
                        {recipientUser.charAt(0).toUpperCase()}
                    </div>
                    <h3>{recipientUser}</h3>
                </div>
                <button onClick={onCose} className= "close-button">Close</button>
            </div>
            <div className="private-message-container">
                {messageIdRef.length===0 ? (
                    <div className="no-message">
                        <p>No Messages yet. Start the conversation!!!</p>
                    </div>
                ): (
                    messageIdRef.map((msg) => (
                        <div key = {msg.id} className={"private-message ${msg.sender === currentUser ? 'own-message' : 'received-message'}"}>
                            <div className="message-header">
                                <span className='sender-name' style={{color: msg.color || '#6b73ff'}}>
                                    {msg.sender === currentUser ? 'You' : msg.sender}</span>
                                <span className="timestamp">
                                   {formatTime(msg.timestamp)}
                                </span>
                                <div className="message-content">
                                    {msg.content}
                                </div>
                            </div>
                        </div>

                    ))
                )
            }
            <div ref={messagesEndRef}></div>
            
            <div className="private-message-input-continer">
                <form onSubmit={sendPrivateMessage} className='private-message-form'>


                    <input type='text' placeholder={`message ${recipientUser}`} value={message} onChange={(e) => setMessage(e.target.value)} className='private-message-input'maxLength={500}/>

                    <button type='submit' className='private-send-button' disabled={!message.trim()}>
                       Send
                    </button>

                </form>
            </div>

            </div>

        </div>
    )
}