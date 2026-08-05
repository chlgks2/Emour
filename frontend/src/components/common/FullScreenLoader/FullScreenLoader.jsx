import { Heart } from "lucide-react";
import styles from "./FullScreenLoader.module.css";

// 라우트 진입 등 화면 전체를 대기시켜야 할 때 쓰는 로더
export default function FullScreenLoader({ label = "불러오는 중" }) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <Heart className={styles.pulse} size={34} aria-hidden="true" />
      <p className={styles.label}>{label}</p>
    </div>
  );
}
