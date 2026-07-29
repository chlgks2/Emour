package com.ssafy.emour.chat.controller;

import com.ssafy.emour.chat.dto.ChatMessageRequest;
import com.ssafy.emour.chat.dto.ChatMessageResponse;
import com.ssafy.emour.chat.dto.ChatReadRequest;
import com.ssafy.emour.chat.dto.ChatReadResponse;
import com.ssafy.emour.chat.exception.ChatException;
import com.ssafy.emour.chat.service.ChatMessageService;
import com.ssafy.emour.chat.service.ChatReadService;
import com.ssafy.emour.global.response.ErrorResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class ChatMessageController {

    private final ChatMessageService chatMessageService;
    private final ChatReadService chatReadService;

    /**
     * "/pub/chat/rooms/1/messages"로 온 메시지를 받습니다.
     * 처리한 메시지는 "/sub/chat/rooms/1/messages"를 보고 있는 사람들에게 전달합니다.
     */
    @MessageMapping("/chat/rooms/{roomId}/messages")
    @SendTo("/sub/chat/rooms/{roomId}/messages")
    public ChatMessageResponse sendMessage(
            @DestinationVariable Long roomId,
            Principal principal,
            ChatMessageRequest request
    ) {
        // DB 저장이 성공한 메시지만 채팅방 사람들에게 전달합니다.
        return chatMessageService.sendMessage(
                roomId,
                getUserId(principal),
                request
        );
    }

    /**
     * 사용자가 마지막으로 읽은 메시지를 저장하고 같은 방에 알려줍니다.
     */
    @MessageMapping("/chat/rooms/{roomId}/read")
    @SendTo("/sub/chat/rooms/{roomId}/read")
    public ChatReadResponse readMessage(
            @DestinationVariable Long roomId,
            Principal principal,
            ChatReadRequest request
    ) {
        return chatReadService.markAsRead(
                roomId,
                getUserId(principal),
                request
        );
    }

    /**
     * WebSocket 처리 중 생긴 오류는 요청한 사용자에게만 보냅니다.
     */
    @MessageExceptionHandler
    @SendToUser(value = "/queue/errors", broadcast = false)
    public ErrorResponse handleWebSocketError(Exception exception) {
        return ErrorResponse.of(exception.getMessage());
    }

    private Long getUserId(Principal principal) {
        if (principal == null) {
            throw new ChatException("로그인이 필요합니다.");
        }

        try {
            return Long.valueOf(principal.getName());
        } catch (NumberFormatException exception) {
            throw new ChatException("로그인 정보를 확인할 수 없습니다.");
        }
    }
}
