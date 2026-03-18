import { useState, useEffect, useCallback } from "react";

// ⚠️ 본인의 웹 앱 URL 확인!
const API_URL = "https://script.google.com/macros/s/AKfycbzkk_CFCf3IwJ9D3JEi8kHlpkGd1sv3taHjpyzoshiegFRoDZE2NSrmMx2c0JDxq9Bi/exec";

export default function App() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [hours, setHours] = useState({});
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);

  const monthKey = `${year}-${month + 1}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 타임스탬프를 붙여서 모바일 캐시를 강제로 무력화
      const response = await fetch(`${API_URL}?month=${monthKey}&t=${Date.now()}`, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      
      const serverData = await response.json();
      
      // 서버 데이터가 비어있지 않을 때만 업데이트 (로컬 데이터 덮어쓰기 방지)
      if (serverData && (Object.keys(serverData.hours).length > 0 || serverData.target)) {
        setHours(serverData.hours || {});
        setTarget(serverData.target || "");
        // 서버 데이터를 로컬에도 동기화
        localStorage.setItem(`work-data-${monthKey}`, JSON.stringify(serverData));
      } else {
        // 서버에 데이터가 없으면 로컬 데이터라도 불러옴
        const cached = localStorage.getItem(`work-data-${monthKey}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          setHours(parsed.hours || {});
          setTarget(parsed.target || "");
        }
      }
    } catch (e) {
      console.error("불러오기 실패:", e);
      // 오프라인이거나 에러 시 로컬 저장소 사용
      const cached = localStorage.getItem(`work-data-${monthKey}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setHours(parsed.hours || {});
        setTarget(parsed.target || "");
      }
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveAll = async () => {
    setLoading(true);
    const body = { month: monthKey, target, hours };
    try {
      // 1. 일단 로컬에 즉시 저장 (사용자 체감 속도)
      localStorage.setItem(`work-data-${monthKey}`, JSON.stringify(body));
      
      // 2. 구글 서버로 전송
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors", 
        body: JSON.stringify(body),
      });
      alert("구글 시트에 동기화 요청을 보냈습니다!");
    } catch (e) {
      alert("동기화 실패");
    } finally {
      setLoading(false);
    }
  };

  const parseTime = (str) => {
    if (!str || typeof str !== 'string' || !str.includes(':')) return Number(str) || 0;
    const [h, m] = str.split(":").map(Number);
    return h + (m || 0) / 60;
  };

  const totalWorked = Object.values(hours).reduce((a, b) => a + parseTime(b), 0);
  const isWeekend = (d) => [0, 6].includes(new Date(year, month, d).getDay());

  return (
    <div style={{ maxWidth: "450px", margin: "0 auto", padding: "15px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1)}>◀</button>
        <h2 style={{ fontSize: "1.1rem" }}>{year}년 {month + 1}월</h2>
        <button onClick={() => month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1)}>▶</button>
      </div>

      <div style={{ background: "#f1f5f9", padding: "15px", borderRadius: "10px", margin: "15px 0" }}>
        <div>목표: <input type="number" value={target} onChange={e => setTarget(e.target.value)} style={{ width: "50px" }} /> 시간</div>
        <div style={{ marginTop: "5px", fontSize: "14px" }}>
          현재: <b>{totalWorked.toFixed(2)}h</b> / 남은: <b>{(target - totalWorked).toFixed(2)}h</b>
        </div>
      </div>

      <div style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #eee", borderRadius: "8px" }}>
        {dates.map(date => {
          const weekend = isWeekend(date);
          return (
            <div key={date} style={{ display: "flex", justifyContent: "space-between", padding: "10px", borderBottom: "1px solid #f8f8f8", background: weekend ? "#fcfcfc" : "white" }}>
              <span style={{ color: weekend ? "#aaa" : "#000" }}>{date}일</span>
              {!weekend && (
                <input 
                  type="text" 
                  value={hours[date] || ""} 
                  onChange={e => setHours({ ...hours, [date]: e.target.value })} 
                  style={{ width: "60px", textAlign: "right", border: "1px solid #ddd" }}
                />
              )}
            </div>
          );
        })}
      </div>

      <button 
        onClick={saveAll} 
        disabled={loading}
        style={{ width: "100%", height: "50px", marginTop: "15px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold" }}
      >
        {loading ? "데이터 동기화 중..." : "서버와 동기화 및 저장"}
      </button>
    </div>
  );
}
