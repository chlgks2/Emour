import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { fetchRecentBookmarks } from "../../../api/bookmarkApi";
import { formatDate, formatTime } from "../../../utils/emotions";
import styles from "./BookmarkPreview.module.css";

/**
 * 대시보드에 노출되는 북마크 미리보기 (최신 3개)
 * 우상단 "더보기"를 누르면 전체 북마크 목록(무한스크롤) 페이지로 이동
 */
const PREVIEW_SIZE = 3;
const PREVIEW_TEXT_LIMIT = 60;

function formatPreviewText(content) {
  if (content.length <= PREVIEW_TEXT_LIMIT) return content;
  return `${content.slice(0, PREVIEW_TEXT_LIMIT).trimEnd()}…`;
}

export default function BookmarkPreview() {
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState(null); // null = 로딩중
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchRecentBookmarks(PREVIEW_SIZE)
      .then((list) => {
        if (!cancelled) setBookmarks(list);
      })
      .catch(() => {
        if (!cancelled) {
          setBookmarks([]);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasBookmarks = Boolean(bookmarks?.length);

  return (
    <section className="surface-plain" aria-labelledby="bookmark-preview-title">
      <header className="section-head">
        <h2 id="bookmark-preview-title" className="section-title">
          북마크한 대화
        </h2>
        {/* 볼 것이 없을 때 "더보기"를 눌러 빈 목록으로 이동하게 두지 않는다 */}
        {hasBookmarks && (
          <button
            type="button"
            className={styles.moreBtn}
            onClick={() => navigate("/bookmarks")}
            aria-label="북마크 전체 보기"
          >
            더보기 <ChevronRight size={14} aria-hidden="true" />
          </button>
        )}
      </header>

      {/*
        로딩 중에는 자리 표시(빈 줄)를 그리지 않는다.
        북마크가 하나도 없는 사용자에게 "내용 없는 항목"이 미리 들어차 있는 것처럼 보였다.
      */}
      {bookmarks === null && (
        <p className={`empty-note ${styles.stateText}`} aria-busy="true">
          불러오는 중...
        </p>
      )}

      {bookmarks?.length === 0 && (
        <p className={`empty-note ${styles.stateText}`}>
          {failed
            ? "북마크를 불러오지 못했어요."
            : "채팅방에서 메시지를 꾹 눌러 저장해보세요."}
        </p>
      )}

      {hasBookmarks && (
        <ul className={styles.list}>
          {bookmarks.map((bookmark) => (
            <li key={bookmark.bookmarkId} className={styles.item}>
              {bookmark.content && (
                <p className={styles.itemText}>
                  {formatPreviewText(bookmark.content)}
                </p>
              )}
              {bookmark.images.length > 0 && (
                <div className={styles.imageGrid}>
                  {bookmark.images.slice(0, 3).map((image, index) => (
                    <div key={image.imageId ?? image.imageUrl} className={styles.imageWrap}>
                      <img
                        className={styles.image}
                        src={image.imageUrl}
                        alt={`북마크한 사진 ${index + 1}`}
                      />
                      {index === 2 && bookmark.images.length > 3 && (
                        <span className={styles.moreImages}>
                          +{bookmark.images.length - 3}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className={styles.itemFooter}>
                <time dateTime={bookmark.sentAt}>
                  {formatDate(bookmark.sentAt)} {formatTime(bookmark.sentAt)}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
