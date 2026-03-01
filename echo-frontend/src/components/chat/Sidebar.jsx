import UserItem from './UserItem';

const Sidebar = ({ onlineUsers, currentUser, userColor, unreadMessages, onOpenChat }) => {
    const usersList = Array.from(onlineUsers);

    return (
        <aside className="chat-sidebar">
            <div className="sidebar-header">
                <h3 className="sidebar-title">
                    <span className="sidebar-title-icon">👥</span>
                    Online
                </h3>
                <span className="sidebar-count">{usersList.length}</span>
            </div>
            <div className="sidebar-users">
                {usersList.map(user => (
                    <UserItem
                        key={user}
                        user={user}
                        currentUser={currentUser}
                        userColor={userColor}
                        unreadCount={unreadMessages.get(user) || 0}
                        onOpenChat={onOpenChat}
                    />
                ))}
            </div>
        </aside>
    );
};

export default Sidebar;
