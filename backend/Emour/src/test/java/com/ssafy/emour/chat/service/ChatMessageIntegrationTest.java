package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.ChatBookmarkListResponse;
import com.ssafy.emour.chat.dto.ChatHistoryResponse;
import com.ssafy.emour.chat.dto.ChatMessageRequest;
import com.ssafy.emour.chat.dto.ChatMessageResponse;
import com.ssafy.emour.chat.dto.ChatReadRequest;
import com.ssafy.emour.chat.dto.ChatSentImageListResponse;
import com.ssafy.emour.chat.dto.ChatUnreadCountResponse;
import com.ssafy.emour.chat.entity.MessageType;
import com.ssafy.emour.chat.repository.ChatAnalysisRepository;
import com.ssafy.emour.chat.repository.ChatBookmarkRepository;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.couple.entity.CoupleMember;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class ChatMessageIntegrationTest {

    @Autowired
    private ChatMessageService chatMessageService;

    @Autowired
    private ChatReadService chatReadService;

    @Autowired
    private ChatBookmarkService chatBookmarkService;

    @Autowired
    private CoupleMemberRepository coupleMemberRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private ChatAnalysisRepository chatAnalysisRepository;

    @Autowired
    private ChatBookmarkRepository chatBookmarkRepository;

    @BeforeEach
    void setUpMember() {
        coupleMemberRepository.save(CoupleMember.active(10L, 1L));
        coupleMemberRepository.save(CoupleMember.active(20L, 1L));
    }

    @Test
    void 텍스트_메시지를_DB에_저장하고_다시_조회한다() {
        ChatMessageResponse sent = chatMessageService.sendMessage(
                1L,
                new ChatMessageRequest(
                        10L,
                        "b0db2a72-6e73-47f6-aa4e-305128b5fb0a",
                        MessageType.TEXT,
                        "안녕!",
                        List.of()
                )
        );

        ChatHistoryResponse history = chatMessageService.getMessages(
                1L,
                10L,
                null,
                50
        );

        assertThat(sent.messageId()).isNotNull();
        assertThat(chatMessageRepository.count()).isEqualTo(1);
        assertThat(chatAnalysisRepository.count()).isEqualTo(1);
        assertThat(history.messages()).hasSize(1);
        assertThat(history.messages().get(0).content()).isEqualTo("안녕!");
    }

    @Test
    void 이미지_메시지에_이미지_여러_장을_저장한다() {
        ChatMessageResponse sent = chatMessageService.sendMessage(
                1L,
                new ChatMessageRequest(
                        10L,
                        "3e0133f5-1dab-43c5-ab30-a5777542f066",
                        MessageType.IMAGE,
                        "여행 사진",
                        List.of(
                                "https://image/first.jpg",
                                "https://image/second.jpg"
                        )
                )
        );

        assertThat(sent.messageId()).isNotNull();
        assertThat(sent.images()).hasSize(2);
        assertThat(sent.images())
                .extracting(image -> image.displayOrder())
                .containsExactly(1, 2);
        assertThat(chatAnalysisRepository.count()).isZero();
    }

    @Test
    void 채팅으로_보낸_사진을_최신순으로_나누어_조회한다() {
        chatMessageService.sendMessage(
                1L,
                imageRequest(
                        10L,
                        "2b9c708d-b7cb-4c79-821c-3dc65a28fb2a",
                        "첫 번째 사진",
                        "https://image/first.jpg"
                )
        );
        chatMessageService.sendMessage(
                1L,
                imageRequest(
                        20L,
                        "8f6774d3-06bc-442a-b979-001119737927",
                        "두 번째 사진",
                        "https://image/second.jpg"
                )
        );

        ChatSentImageListResponse firstPage =
                chatMessageService.getSentImages(1L, 10L, null, 1);

        assertThat(firstPage.images()).hasSize(1);
        assertThat(firstPage.images().get(0).imageUrl())
                .isEqualTo("https://image/second.jpg");
        assertThat(firstPage.images().get(0).senderId()).isEqualTo(20L);
        assertThat(firstPage.hasNext()).isTrue();

        ChatSentImageListResponse secondPage =
                chatMessageService.getSentImages(
                        1L,
                        10L,
                        firstPage.nextCursor(),
                        1
                );

        assertThat(secondPage.images()).hasSize(1);
        assertThat(secondPage.images().get(0).imageUrl())
                .isEqualTo("https://image/first.jpg");
        assertThat(secondPage.hasNext()).isFalse();
    }

    @Test
    void 마지막으로_읽은_메시지_뒤의_상대방_메시지만_안_읽음으로_센다() {
        ChatMessageResponse firstPartnerMessage = chatMessageService.sendMessage(
                1L,
                textRequest(
                        20L,
                        "8a01aec5-36e7-4210-92d5-7fcb995d7be4",
                        "첫 번째 메시지"
                )
        );
        chatMessageService.sendMessage(
                1L,
                textRequest(
                        10L,
                        "87482530-0e74-4775-aa63-9de77a835e30",
                        "내가 보낸 메시지"
                )
        );
        chatMessageService.sendMessage(
                1L,
                textRequest(
                        20L,
                        "bc1e990a-8f13-47e2-a17e-6e87c24b3d62",
                        "두 번째 메시지"
                )
        );

        chatReadService.markAsRead(
                1L,
                new ChatReadRequest(10L, firstPartnerMessage.messageId())
        );

        ChatUnreadCountResponse response =
                chatReadService.getUnreadCount(1L, 10L);

        assertThat(response.unreadCount()).isEqualTo(1L);
    }

    @Test
    void 메시지_내용을_검색한다() {
        chatMessageService.sendMessage(
                1L,
                textRequest(
                        10L,
                        "f4c07f2e-cfa0-4410-bac9-a6bc59366941",
                        "오늘 저녁에 치킨 먹을까?"
                )
        );
        chatMessageService.sendMessage(
                1L,
                textRequest(
                        20L,
                        "dfbd8874-37e5-4c13-9139-16bb326f9050",
                        "나는 피자가 좋아"
                )
        );

        ChatHistoryResponse result = chatMessageService.searchMessages(
                1L,
                10L,
                "치킨",
                null,
                20
        );

        assertThat(result.messages()).hasSize(1);
        assertThat(result.messages().get(0).content())
                .isEqualTo("오늘 저녁에 치킨 먹을까?");
    }

    @Test
    void 메시지를_북마크하고_모아서_본_뒤_취소한다() {
        ChatMessageResponse message = chatMessageService.sendMessage(
                1L,
                textRequest(
                        20L,
                        "c5d24ed0-032f-437d-a48a-af5c6fbb20d1",
                        "기억하고 싶은 메시지"
                )
        );

        chatBookmarkService.addBookmark(message.messageId(), 10L);
        ChatBookmarkListResponse bookmarks =
                chatBookmarkService.getBookmarks(
                        1L,
                        10L,
                        null,
                        20
                );

        assertThat(bookmarks.bookmarks()).hasSize(1);
        assertThat(bookmarks.bookmarks().get(0).message().content())
                .isEqualTo("기억하고 싶은 메시지");

        chatBookmarkService.removeBookmark(message.messageId(), 10L);
        assertThat(chatBookmarkRepository.count()).isZero();
    }

    private ChatMessageRequest textRequest(
            Long senderId,
            String clientMessageId,
            String content
    ) {
        return new ChatMessageRequest(
                senderId,
                clientMessageId,
                MessageType.TEXT,
                content,
                List.of()
        );
    }

    private ChatMessageRequest imageRequest(
            Long senderId,
            String clientMessageId,
            String content,
            String imageUrl
    ) {
        return new ChatMessageRequest(
                senderId,
                clientMessageId,
                MessageType.IMAGE,
                content,
                List.of(imageUrl)
        );
    }
}
