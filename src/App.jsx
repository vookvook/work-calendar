import React, { useState, useEffect, useCallback, useRef } from "react";
import { Calculator, X, RotateCcw, Save, Trash2, Calendar, Clock, AlertCircle } from "lucide-react";

const API_URL = "https://script.google.com/macros/s/AKfycbyA5SoFYozvjhTbQoqIdqjKLdSae-IL0mosWMYe1mAFyGn_H1p4ET4R2FRlmdMB7G19/exec";

export default function WorkLogApp() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [hours, setHours] = useState({});
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  
  // 서버 원본 보관 및 수정 데이터 비교용 상태
  const [originalData, setOriginalData] = useState({ hours: {}, target: "" });

  // 일회성 근무시간 계산기 모달 노출 여부
  const [showCalc, setShowCalc] = useState(false);

  // 커스텀 토스트 알림 상태 (alert 대체)
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // 계산기 전용 독립 상태 (저장되지 않음) - 모두 nn:nn 형식으로 초기화
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
    // 계산기 진입시 디폴트 시간 할당
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

      showToast(`${month + 1}월 근무 내역 저장 완료!`);
      setTimeout(() => fetchFromServer(), 1000);
    } catch (e) { 
      showToast("저장 실패", "error"); 
    } finally { 
      setLoading(false); 
    }
  };

  // HH:MM 형식을 분으로 변환
  const convertTimeToMinutes = (timeStr) => {
    if (!timeStr || !timeStr.includes(":")) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // 분을 HH:MM 형식으로 변환
  const convertMinutesToTime = (totalMins) => {
    if (totalMins < 0) return "00:00";
    const h = Math.floor(totalMins / 60) % 24;
    const m = Math.round(totalMins % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // 계산기 결과 계산 1: 출근시각 + 목표시간 + 휴게시간 = 퇴근 시각 (전부 nn:nn 포맷 기준)
  const getCalculatedFinishTime = () => {
    const startMins = convertTimeToMinutes(calcStart);
    const targetMins = convertTimeToMinutes(calcTarget);
    const restMins = convertTimeToMinutes(calcRest);
    const totalAddedMins = targetMins + restMins;
    return convertMinutesToTime(startMins + totalAddedMins);
  };

  // 계산기 결과 계산 2: 현재시각 기준, 오늘 채워야 할 목표(n)시간까지 남은 근무 후 퇴근 시각 (전부 nn:nn 포맷 기준)
  const getFinishTimeForTarget = () => {
    const nowMins = convertTimeToMinutes(calcNowTime);
    const alreadyWorkedMins = convertTimeToMinutes(calcWorked);
    const targetMins = convertTimeToMinutes(calcDailyTarget);
    
    const remainingMins = targetMins - alreadyWorkedMins;
    if (remainingMins <= 0) return "목표 달성! 🎉";
    
    return `${convertMinutesToTime(nowMins + remainingMins)} 퇴근`;
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 pb-28 font-sans overflow-x-hidden antialiased">
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md w-full border-b border-slate-200 shadow-sm">
        <div className="flex justify-between items-center px-4 py-3">
          <div className="flex items-center gap-1.5">
            <button 
              className="text-slate-700 hover:bg-slate-100 active:scale-95 transition p-2 rounded-full border border-slate-200"
              onClick={() => { if (month === 0) { setYear(year - 1); setMonth(11); } else { setMonth(month - 1); } }}
            >
              ◀
            </button>
            <span className="text-lg font-bold text-slate-800 tracking-tight min-w-[80px] text-center">
              {year}. {month + 1}
            </span>
            <button 
              className="text-slate-700 hover:bg-slate-100 active:scale-95 transition p-2 rounded-full border border-slate-200"
              onClick={() => { if (month === 11) { setYear(year + 1); setMonth(0); } else { setMonth(month + 1); } }}
            >
              ▶
            </button>
          </div>

          {/* 계산기 진입 버튼 */}
          <button 
            onClick={() => setShowCalc(true)}
            className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-600 px-3.5 py-2 rounded-xl text-sm font-semibold border border-indigo-100 transition-all cursor-pointer"
          >
            <Calculator size={16} />
            <span>1일 계산기</span>
          </button>
        </div>
        
        <div className="bg-slate-900 text-white py-2 px-4 text-center text-xs font-semibold flex justify-center items-center gap-1.5">
          <span>남은 평일 <span className="text-sky-400 font-bold">{remainingWeekdays}일</span> 동안</span>
          <span className="bg-slate-800 px-1.5 py-0.5 rounded text-sky-300">하루 {suggested}시간</span>
          <span>권장</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-md mx-auto p-4 space-y-4">
        
        {/* 모바일 화면 최적화용 슬림형 파란색 정보 요약 카드 */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-2xl text-white shadow-md shadow-blue-500/10">
          <div className="flex justify-between items-center mb-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <Calendar size={15} className="opacity-90" />
              <span className="text-xs font-medium opacity-90">이번 달 목표 근무시간</span>
            </div>
            <div className="flex items-center bg-white/15 px-2.5 py-1 rounded-lg">
              <input 
                type="text" 
                value={target} 
                onChange={e => setTarget(e.target.value)} 
                placeholder="00:00" 
                className="w-14 bg-transparent border-none text-white text-right font-bold text-sm outline-none placeholder:text-white/40" 
              />
              <span className="text-xs opacity-75 ml-1">h</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-white/5 rounded-xl py-2 px-1 border border-white/5">
              <div className="text-[10px] text-white/70 uppercase tracking-wider mb-0.5">누적 근무</div>
              <div className="text-base font-extrabold tracking-tight">{formatTimeDisplay(totalWorked)}</div>
            </div>
            <div className="bg-white/5 rounded-xl py-2 px-1 border border-white/5">
              <div className="text-[10px] text-white/70 uppercase tracking-wider mb-0.5">남은 시간</div>
              <div className="text-base font-extrabold tracking-tight">
                {formatTimeDisplay(diff > 0 ? diff : 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Date List Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-150 overflow-hidden divide-y divide-slate-100">
          {dates.map(date => {
            const dayNum = new Date(year, month, date).getDay();
            const holidayCheck = isHoliday(date);
            const isToday = new Date().getDate() === date && isCurrentMonth;
            const hourValue = hours[String(date)] || "";

            return (
              <div 
                key={date} 
                ref={isToday ? todayRef : null} 
                className={`flex justify-between items-center px-4 py-3 transition-colors ${isToday ? "bg-blue-50/50 border-y border-blue-100/30" : "hover:bg-slate-50/40"}`}
              >
                <div className="flex items-center gap-2">
                  {isToday && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>}
                  <span className={`text-sm font-bold ${
                    (dayNum === 0 || holidayCheck) ? "text-rose-500" : (dayNum === 6 ? "text-blue-500" : "text-slate-700")
                  }`}>
                    {date} <small className="text-xs opacity-60 font-medium">({weekDays[dayNum]})</small>
                  </span>
                </div>
                
                {!holidayCheck ? (
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={hourValue} 
                      onChange={e => setHours({ ...hours, [String(date)]: e.target.value })} 
                      style={{ height: "36px" }}
                      className="w-20 text-right border border-slate-200 rounded-lg px-2 text-sm outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 font-medium placeholder:text-slate-300 text-slate-800 bg-slate-50/50" 
                      placeholder={suggested} 
                    />
                    {hourValue ? (
                      <button 
                        onClick={() => { const newH = {...hours}; delete newH[String(date)]; setHours(newH); }} 
                        className="text-slate-400 hover:text-rose-500 p-1.5 rounded-md hover:bg-slate-100 active:scale-95 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <div className="w-[28px]"></div>
                    )}
                  </div>
                ) : (
                  <span className="text-[11px] tracking-wide text-slate-300 font-extrabold mr-7 uppercase bg-slate-100 px-2 py-0.5 rounded-md">OFF</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md p-4 flex gap-3 border-t border-slate-200 z-30">
        <button 
          onClick={fetchFromServer} 
          disabled={loading} 
          className="flex items-center justify-center w-14 h-14 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition-all text-slate-600 shadow-sm disabled:opacity-50"
        >
          <RotateCcw size={20} className={loading ? "animate-spin text-blue-500" : ""} />
        </button>
        
        <button 
          onClick={saveAll} 
          disabled={loading || !isDirty} 
          className={`flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all shadow-sm ${
            (loading || !isDirty) 
              ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-150" 
              : "bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98]"
          }`}
        >
          <Save size={18} />
          <span>{loading ? "처리 중..." : (isDirty ? "변경된 내역 저장" : "수정사항 없음")}</span>
        </button>
      </div>

      {/* 계산기 모달 */}
      {showCalc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end justify-center transition-opacity duration-300">
          <div className="bg-white w-full max-w-md rounded-t-[28px] shadow-2xl p-6 pb-8 border-t border-slate-100 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                  <Calculator size={18} className="text-indigo-600" />
                  일일 근무시간 계산기
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">데이터가 서버에 기록되거나 저장되지 않는 독립형 계산기입니다.</p>
              </div>
              <button 
                onClick={() => setShowCalc(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* 계산기 기능 1: 출근 시각 기준 계산 */}
            <div className="bg-slate-50 rounded-2xl p-4 mb-5 border border-slate-100">
              <span className="inline-block bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-md mb-2">기능 1</span>
              <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1">
                <Clock size={12} />
                출근 시각 기준으로 퇴근 시각 예측
              </h4>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">출근 시간 (nn:nn)</span>
                  <input 
                    type="text" 
                    value={calcStart} 
                    onChange={e => setCalcStart(e.target.value)} 
                    placeholder="09:00" 
                    className="w-24 text-center border border-slate-200 rounded-lg py-1 px-2 font-medium bg-white outline-none"
                  />
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">목표 근무 시간 (nn:nn)</span>
                  <input 
                    type="text" 
                    value={calcTarget} 
                    onChange={e => setCalcTarget(e.target.value)} 
                    placeholder="08:00" 
                    className="w-24 text-center border border-slate-200 rounded-lg py-1 px-2 font-medium bg-white outline-none"
                  />
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">휴게/점심 시간 (nn:nn)</span>
                  <input 
                    type="text" 
                    value={calcRest} 
                    onChange={e => setCalcRest(e.target.value)} 
                    placeholder="01:00" 
                    className="w-24 text-center border border-slate-200 rounded-lg py-1 px-2 font-medium bg-white outline-none"
                  />
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200/60 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">예상 퇴근 시간</span>
                  <span className="text-sm font-extrabold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                    {getCalculatedFinishTime()}
                  </span>
                </div>
              </div>
            </div>

            {/* 계산기 기능 2: 현재 시간 기준 추가 근무 계산 */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <span className="inline-block bg-sky-100 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-md mb-2">기능 2</span>
              <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1">
                <Clock size={12} />
                현재 근무 현황 기반 목표 달성 퇴근 계산
              </h4>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">지금 시간 (nn:nn)</span>
                  <input 
                    type="text" 
                    value={calcNowTime} 
                    onChange={e => setCalcNowTime(e.target.value)} 
                    placeholder="15:30" 
                    className="w-24 text-center border border-slate-200 rounded-lg py-1 px-2 font-medium bg-white outline-none"
                  />
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">현재까지 채운 시간 (nn:nn)</span>
                  <input 
                    type="text" 
                    value={calcWorked} 
                    onChange={e => setCalcWorked(e.target.value)} 
                    placeholder="05:30" 
                    className="w-24 text-center border border-slate-200 rounded-lg py-1 px-2 font-medium bg-white outline-none"
                  />
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">오늘 최종 목표 (nn:nn)</span>
                  <input 
                    type="text" 
                    value={calcDailyTarget} 
                    onChange={e => setCalcDailyTarget(e.target.value)} 
                    placeholder="08:00" 
                    className="w-24 text-center border border-slate-200 rounded-lg py-1 px-2 font-medium bg-white outline-none"
                  />
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200/60 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">목표 달성 퇴근 시각</span>
                  <span className="text-sm font-extrabold text-sky-600 bg-sky-50 px-3 py-1 rounded-lg">
                    {getFinishTimeForTarget()}
                  </span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowCalc(false)}
              className="mt-6 w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition active:scale-95"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full shadow-md text-xs font-semibold text-white ${
            toast.type === "error" ? "bg-rose-500" : "bg-emerald-500"
          }`}>
            <AlertCircle size={14} />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

    </div>
  );
}
