package com.ssafy.emour.chat.controller;

import com.ssafy.emour.chat.dto.ChatImageDeleteResponse;
import com.ssafy.emour.chat.dto.ChatImageUploadResponse;
import com.ssafy.emour.chat.service.ChatImageDeleteService;
import com.ssafy.emour.chat.service.ChatImageUploadService;
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
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/chats/images")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "채팅 이미지 API", description = "채팅 메시지에 넣을 이미지 업로드 API")
public class ChatImageController {

    private final ChatImageUploadService chatImageUploadService;
    private final ChatImageDeleteService chatImageDeleteService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            summary = "채팅 이미지 업로드",
            description = "이미지를 먼저 업로드하고, 반환된 imageUrls를 IMAGE 메시지 전송 시 사용합니다."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "업로드 성공"),
            @ApiResponse(
                    responseCode = "400",
                    description = "채팅방 회원이 아니거나 파일 형식·개수가 잘못됨",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))
            )
    })
    public ChatImageUploadResponse uploadImages(
            @Parameter(description = "이미지를 보낼 채팅방 번호", example = "1")
            @RequestParam Long roomId,

            @Parameter(description = "업로드할 이미지 파일, 최대 10장")
            @RequestPart("files") List<MultipartFile> files
    ) {
        return chatImageUploadService.upload(
                roomId,
                SecurityUtil.getCurrentUserId(),
                files
        );
    }

    @DeleteMapping("/{imageId}")
    @Operation(
            summary = "채팅 이미지 삭제",
            description = "본인이 보낸 이미지 한 장을 삭제합니다. 같은 메시지의 다른 이미지는 유지됩니다."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "삭제 성공"),
            @ApiResponse(
                    responseCode = "400",
                    description = "이미지가 없거나 본인이 보낸 이미지가 아님",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))
            )
    })
    public ChatImageDeleteResponse deleteImage(
            @Parameter(description = "삭제할 이미지 번호", example = "10")
            @PathVariable Long imageId
    ) {
        ChatImageDeleteResponse response = chatImageDeleteService.deleteImage(
                imageId,
                SecurityUtil.getCurrentUserId()
        );
        return response;
    }
}
