import { useState, useEffect, useCallback } from "react";

// ⚠️ 본인의 웹 앱 URL로 교체하세요!
const API_URL = "https://script.google.com/macros/s/AKfycbxJxf-STtBRMcoTA1HPxe3wYP5rIFhzkMD9pheGHqNO_siH9nMBXXNQZiglIn__Eqo/exec";

export default function App() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [hours, setHours] = useState({});
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);

  const monthKey = `${year}-${month + 1}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // ☁️ 수동으로 서버 데이터를 긁어오는 함수
  const fetchFromServer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?month=${monthKey}&t=${Date.now()}`);
      const data = await res.json();

      if (data && (Object.keys(data.hours).length > 0 || data.target)) {
        setHours(data.hours || {});
        setTarget(data.target || "");
        localStorage.setItem(`work-data-${monthKey}`, JSON.stringify(data));
        alert(`${month + 1}월 데이터를 성공적으로 동기화했습니다!`);
      } else {
        alert("시트에 저장된 데이터가 없습니다.");
      }
    } catch (e) {
      console.error(e);
      alert("데이터를 불러오지 못했습니다. 네트워크 상태를 확인하세요.");
    } finally {
      setLoading(false);
    }
  }, [monthKey, month]);

  // 화면 진입 시 로컬 데이터만 우선 로드 (자동 서버 요청 X)
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

  // 💾 저장 함수
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
      alert("구글 시트에 저장을 완료했습니다!");
    } catch (e) {
      alert("저장 실패");
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
      {/* 🔄 수동 동기화 버튼 (모바일 해결사) */}
      <button 
        onClick={fetchFromServer} 
        disabled={loading}
        style={{ width: "100%", height: "50px", marginBottom: "20px", background: "#10b981", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", fontSize: "16px", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
      >
        {loading ? "데이터 가져오는 중..." : "☁️ 구글 시트에서 불러오기"}
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <button onClick={() => month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1)} style={{ padding: "5px 10px" }}>◀</button>
        <h2 style={{ fontSize: "1.2rem", margin: 0 }}>{year}년 {month + 1}월</h2>
        <button onClick={() => month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1)} style={{ padding: "5px 10px" }}>▶</button>
      </div>

      <div style={{ background: "#f8fafc", padding: "15px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
        <div style={{ marginBottom: "8px" }}>
          목표: <input type="number" value={target} onChange={e => setTarget(e.target.value)} style={{ width: "60px", padding: "5px", borderRadius: "4px", border: "1px solid #cbd5e1" }} /> h
        </div>
        <div style={{ fontSize: "14px", color: "#475569" }}>
          현재: <b>{totalWorked.toFixed(2)}h</b> / 남은: <b style={{ color: "#ef4444" }}>{(target - totalWorked).toFixed(2)}h</b>
        </div>
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden", background: "white" }}>
        <div style={{ maxHeight: "380px", overflowY: "auto" }}>
          {dates.map(date => {
            const weekend = isWeekend(date);
            return (
              <div key={date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 15px", borderBottom: "1px solid #f1f5f9", background: weekend ? "#f8fafc" : "white" }}>
                <span style={{ color: weekend ? "#94a3b8" : "#1e293b", fontWeight: weekend ? "normal" : "500" }}>{date}일</span>
                {!weekend && (
                  <input 
                    type="text" 
                    value={hours[date] || ""} 
                    onChange={e => setHours({ ...hours, [date]: e.target.value })} 
                    style={{ width: "75px", textAlign: "right", border: "1px solid #e2e8f0", borderRadius: "5px", padding: "5px" }}
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
        style={{ width: "100%", height: "60px", marginTop: "20px", background: "#2563eb", color: "white", border: "none", borderRadius: "12px", fontSize: "18px", fontWeight: "bold", cursor: "pointer" }}
      >
        {loading ? "통신 중..." : "서버에 저장하기"}
      </button>
    </div>
  );
}
