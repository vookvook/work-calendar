import React, { useState, useEffect, useCallback, useRef } from "react";

const API_URL = "https://script.google.com/macros/s/AKfycby3ozvriSAQjbOBEbFDTlgHow3ywj0bZwOUrxDApTeMNwFIRhmA9CdjbP_Yym9e31hQ/exec";

export default function WorkLogApp() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [hours, setHours] = useState({});
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  
  const todayRef = useRef(null);
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  // ✅ 한국 공휴일 데이터 (2026년 기준 예시 - 필요한 날짜를 추가하세요)
  const koreanHolidays = [
    "2026-01-01", // 신정
    "2026-02-16", "2026-02-17", "2026-02-18", // 설날 연휴
    "2026-03-01", "2026-03-02", // 삼일절 및 대체공휴일
    "2026-05-05", // 어린이날
    "2026-05-24", // 부처님 오신 날
    "2026-05-25", // 대체공휴일
    "2026-06-06", // 현충일
    "2026-08-15", // 광복절
    "2026-08-17", // 대체공휴일
    "2026-09-24", "2026-09-25", "2026-09-26", // 추석 연휴
    "2026-10-03", // 개천절
    "2026-10-05", // 개천절 대체공휴일 (월요일)
    "2026-10-09", // 한글날
    "2026-12-25"  // 성탄절
  ];

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // ✅ 휴일 판별 함수 (주말 또는 공휴일 리스트에 포함된 경우)
  const isHoliday = (d) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayNum = new Date(year, month, d).getDay();
    const isWeekend = dayNum === 0 || dayNum === 6;
    const isPublicHoliday = koreanHolidays.includes(dateStr);
    return isWeekend || isPublicHoliday;
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

  const totalWorked = Object.values(hours).reduce((a, b) => a + parseTime(b), 0);
  const todayDate = new Date().getDate();
  const isCurrentMonth = new Date().getFullYear() === year && new Date().getMonth() === month;

  // ✅ 남은 평일 계산 (공휴일 제외 로직 적용)
  const remainingWeekdays = dates.filter(d => {
    if (isCurrentMonth && d < todayDate) return false;
    const holidayCheck = isHoliday(d);
    const hasValue = hours[String(d)];
    return !holidayCheck && !hasValue; // 휴일이 아니고 데이터가 없는 날만 카운트
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
    if (loading) return;
    setLoading(true);
    try {
      const filteredHours = {};
      Object.keys(hours).forEach(key => { if (hours[key]) filteredHours[key] = hours[key]; });
      const payload = { month: monthKey, target: String(target), hours: filteredHours };

      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });

      alert("저장 요청이 전송되었습니다! 💾");
      setTimeout(() => fetchFromServer(), 1500);
    } catch (e) { alert("저장 실패"); }
    finally { setLoading(false); }
  };

  const handlePrevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else { setMonth(month - 1); }
  };
  const handleNextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else { setMonth(month + 1); }
  };

  return (
    <div style={{ width: "100%", minHeight: "100vh", backgroundColor: "#f8fafc", paddingBottom: "100px", fontFamily: "sans-serif" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 1000, backgroundColor: "white", width: "100%", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px" }}>
          <button style={{border:'none', background:'none', fontSize:'20px', padding:'10px', cursor:'pointer'}} onClick={handlePrevMonth}>◀</button>
          <span style={{ fontSize: "18px", fontWeight: "bold" }}>{year}. {month + 1}</span>
          <button style={{border:'none', background:'none', fontSize:'20px', padding:'10px', cursor:'pointer'}} onClick={handleNextMonth}>▶</button>
        </div>
        <div style={{ backgroundColor: "#1e293b", color: "white", padding: "10px", textAlign: "center", fontSize: "13px", fontWeight: "600" }}>
           남은 근무일 <span style={{color:'#60a5fa'}}>{remainingWeekdays}일</span> 동안 하루 <span style={{color:'#60a5fa'}}>{suggested}시간</span> 권장
        </div>
      </div>

      <div style={{ padding: "20px" }}>
        <div style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", padding: "25px", borderRadius: "24px", color: "white", marginBottom: "20px", boxShadow: "0 10px 15px -3px rgba(37,99,235,0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: "15px" }}>
            <span style={{fontWeight:'600'}}>목표 시간</span>
            <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
              <input type="text" value={target} onChange={e => setTarget(e.target.value)} style={{ width: "70px", background: "rgba(255,255,255,0.2)", border: "none", color: "white", textAlign: "right", borderRadius: "8px", padding: "5px 10px", fontSize: "18px", fontWeight: "bold", outline: "none" }} />
              <span>h</span>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div><small style={{opacity:0.8}}>누적 근무</small><div style={{fontSize:'24px', fontWeight:'900'}}>{totalWorked.toFixed(1)}h</div></div>
            <div style={{textAlign:'right'}}><small style={{opacity:0.8}}>남은 시간</small><div style={{fontSize:'24px', fontWeight:'900'}}>{(diff > 0 ? diff : 0).toFixed(1)}h</div></div>
          </div>
        </div>

        <div style={{ background: "white", borderRadius: "20px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
          {dates.map(date => {
            const dayNum = new Date(year, month, date).getDay();
            const holidayCheck = isHoliday(date); // ✅ 주말+공휴일 체크
            const isToday = new Date().getDate() === date && isCurrentMonth;
            const hourValue = hours[String(date)] || "";

            return (
              <div key={date} ref={isToday ? todayRef : null} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px", borderBottom: "1px solid #f1f5f9", backgroundColor: isToday ? "#eff6ff" : "white" }}>
                <span style={{ fontSize:'16px', fontWeight:'700', color: (dayNum === 0 || isHoliday(date)) ? "#ef4444" : (dayNum === 6 ? "#3b82f6" : "#1e293b") }}>
                  {date} <small style={{fontSize:'12px', fontWeight:'500', opacity:0.6}}>({weekDays[dayNum]})</small>
                </span>
                
                {/* ✅ 휴일(주말 포함)이면 입력창 대신 OFF 표시 */}
                {!holidayCheck ? (
                  <input type="text" value={hourValue} onChange={e => setHours({ ...hours, [String(date)]: e.target.value })} style={{ width: "80px", height: "36px", textAlign: "right", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0 10px", fontSize: "15px", outline: "none" }} placeholder={suggested} />
                ) : <span style={{color:'#cbd5e1', fontSize:'14px', fontWeight:'bold'}}>OFF</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, width: "100%", padding: "15px 20px", boxSizing: "border-box", display: "flex", gap: "12px", background: "white", borderTop: "1px solid #e2e8f0", zIndex: 1100 }}>
        <button onClick={fetchFromServer} disabled={loading} style={{ width: "60px", height: "60px", borderRadius: "15px", border: "1px solid #e2e8f0", background: "white", fontSize: "20px" }}>{loading ? "..." : "🔄"}</button>
        <button onClick={saveAll} disabled={loading} style={{ flex: 1, height: "60px", borderRadius: "15px", border: "none", background: "#1e293b", color: "white", fontSize: "17px", fontWeight: "bold" }}>{loading ? "처리 중..." : "저장하기"}</button>
      </div>
    </div>
  );
}
