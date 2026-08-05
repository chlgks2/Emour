package com.ssafy.emour.chat.repository;

import com.ssafy.emour.chat.entity.ChatReadState;
import com.ssafy.emour.chat.entity.ChatReadStateId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ChatReadStateRepository
        extends JpaRepository<ChatReadState, ChatReadStateId> {

    // 1:1 채팅방에서 현재 사용자가 아닌 상대방의 읽음 위치를 찾습니다.
    @Query("""
            select state
            from ChatReadState state
            where state.id.roomId = :roomId
              and state.id.userId <> :userId
            """)
    Optional<ChatReadState> findPartnerReadState(
            @Param("roomId") Long roomId,
            @Param("userId") Long userId
    );
}
