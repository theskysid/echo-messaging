package com.theskysid.echobackend.repository;

import com.theskysid.echobackend.model.User;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

   public boolean existbyUsername(String username);

   @Transactional
   @Modifying
   @Query("UPDATE User u SET u.isOnline = :isOnline WHERE u.username= :username")
   public void updateUserOnlineStatus(@Param("username") String username, @Param("isOnline") boolean isOnline);

   public Optional<User> findByUsername(String username);

   List<User> findByIsOnlineTrue();
}
