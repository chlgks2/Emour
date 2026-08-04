package com.ssafy.emour.chat.controller;

import com.ssafy.emour.chat.dto.ChatBookmarkListResponse;
import com.ssafy.emour.chat.dto.ChatBookmarkResponse;
import com.ssafy.emour.chat.dto.ChatHistoryResponse;
import com.ssafy.emour.chat.dto.ChatMessageResponse;
import com.ssafy.emour.chat.dto.ChatReactionEventResponse;
import com.ssafy.emour.chat.dto.ChatReactionRequest;
import com.ssafy.emour.chat.dto.ChatReactionResponse;
import com.ssafy.emour.chat.dto.ChatReadResponse;
import com.ssafy.emour.chat.dto.ChatReadStatusResponse;
import com.ssafy.emour.chat.dto.ChatRestMessageRequest;
import com.ssafy.emour.chat.dto.ChatUnreadCountResponse;
import com.ssafy.emour.chat.dto.AiSuggestionResponse;
import com.ssafy.emour.chat.dto.ChatSuggestionRequest;
import com.ssafy.emour.chat.messaging.ChatRealtimePublisher;
import com.ssafy.emour.chat.service.ChatBookmarkService;
import com.ssafy.emour.chat.service.ChatMessageService;
import com.ssafy.emour.chat.service.ChatReactionService;
import com.ssafy.emour.chat.service.ChatReadService;
import com.ssafy.emour.chat.service.ChatSuggestionService;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import com.ssafy.emour.global.response.ErrorResponse;
import com.ssafy.emour.global.util.SecurityUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/chats")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(
        name = "채팅 REST API",
        description = "채팅 메시지 REST API"
)
public class ChatRestController {

    private final ChatMessageService chatMessageService;
    private final ChatReadService chatReadService;
    private final ChatBookmarkService chatBookmarkService;
    private final ChatReactionService chatReactionService;
    private final ChatRealtimePublisher realtimePublisher;
    private final ChatSuggestionService chatSuggestionService;

