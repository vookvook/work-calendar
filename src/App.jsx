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

  const monthKey = `${year}-${month + 1}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getHolidayName = (d) => {
    const ymd = `${year}-${month + 1}-${d}`;
    const mmdd = `${month + 1}-${d}`;
    const fixed = { "1-1": "신정", "3-1": "삼일절", "5-5": "어린이날", "6-3": "지방선거", "6-6": "현충일", "8-15": "광복절", "10-3": "개천절", "10-9": "한글날", "12-25": "성탄절" };
    if (fixed[mmdd]) return fixed[mmdd];
    const special2026 = {
      "2026-3-2": "대체공휴일(삼일절)", "2026-5-25": "대체공휴일(부처님오신날)", "2026-8-17": "대체공휴일(광복절)",
      "2026-10-5": "대체공휴일(개천절)", "2026-2-19": "대체공휴일(설날)", "2026-9-28": "대체공휴일(추석)"
    };
    return special2026[ymd] || null;
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
  const suggested = diff > 0 && remainingWeekdays > 0 ? (diff / remainingWeekdays).toFixed(1) : "0";

  const scrollToToday = () => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  useEffect(() => {
    document.documentElement.style.touchAction = "pan-y"; 
    const cached = localStorage.getItem(`work-data-${monthKey}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      setHours(parsed.hours || {});
      setTarget(parsed.target || "");
    }
    setTimeout(scrollToToday, 500);
  }, [monthKey]);

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

  const saveAll = async () => {
    setLoading(true);
    const body = { month: monthKey, target, hours };
    try {
      localStorage.setItem(`work-data-${monthKey}`, JSON.stringify(body));
      await fetch(API_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(body) });
      alert("저장 성공! 💾");
    } catch (e) { alert("저장 실패"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ width: "100%", minHeight: "100vh", backgroundColor: "#f8fafc", paddingBottom: "120px", boxSizing: "border-box", fontFamily: pretendardFont }}>
      
      {/* 📅 헤더: 패딩 24px */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", backgroundColor: "white", borderBottom: "1px solid #e2e8f0" }}>
        <button onClick={() => month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1)} style={{ fontSize: "24px", background: "none", border: "none" }}>◀</button>
        <h1 style={{ fontSize: "28px", fontWeight: "800", margin: 0 }}>{year}. {month + 1}</h1>
        <button onClick={() => month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1)} style={{ fontSize: "24px", background: "none", border: "none" }}>▶</button>
      </div>

      {/* 📊 요약 카드: 패딩 24px */}
      <div style={{ padding: "15px 24px" }}>
        <div style={{ background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", padding: "25px 20px", borderRadius: "20px", color: "white", boxShadow: "0 8px 16px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "18px", fontWeight: "bold" }}>목표 시간</span>
            <input type="number" inputMode="numeric" value={target} onChange={e => setTarget(e.target.value)} style={{ width: "70px", fontSize: "22px", background: "rgba(255,255,255,0.2)", border: "none", color: "white", textAlign: "right", borderRadius: "8px", padding: "5px", fontFamily: pretendardFont }} />
          </div>
          <div style={{ fontSize: "48px", fontWeight: "900", lineHeight: 1 }}>{totalWorked.toFixed(1)}<span style={{ fontSize: "18px", fontWeight: "400", marginLeft: "5px" }}>h</span></div>
          <div style={{ fontSize: "15px", marginTop: "12px", opacity: 0.9 }}>
             남은 평일 {remainingWeekdays}일 | 하루 <span style={{ fontWeight: "bold", borderBottom: "2px solid white" }}>{suggested}h</span> 필요
          </div>
        </div>
      </div>

      {/* 📝 날짜 리스트: 패딩 24px */}
      <div style={{ backgroundColor: "white" }}>
        {dates.map(date => {
          const holiday = getHolidayName(date);
          const dayNum = new Date(year, month, date).getDay();
          const isWeekend = dayNum === 0 || dayNum === 6;
          const isToday = new Date().getDate() === date && new Date().getMonth() === month && new Date().getFullYear() === year;
          const isPast = isCurrentMonth && date < todayDate;

          return (
            <div key={date} ref={isToday ? todayRef : null} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #f1f5f9", backgroundColor: isToday ? "#eff6ff" : "white" }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "24px", fontWeight: "800", color: holiday || dayNum === 0 ? "#ef4444" : dayNum === 6 ? "#3b82f6" : "#1e293b", opacity: isPast && !hours[date] ? 0.5 : 1 }}>{date}</span>
                {holiday && <div style={{ fontSize: "12px", color: "#ef4444", fontWeight: "bold" }}>{holiday}</div>}
              </div>

              {!holiday && !isWeekend ? (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input 
                    type="text"
                    inputMode="text" 
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    value={hours[date] || ""} 
                    onChange={e => setHours({ ...hours, [date]: e.target.value })} 
                    style={{ width: "85px", height: "45px", fontSize: "20px", textAlign: "right", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0 8px", outline: "none", fontFamily: pretendardFont, backgroundColor: isPast && !hours[date] ? "#f1f5f9" : "white" }} 
                    placeholder={isPast ? "0" : suggested} 
                  />
                  <button onClick={() => setHours({ ...hours, [date]: "" })} style={{ width: "45px", height: "45px", fontSize: "20px", background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: "10px", color: "#ef4444", display: "flex", justifyContent: "center", alignItems: "center" }}>🗑️</button>
                </div>
              ) : (
                <span style={{ fontSize: "18px", color: "#cbd5e1", fontWeight: "bold" }}>OFF</span>
              )}
            </div>
          );
        })}
      </div>

      {/* 🔘 하단 고정 버튼 바: 패딩 24px */}
      <div style={{ position: "fixed", bottom: "0", left: "0", width: "100%", display: "flex", padding: "20px 24px", boxSizing: "border-box", background: "white", borderTop: "1px solid #e2e8f0", gap: "15px", zIndex: 1000 }}>
        <button onClick={fetchFromServer} disabled={loading} style={{ width: "70px", height: "70px", fontSize: "32px", backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "15px", display: "flex", justifyContent: "center", alignItems: "center" }}>🔄</button>
        <button onClick={saveAll} disabled={loading} style={{ flex: 1, height: "70px", backgroundColor: "#1e293b", color: "white", fontSize: "22px", fontWeight: "800", borderRadius: "15px", border: "none" }}>저장하기</button>
      </div>
    </div>
  );
}
