package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.ChatImageDeleteResponse;
import com.ssafy.emour.chat.entity.ChatMessage;
import com.ssafy.emour.chat.entity.ChatMessageImage;
import com.ssafy.emour.chat.entity.MessageType;
import com.ssafy.emour.chat.event.ChatImageFileDeleteEvent;
import com.ssafy.emour.chat.event.ChatImageDeletedEvent;
import com.ssafy.emour.chat.exception.ChatException;
import com.ssafy.emour.chat.repository.ChatMessageImageRepository;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.event.DashboardChangePublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ChatImageDeleteService {

    private final ChatMessageImageRepository imageRepository;
    private final ChatMessageRepository messageRepository;
    private final CoupleMemberRepository coupleMemberRepository;
    private final DashboardChangePublisher dashboardChangePublisher;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock dashboardClock;

    @Transactional
    public ChatImageDeleteResponse deleteImage(
            Long imageId,
            Long userId
    ) {
        if (imageId == null || userId == null) {
            throw new ChatException("이미지 번호와 사용자 번호가 필요합니다.");
        }

        ChatMessageImage image = imageRepository
                .findActiveById(imageId)
                .orElseThrow(() -> new ChatException(
                        "삭제할 채팅 이미지를 찾을 수 없습니다."
                ));
        ChatMessage message = image.getMessage();
        validateActiveMember(message.getRoomId(), userId);
        validateOwner(message, userId);

        if (message.getMessageType() != MessageType.IMAGE) {
            throw new ChatException("이미지 메시지의 사진만 삭제할 수 있습니다.");
        }

        LocalDateTime deletedAt = LocalDateTime.now(dashboardClock);
        image.delete(deletedAt);

        int remainingImageCount = (int) message.getImages().stream()
                .filter(found -> !found.isDeleted())
                .count();

        // 마지막 이미지까지 삭제했다면 빈 이미지 말풍선이 남지 않게
        // 메시지도 함께 삭제합니다. 관련 북마크와 공감은 DB CASCADE로 정리됩니다.
        if (remainingImageCount == 0) {
            messageRepository.delete(message);
        }

        // 커밋이 성공한 경우에만 파일과 대시보드 집계를 정리합니다.
        ChatImageDeleteResponse response = new ChatImageDeleteResponse(
                message.getRoomId(),
                message.getMessageId(),
                image.getImageId(),
                remainingImageCount,
                remainingImageCount == 0,
                deletedAt
        );
        eventPublisher.publishEvent(
                new ChatImageFileDeleteEvent(image.getImageUrl())
        );
        eventPublisher.publishEvent(new ChatImageDeletedEvent(response));
        dashboardChangePublisher.messageChanged(message);
        return response;
    }

    private void validateActiveMember(Long roomId, Long userId) {
        boolean activeMember = coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(userId, roomId),
                CoupleMemberStatus.ACTIVE
        );
        if (!activeMember) {
            throw new ChatException(
                    "해당 채팅방에 참여 중인 사용자만 이미지를 삭제할 수 있습니다."
            );
        }
    }

    private void validateOwner(ChatMessage message, Long userId) {
        if (!message.getSenderId().equals(userId)) {
            throw new ChatException("본인이 보낸 이미지만 삭제할 수 있습니다.");
        }
    }
}
