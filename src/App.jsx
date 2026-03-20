import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = "https://script.google.com/macros/s/AKfycbwrpAEoEa5jvOzRM3eLyW2gkqukakDNz9LH-4Hwi8tlS7GMuBA2BwTBjaTr7Di6933e/exec";

export default function App() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [hours, setHours] = useState({});
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  
  const todayRef = useRef(null);
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // 시간 파싱 (수식이 섞여 들어오는 것을 방지)
  const parseTime = (val) => {
    let str = String(val || "").trim();
    if (str.includes("오전") || str.includes("오후")) {
      const match = str.match(/\d+:\d+/);
      str = match ? match[0] : "0";
    }
    if (!str.includes(':')) return Number(str) || 0;
    const [h, m] = str.split(":").map(Number);
    return (h || 0) + (m || 0) / 60;
  };

  const totalWorked = Object.values(hours).reduce((a, b) => a + parseTime(b), 0);
  const todayDate = new Date().getDate();
  const isCurrentMonth = new Date().getFullYear() === year && new Date().getMonth() === month;

  const remainingWeekdays = dates.filter(d => {
    if (isCurrentMonth && d < todayDate) return false;
    const dayNum = new Date(year, month, d).getDay();
    return dayNum !== 0 && dayNum !== 6 && !hours[d];
  }).length;

  const diff = Number(target) - totalWorked;
  const suggested = diff > 0 && remainingWeekdays > 0 ? (diff / remainingWeekdays).toFixed(1) : "0";

  const fetchFromServer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?month=${monthKey}&t=${Date.now()}`);
      const data = await res.json();
      if (data) {
        setHours(data.hours || {});
        setTarget(data.target || "");
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [monthKey]);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      html, body { margin: 0; padding: 0; overflow-x: hidden; background-color: #f8fafc; font-family: 'Pretendard', sans-serif; }
      #root { display: block !important; overflow: visible !important; }
      input::placeholder { color: #cbd5e1; }
    `;
    document.head.appendChild(style);
    
    fetchFromServer();
    if (isCurrentMonth && todayRef.current) {
      setTimeout(() => todayRef.current.scrollIntoView({ behavior: "smooth", block: "center" }), 600);
    }
    return () => { if (document.head.contains(style)) document.head.removeChild(style); };
  }, [monthKey, fetchFromServer]);

  const saveAll = async () => {
    setLoading(true);
    try {
      // 데이터 전송 (GAS에서 처리하므로 클린하게 전송)
      await fetch(API_URL, { 
        method: "POST", 
        mode: "no-cors", 
        body: JSON.stringify({ month: monthKey, target, hours }) 
      });
      alert("저장 성공! 데이터 형식이 유지됩니다. 💾");
      fetchFromServer();
    } catch (e) { alert("저장 실패"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ width: "100%", minHeight: "100vh" }}>
      
      {/* 📍 상단 고정 (Sticky Header) - 원래의 깔끔한 디자인 */}
      <div style={{ 
        position: "sticky", top: 0, zIndex: 1000, 
        backgroundColor: "white", width: "100%", 
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
      }}>
        <div style={{ 
          display: "flex", justifyContent: "space-between", alignItems: "center", 
          padding: "18px 24px", borderBottom: "1px solid #f1f5f9" 
        }}>
          <button onClick={() => setMonth(month - 1)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>◀</button>
          <h1 style={{ fontSize: "22px", fontWeight: "800", margin: 0, color: "#1e293b" }}>{year}. {month + 1}</h1>
          <button onClick={() => setMonth(month + 1)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>▶</button>
        </div>
        <div style={{ 
          backgroundColor: "#1e293b", color: "white", padding: "14px 24px", 
          fontSize: "14px", textAlign: "center", fontWeight: "500" 
        }}>
          남은 평일 <span style={{ color: "#60a5fa", fontWeight: "700" }}>{remainingWeekdays}일</span>동안 하루 <span style={{ color: "#60a5fa", fontWeight: "700" }}>{suggested}시간</span>씩 하면 완료!
        </div>
      </div>

      <div style={{ padding: "24px" }}>
        {/* 대시보드 카드 */}
        <div style={{ 
          background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", 
          padding: "24px", borderRadius: "24px", color: "white", 
          boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.4)", marginBottom: "24px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <span style={{ fontSize: "15px", fontWeight: "600", opacity: 0.9 }}>이번 달 목표</span>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <input 
                type="text" value={target} onChange={e => setTarget(e.target.value)} 
                style={{ width: "60px", fontSize: "20px", background: "rgba(255,255,255,0.2)", border: "none", color: "white", textAlign: "right", borderRadius: "8px", padding: "4px 8px", fontWeight: "700", outline: "none" }} 
              />
              <span style={{ fontSize: "16px", fontWeight: "600" }}>h</span>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "12px", opacity: 0.7, marginBottom: "4px" }}>누적 근무</div>
              <div style={{ fontSize: "28px", fontWeight: "800" }}>{totalWorked.toFixed(1)}h</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "12px", opacity: 0.7, marginBottom: "4px" }}>남은 시간</div>
              <div style={{ fontSize: "28px", fontWeight: "800" }}>{(diff > 0 ? diff : 0).toFixed(1)}h</div>
            </div>
          </div>
        </div>

        {/* 날짜 리스트 */}
        <div style={{ background: "white", borderRadius: "24px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          {dates.map(date => {
            const dayNum = new Date(year, month, date).getDay();
            const isWeekend = dayNum === 0 || dayNum === 6;
            const isToday = new Date().getDate() === date && isCurrentMonth;
            const color = dayNum === 0 ? "#ef4444" : (dayNum === 6 ? "#3b82f6" : "#1e293b");

            return (
              <div 
                key={date} ref={isToday ? todayRef : null} 
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #f1f5f9", backgroundColor: isToday ? "#eff6ff" : "white" }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <span style={{ fontSize: "18px", fontWeight: "700", color }}>{date}</span>
                  <span style={{ fontSize: "13px", fontWeight: "600", color, opacity: 0.7 }}>{weekDays[dayNum]}</span>
                </div>
                {!isWeekend ? (
                  <input 
                    type="text" value={hours[date] || ""} 
                    onChange={e => setHours({ ...hours, [date]: e.target.value })} 
                    style={{ width: "70px", height: "38px", fontSize: "16px", textAlign: "right", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0 10px", outline: "none" }} 
                    placeholder={suggested}
                  />
                ) : <span style={{ fontSize: "12px", color: "#cbd5e1", fontWeight: "700" }}>REST</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단 버튼 바 */}
      <div style={{ 
        position: "fixed", bottom: 0, width: "100%", padding: "16px 24px", 
        boxSizing: "border-box", display: "flex", gap: "12px", 
        background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", 
        borderTop: "1px solid #e2e8f0", zIndex: 1001 
      }}>
        <button onClick={fetchFromServer} style={{ padding: "14px 18px", borderRadius: "16px", border: "1px solid #e2e8f0", background: "white", fontSize: "18px", cursor: "pointer" }}>🔄</button>
        <button onClick={saveAll} style={{ flex: 1, padding: "14px", borderRadius: "16px", border: "none", background: "#1e293b", color: "white", fontWeight: "700", fontSize: "16px", cursor: "pointer" }}>저장하기</button>
      </div>
    </div>
  );
}
