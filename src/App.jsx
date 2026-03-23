import React, { useState, useEffect, useCallback, useRef } from "react";

// ✅ 사용 중이신 API URL 유지
const API_URL = "https://script.google.com/macros/s/AKfycbzDyH7EB8PYT1Yjgal9xNhxT_tiwKgSOQL_jXAdmTyTMs_i-SG0IUSQ29z5Y_b8Choq/exec";

export default function WorkLogApp() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [hours, setHours] = useState({});
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  
  const todayRef = useRef(null);
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  // ✅ 1. 데이터 키 설정 (서버와 100% 일치시켜야 함: 2026-03)
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // ✅ 2. 시간 파싱 로직 강화
  const parseTime = (val) => {
    let str = String(val || "").trim();
    if (!str) return 0;
    // "오전 9:00" 같은 형식 대응
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

  // ✅ 3. 남은 평일 계산 (서버에서 온 데이터의 키 타입에 상관없이 체크)
  const remainingWeekdays = dates.filter(d => {
    if (isCurrentMonth && d < todayDate) return false;
    const dayNum = new Date(year, month, d).getDay();
    const hasValue = hours[String(d)] || hours[d]; // 키가 "1"일 수도, 1일 수도 있음
    return dayNum !== 0 && dayNum !== 6 && !hasValue;
  }).length;

  const diff = Number(target) - totalWorked;
  const suggested = diff > 0 && remainingWeekdays > 0 ? (diff / remainingWeekdays).toFixed(1) : "0";

  // ✅ 4. 연도까지 변경되는 월 이동 로직
  const handlePrevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else { setMonth(month - 1); }
  };
  const handleNextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else { setMonth(month + 1); }
  };

  const fetchFromServer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?month=${monthKey}&t=${Date.now()}`);
      const data = await res.json();
      if (data) {
        // 데이터가 올 때 키 값을 안정적으로 세팅
        setHours(data.hours || {});
        setTarget(data.target || "");
      }
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
  }, [isCurrentMonth]);

  const saveAll = async () => {
    setLoading(true);
    try {
      await fetch(API_URL, { 
        method: "POST", 
        mode: "no-cors", 
        body: JSON.stringify({ month: monthKey, target, hours }) 
      });
      alert("성공적으로 저장되었습니다! 💾");
      fetchFromServer();
    } catch (e) { alert("저장 실패"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ width: "100%", minHeight: "100vh", backgroundColor: "#f8fafc", paddingBottom: "100px" }}>
      
      {/* 📍 상단 고정 레이어 (Sticky Header) - 구조 단순화 */}
      <div style={{ 
        position: "-webkit-sticky", position: "sticky", 
        top: 0, zIndex: 1000, 
        backgroundColor: "white", width: "100%", 
        borderBottom: "1px solid #e2e8f0"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px" }}>
          <button style={{border:'none', background:'none', fontSize:'24px', padding:'10px'}} onClick={handlePrevMonth}>◀</button>
          <span style={{ fontSize: "20px", fontWeight: "bold" }}>{year}. {month + 1}</span>
          <button style={{border:'none', background:'none', fontSize:'24px', padding:'10px'}} onClick={handleNextMonth}>▶</button>
        </div>
        <div style={{ backgroundColor: "#1e293b", color: "white", padding: "12px", textAlign: "center", fontSize: "14px", fontWeight: "600" }}>
           남은 평일 <span style={{color:'#60a5fa'}}>{remainingWeekdays}일</span> 동안 하루 <span style={{color:'#60a5fa'}}>{suggested}시간</span> 권장
        </div>
      </div>

      <div style={{ padding: "20px" }}>
        {/* 요약 카드 */}
        <div style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", padding: "25px", borderRadius: "24px", color: "white", marginBottom: "20px", boxShadow: "0 10px 15px -3px rgba(37,99,235,0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: "15px" }}>
            <span style={{fontWeight:'600'}}>목표 시간</span>
            <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
              <input type="text" value={target} onChange={e => setTarget(e.target.value)} style={{ width: "70px", background: "rgba(255,255,255,0.2)", border: "none", color: "white", textAlign: "right", borderRadius: "8px", padding: "5px 10px", fontSize: "18px", fontWeight: "bold", outline: "none" }} />
              <span>h</span>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div><small style={{opacity:0.8}}>누적 근무</small><div style={{fontSize:'26px', fontWeight:'900'}}>{totalWorked.toFixed(1)}h</div></div>
            <div style={{textAlign:'right'}}><small style={{opacity:0.8}}>남은 시간</small><div style={{fontSize:'26px', fontWeight:'900'}}>{(diff > 0 ? diff : 0).toFixed(1)}h</div></div>
          </div>
        </div>

        {/* 날짜 리스트 */}
        <div style={{ background: "white", borderRadius: "20px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
          {dates.map(date => {
            const dayNum = new Date(year, month, date).getDay();
            const isWeekend = dayNum === 0 || dayNum === 6;
            const isToday = new Date().getDate() === date && isCurrentMonth;
            
            // 데이터 키를 문자열로 접근
            const hourValue = hours[String(date)] || hours[date] || "";

            return (
              <div key={date} ref={isToday ? todayRef : null} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #f1f5f9", backgroundColor: isToday ? "#eff6ff" : "white" }}>
                <span style={{ fontSize:'18px', fontWeight:'700', color: dayNum === 0 ? "#ef4444" : (dayNum === 6 ? "#3b82f6" : "#1e293b") }}>
                  {date} <small style={{fontSize:'13px', fontWeight:'500', opacity:0.6}}>({weekDays[dayNum]})</small>
                </span>
                {!isWeekend ? (
                  <input 
                    type="text" 
                    value={hourValue} 
                    onChange={e => setHours({ ...hours, [String(date)]: e.target.value })} 
                    style={{ width: "85px", height: "40px", textAlign: "right", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0 10px", fontSize: "16px", outline: "none" }} 
                    placeholder={suggested} 
                  />
                ) : <span style={{color:'#cbd5e1', fontWeight:'bold'}}>OFF</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단 고정 버튼 */}
      <div style={{ position: "fixed", bottom: 0, left: 0, width: "100%", padding: "15px 20px", boxSizing: "border-box", display: "flex", gap: "12px", background: "white", borderTop: "1px solid #e2e8f0", zIndex: 1100 }}>
        <button onClick={fetchFromServer} style={{ width: "60px", height: "60px", borderRadius: "15px", border: "1px solid #e2e8f0", background: "white", fontSize: "24px" }}>
          {loading ? "..." : "🔄"}
        </button>
        <button onClick={saveAll} style={{ flex: 1, height: "60px", borderRadius: "15px", border: "none", background: "#1e293b", color: "white", fontSize: "18px", fontWeight: "bold" }}>
          {loading ? "저장 중..." : "저장하기"}
        </button>
      </div>
    </div>
  );
}
