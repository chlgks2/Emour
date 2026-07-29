package com.ssafy.emour.chat.controller;

import com.ssafy.emour.chat.dto.ChatMessageResponse;
import com.ssafy.emour.chat.dto.ChatRestMessageRequest;
import com.ssafy.emour.chat.service.ChatMessageService;
import com.ssafy.emour.global.response.ErrorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
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
