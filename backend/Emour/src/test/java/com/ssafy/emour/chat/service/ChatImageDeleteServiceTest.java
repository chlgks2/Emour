package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.ChatImageDeleteResponse;
import com.ssafy.emour.chat.entity.ChatMessage;
import com.ssafy.emour.chat.entity.ChatMessageImage;
import com.ssafy.emour.chat.entity.MessageType;
import com.ssafy.emour.chat.event.ChatImageFileDeleteEvent;
import com.ssafy.emour.chat.exception.ChatException;
import com.ssafy.emour.chat.repository.ChatMessageImageRepository;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.event.DashboardChangePublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatImageDeleteServiceTest {

    private static final Long ROOM_ID = 1L;
    private static final Long USER_ID = 10L;
    private static final LocalDateTime NOW = LocalDateTime.of(
            2026,
            8,
            3,
            15,
            30
    );

    @Mock
    private ChatMessageImageRepository imageRepository;
    @Mock
    private ChatMessageRepository messageRepository;
    @Mock
    private CoupleMemberRepository coupleMemberRepository;
    @Mock
    private DashboardChangePublisher dashboardChangePublisher;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    private ChatImageDeleteService service;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(
                NOW.atZone(ZoneId.of("Asia/Seoul")).toInstant(),
                ZoneId.of("Asia/Seoul")
        );
        service = new ChatImageDeleteService(
                imageRepository,
                messageRepository,
                coupleMemberRepository,
                dashboardChangePublisher,
                eventPublisher,
                clock
        );
    }

    @Test
    void deletesOneImageAndKeepsOthers() {
        ChatMessage message = imageMessage(100L, 2);
        ChatMessageImage target = message.getImages().get(0);
        allowActiveMember(USER_ID);
        when(imageRepository.findWithMessageById(target.getImageId()))
                .thenReturn(Optional.of(target));

        ChatImageDeleteResponse response = service.deleteImage(
                target.getImageId(),
                USER_ID
        );

        assertThat(message.getImages()).doesNotContain(target);
        assertThat(response.remainingImageCount()).isEqualTo(1);
        assertThat(response.messageHidden()).isFalse();
        verify(eventPublisher).publishEvent(
                new ChatImageFileDeleteEvent(target.getImageUrl())
        );
        verify(dashboardChangePublisher).messageChanged(message);
        verify(messageRepository, never()).delete(any());
    }

    @Test
    void hidesMessageWhenLastImageIsDeleted() {
        ChatMessage message = imageMessage(101L, 1);
        ChatMessageImage target = message.getImages().get(0);
        allowActiveMember(USER_ID);
        when(imageRepository.findWithMessageById(target.getImageId()))
                .thenReturn(Optional.of(target));

        ChatImageDeleteResponse response = service.deleteImage(
                target.getImageId(),
                USER_ID
        );

        assertThat(response.remainingImageCount()).isZero();
        assertThat(response.messageHidden()).isTrue();
        verify(messageRepository).delete(message);
    }

    @Test
    void rejectsPartnerImageDeletion() {
        ChatMessage message = imageMessage(102L, 1);
        ChatMessageImage target = message.getImages().get(0);
        allowActiveMember(20L);
        when(imageRepository.findWithMessageById(target.getImageId()))
                .thenReturn(Optional.of(target));

        assertThatThrownBy(() -> service.deleteImage(
                target.getImageId(),
                20L
        )).isInstanceOf(ChatException.class)
                .hasMessageContaining("본인이 보낸 이미지");

        verify(eventPublisher, never()).publishEvent(any());
        verify(dashboardChangePublisher, never()).messageChanged(any());
    }

    private ChatMessage imageMessage(Long messageId, int imageCount) {
        ChatMessage message = ChatMessage.create(
                ROOM_ID,
                USER_ID,
                "7cc9768e-344a-4a96-b1b6-dfa93668ac6c",
                MessageType.IMAGE,
                null
        );
        ReflectionTestUtils.setField(message, "messageId", messageId);
        for (int index = 0; index < imageCount; index++) {
            message.addImage(
                    "/uploads/2026/08/03/image-" + index + ".jpg",
                    index + 1
            );
            ReflectionTestUtils.setField(
                    message.getImages().get(index),
                    "imageId",
                    (long) (index + 1)
            );
        }
        return message;
    }

    private void allowActiveMember(Long userId) {
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(userId, ROOM_ID),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
    }
}
