import { useState, useEffect } from "react";

export default function App() {

  const year = 2026;
  const month = 2;

  const days = ["일","월","화","수","목","금","토"];
  const dates = Array.from({ length: 31 }, (_, i) => i + 1);

  // 공휴일 + 대체공휴일
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

  const workingDays = dates.filter(
    d => !isWeekend(d) && !isHoliday(d)
  );

  const dailyTarget = target / workingDays.length;

  const formatTime = (h)=>{
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return `${hh}:${mm.toString().padStart(2,"0")}`;
  };

  // 8:30 -> 8.5
  const parseTime = (str)=>{
    if(!str) return 0;
    const parts = str.split(":");
    const h = Number(parts[0]) || 0;
    const m = Number(parts[1]) || 0;
    return h + m/60;
  };

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

  const total = Object.values(hours)
    .map(parseTime)
    .reduce((a,b)=>a+b,0);

  const remain = target-total;

  return (

    <div style={{padding:40,fontFamily:"sans-serif",maxWidth:900,margin:"auto"}}>

      <h1>2026년 3월 근무시간</h1>

      <div style={{marginBottom:20}}>
        목표 근무시간
        <input
          value={target}
          onChange={(e)=>setTarget(Number(e.target.value))}
          style={{marginLeft:10,width:80}}
        />
      </div>

      <div style={{marginBottom:10}}>
        총 근무시간: <b>{total.toFixed(2)}</b>
      </div>

      <div style={{marginBottom:20}}>
        남은시간: <b>{remain.toFixed(2)}</b>
      </div>

      <button onClick={resetAll} style={{marginBottom:20}}>
        전체 초기화
      </button>

      <div
        style={{
          display:"grid",
          gridTemplateColumns:"repeat(7,1fr)",
          gap:8
        }}
      >

        {days.map(d=>(
          <div key={d} style={{fontWeight:"bold",textAlign:"center"}}>
            {d}
          </div>
        ))}

        {dates.map(date=>{

          const weekend = isWeekend(date);
          const holiday = isHoliday(date);
          const off = weekend || holiday;

          const value = hours[date] || "";

          return (

            <div
              key={date}
              style={{
                border:"1px solid #ddd",
                padding:10,
                background: off ? "#f3f3f3":"white"
              }}
            >

              <div style={{marginBottom:5}}>
                {date}
              </div>

              {off ? (
                <div style={{fontSize:12,color:"#888"}}>
                  휴무
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={value}
                    placeholder={formatTime(dailyTarget)}
                    onChange={(e)=>handleChange(date,e.target.value)}
                    style={{
                      width:"70px",
                      color:value ? "blue":"black"
                    }}
                  />

                  <button
                    onClick={()=>resetDay(date)}
                    style={{
                      marginLeft:5,
                      fontSize:10
                    }}
                  >
                    x
                  </button>
                </>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
}
