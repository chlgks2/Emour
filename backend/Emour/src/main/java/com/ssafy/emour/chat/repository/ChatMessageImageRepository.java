package com.ssafy.emour.chat.repository;

import com.ssafy.emour.chat.entity.ChatMessageImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ChatMessageImageRepository
        extends JpaRepository<ChatMessageImage, Long> {

    @Query("""
            select image
            from ChatMessageImage image
            join fetch image.message message
            where image.imageId = :imageId
            """)
    Optional<ChatMessageImage> findWithMessageById(
            @Param("imageId") Long imageId
    );
}
