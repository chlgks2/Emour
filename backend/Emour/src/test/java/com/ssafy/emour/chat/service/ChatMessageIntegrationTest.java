package com.ssafy.emour.chat.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.emour.chat.dto.ChatBookmarkListResponse;
import com.ssafy.emour.chat.dto.ChatHistoryResponse;
import com.ssafy.emour.chat.dto.ChatMessageRequest;
import com.ssafy.emour.chat.dto.ChatMessageResponse;
import com.ssafy.emour.chat.dto.ChatReactionRequest;
import com.ssafy.emour.chat.dto.ChatReactionResponse;
import com.ssafy.emour.chat.dto.ChatReadRequest;
import com.ssafy.emour.chat.dto.ChatUnreadCountResponse;
import com.ssafy.emour.chat.entity.AnalysisStatus;
import com.ssafy.emour.chat.entity.EmotionType;
import com.ssafy.emour.chat.entity.MessageType;
import com.ssafy.emour.chat.repository.ChatAnalysisRepository;
import com.ssafy.emour.chat.repository.ChatBookmarkRepository;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.chat.repository.ChatReactionRepository;
import com.ssafy.emour.couple.entity.CoupleMember;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardEmotionFlowResponse;
import com.ssafy.emour.dashboard.service.DashboardEmotionService;
import com.ssafy.emour.dashboard.service.DashboardSnapshotService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
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
    private ChatReactionService chatReactionService;

    @Autowired
    private DashboardEmotionService dashboardEmotionService;

    @Autowired
    private DashboardSnapshotService dashboardSnapshotService;

    @Autowired
    private CoupleMemberRepository coupleMemberRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private ChatAnalysisRepository chatAnalysisRepository;

    @Autowired
    private ChatBookmarkRepository chatBookmarkRepository;

    @Autowired
    private ChatReactionRepository chatReactionRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private EntityManager entityManager;

    @BeforeEach
    void setUpMember() {
        // couple_member의 외래키가 가리키는 부모 데이터를 먼저 준비합니다.
        insertUserIfMissing(10L, "chat-test-10@ssafy.com", "테스터10");
        insertUserIfMissing(20L, "chat-test-20@ssafy.com", "테스터20");
        insertRoomIfMissing();
        coupleMemberRepository.save(CoupleMember.active(10L, 1L));
        coupleMemberRepository.save(CoupleMember.active(20L, 1L));
    }

    // 텍스트 메시지를 DB에 저장한 뒤 채팅 내역으로 다시 조회합니다.
    @Test
    void savesAndLoadsText() {
        long messageCountBefore = chatMessageRepository.count();
        long analysisCountBefore = chatAnalysisRepository.count();

        ChatMessageResponse sent = chatMessageService.sendMessage(
                1L,
                10L,
                new ChatMessageRequest(
                        "b0db2a72-6e73-47f6-aa4e-305128b5fb0a",
                        MessageType.TEXT,
                        "안녕!",
                        List.of()
                )
        );

        // AI 분석이 끝난 상황처럼 감정을 저장한 뒤 다시 채팅 내역을 조회합니다.
        chatAnalysisRepository
                .findByMessageMessageId(sent.messageId())
                .orElseThrow()
                .complete(EmotionType.JOY);
        entityManager.flush();
        entityManager.clear();

        ChatHistoryResponse history = chatMessageService.getMessages(
                1L,
                10L,
                null,
                50
        );

        assertThat(sent.messageId()).isNotNull();
        assertThat(chatMessageRepository.count())
                .isEqualTo(messageCountBefore + 1);
        assertThat(chatAnalysisRepository.count())
                .isEqualTo(analysisCountBefore + 1);
        assertThat(history.messages())
                .anySatisfy(message -> {
                    assertThat(message.messageId()).isEqualTo(sent.messageId());
                    assertThat(message.content()).isEqualTo("안녕!");
                    assertThat(message.analysisStatus())
                            .isEqualTo(AnalysisStatus.COMPLETED);
                    assertThat(message.emotion()).isEqualTo("JOY");
                });
    }

    // 사진 여러 장을 메시지 하나에 묶어서 저장하고 조회합니다.
    @Test
    void savesMultipleImages() {
        long analysisCountBefore = chatAnalysisRepository.count();

        ChatMessageResponse sent = chatMessageService.sendMessage(
                1L,
                10L,
                new ChatMessageRequest(
                        "3e0133f5-1dab-43c5-ab30-a5777542f066",
                        MessageType.IMAGE,
                        null,
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
        assertThat(chatAnalysisRepository.count())
                .isEqualTo(analysisCountBefore);

        // 다시 채팅 내역을 조회해도 사진 두 장이 메시지 하나에 함께 들어 있어야 합니다.
        ChatHistoryResponse history = chatMessageService.getMessages(
                1L,
                10L,
                null,
                50
        );

        ChatMessageResponse savedMessage = history.messages().stream()
                .filter(message -> message.messageId().equals(sent.messageId()))
                .findFirst()
                .orElseThrow();
        assertThat(savedMessage.images())
                .extracting(image -> image.imageUrl())
                .containsExactly(
                        "https://image/first.jpg",
                        "https://image/second.jpg"
                );
    }

    // 마지막 읽은 위치 뒤의 상대방 메시지만 안 읽은 메시지로 계산합니다.
    @Test
    void countsUnreadMessages() {
        ChatMessageResponse firstPartnerMessage = chatMessageService.sendMessage(
                1L,
                20L,
                textRequest(
                        "8a01aec5-36e7-4210-92d5-7fcb995d7be4",
                        "첫 번째 메시지"
                )
        );
        chatMessageService.sendMessage(
                1L,
                10L,
                textRequest(
                        "87482530-0e74-4775-aa63-9de77a835e30",
                        "내가 보낸 메시지"
                )
        );
        chatMessageService.sendMessage(
                1L,
                20L,
                textRequest(
                        "bc1e990a-8f13-47e2-a17e-6e87c24b3d62",
                        "두 번째 메시지"
                )
        );

        chatReadService.markAsRead(
                1L,
                10L,
                new ChatReadRequest(firstPartnerMessage.messageId())
        );

        ChatUnreadCountResponse response =
                chatReadService.getUnreadCount(1L, 10L);

        assertThat(response.unreadCount()).isEqualTo(1L);
    }

    // 같은 채팅방에서 검색어가 포함된 메시지만 찾습니다.
    @Test
    void searchesMessages() {
        chatMessageService.sendMessage(
                1L,
                10L,
                textRequest(
                        "f4c07f2e-cfa0-4410-bac9-a6bc59366941",
                        "오늘 저녁에 치킨 먹을까?"
                )
        );
        chatMessageService.sendMessage(
                1L,
                20L,
                textRequest(
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

    // 메시지 북마크의 저장, 조회, 취소 과정을 확인합니다.
    @Test
    void managesBookmarks() {
        long bookmarkCountBefore = chatBookmarkRepository.count();

        ChatMessageResponse message = chatMessageService.sendMessage(
                1L,
                20L,
                textRequest(
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
        assertThat(chatBookmarkRepository.count())
                .isEqualTo(bookmarkCountBefore);
    }

    // 한 사용자의 공감을 추가하고 변경한 뒤 취소하는 과정을 확인합니다.
    @Test
    void managesReactions() {
        long reactionCountBefore = chatReactionRepository.count();

        ChatMessageResponse message = chatMessageService.sendMessage(
                1L,
                20L,
                textRequest(
                        "600b7d53-68d6-4437-98b1-b9badf073c6a",
                        "공감할 메시지"
                )
        );

        ChatReactionResponse added = chatReactionService.setReaction(
                message.messageId(),
                10L,
                new ChatReactionRequest("heart")
        );
        ChatReactionResponse changed = chatReactionService.setReaction(
                message.messageId(),
                10L,
                new ChatReactionRequest("LAUGH")
        );

        assertThat(added.reactionType()).isEqualTo("HEART");
        assertThat(changed.reactionType()).isEqualTo("LAUGH");
        assertThat(chatReactionRepository.count())
                .isEqualTo(reactionCountBefore + 1);

        ChatHistoryResponse history = chatMessageService.getMessages(
                1L,
                10L,
                null,
                50
        );
        ChatMessageResponse reactedMessage = history.messages().stream()
                .filter(found -> found.messageId().equals(message.messageId()))
                .findFirst()
                .orElseThrow();
        assertThat(reactedMessage.reactions())
                .extracting(ChatReactionResponse::reactionType)
                .containsExactly("LAUGH");

        chatReactionService.removeReaction(message.messageId(), 10L);
        assertThat(chatReactionRepository.count())
                .isEqualTo(reactionCountBefore);
    }

    // 완료된 감정 분석 결과를 실제 DB에서 읽어 대시보드 JSON으로 저장합니다.
    @Test
    void savesEmotionFlow() throws Exception {
        java.time.LocalDateTime snapshotUntil =
                java.time.LocalDateTime.now()
                        .truncatedTo(java.time.temporal.ChronoUnit.HOURS);
        java.time.LocalDate summaryDate = snapshotUntil
                .minusNanos(1)
                .toLocalDate();
        ChatMessageResponse message = chatMessageService.sendMessage(
                1L,
                10L,
                textRequest(
                        "30a7bf98-a1ef-4a65-a3bc-c5cf8d23af8e",
                        "오늘 정말 기분이 좋아"
                )
        );

        chatAnalysisRepository.flush();
        jdbcTemplate.update(
                """
                UPDATE chat_message
                SET sent_at = CONCAT(?, ' 01:00:00')
                WHERE message_id = ?
                """,
                summaryDate.toString(),
                message.messageId()
        );
        jdbcTemplate.update(
                """
                UPDATE chat_analysis
                SET emotion_type = 'JOY',
                    analysis_status = 'COMPLETED',
                    analyzed_at = CURRENT_TIMESTAMP(6)
                WHERE message_id = ?
                """,
                message.messageId()
        );
        // JDBC로 바꾼 값을 JPA가 DB에서 다시 읽도록 기존 캐시를 비웁니다.
        entityManager.clear();

        dashboardSnapshotService.refreshSnapshot(
                1L,
                10L,
                summaryDate,
                snapshotUntil,
                true
        );
        DashboardEmotionFlowResponse response =
                dashboardEmotionService.getEmotionFlow(
                        1L,
                        10L,
                        com.ssafy.emour.dashboard.dto.DashboardPeriod.DAY,
                        summaryDate
                );

        String emotionFlowJson = jdbcTemplate.queryForObject(
                """
                SELECT emotion_flow
                FROM member_dashboard
                WHERE room_id = 1
                  AND user_id = 10
                  AND summary_date = ?
                """,
                String.class,
                summaryDate
        );

        assertThat(response.analyzedMessageCount()).isGreaterThanOrEqualTo(1);
        assertThat(response.flow()).hasSize(12);
        assertThat(response.flow().stream()
                .mapToInt(slot -> slot.positiveCount())
                .sum()).isGreaterThanOrEqualTo(1);
        ObjectMapper objectMapper = new ObjectMapper();
        var storedFlow = objectMapper.readTree(emotionFlowJson);
        if (storedFlow.isTextual()) {
            storedFlow = objectMapper.readTree(storedFlow.asText());
        }
        assertThat(storedFlow.size()).isEqualTo(12);
    }

    private ChatMessageRequest textRequest(
            String clientMessageId,
            String content
    ) {
        return new ChatMessageRequest(
                clientMessageId,
                MessageType.TEXT,
                content,
                List.of()
        );
    }

    private void insertUserIfMissing(
            Long userId,
            String email,
            String nickname
    ) {
        jdbcTemplate.update(
                """
                INSERT IGNORE INTO app_user
                    (user_id, email, nickname, status, is_email_verified,
                     created_at, updated_at)
                VALUES (?, ?, ?, 'ACTIVE', TRUE,
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                userId,
                email,
                nickname
        );
    }

    private void insertRoomIfMissing() {
        jdbcTemplate.update(
                """
                INSERT IGNORE INTO couple_room
                    (room_id, room_code, status, created_at, updated_at)
                VALUES (1, 'CHAT_TEST_ROOM', 'ACTIVE',
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
        );
    }
}
