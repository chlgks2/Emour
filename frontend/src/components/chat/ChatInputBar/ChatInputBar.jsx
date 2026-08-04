import { useRef } from "react";
import { ImagePlus, Send } from "lucide-react";
import styles from "./ChatInputBar.module.css";

export default function ChatInputBar({
  value,
  onChange,
  onSend,
  onImagesSelect,
  disabled,
}) {
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);

  const handleSend = () => {
    onSend();

    // 전송 버튼을 눌러도 다음 메시지를 바로 입력할 수 있게
    // 포커스를 메시지 입력창으로 되돌린다.
    requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFilesChange = (event) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length > 0) {
      onImagesSelect?.(files);
    }
  };

  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={styles.imageBtn}
        aria-label="사진 추가"
        title="사진 추가"
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
      >
        <ImagePlus size={21} />
      </button>
      <input
        ref={fileInputRef}
        className={styles.fileInput}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFilesChange}
        tabIndex={-1}
      />
      <input
        ref={messageInputRef}
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="메시지를 입력하세요"
        aria-label="메시지 입력"
        enterKeyHint="send"
      />
      <button
        type="button"
        className={styles.sendBtn}
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        aria-label="전송"
      >
        <Send size={18} />
      </button>
    </div>
  );
}
