package com.ssafy.emour.chat.controller;

import com.ssafy.emour.chat.dto.ChatHistoryResponse;
import com.ssafy.emour.chat.dto.ChatMessageResponse;
import com.ssafy.emour.chat.dto.ChatRestMessageRequest;
import com.ssafy.emour.chat.service.ChatMessageService;
import com.ssafy.emour.global.response.ErrorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/chats")
@RequiredArgsConstructor
@Tag(
        name = "채팅 REST API",
        description = "채팅 메시지 REST API"
)
public class ChatRestController {

    private final ChatMessageService chatMessageService;
    private final SimpMessagingTemplate messagingTemplate;

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

            @Parameter(description = "조회하는 사용자 번호", example = "1")
            @RequestParam Long userId,

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
                userId,
                beforeMessageId,
                size
        );
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
                request.toMessageRequest()
        );

        // REST로 보낸 메시지도 현재 방을 보고 있는 사용자에게 실시간 전달합니다.
        messagingTemplate.convertAndSend(
                "/sub/chat/rooms/" + request.roomId() + "/messages",
                response
        );

        return response;
    }
}
