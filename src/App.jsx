import { useState, useEffect, useCallback } from "react";

// ⚠️ 본인의 웹 앱 URL (끝이 /exec로 끝나는 것)을 넣으세요!
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

  // ✨ 수정된 로드 로직: 모바일 브라우저의 캐시를 강제로 무효화합니다.
  const loadData = useCallback(async () => {
    setLoading(true);
    
    // 1. 로컬 저장소 데이터 우선 표시 (새로고침 시 깜빡임 방지)
    const localStr = localStorage.getItem(`work-data-${monthKey}`);
    if (localStr) {
      const localData = JSON.parse(localStr);
      setHours(localData.hours || {});
      setTarget(localData.target || "");
    }

    try {
      // 2. 서버 요청 시 헤더에 캐시 무시 설정 추가
      const res = await fetch(`${API_URL}?month=${monthKey}&t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      const serverData = await res.json();
      
      // 3. 서버 응답이 유효할 때만 업데이트
      if (serverData && (Object.keys(serverData.hours).length > 0 || serverData.target)) {
        setHours(serverData.hours || {});
        setTarget(serverData.target || "");
        localStorage.setItem(`work-data-${monthKey}`, JSON.stringify(serverData));
      }
    } catch (e) {
      console.error("데이터 불러오기 실패:", e);
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 저장 로직
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
      alert("성공적으로 저장 요청을 보냈습니다!");
    } catch (e) {
      console.error("저장 실패:", e);
      alert("저장 중 오류가 발생했습니다.");
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
    <div style={{ maxWidth: "500px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif", fontSize: "18px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <button onClick={() => month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1)} style={{ padding: "10px" }}>◀</button>
        <h2 style={{ margin: 0 }}>{year}년 {month + 1}월</h2>
        <button onClick={() => month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1)} style={{ padding: "10px" }}>▶</button>
      </header>

      <div style={{ backgroundColor: "#f3f4f6", padding: "20px", borderRadius: "12px", marginBottom: "20px" }}>
        <div style={{ marginBottom: "10px" }}>
          목표 시간: <input type="number" value={target} onChange={e => setTarget(e.target.value)} style={{ width: "80px", fontSize: "18px", padding: "5px" }} /> h
        </div>
        <div style={{ color: "#374151" }}>총 근무: <b>{totalWorked.toFixed(2)}h</b></div>
        <div style={{ color: "#dc2626", fontWeight: "bold" }}>남은 시간: {(target - totalWorked).toFixed(2)}h</div>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ maxHeight: "450px", overflowY: "auto", padding: "10px" }}>
          {dates.map(date => {
            const weekend = isWeekend(date);
            return (
              <div key={date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 5px", borderBottom: "1px solid #f3f4f6", backgroundColor: weekend ? "#f9fafb" : "white" }}>
                <span style={{ color: weekend ? "#9ca3af" : "#111827" }}>{date}일</span>
                {!weekend && (
                  <input 
                    type="text" 
                    value={hours[date] || ""} 
                    onChange={e => setHours({ ...hours, [date]: e.target.value })} 
                    style={{ width: "90px", textAlign: "right", padding: "5px", border: "1px solid #d1d5db", borderRadius: "4px" }}
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
        style={{ width: "100%", height: "60px", marginTop: "20px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "12px", fontSize: "20px", fontWeight: "bold", cursor: "pointer" }}
      >
        {loading ? "데이터 처리 중..." : "구글 시트에 저장하기"}
      </button>
      
      {loading && <p style={{ textAlign: "center", color: "#6b7280", fontSize: "14px", marginTop: "10px" }}>동기화 중입니다...</p>}
    </div>
  );
}
