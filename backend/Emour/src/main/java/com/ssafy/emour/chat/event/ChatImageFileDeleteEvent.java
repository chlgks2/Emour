package com.ssafy.emour.chat.event;

/** DB 삭제가 확정된 뒤 실제 저장소 파일을 정리하기 위한 내부 이벤트입니다. */
public record ChatImageFileDeleteEvent(String imageUrl) {
}
