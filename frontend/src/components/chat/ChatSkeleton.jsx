import Skeleton from "../common/Skeleton";
import styles from "./ChatSkeleton.module.css";

// 대화 목록 로딩 자리 표시. 말풍선 폭을 번갈아 다르게 해 실제 대화처럼 보이게 한다.
const PLACEHOLDER_ROWS = [
  { mine: false, width: "58%" },
  { mine: true, width: "44%" },
  { mine: false, width: "70%" },
  { mine: true, width: "36%" },
  { mine: false, width: "50%" },
  { mine: true, width: "62%" },
];

export default function ChatSkeleton() {
  return (
    <div className={styles.wrap}>
      <span className="sr-only">대화를 불러오는 중입니다</span>
      {PLACEHOLDER_ROWS.map((row, i) => (
        <div key={i} className={[styles.row, row.mine ? styles.mine : ""].join(" ")}>
          <Skeleton width={row.width} height="40px" radius="var(--radius-md)" />
        </div>
      ))}
    </div>
  );
}
