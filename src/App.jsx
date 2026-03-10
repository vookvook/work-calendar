import { useState } from "react";

export default function App() {
  const days = ["월","화","수","목","금","토","일"];
  const dates = Array.from({ length: 31 }, (_, i) => i + 1);

  const [target] = useState(169);

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>2026년 3월 근무시간</h1>

      <div style={{ marginBottom: 20 }}>
        목표 근무시간 <input defaultValue={target} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 10
        }}
      >
        {days.map((d) => (
          <div key={d} style={{ fontWeight: "bold" }}>{d}</div>
        ))}

        {dates.map((date) => (
          <div
            key={date}
            style={{
              border: "1px solid #ddd",
              padding: 10,
              minHeight: 60
            }}
          >
            <div>{date}</div>
            <div style={{ fontSize: 12, color: "#666" }}>
              8시간 03분
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
