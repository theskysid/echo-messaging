import React, { useState, useEffect, useCallback } from 'react';
import { friendService } from '../services/friendService';
import '../styles/FindFriendsModal.css';

const FindFriendsModal = ({ onClose, onFriendsChange, refreshTrigger }) => {
    const [activeTab, setActiveTab] = useState('search'); // 'search' | 'incoming' | 'outgoing'
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [outgoingRequests, setOutgoingRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [feedbackMsg, setFeedbackMsg] = useState('');

    const loadRequests = useCallback(async (showSpin = false) => {
        if (showSpin) setIsRefreshing(true);
        try {
            const [inReqs, outReqs] = await Promise.all([
                friendService.getIncomingRequests(),
                friendService.getOutgoingRequests()
            ]);
            setIncomingRequests(inReqs || []);
            setOutgoingRequests(outReqs || []);
        } catch (err) {
            console.error('Error loading friend requests:', err);
        } finally {
            if (showSpin) setTimeout(() => setIsRefreshing(false), 400);
        }
    }, []);

    useEffect(() => {
        loadRequests();
    }, [loadRequests, refreshTrigger]);

    const showFeedback = (msg) => {
        setFeedbackMsg(msg);
        setTimeout(() => setFeedbackMsg(''), 3000);
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim() || searchQuery.trim().length < 2) {
            alert('Please enter at least 2 characters to search');
            return;
        }

        setIsLoading(true);
        try {
            const results = await friendService.searchUsers(searchQuery.trim());
            setSearchResults(results || []);
        } catch (err) {
            console.error('Search failed:', err);
            alert(err.message || 'Search failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendRequest = async (username) => {
        try {
            await friendService.sendRequest(username);
            showFeedback(`Friend request sent to ${username}!`);
            setSearchResults((prev) =>
                prev.map((u) => (u.username === username ? { ...u, friendshipStatus: 'PENDING_OUTGOING' } : u))
            );
            loadRequests();
            if (onFriendsChange) onFriendsChange();
        } catch (err) {
            alert(err.message || 'Could not send friend request');
        }
    };

    const handleAcceptRequest = async (friendshipId, senderUsername) => {
        try {
            await friendService.acceptRequest(friendshipId);
            showFeedback(`Accepted friend request from ${senderUsername}!`);
            loadRequests();
            if (onFriendsChange) onFriendsChange();
        } catch (err) {
            alert(err.message || 'Could not accept friend request');
        }
    };

    const handleRejectRequest = async (friendshipId) => {
        try {
            await friendService.rejectRequest(friendshipId);
            showFeedback('Friend request rejected.');
            loadRequests();
        } catch (err) {
            alert(err.message || 'Could not reject friend request');
        }
    };

    const handleCancelRequest = async (friendshipId) => {
        try {
            await friendService.cancelRequest(friendshipId);
            showFeedback('Friend request cancelled.');
            loadRequests();
        } catch (err) {
            alert(err.message || 'Could not cancel friend request');
        }
    };

    return (
        <div className="friends-modal-overlay" onClick={onClose}>
            <div className="friends-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="friends-modal-header">
                    <h3>👥 Friend System Management</h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                            onClick={() => loadRequests(true)}
                            className={`friends-refresh-btn ${isRefreshing ? 'spin' : ''}`}
                            title="Refresh Requests without reload"
                        >
                            🔄
                        </button>
                        <button onClick={onClose} className="friends-modal-close">✕</button>
                    </div>
                </div>

                <div className="friends-modal-tabs">
                    <button
                        className={`friends-tab-btn ${activeTab === 'search' ? 'active' : ''}`}
                        onClick={() => setActiveTab('search')}
                    >
                        🔍 Search & Add
                    </button>
                    <button
                        className={`friends-tab-btn ${activeTab === 'incoming' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('incoming');
                            loadRequests();
                        }}
                    >
                        📥 Incoming{' '}
                        {incomingRequests.length > 0 && (
                            <span className="friends-tab-badge">{incomingRequests.length}</span>
                        )}
                    </button>
                    <button
                        className={`friends-tab-btn ${activeTab === 'outgoing' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('outgoing');
                            loadRequests();
                        }}
                    >
                        📤 Outgoing{' '}
                        {outgoingRequests.length > 0 && (
                            <span className="friends-tab-badge">{outgoingRequests.length}</span>
                        )}
                    </button>
                </div>

                <div className="friends-modal-body">
                    {feedbackMsg && (
                        <div style={{ background: '#d4edda', color: '#155724', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px', fontWeight: '600' }}>
                            {feedbackMsg}
                        </div>
                    )}

                    {activeTab === 'search' && (
                        <div>
                            <form onSubmit={handleSearch} className="friends-search-form">
                                <input
                                    type="text"
                                    placeholder="Search by username (min 2 chars)..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="friends-search-input"
                                />
                                <button type="submit" disabled={isLoading || searchQuery.trim().length < 2} className="friends-search-btn">
                                    {isLoading ? '...' : 'Search'}
                                </button>
                            </form>

                            {searchResults.length === 0 ? (
                                <div className="empty-state">
                                    <span>🔍</span>
                                    <p>Search for friends to start chatting over secure DMs!</p>
                                </div>
                            ) : (
                                searchResults.map((user) => (
                                    <div key={user.id} className="friend-item-row">
                                        <div className="friend-item-user">
                                            <div className="friend-item-avatar">
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="friend-item-details">
                                                <span className="friend-item-name">{user.username}</span>
                                                {user.displayName && <span className="friend-item-sub">{user.displayName}</span>}
                                            </div>
                                        </div>

                                        <div className="friend-item-actions">
                                            {user.friendshipStatus === 'ACCEPTED' && (
                                                <span className="status-badge accepted">✓ Friends</span>
                                            )}
                                            {user.friendshipStatus === 'PENDING_OUTGOING' && (
                                                <span className="status-badge pending">⏳ Request Sent</span>
                                            )}
                                            {user.friendshipStatus === 'PENDING_INCOMING' && (
                                                <span className="status-badge pending">📥 Check Incoming</span>
                                            )}
                                            {(user.friendshipStatus === 'NONE' || !user.friendshipStatus) && (
                                                <button
                                                    onClick={() => handleSendRequest(user.username)}
                                                    className="btn-add-friend"
                                                >
                                                    + Add Friend
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'incoming' && (
                        <div>
                            {incomingRequests.length === 0 ? (
                                <div className="empty-state">
                                    <span>📭</span>
                                    <p>No pending incoming friend requests right now.</p>
                                    <button
                                        onClick={() => loadRequests(true)}
                                        style={{ marginTop: '10px', padding: '6px 14px', borderRadius: '16px', background: '#e9ecef', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                                    >
                                        🔄 Check again
                                    </button>
                                </div>
                            ) : (
                                incomingRequests.map((req) => (
                                    <div key={req.id} className="friend-item-row">
                                        <div className="friend-item-user">
                                            <div className="friend-item-avatar" style={{ background: '#667eea' }}>
                                                {req.requesterUsername.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="friend-item-details">
                                                <span className="friend-item-name">{req.requesterUsername}</span>
                                                <span className="friend-item-sub">Wants to be friends</span>
                                            </div>
                                        </div>

                                        <div className="friend-item-actions">
                                            <button
                                                onClick={() => handleAcceptRequest(req.id, req.requesterUsername)}
                                                className="btn-accept-request"
                                            >
                                                ✓ Accept
                                            </button>
                                            <button
                                                onClick={() => handleRejectRequest(req.id)}
                                                className="btn-reject-request"
                                            >
                                                ✕ Reject
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'outgoing' && (
                        <div>
                            {outgoingRequests.length === 0 ? (
                                <div className="empty-state">
                                    <span>📤</span>
                                    <p>No outgoing friend requests right now.</p>
                                    <button
                                        onClick={() => loadRequests(true)}
                                        style={{ marginTop: '10px', padding: '6px 14px', borderRadius: '16px', background: '#e9ecef', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                                    >
                                        🔄 Check again
                                    </button>
                                </div>
                            ) : (
                                outgoingRequests.map((req) => (
                                    <div key={req.id} className="friend-item-row">
                                        <div className="friend-item-user">
                                            <div className="friend-item-avatar" style={{ background: '#764ba2' }}>
                                                {req.addresseeUsername.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="friend-item-details">
                                                <span className="friend-item-name">{req.addresseeUsername}</span>
                                                <span className="friend-item-sub">Pending response...</span>
                                            </div>
                                        </div>

                                        <div className="friend-item-actions">
                                            <button
                                                onClick={() => handleCancelRequest(req.id)}
                                                className="btn-cancel-request"
                                            >
                                                ✕ Cancel
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FindFriendsModal;
