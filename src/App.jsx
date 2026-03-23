import React, { useState, useEffect, useCallback, useRef } from "react";

const API_URL = "https://script.google.com/macros/s/AKfycbyA5SoFYozvjhTbQoqIdqjKLdSae-IL0mosWMYe1mAFyGn_H1p4ET4R2FRlmdMB7G19/exec";

export default function WorkLogApp() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [hours, setHours] = useState({});
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  
  // ✅ [추가] 서버에서 받아온 원본 데이터를 저장할 상태 (비교용)
  const [originalData, setOriginalData] = useState({ hours: {}, target: "" });

  const todayRef = useRef(null);
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
  const koreanHolidays = ["2026-01-01", "2026-02-16", "2026-02-17", "2026-02-18", "2026-03-01", "2026-03-02", "2026-05-05", "2026-05-24", "2026-05-25", "2026-06-06", "2026-08-15", "2026-08-17", "2026-09-24", "2026-09-25", "2026-09-26", "2026-10-03", "2026-10-05", "2026-10-09", "2026-12-25"];

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // ✅ [추가] 데이터 변경 여부 확인 로직
  // 현재 hours, target이 서버에서 가져온 원본(originalData)과 하나라도 다르면 true
  const isDirty = JSON.stringify(originalData.hours) !== JSON.stringify(hours) || originalData.target !== target;

  const isHoliday = (d) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayNum = new Date(year, month, d).getDay();
    return dayNum === 0 || dayNum === 6 || koreanHolidays.includes(dateStr);
  };

  const parseTime = (val) => {
    let str = String(val || "").trim();
    if (!str) return 0;
    if (str.includes("오전") || str.includes("오후")) {
      const match = str.match(/\d+:\d+/);
      str = match ? match[0] : "0";
    }
    if (!str.includes(':')) return Number(str) || 0;
    const [h, m] = str.split(":").map(Number);
    return (h || 0) + (m || 0) / 60;
  };

  const formatTimeDisplay = (decimalTime) => {
    if (decimalTime <= 0) return "0:00";
    const h = Math.floor(decimalTime);
    const m = Math.round((decimalTime - h) * 60);
    return `${h}:${String(m).padStart(2, '0')}`;
  };

  const totalWorked = Object.values(hours).reduce((a, b) => a + parseTime(b), 0);
  const targetDecimal = parseTime(target);
  const diff = targetDecimal - totalWorked;

  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const isFutureMonth = new Date(year, month) > new Date(now.getFullYear(), now.getMonth());

  const remainingWeekdays = dates.filter(d => {
    const holidayCheck = isHoliday(d);
    const hasValue = !!hours[String(d)];
    if (isFutureMonth) return !holidayCheck && !hasValue;
    if (isCurrentMonth) {
      if (d < now.getDate()) return false;
      return !holidayCheck && !hasValue;
    }
    return false;
  }).length;

  const suggested = diff > 0 && remainingWeekdays > 0 ? (diff / remainingWeekdays).toFixed(1) : "0";

  const fetchFromServer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?month=${monthKey}&t=${Date.now()}`);
      const data = await res.json();
      
      const serverHours = data.hours || {};
      const serverTarget = data.target || "";

      setHours(serverHours);
      setTarget(serverTarget);
      // ✅ [추가] 원본 데이터 보관
      setOriginalData({ hours: serverHours, target: serverTarget });
    } catch (e) { console.error("불러오기 실패:", e); }
    finally { setLoading(false); }
  }, [monthKey]);

  useEffect(() => {
    fetchFromServer();
  }, [fetchFromServer]);

  useEffect(() => {
    if (isCurrentMonth && todayRef.current) {
      setTimeout(() => todayRef.current.scrollIntoView({ behavior: "smooth", block: "center" }), 600);
    }
  }, [isCurrentMonth, month]);

  const saveAll = async () => {
    if (loading || !isDirty) return; // ✅ 수정사항 없으면 실행 안 함
    
    const finalTarget = target.trim() === "" ? "0:00" : target;
    setLoading(true);
    try {
      const filteredHours = {};
      Object.keys(hours).forEach(key => { 
        if (hours[key] && String(hours[key]).trim() !== "") {
          filteredHours[key] = hours[key]; 
        }
      });
      
      const payload = { month: monthKey, target: finalTarget, hours: filteredHours };

      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });

      alert(`${month + 1}월 저장 완료!`);
      setTimeout(() => fetchFromServer(), 1000);
    } catch (e) { alert("저장 실패"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ width: "100%", minHeight: "100vh", backgroundColor: "#f8fafc", paddingBottom: "100px", fontFamily: "sans-serif", overflowX: "hidden" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 1000, backgroundColor: "white", width: "100%", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px" }}>
          <button style={{border:'none', background:'none', fontSize:'20px', padding:'10px'}} onClick={() => { if (month === 0) { setYear(year - 1); setMonth(11); } else { setMonth(month - 1); } }}>◀</button>
          <span style={{ fontSize: "18px", fontWeight: "bold" }}>{year}. {month + 1}</span>
          <button style={{border:'none', background:'none', fontSize:'20px', padding:'10px'}} onClick={() => { if (month === 11) { setYear(year + 1); setMonth(0); } else { setMonth(month + 1); } }}>▶</button>
        </div>
        <div style={{ backgroundColor: "#1e293b", color: "white", padding: "10px", textAlign: "center", fontSize: "13px", fontWeight: "600" }}>
           남은 근무일 <span style={{color:'#60a5fa'}}>{remainingWeekdays}일</span> 동안 하루 <span style={{color:'#60a5fa'}}>{suggested}시간</span> 권장
        </div>
      </div>

      <div style={{ padding: "20px", boxSizing: "border-box" }}>
        <div style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", padding: "25px", borderRadius: "24px", color: "white", marginBottom: "20px", boxShadow: "0 10px 15px -3px rgba(37,99,235,0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: "15px" }}>
            <span style={{fontWeight:'600'}}>목표 시간</span>
            <input type="text" value={target} onChange={e => setTarget(e.target.value)} placeholder="00:00" style={{ width: "90px", background: "rgba(255,255,255,0.2)", border: "none", color: "white", textAlign: "right", borderRadius: "8px", padding: "5px 10px", fontSize: "18px", fontWeight: "bold", outline: "none" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div><small style={{opacity:0.8}}>누적 근무</small><div style={{fontSize:'24px', fontWeight:'900'}}>{formatTimeDisplay(totalWorked)}</div></div>
            <div style={{textAlign:'right'}}><small style={{opacity:0.8}}>남은 시간</small><div style={{fontSize:'24px', fontWeight:'900'}}>{formatTimeDisplay(diff > 0 ? diff : 0)}</div></div>
          </div>
        </div>

        <div style={{ background: "white", borderRadius: "20px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
          {dates.map(date => {
            const dayNum = new Date(year, month, date).getDay();
            const holidayCheck = isHoliday(date);
            const isToday = new Date().getDate() === date && isCurrentMonth;
            const hourValue = hours[String(date)] || "";

            return (
              <div key={date} ref={isToday ? todayRef : null} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px", borderBottom: "1px solid #f1f5f9", backgroundColor: isToday ? "#eff6ff" : "white" }}>
                <span style={{ fontSize:'16px', fontWeight:'700', color: (dayNum === 0 || holidayCheck) ? "#ef4444" : (dayNum === 6 ? "#3b82f6" : "#1e293b") }}>
                  {date} <small style={{fontSize:'12px', opacity:0.6}}>({weekDays[dayNum]})</small>
                </span>
                {!holidayCheck ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input type="text" value={hourValue} onChange={e => setHours({ ...hours, [String(date)]: e.target.value })} style={{ width: "80px", height: "36px", textAlign: "right", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0 10px", fontSize: "15px", outline: "none" }} placeholder={suggested} />
                    {hourValue ? <button onClick={() => { const newH = {...hours}; delete newH[String(date)]; setHours(newH); }} style={{ border: "none", background: "none", padding: "5px", cursor: "pointer", fontSize: "16px", opacity: 0.5 }}>🗑️</button> : <div style={{ width: "26px" }}></div>}
                  </div>
                ) : <span style={{ color:'#cbd5e1', fontSize:'14px', fontWeight:'bold', marginRight: "34px" }}>OFF</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, width: "100%", padding: "15px 20px", boxSizing: "border-box", display: "flex", gap: "12px", background: "white", borderTop: "1px solid #e2e8f0", zIndex: 1100 }}>
        <button onClick={fetchFromServer} disabled={loading} style={{ width: "60px", height: "60px", borderRadius: "15px", border: "1px solid #e2e8f0", background: "white", fontSize: "20px" }}>🔄</button>
        
        {/* ✅ [수정] 수정사항이 없을 때(isDirty가 false일 때) 버튼 비활성화 및 색상 변경 */}
        <button 
          onClick={saveAll} 
          disabled={loading || !isDirty} 
          style={{ 
            flex: 1, 
            height: "60px", 
            borderRadius: "15px", 
            border: "none", 
            background: (loading || !isDirty) ? "#cbd5e1" : "#1e293b", 
            color: (loading || !isDirty) ? "#94a3b8" : "white", 
            fontSize: "17px", 
            fontWeight: "bold",
            cursor: (loading || !isDirty) ? "not-allowed" : "pointer",
            transition: "all 0.3s ease"
          }}
        >
          {loading ? "처리 중..." : (isDirty ? "저장하기" : "수정사항 없음")}
        </button>
      </div>
    </div>
  );
}
