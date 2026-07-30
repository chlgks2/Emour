import styles from "./DateDivider.module.css";
import { formatDate } from "../../utils/emotions";

// dateTime: chat_message.sent_at 등 DATETIME 값의 ISO 문자열
export default function DateDivider({ dateTime }) {
  return (
    <div className={styles.divider}>
      <span>{formatDate(dateTime)}</span>
    </div>
  );
}
