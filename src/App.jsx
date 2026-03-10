import { useState, useEffect } from "react";

export default function App() {

  const year = 2026;
  const month = 2;

  const dates = Array.from({ length: 31 }, (_, i) => i + 1);

  const holidays = [1,2];

  const savedHours = JSON.parse(localStorage.getItem("workHours")) || {};
  const savedTarget = Number(localStorage.getItem("target")) || 169;

  const [target,setTarget] = useState(savedTarget);
  const [hours,setHours] = useState(savedHours);

  useEffect(()=>{
    localStorage.setItem("workHours",JSON.stringify(hours));
  },[hours]);

  useEffect(()=>{
    localStorage.setItem("target",target);
  },[target]);

  const isWeekend = (date)=>{
    const day = new Date(year,month,date).getDay();
    return day === 0 || day === 6;
  };

  const isHoliday = (date)=>{
    return holidays.includes(date);
  };

  const parseTime = (str)=>{
    if(!str) return 0;
    const parts = str.split(":");
    const h = Number(parts[0]) || 0;
    const m = Number(parts[1]) || 0;
    return h + m/60;
  };

  const formatTime = (h)=>{
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return `${hh}:${mm.toString().padStart(2,"0")}`;
  };

  const workingDays = dates.filter(
    d => !isWeekend(d) && !isHoliday(d)
  );

  const enteredDates = Object.keys(hours).map(Number);

  const remainingWorkingDays = workingDays.filter(
    d => !enteredDates.includes(d)
  );

  const totalWorked = Object.values(hours)
    .map(parseTime)
    .reduce((a,b)=>a+b,0);

  const remainingHours = target-totalWorked;

  const dynamicDailyTarget =
    remainingWorkingDays.length > 0
      ? remainingHours / remainingWorkingDays.length
      : 0;

  const handleChange = (date,val)=>{
    setHours({
      ...hours,
      [date]:val
    });
  };

  const resetDay = (date)=>{
    const copy = {...hours};
    delete copy[date];
    setHours(copy);
  };

  const resetAll = ()=>{
    setHours({});
  };

  const dayName = (date)=>{
    return ["일","월","화","수","목","금","토"][
      new Date(year,month,date).getDay()
    ];
  };

  return (

    <div style={{
  width:"100%",
  minHeight:"100vh",
  padding:"12px",
  boxSizing:"border-box",
  fontFamily:"sans-serif",
  fontSize:"18px"
}}>

      <h2>2026년 3월 근무시간</h2>

      <div style={{marginBottom:15}}>
        목표 근무시간
        <input
          value={target}
          onChange={(e)=>setTarget(Number(e.target.value))}
          style={{
            marginLeft:10,
            width:80
          }}
        />
      </div>

      <div style={{marginBottom:10}}>
        총 근무시간 <b>{totalWorked.toFixed(2)}</b>
      </div>

      <div style={{marginBottom:20}}>
        남은시간 <b>{remainingHours.toFixed(2)}</b>
      </div>

      <button
        onClick={resetAll}
        style={{
          marginBottom:20,
          padding:"6px 12px"
        }}
      >
        전체 초기화
      </button>

      {dates.map(date=>{

        const weekend = isWeekend(date);
        const holiday = isHoliday(date);
        const off = weekend || holiday;

        const value = hours[date] || "";

        return (

          <div
            key={date}
            style={{
              border:"1px solid #eee",
              borderRadius:10,
              padding:12,
              marginBottom:10,
              background: off ? "#f4f4f4":"white",
              display:"flex",
              alignItems:"center",
              justifyContent:"space-between"
            }}
          >

            <div>

              <div style={{fontWeight:600}}>
                {date}일 ({dayName(date)})
              </div>

              {off && (
                <div style={{
                  fontSize:12,
                  color:"#999"
                }}>
                  휴무
                </div>
              )}

            </div>

            {!off && (

              <div style={{display:"flex",alignItems:"center"}}>

                <input
                  type="text"
                  value={value}
                  placeholder={formatTime(dynamicDailyTarget)}
                  onChange={(e)=>handleChange(date,e.target.value)}
                  style={{
                    width:70,
                    padding:5,
                    fontSize:14,
                    color:value ? "#2563eb":"black"
                  }}
                />

                <button
                  onClick={()=>resetDay(date)}
                  style={{
                    marginLeft:8,
                    fontSize:12
                  }}
                >
                  초기화
                </button>

              </div>

            )}

          </div>

        );
      })}

    </div>
  );
}
