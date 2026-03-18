import { useState, useEffect } from "react";

// ⚠️ 본인의 웹 앱 URL로 교체하세요!
const API_URL = "https://script.google.com/macros/s/AKfycbzkk_CFCf3IwJ9D3JEi8kHlpkGd1sv3taHjpyzoshiegFRoDZE2NSrmMx2c0JDxq9Bi/exec";

export default function App() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [hours, setHours] = useState({});
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);

  const monthKey = `${year}-${month + 1}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // 데이터 로드
  const loadData = async () => {
    setLoading(true);
    // 1. 로컬 스토리지 우선 로드 (빠른 화면 표시)
    const cached = localStorage.getItem(`work-${monthKey}`);
    if (cached) {
      const { hours: h, target: t } = JSON.parse(cached);
      setHours(h || {});
      setTarget(t || "");
    }

    try {
      // 2. 구글 시트에서 최신 데이터 가져오기
      const res = await fetch(`${API_URL}?month=${monthKey}`);
      const data = await res.json();
      if (data && (data.hours || data.target)) {
        setHours(data.hours || {});
        setTarget(data.target || "");
        localStorage.setItem(`work-${monthKey}`, JSON.stringify(data));
      }
    } catch (e) {
      console.error("불러오기 실패:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [year, month]);

  // 저장 함수
  const saveAll = async () => {
    setLoading(true);
    const body = { month: monthKey, target, hours };
    try {
      // 로컬에 선저장
      localStorage.setItem(`work-${monthKey}`, JSON.stringify(body));
      
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors", 
        body: JSON.stringify(body),
      });
      alert("구글 시트에 저장 요청을 보냈습니다!");
    } catch (e) {
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 시간 계산 로직
  const parseTime = (str) => {
    if (!str || typeof str !== 'string' || !str.includes(':')) return Number(str) || 0;
    const [h, m] = str.split(":").map(Number);
    return h + (m || 0) / 60;
  };

  const totalWorked = Object.values(hours).reduce((a, b) => a + parseTime(b), 0);
  const isWeekend = (d) => [0, 6].includes(new Date(year, month, d).getDay());

  return (
    <div style={{ maxWidth: "500px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1)}>◀</button>
        <h3>{year}년 {month + 1}월</h3>
        <button onClick={() => month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1)}>▶</button>
      </div>

      <div style={{ background: "#f3f4f6", padding: "15px", borderRadius: "10px", margin: "20px 0" }}>
        <div>목표: <input type="number" value={target} onChange={e => setTarget(e.target.value)} style={{ width: "60px" }} /> h</div>
        <div style={{ marginTop: "10px" }}>총 근무: <b>{totalWorked.toFixed(2)}h</b></div>
        <div style={{ color: "red" }}>남은 시간: {(target - totalWorked).toFixed(2)}h</div>
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: "10px", padding: "10px", maxHeight: "400px", overflowY: "auto" }}>
        {dates.map(date => (
          <div key={date} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f9f9f9", opacity: isWeekend(date) ? 0.5 : 1 }}>
            <span>{date}일</span>
            {!isWeekend(date) && (
              <input 
                type="text" 
                value={hours[date] || ""} 
                onChange={e => setHours({ ...hours, [date]: e.target.value })} 
                style={{ width: "80px", textAlign: "right" }}
                placeholder="0:00"
              />
            )}
          </div>
        ))}
      </div>

      <button 
        onClick={saveAll} 
        disabled={loading}
        style={{ width: "100%", height: "50px", marginTop: "20px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}
      >
        {loading ? "통신 중..." : "구글 시트에 저장"}
      </button>
    </div>
  );
}
