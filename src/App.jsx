import { useState, useEffect } from "react";

export default function App() {

  const now = new Date(
    new Date().toLocaleString("en-US",{timeZone:"Asia/Seoul"})
  );

  const [year,setYear] = useState(now.getFullYear());
  const [month,setMonth] = useState(now.getMonth());

  const daysInMonth = new Date(year,month+1,0).getDate();
  const dates = Array.from({length:daysInMonth},(_,i)=>i+1);

  const monthKey = `${year}-${month+1}`;

  const getKoreanHolidays=(y,m)=>{

    if(y===2026){

      const holidays2026={
        1:[1],
        2:[16,17,18],
        3:[1,2],
        5:[5,25],
        6:[3,6],
        8:[15,17],
        9:[24,25,26],
        10:[3,5,9],
        12:[25]
      };

      return holidays2026[m+1] || [];
    }

    return [];
  };

  const holidays = getKoreanHolidays(year,month);

  const loadHours=()=>{
    const saved = localStorage.getItem(`workHours-${monthKey}`);
    return saved ? JSON.parse(saved) : {};
  };

  const loadTarget=()=>{
    const saved = localStorage.getItem(`target-${monthKey}`);

    if(saved!==null) return saved;

    if(year===2026 && month===2) return 169;

    return "";
  };

  const [hours,setHours]=useState(loadHours);
  const [target,setTarget]=useState(loadTarget);

  useEffect(()=>{
    setHours(loadHours());
    setTarget(loadTarget());
  },[year,month]);

  useEffect(()=>{
    localStorage.setItem(
      `workHours-${monthKey}`,
      JSON.stringify(hours)
    );
  },[hours,monthKey]);

  useEffect(()=>{
    localStorage.setItem(
      `target-${monthKey}`,
      target
    );
  },[target,monthKey]);

  const prevMonth=()=>{
    if(month===0){
      setMonth(11);
      setYear(year-1);
    }else{
      setMonth(month-1);
    }
  };

  const nextMonth=()=>{
    if(month===11){
      setMonth(0);
      setYear(year+1);
    }else{
      setMonth(month+1);
    }
  };

  const isWeekend=(date)=>{
    const day = new Date(year,month,date).getDay();
    return day===0 || day===6;
  };

  const isHoliday=(date)=>{
    return holidays.includes(date);
  };

  const parseTime=(str)=>{
    if(!str) return 0;
    const parts=str.split(":");
    const h=Number(parts[0])||0;
    const m=Number(parts[1])||0;
    return h + m/60;
  };

  const formatTime=(h)=>{
    const hh=Math.floor(h);
    const mm=Math.round((h-hh)*60);
    return `${hh}:${mm.toString().padStart(2,"0")}`;
  };

  const workingDays=dates.filter(
    d=>!isWeekend(d) && !isHoliday(d)
  );

  const enteredDates=Object.keys(hours).map(Number);

  const remainingWorkingDays=workingDays.filter(
    d=>!enteredDates.includes(d)
  );

  const totalWorked=Object.values(hours)
    .map(parseTime)
    .reduce((a,b)=>a+b,0);

  const remainingHours =
    target ? target-totalWorked : 0;

  const dynamicDailyTarget =
    remainingWorkingDays.length>0 && target
      ? remainingHours / remainingWorkingDays.length
      : 0;

  const handleChange=(date,val)=>{
    setHours({
      ...hours,
      [date]:val
    });
  };

  const resetDay=(date)=>{
    const copy={...hours};
    delete copy[date];
    setHours(copy);
  };

  const resetAll=()=>{
    setHours({});
  };

  const dayName=(date)=>{
    return ["일","월","화","수","목","금","토"][
      new Date(year,month,date).getDay()
    ];
  };

  return (

    <div style={{
      width:"100%",
      minHeight:"100vh",
      padding:"20px",
      boxSizing:"border-box",
      fontFamily:"sans-serif",
      fontSize:"32px"
    }}>

      <div style={{
        display:"flex",
        justifyContent:"space-between",
        alignItems:"center",
        marginBottom:20
      }}>

        <button
          onClick={prevMonth}
          style={{fontSize:28}}
        >
          ◀
        </button>

        <h2>
          {year}년 {month+1}월 근무시간
        </h2>

        <button
          onClick={nextMonth}
          style={{fontSize:28}}
        >
          ▶
        </button>

      </div>

      <div style={{marginBottom:25}}>

        목표 근무시간

        <input
          type="number"
          value={target}
          onChange={(e)=>setTarget(e.target.value)}
          style={{
            marginLeft:20,
            width:160,
            height:55,
            fontSize:28
          }}
        />

      </div>

      <div style={{marginBottom:10}}>
        총 근무시간 <b>{totalWorked.toFixed(2)}</b>
      </div>

      <div style={{marginBottom:25}}>
        남은시간 <b>{remainingHours.toFixed(2)}</b>
      </div>

      <button
        onClick={resetAll}
        style={{
          marginBottom:25,
          fontSize:24
        }}
      >
        전체 초기화
      </button>

      {dates.map(date=>{

        const weekend=isWeekend(date);
        const holiday=isHoliday(date);
        const off = weekend || holiday;

        const value=hours[date]||"";

        return(

          <div
            key={date}
            style={{
              border:"1px solid #eee",
              borderRadius:14,
              padding:"16px",
              marginBottom:12,
              background: off ? "#f3f3f3":"white",
              display:"flex",
              justifyContent:"space-between",
              alignItems:"center"
            }}
          >

            <div>

              <div style={{
                fontWeight:600
              }}>
                {date}일 ({dayName(date)})
              </div>

              {holiday && (
                <div style={{color:"red"}}>
                  공휴일
                </div>
              )}

              {weekend && (
                <div style={{color:"#999"}}>
                  주말
                </div>
              )}

            </div>

            {!off && (

              <div style={{
                display:"flex",
                alignItems:"center"
              }}>

                <input
                  type="text"
                  value={value}
                  placeholder={
                    dynamicDailyTarget
                      ? formatTime(dynamicDailyTarget)
                      : ""
                  }
                  onChange={(e)=>handleChange(date,e.target.value)}
                  style={{
                    width:130,
                    height:50,
                    fontSize:26
                  }}
                />

                <button
                  onClick={()=>resetDay(date)}
                  style={{
                    marginLeft:10
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
