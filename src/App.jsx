import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = "https://script.google.com/macros/s/AKfycbzkk_CFCf3IwJ9D3JEi8kHlpkGd1sv3taHjpyzoshiegFRoDZE2NSrmMx2c0JDxq9Bi/exec";

export default function App() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [hours, setHours] = useState({});
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  
  const todayRef = useRef(null);
  const pretendardFont = "Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  // 데이터 안정성을 위해 초기 monthKey 형식을 유지합니다.
  const monthKey = `${year}-${month + 1}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getHolidayName = (d) => {
    const ymd = `${year}-${month + 1}-${d}`;
    const mmdd = `${month + 1}-${d}`;
    const fixed = { "1-1": "신정", "3-1": "삼일절", "5-5": "어린이날", "6-3": "지방선거", "6-6": "현충일", "8-15": "광복절", "10-3": "개천절", "10-9": "한글날", "12-25": "성탄절" };
    if (fixed[mmdd]) return fixed[mmdd];
    const special = { "2026-3-2": "대체공휴일(삼일절)", "2026-5-25": "대체공휴일(부처님오신날)", "2026-8-17": "대체공휴일(광복절)", "2026-10-5": "대체공휴일(개천절)", "2026-2-19": "대체공휴일(설날)", "2026-9-28": "대체공휴일(추석)" };
    return special[ymd] || null;
  };

  const parseTime = (val) => {
    const str = String(val || "").trim();
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
    const holiday = getHolidayName(d);
    return dayNum !== 0 && dayNum !== 6 && !holiday && !hours[d];
  }).length;

  const diff = Number(target) - totalWorked;
  const displayDiff = diff > 0 ? diff : 0;
  const suggested = diff > 0 && remainingWeekdays > 0 ? (diff / remainingWeekdays).toFixed(1) : "0";

  const fetchFromServer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?month=${monthKey}&t=${Date.now()}`);
      const data = await res.json();
      if (data) {
        setHours(data.hours || {});
        setTarget(data.target || "");
        localStorage.setItem(`work-data-${monthKey}`, JSON.stringify(data));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [monthKey]);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      body, html { margin: 0 !important; padding: 0 !important; width: 100%; overflow-x: hidden; background-color: #f8fafc; }
      #root { width: 100%; margin: 0; padding: 0; }
    `;
    document.head.appendChild(style);
    
    const cached = localStorage.getItem(`work-data-${monthKey}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      setHours(parsed.hours || {});
      setTarget(parsed.target || "");
    }
    
    fetchFromServer();

    if (isCurrentMonth) {
      setTimeout(() => {
        if (todayRef.current) todayRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 600);
    }
    return () => { if (document.head.contains(style)) document.head.removeChild(style); };
  }, [monthKey, fetchFromServer]);

  const saveAll = async () => {
    setLoading(true);
    const body = { month: monthKey, target, hours };
    try {
      localStorage.setItem(`work-data-${monthKey}`, JSON.stringify(body));
      await fetch(API_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(body) });
      alert("저장 성공! 💾");
      fetchFromServer();
    } catch (e) { alert("저장 실패"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ width: "100%", minHeight: "100vh", boxSizing: "border-box", fontFamily: pretendardFont }}>
      
      {/* 📍 상단 고정 영역 (헤더 + 안내바) */}
      <div style={{ position: "sticky", top: 0, zIndex: 1000, width: "100%", backgroundColor: "white" }}>
        <div style={{ 
          display: "flex", justifyContent: "space-between", alignItems: "center", 
          padding: "15px 24px", borderBottom: "1px solid #e2e8f0" 
        }}>
          <button onClick={() => month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1)} style={{ fontSize: "20px", background: "none", border: "none" }}>◀</button>
          <h1 style={{ fontSize: "24px", fontWeight: "800", margin: 0 }}>{year}. {month + 1}</h1>
          <button onClick={() => month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1)} style={{ fontSize: "20px", background: "none", border: "none" }}>▶</button>
        </div>

        <div style={{ backgroundColor: "#1e293b", color: "white", padding: "14px 24px", fontSize: "14px", textAlign: "center", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
           남은 평일 <span style={{ fontWeight: "bold", color: "#60a5fa" }}>{remainingWeekdays}일</span> 동안 하루 <span style={{ fontWeight: "bold", color: "#60a5fa", textDecoration: "underline" }}>{suggested}시간</span>씩 하면 완료!
        </div>
      </div>

      <div style={{ padding: "15px 20px" }}>
        <div style={{ background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", padding: "25px 24px", borderRadius: "24px", color: "white" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: "15px" }}>
            <span style={{ fontSize: "16px", fontWeight: "600", opacity: 0.9 }}>목표 시간 설정</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* 목표 시간도 일반 키보드로 수정 */}
              <input type="text" value={target} onChange={e => setTarget(e.target.value)} style={{ width: "70px", fontSize: "20px", background: "rgba(255,255,255,0.2)", border: "none", color: "white", textAlign: "right", borderRadius: "8px", padding: "5px 10px", fontWeight: "800", outline: "none" }} />
              <span style={{ fontSize: "16px" }}>h</span>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: "13px", opacity: 0.8 }}>누적 근무</div><div style={{ fontSize: "32px", fontWeight: "900" }}>{totalWorked.toFixed(1)}h</div></div>
            <div style={{ flex: 1, textAlign: "right" }}><div style={{ fontSize: "13px", opacity: 0.8 }}>남은 시간</div><div style={{ fontSize: "32px", fontWeight: "900" }}>{displayDiff.toFixed(1)}h</div></div>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: "white", paddingBottom: "140px" }}>
        {dates.map(date => {
          const holiday = getHolidayName(date);
          const dayNum = new Date(year, month, date).getDay();
          const isWeekend = dayNum === 0 || dayNum === 6;
          const isToday = new Date().getDate() === date && new Date().getMonth() === month && new Date().getFullYear() === year;
          const isPast = isCurrentMonth && date < todayDate;
          const getDayColor = () => { if (holiday || dayNum === 0) return "#ef4444"; if (dayNum === 6) return "#3b82f6"; return "#1e293b"; };
          
          return (
            <div key={date} ref={isToday ? todayRef : null} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #f1f5f9", backgroundColor: isToday ? "#eff6ff" : "white" }}>
              <div style={{ flex: 1, display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontSize: "22px", fontWeight: "800", color: getDayColor(), opacity: isPast && !hours[date] ? 0.5 : 1 }}>{date}</span>
                <span style={{ fontSize: "13px", fontWeight: "600", color: getDayColor(), opacity: isPast && !hours[date] ? 0.5 : 0.7 }}>({weekDays[dayNum]})</span>
                {holiday && <div style={{ fontSize: "11px", color: "#ef4444", fontWeight: "bold" }}>{holiday}</div>}
              </div>
              {!holiday && !isWeekend ? (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {/* ✨ 일반 키보드가 나오도록 type="text"만 유지하고 inputMode를 제거함 */}
                  <input 
                    type="text" 
                    value={hours[date] || ""} 
                    onChange={e => setHours({ ...hours, [date]: e.target.value })} 
                    style={{ width: "80px", height: "42px", fontSize: "18px", textAlign: "right", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0 8px", outline: "none" }} 
                    placeholder={isPast ? "0" : suggested} 
                  />
                  <button onClick={() => setHours(prev => { const n = {...prev}; delete n[date]; return n; })} style={{ width: "42px", height: "42px", background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: "10px", color: "#ef4444" }}>🗑️</button>
                </div>
              ) : (
                <span style={{ fontSize: "16px", color: "#cbd5e1", fontWeight: "bold" }}>OFF</span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ position: "fixed", bottom: "0", left: "0", width: "100%", display: "flex", padding: "15px 20px", boxSizing: "border-box", background: "white", borderTop: "1px solid #e2e8f0", gap: "12px", zIndex: 2000 }}>
        <button onClick={fetchFromServer} disabled={loading} style={{ width: "60px", height: "60px", fontSize: "28px", backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "15px" }}>{loading ? "..." : "🔄"}</button>
        <button onClick={saveAll} disabled={loading} style={{ flex: 1, height: "60px", backgroundColor: "#1e293b", color: "white", fontSize: "20px", fontWeight: "800", borderRadius: "15px", border: "none" }}>저장하기</button>
      </div>
    </div>
  );
}