    /**
     * 채팅방에 처음 들어오거나 위로 스크롤할 때 이전 메시지를 가져옵니다.
     */
    @GetMapping
    @Operation(
            summary = "이전 채팅 메시지 조회",
            description = """
                    최신 메시지 또는 beforeMessageId보다 과거의 메시지를 조회합니다.
                    응답의 nextCursor를 다음 요청의 beforeMessageId로 사용합니다.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(
                    responseCode = "400",
                    description = "채팅방 멤버가 아니거나 요청값이 잘못됨",
                    content = @Content(
                            schema = @Schema(implementation = ErrorResponse.class)
                    )
            )
    })
    public ChatHistoryResponse getMessages(
            @Parameter(description = "커플방 번호", example = "1")
            @RequestParam Long roomId,

            @Parameter(
                    description = "이 번호보다 과거 메시지를 조회하며, 첫 조회에서는 생략",
                    example = "100"
            )
            @RequestParam(required = false) Long beforeMessageId,

            @Parameter(
                    description = "조회 개수, 최소 1개부터 최대 100개",
                    example = "50"
            )
            @RequestParam(required = false) Integer size
    ) {
        return chatMessageService.getMessages(
                roomId,
                SecurityUtil.getCurrentUserId(),
                beforeMessageId,
                size
        );
    }

    /**
     * 메인 화면에서 채팅 아이콘 옆에 표시할 숫자를 조회합니다.
     */
    @GetMapping("/unread-count")
    @Operation(
            summary = "안 읽은 채팅 개수 조회",
            description = """
                    마지막 읽은 메시지 이후 상대방이 보낸 메시지 개수를 조회합니다.
                    다른 화면에 있을 때 채팅 아이콘의 숫자 배지로 사용할 수 있습니다.
                    """
    )
    public ChatUnreadCountResponse getUnreadCount(
            @Parameter(description = "커플방 번호", example = "1")
            @RequestParam Long roomId
    ) {
        return chatReadService.getUnreadCount(
                roomId,
                SecurityUtil.getCurrentUserId()
        );
    }

    /**
     * 상대방이 내 메시지를 어디까지 읽었는지 조회합니다.
     */
    @GetMapping("/read-status")
    @Operation(
            summary = "상대방 읽음 상태 조회",
            description = """
                    상대방이 마지막으로 읽은 메시지 번호를 조회합니다.
                    내 메시지 번호가 이 번호보다 작거나 같으면 상대방이 읽은 메시지입니다.
                    """
    )
    public ChatReadStatusResponse getReadStatus(
            @Parameter(description = "커플방 번호", example = "1")
            @RequestParam Long roomId
    ) {
        return chatReadService.getPartnerReadStatus(
                roomId,
                SecurityUtil.getCurrentUserId()
        );
    }

    /**
     * 특정 메시지까지 읽었다고 저장합니다.
     */
    @PostMapping("/{messageId}/read")
    @Operation(
            summary = "메시지 읽음 처리",
            description = "선택한 메시지까지 읽었다는 위치를 저장합니다."
    )
    public ChatReadResponse markAsRead(
            @Parameter(description = "마지막으로 읽은 메시지 번호", example = "100")
            @PathVariable Long messageId
    ) {
        ChatReadResponse response = chatReadService.markMessageAsRead(
                messageId,
                SecurityUtil.getCurrentUserId()
        );
        realtimePublisher.publishRead(response.roomId(), response);
        return response;
    }

    /**
     * 채팅 내용에 검색어가 포함된 메시지를 찾습니다.
     */
    @GetMapping("/search")
    @Operation(
            summary = "채팅 메시지 검색",
            description = "같은 방의 메시지 내용에서 검색어가 포함된 메시지를 찾습니다."
    )
    public ChatHistoryResponse searchMessages(
            @Parameter(description = "커플방 번호", example = "1")
            @RequestParam Long roomId,

            @Parameter(description = "찾을 단어", example = "사랑")
            @RequestParam String keyword,

            @Parameter(description = "이 번호보다 과거 메시지를 검색")
            @RequestParam(required = false) Long beforeMessageId,

            @Parameter(description = "조회 개수, 최대 100개", example = "20")
            @RequestParam(required = false) Integer size
    ) {
        return chatMessageService.searchMessages(
                roomId,
                SecurityUtil.getCurrentUserId(),
                keyword,
                beforeMessageId,
                size
        );
    }

    /**
     * 나중에 다시 보고 싶은 메시지를 저장합니다.
     */
    @PostMapping("/{messageId}/bookmark")
    @Operation(summary = "메시지 북마크 저장")
    public ChatBookmarkResponse addBookmark(
            @Parameter(description = "저장할 메시지 번호", example = "100")
            @PathVariable Long messageId
    ) {
        return chatBookmarkService.addBookmark(
                messageId,
                SecurityUtil.getCurrentUserId()
        );
    }

    /**
     * 저장했던 메시지의 북마크를 취소합니다.
     */
    @DeleteMapping("/{messageId}/bookmark")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "메시지 북마크 취소")
    public void removeBookmark(
            @Parameter(description = "저장 취소할 메시지 번호", example = "100")
            @PathVariable Long messageId
    ) {
        chatBookmarkService.removeBookmark(
                messageId,
                SecurityUtil.getCurrentUserId()
        );
    }

    /**
     * 사용자가 저장한 하이라이트 메시지를 모아서 보여줍니다.
     */
    @GetMapping("/bookmarks")
    @Operation(summary = "저장한 메시지 모아보기")
    public ChatBookmarkListResponse getBookmarks(
            @Parameter(description = "커플방 번호", example = "1")
            @RequestParam Long roomId,

            @Parameter(description = "이 번호보다 과거 북마크를 조회")
            @RequestParam(required = false) Long beforeBookmarkId,

            @Parameter(description = "조회 개수, 최대 100개", example = "20")
            @RequestParam(required = false) Integer size,

            @Parameter(description = "조회 단위: DAY, MONTH, YEAR")
            @RequestParam(required = false) DashboardPeriod period,

            @Parameter(description = "메시지를 보낸 기준 날짜. period와 함께 입력")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date
    ) {
        return chatBookmarkService.getBookmarks(
                roomId,
                SecurityUtil.getCurrentUserId(),
                beforeBookmarkId,
                size,
                period,
                date
        );
    }

    /**
     * 메시지에 공감을 추가하거나 기존 공감 종류를 변경합니다.
     */
    @PostMapping("/{messageId}/reaction")
    @Operation(
            summary = "메시지 공감 추가 또는 변경",
            description = """
                    한 사용자는 메시지 하나에 공감 하나만 남길 수 있습니다.
                    이미 공감한 메시지에 다시 요청하면 공감 종류가 변경됩니다.
                    """
    )
    public ChatReactionResponse setReaction(
            @Parameter(description = "공감할 메시지 번호", example = "100")
            @PathVariable Long messageId,

            @RequestBody ChatReactionRequest request
    ) {
        ChatReactionResponse response = chatReactionService.setReaction(
                messageId,
                SecurityUtil.getCurrentUserId(),
                request
        );

        publishReaction("UPSERTED", response);
        return response;
    }

    /**
     * 현재 사용자가 메시지에 남긴 공감을 취소합니다.
     */
    @DeleteMapping("/{messageId}/reaction")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "메시지 공감 취소")
    public void removeReaction(
            @Parameter(description = "공감을 취소할 메시지 번호", example = "100")
            @PathVariable Long messageId
    ) {
        chatReactionService.removeReaction(
                messageId,
                SecurityUtil.getCurrentUserId()
        ).ifPresent(response -> publishReaction("REMOVED", response));
    }

    /**
     * WebSocket과 동일한 저장 기능을 REST에서도 사용할 수 있습니다.
     */
    @PostMapping
    @Operation(
            summary = "채팅 메시지 전송",
            description = """
                    REST로 메시지를 저장합니다.
                    WebSocket 전송과 같은 Service를 사용하므로 저장 규칙도 같습니다.
                    """
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "전송 성공"),
            @ApiResponse(
                    responseCode = "400",
                    description = "채팅방 멤버가 아니거나 메시지 내용이 잘못됨",
                    content = @Content(
                            schema = @Schema(implementation = ErrorResponse.class)
                    )
            )
    })
    public ChatMessageResponse sendMessage(
            @RequestBody ChatRestMessageRequest request
    ) {
        if (request == null || request.roomId() == null) {
            throw new IllegalArgumentException("방 번호는 꼭 필요합니다.");
        }

        ChatMessageResponse response = chatMessageService.sendMessage(
                request.roomId(),
                SecurityUtil.getCurrentUserId(),
                request.toMessageRequest()
        );

        // REST로 보낸 메시지도 현재 방을 보고 있는 사용자에게 실시간 전달합니다.
        realtimePublisher.publishMessage(request.roomId(), response);

        return response;
    }

    private void publishReaction(
            String action,
            ChatReactionResponse reaction
    ) {
        // 같은 방을 구독하는 사용자에게 공감 추가·변경·취소를 즉시 알려줍니다.
        realtimePublisher.publishReaction(
                reaction.roomId(),
                new ChatReactionEventResponse(action, reaction)
        );
    }

    /** 저장된 내 메시지를 기준으로 세 가지 스타일의 문장을 추천받습니다. */
    @PostMapping("/suggest")
    @Operation(
            summary = "AI 답장 문장 추천",
            description = "최근 대화 문맥을 AI에 전달해 논리적·공감형·상냥한 문장을 추천합니다."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "추천 성공 또는 안전 정책으로 차단됨"),
            @ApiResponse(
                    responseCode = "400",
                    description = "메시지가 없거나 본인의 메시지가 아님",
                    content = @Content(
                            schema = @Schema(implementation = ErrorResponse.class)
                    )
            ),
            @ApiResponse(
                    responseCode = "502",
                    description = "AI 서버 요청 또는 응답 검증 실패",
                    content = @Content(
                            schema = @Schema(implementation = ErrorResponse.class)
                    )
            )
    })
    public AiSuggestionResponse suggestMessage(
            @Valid @RequestBody ChatSuggestionRequest request
    ) {
        return chatSuggestionService.suggest(
                SecurityUtil.getCurrentUserId(),
                request
        );
    }
}
