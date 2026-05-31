import React, { useState, useEffect, useCallback, useRef } from "react";

const API_URL = "https://script.google.com/macros/s/AKfycbyA5SoFYozvjhTbQoqIdqjKLdSae-IL0mosWMYe1mAFyGn_H1p4ET4R2FRlmdMB7G19/exec";

// SVG 아이콘 직접 정의 (인라인 스타일에서 의존성 없이 즉시 렌더링되도록 구현)
const IconCalculator = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
    <line x1="9" y1="22" x2="9" y2="16"></line>
    <line x1="8" y1="6" x2="16" y2="6"></line>
    <line x1="16" y1="16" x2="16" y2="22"></line>
    <line x1="15" y1="2" x2="15" y2="22"></line>
  </svg>
);

const IconX = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const IconRotate = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
  </svg>
);

const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

export default function App() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [hours, setHours] = useState({});
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  
  // 서버에서 받아온 원본 데이터를 저장할 상태
  const [originalData, setOriginalData] = useState({ hours: {}, target: "" });

  // 1일 계산기 노출 여부
  const [showCalc, setShowCalc] = useState(false);

  // 인앱 커스텀 토스트 알림 상태
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // 계산기 로컬 전용 상태 (저장 안 됨, nn:nn 포맷 초기화)
  const [calcStart, setCalcStart] = useState("09:00");
  const [calcTarget, setCalcTarget] = useState("08:00"); 
  const [calcRest, setCalcRest] = useState("01:00"); 
  
  const [calcNowTime, setCalcNowTime] = useState("");
  const [calcWorked, setCalcWorked] = useState("05:30"); 
  const [calcDailyTarget, setCalcDailyTarget] = useState("08:00"); 

  const todayRef = useRef(null);
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
  const koreanHolidays = [
    "2026-01-01", "2026-02-16", "2026-02-17", "2026-02-18", "2026-03-01", "2026-03-02", 
    "2026-05-01", "2026-05-05", "2026-05-24", "2026-05-25", "2026-06-03", "2026-06-06", 
    "2026-08-15", "2026-08-17", "2026-09-24", "2026-09-25", "2026-09-26", "2026-10-03", 
    "2026-10-05", "2026-10-09", "2026-12-25"
  ];

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // 데이터 변경 여부 확인 로직
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

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const fetchFromServer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?month=${monthKey}&t=${Date.now()}`);
      const data = await res.json();
      
      const serverHours = data.hours || {};
      const serverTarget = data.target || "";

      setHours(serverHours);
      setTarget(serverTarget);
      setOriginalData({ hours: serverHours, target: serverTarget });
      showToast("데이터를 성공적으로 불러왔습니다.");
    } catch (e) { 
      console.error("불러오기 실패:", e); 
      showToast("불러오기 실패", "error");
    } finally { 
      setLoading(false); 
    }
  }, [monthKey]);

  useEffect(() => {
    fetchFromServer();
  }, [fetchFromServer]);

  useEffect(() => {
    if (isCurrentMonth && todayRef.current) {
      setTimeout(() => todayRef.current.scrollIntoView({ behavior: "smooth", block: "center" }), 600);
    }
    // 계산기 초기 시간 지정
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMin = String(now.getMinutes()).padStart(2, '0');
    setCalcNowTime(`${currentHour}:${currentMin}`);
  }, [isCurrentMonth, month]);

  const saveAll = async () => {
    if (loading || !isDirty) return;
    
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

      showToast(`${month + 1}월 저장 완료!`);
      setTimeout(() => fetchFromServer(), 1000);
    } catch (e) { 
      showToast("저장 실패", "error"); 
    } finally { 
      setLoading(false); 
    }
  };

  // nn:nn 포맷 -> 분 단위 수치 변환
  const convertTimeToMinutes = (timeStr) => {
    if (!timeStr || !timeStr.includes(":")) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // 분 단위 수치 -> nn:nn 포맷 변환
  const convertMinutesToTime = (totalMins) => {
    if (totalMins < 0) return "00:00";
    const h = Math.floor(totalMins / 60) % 24;
    const m = Math.round(totalMins % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // 계산기 1: 출근시각 예측
  const getCalculatedFinishTime = () => {
    const startMins = convertTimeToMinutes(calcStart);
    const targetMins = convertTimeToMinutes(calcTarget);
    const restMins = convertTimeToMinutes(calcRest);
    return convertMinutesToTime(startMins + targetMins + restMins);
  };

  // 계산기 2: 오늘 채워야 할 추가근무 퇴근시각 예측
  const getFinishTimeForTarget = () => {
    const nowMins = convertTimeToMinutes(calcNowTime);
    const alreadyWorkedMins = convertTimeToMinutes(calcWorked);
    const targetMins = convertTimeToMinutes(calcDailyTarget);
    
    const remainingMins = targetMins - alreadyWorkedMins;
    if (remainingMins <= 0) return "목표 달성! 🎉";
    
    return `${convertMinutesToTime(nowMins + remainingMins)} 퇴근`;
  };

  return (
    <div style={{ width: "100%", minHeight: "100vh", backgroundColor: "#f8fafc", paddingBottom: "120px", fontFamily: "sans-serif", overflowX: "hidden", boxSizing: "border-box" }}>
      
      {/* 100% 인라인 스타일로 구현된 복구된 Sticky Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 1000, backgroundColor: "white", width: "100%", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px" }}>
          
          {/* 달 이동 */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button 
              style={{ border: "none", background: "none", fontSize: "20px", padding: "10px", cursor: "pointer" }} 
              onClick={() => { if (month === 0) { setYear(year - 1); setMonth(11); } else { setMonth(month - 1); } }}
            >
              ◀
            </button>
            <span style={{ fontSize: "18px", fontWeight: "bold", color: "#1e293b" }}>{year}. {month + 1}</span>
            <button 
              style={{ border: "none", background: "none", fontSize: "20px", padding: "10px", cursor: "pointer" }} 
              onClick={() => { if (month === 11) { setYear(year + 1); setMonth(0); } else { setMonth(month + 1); } }}
            >
              ▶
            </button>
          </div>

          {/* 계산기 팝업 트리거 버튼 */}
          <button 
            onClick={() => setShowCalc(true)}
            style={{ 
              border: "none", 
              backgroundColor: "#eef2ff", 
              color: "#4f46e5", 
              padding: "8px 12px", 
              borderRadius: "10px", 
              fontSize: "12px", 
              fontWeight: "bold", 
              cursor: "pointer", 
              display: "flex", 
              alignItems: "center", 
              gap: "6px" 
            }}
          >
            <IconCalculator />
            <span>1일 계산기</span>
          </button>
        </div>
        
        {/* 권장 근무 알림판 */}
        <div style={{ backgroundColor: "#1e293b", color: "white", padding: "10px", textAlign: "center", fontSize: "13px", fontWeight: "600" }}>
           남은 근무일 <span style={{ color: "#60a5fa" }}>{remainingWeekdays}일</span> 동안 하루 <span style={{ color: "#60a5fa" }}>{suggested}시간</span> 권장
        </div>
      </div>

      <div style={{ padding: "20px", boxSizing: "border-box", maxWidth: "500px", margin: "0 auto" }}>
        
        {/* [원복 완료] 이전 크기와 여백을 100% 복구한 우아한 파란 카드 */}
        <div style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", padding: "25px", borderRadius: "24px", color: "white", marginBottom: "20px", boxShadow: "0 10px 15px -3px rgba(37,99,235,0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: "15px" }}>
            <span style={{ fontWeight: "600" }}>목표 시간</span>
            <input 
              type="text" 
              value={target} 
              onChange={e => setTarget(e.target.value)} 
              placeholder="00:00" 
              style={{ width: "90px", background: "rgba(255,255,255,0.2)", border: "none", color: "white", textAlign: "right", borderRadius: "8px", padding: "5px 10px", fontSize: "18px", fontWeight: "bold", outline: "none" }} 
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <small style={{ opacity: 0.8, fontSize: "12px" }}>누적 근무</small>
              <div style={{ fontSize: "24px", fontWeight: "900" }}>{formatTimeDisplay(totalWorked)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <small style={{ opacity: 0.8, fontSize: "12px" }}>남은 시간</small>
              <div style={{ fontSize: "24px", fontWeight: "900" }}>{formatTimeDisplay(diff > 0 ? diff : 0)}</div>
            </div>
          </div>
        </div>

        {/* 원복된 깔끔한 백그라운드 리스트 컴포넌트 */}
        <div style={{ background: "white", borderRadius: "20px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
          {dates.map(date => {
            const dayNum = new Date(year, month, date).getDay();
            const holidayCheck = isHoliday(date);
            const isToday = new Date().getDate() === date && isCurrentMonth;
            const hourValue = hours[String(date)] || "";

            return (
              <div 
                key={date} 
                ref={isToday ? todayRef : null} 
                style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  padding: "15px 20px", 
                  borderBottom: "1px solid #f1f5f9", 
                  backgroundColor: isToday ? "#eff6ff" : "white" 
                }}
              >
                <span style={{ fontSize: "16px", fontWeight: "700", color: (dayNum === 0 || holidayCheck) ? "#ef4444" : (dayNum === 6 ? "#3b82f6" : "#1e293b") }}>
                  {date} <small style={{ fontSize: "12px", opacity: 0.6 }}>({weekDays[dayNum]})</small>
                </span>
                
                {!holidayCheck ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input 
                      type="text" 
                      value={hourValue} 
                      onChange={e => setHours({ ...hours, [String(date)]: e.target.value })} 
                      style={{ width: "80px", height: "36px", textAlign: "right", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0 10px", fontSize: "15px", outline: "none", backgroundColor: "#f8fafc" }} 
                      placeholder={suggested} 
                    />
                    {hourValue ? (
                      <button 
                        onClick={() => { const newH = {...hours}; delete newH[String(date)]; setHours(newH); }} 
                        style={{ border: "none", background: "none", padding: "5px", cursor: "pointer", fontSize: "16px", opacity: 0.5, display: "flex", alignItems: "center" }}
                      >
                        <IconTrash />
                      </button>
                    ) : (
                      <div style={{ width: "24px" }}></div>
                    )}
                  </div>
                ) : (
                  <span style={{ color: "#cbd5e1", fontSize: "14px", fontWeight: "bold", marginRight: "34px" }}>OFF</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 100% 인라인 스타일 고정형 하단 액션바 */}
      <div style={{ position: "fixed", bottom: 0, left: 0, width: "100%", padding: "15px 20px", boxSizing: "border-box", display: "flex", gap: "12px", background: "white", borderTop: "1px solid #e2e8f0", zIndex: 1100 }}>
        <button 
          onClick={fetchFromServer} 
          disabled={loading} 
          style={{ 
            width: "60px", 
            height: "60px", 
            borderRadius: "15px", 
            border: "1px solid #e2e8f0", 
            background: "white", 
            cursor: "pointer", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center" 
          }}
        >
          <IconRotate />
        </button>
        
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
            transition: "all 0.3s ease",
            boxSizing: "border-box"
          }}
        >
          {loading ? "처리 중..." : (isDirty ? "저장하기" : "수정사항 없음")}
        </button>
      </div>

      {/* 일일 계산기 모달 (순수 인라인 스타일 구조로 설계) */}
      {showCalc && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", zIndex: 2000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ backgroundColor: "white", width: "100%", maxWidth: "480px", borderTopLeftRadius: "28px", borderTopRightRadius: "28px", padding: "24px", boxSizing: "border-box", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 -10px 25px -5px rgba(0,0,0,0.1)" }}>
            
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "16px", marginBottom: "16px", borderBottom: "1px solid #f1f5f9" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold", color: "#1e293b" }}>
                  일일 근무시간 계산기 (저장안됨)
                </h3>
                <small style={{ color: "#94a3b8", fontSize: "11px" }}>기록에 반영되지 않는 1회성 간이 연산 장치입니다.</small>
              </div>
              <button 
                onClick={() => setShowCalc(false)}
                style={{ border: "none", background: "none", padding: "4px", cursor: "pointer", color: "#94a3b8" }}
              >
                <IconX />
              </button>
            </div>

            {/* 기능 1: 출근 시각 계산 */}
            <div style={{ backgroundColor: "#f8fafc", borderRadius: "16px", padding: "16px", marginBottom: "16px", border: "1px solid #f1f5f9" }}>
              <div style={{ display: "inline-block", backgroundColor: "#e0e7ff", color: "#4f46e5", fontSize: "10px", fontWeight: "bold", padding: "2px 6px", borderRadius: "4px", marginBottom: "8px" }}>기능 1</div>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#475569" }}>출근 시각 기준으로 퇴근 시각 예측</h4>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>출근 시각 (nn:nn)</span>
                  <input 
                    type="text" 
                    value={calcStart} 
                    onChange={e => setCalcStart(e.target.value)} 
                    style={{ width: "90px", height: "32px", textAlign: "center", border: "1px solid #e2e8f0", borderRadius: "8px", outline: "none", fontSize: "13px", backgroundColor: "white" }} 
                    placeholder="09:00" 
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>목표 근무 (nn:nn)</span>
                  <input 
                    type="text" 
                    value={calcTarget} 
                    onChange={e => setCalcTarget(e.target.value)} 
                    style={{ width: "90px", height: "32px", textAlign: "center", border: "1px solid #e2e8f0", borderRadius: "8px", outline: "none", fontSize: "13px", backgroundColor: "white" }} 
                    placeholder="08:00" 
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>점심/휴게 (nn:nn)</span>
                  <input 
                    type="text" 
                    value={calcRest} 
                    onChange={e => setCalcRest(e.target.value)} 
                    style={{ width: "90px", height: "32px", textAlign: "center", border: "1px solid #e2e8f0", borderRadius: "8px", outline: "none", fontSize: "13px", backgroundColor: "white" }} 
                    placeholder="01:00" 
                  />
                </div>
                <div style={{ marginTop: "8px", paddingTop: "12px", borderTop: "1px dashed #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: "bold", color: "#334155" }}>권장 퇴근 시각</span>
                  <span style={{ fontSize: "14px", fontWeight: "bold", color: "#4f46e5", backgroundColor: "#e0e7ff", padding: "4px 10px", borderRadius: "8px" }}>
                    {getCalculatedFinishTime()}
                  </span>
                </div>
              </div>
            </div>

            {/* 기능 2: 현재 근무 현황 기반 계산 */}
            <div style={{ backgroundColor: "#f8fafc", borderRadius: "16px", padding: "16px", border: "1px solid #f1f5f9", marginBottom: "20px" }}>
              <div style={{ display: "inline-block", backgroundColor: "#e0f2fe", color: "#0369a1", fontSize: "10px", fontWeight: "bold", padding: "2px 6px", borderRadius: "4px", marginBottom: "8px" }}>기능 2</div>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#475569" }}>현재까지 근무 후 추가 근무 퇴근 계산</h4>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>지금 시각 (nn:nn)</span>
                  <input 
                    type="text" 
                    value={calcNowTime} 
                    onChange={e => setCalcNowTime(e.target.value)} 
                    style={{ width: "90px", height: "32px", textAlign: "center", border: "1px solid #e2e8f0", borderRadius: "8px", outline: "none", fontSize: "13px", backgroundColor: "white" }} 
                    placeholder="15:30" 
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>오늘 여태 근무 (nn:nn)</span>
                  <input 
                    type="text" 
                    value={calcWorked} 
                    onChange={e => setCalcWorked(e.target.value)} 
                    style={{ width: "90px", height: "32px", textAlign: "center", border: "1px solid #e2e8f0", borderRadius: "8px", outline: "none", fontSize: "13px", backgroundColor: "white" }} 
                    placeholder="05:30" 
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>오늘 최종 목표 (nn:nn)</span>
                  <input 
                    type="text" 
                    value={calcDailyTarget} 
                    onChange={e => setCalcDailyTarget(e.target.value)} 
                    style={{ width: "90px", height: "32px", textAlign: "center", border: "1px solid #e2e8f0", borderRadius: "8px", outline: "none", fontSize: "13px", backgroundColor: "white" }} 
                    placeholder="08:00" 
                  />
                </div>
                <div style={{ marginTop: "8px", paddingTop: "12px", borderTop: "1px dashed #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: "bold", color: "#334155" }}>목표 달성 퇴근 시각</span>
                  <span style={{ fontSize: "14px", fontWeight: "bold", color: "#0369a1", backgroundColor: "#e0f2fe", padding: "4px 10px", borderRadius: "8px" }}>
                    {getFinishTimeForTarget()}
                  </span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowCalc(false)}
              style={{ width: "100%", padding: "14px", border: "none", backgroundColor: "#1e293b", color: "white", borderRadius: "12px", fontWeight: "bold", fontSize: "14px", cursor: "pointer" }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 커스텀 토스트 알림 컴포넌트 */}
      {toast.show && (
        <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", zIndex: 3000, backgroundColor: toast.type === "error" ? "#ef4444" : "#10b981", color: "white", padding: "10px 20px", borderRadius: "30px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", fontSize: "14px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}
