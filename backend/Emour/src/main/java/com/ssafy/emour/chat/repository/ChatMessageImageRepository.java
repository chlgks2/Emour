package com.ssafy.emour.chat.repository;

import com.ssafy.emour.chat.entity.ChatMessageImage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatMessageImageRepository
        extends JpaRepository<ChatMessageImage, Long> {

    @Query("""
            SELECT image
            FROM ChatMessageImage image
            JOIN FETCH image.message message
            WHERE message.roomId = :roomId
            ORDER BY image.imageId DESC
            """)
    List<ChatMessageImage> findRecentImages(
            @Param("roomId") Long roomId,
            Pageable pageable
    );

    @Query("""
            SELECT image
            FROM ChatMessageImage image
            JOIN FETCH image.message message
            WHERE message.roomId = :roomId
              AND image.imageId < :beforeImageId
            ORDER BY image.imageId DESC
            """)
    List<ChatMessageImage> findImagesBefore(
            @Param("roomId") Long roomId,
            @Param("beforeImageId") Long beforeImageId,
            Pageable pageable
    );
}
