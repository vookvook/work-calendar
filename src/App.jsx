import { useState, useEffect } from "react";

// ⚠️ 여기에 새로 배포한 URL을 꼭 넣으세요!
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

  // 데이터 불러오기
  const loadHours = async () => {
    setLoading(true);
    
    // 1. 먼저 로컬 스토리지에서 읽어서 즉시 보여줌
    const localData = localStorage.getItem(`work-data-${monthKey}`);
    if (localData) {
      const parsed = JSON.parse(localData);
      setHours(parsed.hours || {});
      setTarget(parsed.target || "");
    }

    try {
      // 2. 구글 시트에서 최신 데이터 가져오기
      const res = await fetch(`${API_URL}?month=${monthKey}`);
      const data = await res.json();
      
      if (data && (data.hours || data.target)) {
        setHours(data.hours || {});
        setTarget(data.target || "");
        // 3. 서버 성공 시 로컬도 업데이트
        localStorage.setItem(`work-data-${monthKey}`, JSON.stringify(data));
      }
    } catch (e) {
      console.error("데이터 동기화 실패:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHours();
  }, [year, month]);

  const saveAll = async () => {
    setLoading(true);
    const saveData = { month: monthKey, target, hours };

    try {
      // 로컬에 먼저 임시 저장
      localStorage.setItem(`work-data-${monthKey}`, JSON.stringify(saveData));

      // fetch 옵션에 'mode: no-cors'를 쓰면 성공 여부 확인이 어려우므로 
      // POST 후 시트에 들어갔는지 직접 확인하는 것이 가장 정확합니다.
      await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(saveData),
      });
      
      alert("구글 시트에 저장이 요청되었습니다.");
    } catch (error) {
      console.error("저장 실패:", error);
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

  const formatTime = (h) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return `${hh}:${mm.toString().padStart(2, "0")}`;
  };

  const totalWorked = Object.values(hours).reduce((a, b) => a + parseTime(b), 0);
  const remainingHours = target ? target - totalWorked : 0;
  
  const isWeekend = (d) => [0, 6].includes(new Date(year, month, d).getDay());
  const holidays = [/* 공휴일 목록.. 위 코드와 동일 */]; 
  const isHoliday = (d) => holidays.includes(d);

  return (
    <div style={{ width: "100%", maxWidth: "500px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1)}>◀</button>
        <h2 style={{ fontSize: "20px" }}>{year}년 {month + 1}월</h2>
        <button onClick={() => month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1)}>▶</button>
      </header>

      <section style={{ margin: "20px 0", padding: "15px", backgroundColor: "#f0f4ff", borderRadius: "10px" }}>
        <div style={{ marginBottom: "10px" }}>
          목표: <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} style={{ width: "80px", padding: "5px" }} /> 시간
        </div>
        <div style={{ fontSize: "14px", color: "#555" }}>
          현재: <b>{totalWorked.toFixed(2)}h</b> / 남은시간: <b style={{ color: "red" }}>{remainingHours.toFixed(2)}h</b>
        </div>
      </section>

      <main style={{ maxHeight: "50vh", overflowY: "auto", border: "1px solid #eee", padding: "10px", borderRadius: "8px" }}>
        {dates.map(date => {
          const off = isWeekend(date);
          return (
            <div key={date} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f9f9f9", opacity: off ? 0.5 : 1 }}>
              <span style={{ fontSize: "16px" }}>{date}일</span>
              {!off && (
                <input 
                  type="text" 
                  value={hours[date] || ""} 
                  onChange={(e) => setHours({ ...hours, [date]: e.target.value })}
                  style={{ width: "70px", textAlign: "right", border: "1px solid #ccc" }}
                />
              )}
            </div>
          );
        })}
      </main>

      <button 
        onClick={saveAll} 
        disabled={loading}
        style={{ width: "100%", height: "55px", marginTop: "20px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
      >
        {loading ? "처리 중..." : "구글 시트에 저장하기"}
      </button>
      
      {loading && <p style={{ textAlign: "center", fontSize: "12px", color: "#999" }}>데이터를 불러오는 중입니다...</p>}
    </div>
  );
}
