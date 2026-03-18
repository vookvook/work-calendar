import { useState, useEffect, useCallback } from "react";

// ⚠️ 본인의 웹 앱 URL로 교체하세요!
const API_URL = "https://script.google.com/macros/s/AKfycbwj9klic8YSAMWI5tw4V4ftWdyIqOghmPc4P4UFgg1Lp8FJ39rxWQkZbmYr2VRgmDs/exec";

export default function App() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [hours, setHours] = useState({});
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);

  const monthKey = `${year}-${month + 1}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // ☁️ 서버에서 데이터 가져오기
  const fetchFromServer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?month=${monthKey}&t=${Date.now()}`);
      const data = await res.json();

      if (data && (Object.keys(data.hours).length > 0 || data.target)) {
        setHours(data.hours || {});
        setTarget(data.target || "");
        localStorage.setItem(`work-data-${monthKey}`, JSON.stringify(data));
        alert("성공적으로 불러왔습니다!");
      } else {
        alert("불러올 데이터가 없습니다.");
      }
    } catch (e) {
      alert("데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  // 월이 바뀔 때 로컬 저장소 데이터만 먼저 로드
  useEffect(() => {
    const cached = localStorage.getItem(`work-data-${monthKey}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      setHours(parsed.hours || {});
      setTarget(parsed.target || "");
    } else {
      setHours({});
      setTarget("");
    }
  }, [monthKey]);

  // 💾 시트에 저장하기
  const saveAll = async () => {
    setLoading(true);
    const body = { month: monthKey, target, hours };
    try {
      localStorage.setItem(`work-data-${monthKey}`, JSON.stringify(body));
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors", 
        body: JSON.stringify(body),
      });
      alert("저장을 완료했습니다!");
    } catch (e) {
      alert("저장 실패");
    } finally {
      setLoading(false);
    }
  };

  // 🧮 시간 수식 계산 (8:08 -> 8.133)
  const parseTime = (val) => {
    const str = String(val || "");
    if (!str.includes(':')) return Number(str) || 0;
    const [h, m] = str.split(":").map(Number);
    return (h || 0) + (m || 0) / 60;
  };

  const totalWorked = Object.values(hours).reduce((a, b) => a + parseTime(b), 0);
  const isWeekend = (d) => [0, 6].includes(new Date(year, month, d).getDay());

  return (
    <div style={{ maxWidth: "450px", margin: "0 auto", padding: "15px", fontFamily: "sans-serif" }}>
      <button 
        onClick={fetchFromServer} 
        disabled={loading}
        style={{ width: "100%", height: "50px", marginBottom: "20px", background: "#10b981", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}
      >
        {loading ? "서버 확인 중..." : "☁️ 구글 시트에서 불러오기"}
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <button onClick={() => month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1)} style={{ padding: "5px 10px" }}>◀</button>
        <h2 style={{ fontSize: "1.1rem", margin: 0 }}>{year}년 {month + 1}월</h2>
        <button onClick={() => month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1)} style={{ padding: "5px 10px" }}>▶</button>
      </div>

      <div style={{ background: "#f1f5f9", padding: "15px", borderRadius: "12px", marginBottom: "20px" }}>
        <div style={{ marginBottom: "5px" }}>목표: <input type="number" value={target} onChange={e => setTarget(e.target.value)} style={{ width: "55px", border: "1px solid #ddd" }} /> h</div>
        <div style={{ fontSize: "14px", color: "#475569" }}>
          현재: <b>{totalWorked.toFixed(2)}h</b> / 남은: <b style={{ color: "red" }}>{(target - totalWorked).toFixed(2)}h</b>
        </div>
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: "10px", overflow: "hidden", background: "white" }}>
        <div style={{ maxHeight: "380px", overflowY: "auto" }}>
          {dates.map(date => {
            const weekend = isWeekend(date);
            return (
              <div key={date} style={{ display: "flex", justifyContent: "space-between", padding: "10px 15px", borderBottom: "1px solid #f9f9f9", background: weekend ? "#fcfcfc" : "white" }}>
                <span style={{ color: weekend ? "#aaa" : "#333" }}>{date}일</span>
                {!weekend && (
                  <input 
                    type="text" 
                    value={hours[date] || ""} 
                    onChange={e => setHours({ ...hours, [date]: e.target.value })} 
                    style={{ width: "65px", textAlign: "right", border: "1px solid #ddd", borderRadius: "4px" }}
                    placeholder="0:00"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button 
        onClick={saveAll} 
        disabled={loading}
        style={{ width: "100%", height: "55px", marginTop: "15px", background: "#2563eb", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", fontSize: "16px" }}
      >
        {loading ? "저장 중..." : "서버에 저장하기"}
      </button>
    </div>
  );
}
