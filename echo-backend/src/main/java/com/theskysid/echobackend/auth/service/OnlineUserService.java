package com.theskysid.echobackend.auth.service;

import org.springframework.stereotype.Service;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

@Service
public class OnlineUserService {

    private final Set<Long> onlineUsers = Collections.synchronizedSet(new HashSet<>());

    public void markOnline(Long userId) {
        onlineUsers.add(userId);
    }

    public void markOffline(Long userId) {
        onlineUsers.remove(userId);
    }

    public boolean isOnline(Long userId) {
        return onlineUsers.contains(userId);
    }

    public Set<Long> getOnlineUserIds() {
        return Collections.unmodifiableSet(onlineUsers);
    }
}