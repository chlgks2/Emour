package com.ssafy.emour.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "채팅 이미지 삭제 결과")
public record ChatImageDeleteResponse(
        @Schema(description = "커플방 번호", example = "1")
        Long roomId,

        @Schema(description = "메시지 번호", example = "100")
        Long messageId,

        @Schema(description = "삭제한 이미지 번호", example = "10")
        Long imageId,

        @Schema(description = "메시지에 남아 있는 이미지 개수", example = "2")
        int remainingImageCount,

        @Schema(description = "모든 이미지가 삭제되어 화면에서 숨길 메시지인지 여부")
        boolean messageHidden,

        @Schema(description = "삭제 일시")
        LocalDateTime deletedAt
) {
}
