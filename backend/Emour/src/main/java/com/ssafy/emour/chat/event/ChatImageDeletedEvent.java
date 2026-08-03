package com.ssafy.emour.chat.event;

import com.ssafy.emour.chat.dto.ChatImageDeleteResponse;

/** 이미지 삭제가 확정된 뒤 실시간 구독자에게 전달할 내부 이벤트입니다. */
public record ChatImageDeletedEvent(ChatImageDeleteResponse response) {
}
