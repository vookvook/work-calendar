import React, { useState, useEffect, useCallback, useRef } from "react";

// ✅ 배포하신 앱스크립트 URL로 교체하세요.
const API_URL = "https://script.google.com/macros/s/AKfycby3ozvriSAQjbOBEbFDTlgHow3ywj0bZwOUrxDApTeMNwFIRhmA9CdjbP_Yym9e31hQ/exec";

export default function WorkLogApp() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [hours, setHours] = useState({});
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  
  const todayRef = useRef(null);
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  // 1. 데이터 키 설정 (서버와 일치: 2026-03)
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // 2. 시간 파싱 로직 (문자열 시간을 숫자로 변환하여 합산)
  const parseTime = (val) => {
    let str = String(val || "").trim();
    if (!str) return 0;
    
    // "오전 9:00" 등 한글 포함 형식 대응
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

  // 3. 남은 평일 계산
  const remainingWeekdays = dates.filter(d => {
    if (isCurrentMonth && d < todayDate) return false;
    const dateObj = new Date(year, month, d);
    const dayNum = dateObj.getDay();
    const hasValue = hours[String(d)];
    return dayNum !== 0 && dayNum !== 6 && !hasValue;
  }).length;

  const diff = Number(target) - totalWorked;
  const suggested = diff > 0 && remainingWeekdays > 0 ? (diff / remainingWeekdays).toFixed(1) : "0";

  // 4. 데이터 불러오기 (GET)
  const fetchFromServer = useCallback(async () => {
    setLoading(true);
    try {
      // 쿼리 파라미터로 monthKey 전달
      const res = await fetch(`${API_URL}?month=${monthKey}&t=${new Date().getTime()}`);
      const data = await res.json();
      if (data) {
        // 앱스크립트에서 보낸 JSON 구조에 맞춰 상태 업데이트
        setHours(data.hours || {});
        setTarget(data.target || "");
      }
    } catch (e) {
      console.error("데이터 불러오기 실패:", e);
      // 실패 시 초기화 (선택 사항)
      setHours({});
      setTarget("");
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    fetchFromServer();
  }, [fetchFromServer]);

  // 오늘 날짜로 스크롤
  useEffect(() => {
    if (isCurrentMonth && todayRef.current) {
      setTimeout(() => todayRef.current.scrollIntoView({ behavior: "smooth", block: "center" }), 600);
    }
  }, [isCurrentMonth, month]);

  // 5. 저장하기 (POST)
  const saveAll = async () => {
    if (loading) return;
    setLoading(true);
    
    try {
      // 불필요한 빈 값 제외하고 전송 데이터 정리
      const filteredHours = {};
      Object.keys(hours).forEach(key => {
        if (hours[key]) filteredHours[key] = hours[key];
      });

      const payload = {
        month: monthKey,
        target: String(target),
        hours: filteredHours
      };

      // no-cors 모드에서는 응답 본문을 읽을 수 없으므로 성공 여부 판단이 제한적임
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });

      alert("저장 요청이 전송되었습니다! 💾");
      
      // 서버 반영 시간을 고려하여 1.5초 후 다시 불러오기
      setTimeout(() => fetchFromServer(), 1500);
    } catch (e) {
      console.error("저장 오류:", e);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
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
      
      {/* Sticky Header */}
      <div style={{ 
        position: "sticky", top: 0, zIndex: 1000, 
        backgroundColor: "white", width: "100%", 
        borderBottom: "1px solid #e2e8f0"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px" }}>
          <button style={{border:'none', background:'none', fontSize:'20px', padding:'10px', cursor:'pointer'}} onClick={handlePrevMonth}>◀</button>
          <span style={{ fontSize: "18px", fontWeight: "bold" }}>{year}. {month + 1}</span>
          <button style={{border:'none', background:'none', fontSize:'20px', padding:'10px', cursor:'pointer'}} onClick={handleNextMonth}>▶</button>
        </div>
        <div style={{ backgroundColor: "#1e293b", color: "white", padding: "10px", textAlign: "center", fontSize: "13px", fontWeight: "600" }}>
           남은 평일 <span style={{color:'#60a5fa'}}>{remainingWeekdays}일</span> 동안 하루 <span style={{color:'#60a5fa'}}>{suggested}시간</span> 권장
        </div>
      </div>

      <div style={{ padding: "20px" }}>
        {/* 요약 카드 */}
        <div style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", padding: "25px", borderRadius: "24px", color: "white", marginBottom: "20px", boxShadow: "0 10px 15px -3px rgba(37,99,235,0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: "15px" }}>
            <span style={{fontWeight:'600'}}>목표 시간</span>
            <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
              <input 
                type="text" 
                value={target} 
                onChange={e => setTarget(e.target.value)} 
                style={{ width: "70px", background: "rgba(255,255,255,0.2)", border: "none", color: "white", textAlign: "right", borderRadius: "8px", padding: "5px 10px", fontSize: "18px", fontWeight: "bold", outline: "none" }} 
              />
              <span>h</span>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div><small style={{opacity:0.8}}>누적 근무</small><div style={{fontSize:'24px', fontWeight:'900'}}>{totalWorked.toFixed(1)}h</div></div>
            <div style={{textAlign:'right'}}><small style={{opacity:0.8}}>남은 시간</small><div style={{fontSize:'24px', fontWeight:'900'}}>{(diff > 0 ? diff : 0).toFixed(1)}h</div></div>
          </div>
        </div>

        {/* 날짜 리스트 */}
        <div style={{ background: "white", borderRadius: "20px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
          {dates.map(date => {
            const dayNum = new Date(year, month, date).getDay();
            const isWeekend = dayNum === 0 || dayNum === 6;
            const isToday = new Date().getDate() === date && isCurrentMonth;
            const hourValue = hours[String(date)] || "";

            return (
              <div 
                key={date} 
                ref={isToday ? todayRef : null} 
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px", borderBottom: "1px solid #f1f5f9", backgroundColor: isToday ? "#eff6ff" : "white" }}
              >
                <span style={{ fontSize:'16px', fontWeight:'700', color: dayNum === 0 ? "#ef4444" : (dayNum === 6 ? "#3b82f6" : "#1e293b") }}>
                  {date} <small style={{fontSize:'12px', fontWeight:'500', opacity:0.6}}>({weekDays[dayNum]})</small>
                </span>
                {!isWeekend ? (
                  <input 
                    type="text" 
                    value={hourValue} 
                    onChange={e => setHours({ ...hours, [String(date)]: e.target.value })} 
                    style={{ width: "80px", height: "36px", textAlign: "right", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0 10px", fontSize: "15px", outline: "none" }} 
                    placeholder={suggested} 
                  />
                ) : <span style={{color:'#cbd5e1', fontSize:'14px', fontWeight:'bold'}}>OFF</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단 고정 버튼 */}
      <div style={{ position: "fixed", bottom: 0, left: 0, width: "100%", padding: "15px 20px", boxSizing: "border-box", display: "flex", gap: "12px", background: "white", borderTop: "1px solid #e2e8f0", zIndex: 1100 }}>
        <button onClick={fetchFromServer} disabled={loading} style={{ width: "60px", height: "60px", borderRadius: "15px", border: "1px solid #e2e8f0", background: "white", fontSize: "20px", cursor: "pointer" }}>
          {loading ? "..." : "🔄"}
        </button>
        <button onClick={saveAll} disabled={loading} style={{ flex: 1, height: "60px", borderRadius: "15px", border: "none", background: "#1e293b", color: "white", fontSize: "17px", fontWeight: "bold", cursor: "pointer" }}>
          {loading ? "처리 중..." : "저장하기"}
        </button>
      </div>
    </div>
  );
}
