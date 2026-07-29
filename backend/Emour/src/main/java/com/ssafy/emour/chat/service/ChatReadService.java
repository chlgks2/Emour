package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.ChatReadRequest;
import com.ssafy.emour.chat.dto.ChatReadResponse;
import com.ssafy.emour.chat.dto.ChatUnreadCountResponse;
import com.ssafy.emour.chat.entity.ChatReadState;
import com.ssafy.emour.chat.entity.ChatReadStateId;
import com.ssafy.emour.chat.exception.ChatException;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.chat.repository.ChatReadStateRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ChatReadService {

    private final ChatReadStateRepository chatReadStateRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final CoupleMemberRepository coupleMemberRepository;
    private final ChatMessageService chatMessageService;

    @Transactional
    public ChatReadResponse markAsRead(Long roomId, ChatReadRequest request) {
        if (request == null
                || request.userId() == null
                || request.lastReadMessageId() == null) {
            throw new ChatException("사용자 번호와 마지막 읽은 메시지 번호가 필요합니다.");
        }

        validateActiveMember(request.userId(), roomId);

        // 다른 방 메시지를 읽었다고 표시하지 못하게 확인합니다.
        chatMessageService.findMessageInRoom(
                request.lastReadMessageId(),
                roomId
        );

        ChatReadStateId id = new ChatReadStateId(request.userId(), roomId);
        ChatReadState state = chatReadStateRepository.findById(id)
                .orElseGet(() -> ChatReadState.first(
                        request.userId(),
                        roomId,
                        request.lastReadMessageId()
                ));

        state.moveForward(request.lastReadMessageId());
        ChatReadState saved = chatReadStateRepository.save(state);

        return new ChatReadResponse(
                saved.getRoomId(),
                saved.getUserId(),
                saved.getLastReadMessageId(),
                saved.getReadAt()
        );
    }

    /**
     * REST 주소에 들어온 메시지 번호를 이용해 그 메시지가 속한 방까지 찾습니다.
     */
    @Transactional
    public ChatReadResponse markMessageAsRead(
            Long messageId,
            Long userId
    ) {
        if (messageId == null || userId == null) {
            throw new ChatException("사용자 번호와 메시지 번호는 꼭 필요합니다.");
        }

        Long roomId = chatMessageService
                .findMessage(messageId)
                .getRoomId();

        return markAsRead(
                roomId,
                new ChatReadRequest(userId, messageId)
        );
    }

    /**
     * 메인 화면의 채팅 배지에 표시할 안 읽은 메시지 개수를 계산합니다.
     * 내가 보낸 메시지는 읽지 않은 메시지에 포함하지 않습니다.
     */
    @Transactional(readOnly = true)
    public ChatUnreadCountResponse getUnreadCount(Long roomId, Long userId) {
        validateActiveMember(userId, roomId);

        ChatReadStateId stateId = new ChatReadStateId(userId, roomId);
        Long lastReadMessageId = chatReadStateRepository.findById(stateId)
                .map(ChatReadState::getLastReadMessageId)
                .orElse(null);

        long unreadCount = lastReadMessageId == null
                ? chatMessageRepository
                .countByRoomIdAndSenderIdNot(roomId, userId)
                : chatMessageRepository
                .countByRoomIdAndSenderIdNotAndMessageIdGreaterThan(
                        roomId,
                        userId,
                        lastReadMessageId
                );

        return new ChatUnreadCountResponse(
                roomId,
                userId,
                lastReadMessageId,
                unreadCount
        );
    }

    private void validateActiveMember(Long userId, Long roomId) {
        if (userId == null || roomId == null) {
            throw new ChatException("사용자 번호와 방 번호는 꼭 필요합니다.");
        }

        boolean activeMember = coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(userId, roomId),
                CoupleMemberStatus.ACTIVE
        );
        if (!activeMember) {
            throw new ChatException("해당 채팅방에 참여 중인 사용자가 아닙니다.");
        }
    }
}
