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

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
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
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="메시지를 입력하세요"
        aria-label="메시지 입력"
        enterKeyHint="send"
        disabled={disabled}
      />
      <button
        type="button"
        className={styles.sendBtn}
        onClick={onSend}
        disabled={disabled || !value.trim()}
        aria-label="전송"
      >
        <Send size={18} />
      </button>
    </div>
  );
}
