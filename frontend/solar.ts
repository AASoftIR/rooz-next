/** Zero-dependency Persian calendar UI. Gregorian ISO dates remain storage keys. */
const persianParts=new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn',{year:'numeric',month:'numeric',day:'numeric',timeZone:'UTC'});
export const persianName=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{month:'long',year:'numeric',timeZone:'UTC'});
const cache=new Map<string,{year:number,month:number,day:number}>();
export function solarParts(day:string):{year:number,month:number,day:number}{
 let item=cache.get(day);if(item)return item;
 const parts=persianParts.formatToParts(new Date(day+'T12:00:00Z'));
 const get=(name:string)=>Number(parts.find(p=>p.type===name)?.value||0);
 item={year:get('year'),month:get('month'),day:get('day')};
 if(cache.size>1500)cache.clear();cache.set(day,item);return item;
}
export function currentMonthStart(anchor:Date,lang:'en'|'fa'):Date{
 const d=new Date(anchor.getFullYear(),anchor.getMonth(),anchor.getDate(),12);
 if(lang==='en')return new Date(d.getFullYear(),d.getMonth(),1,12);
 for(let n=0;n<32;n++){const key=toISO(d);if(solarParts(key).day===1)return d;d.setDate(d.getDate()-1);}
 return d;
}
export function toISO(d:Date):string{return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function shiftCalendarMonth(anchor:Date,delta:number,lang:'en'|'fa'):Date{
 if(lang==='en')return new Date(anchor.getFullYear(),anchor.getMonth()+delta,1,12);
 let d=currentMonthStart(anchor,'fa');
 for(let i=0;i<Math.abs(delta);i++){
  if(delta>0){d.setDate(d.getDate()+33);d=currentMonthStart(d,'fa');}
  else{d.setDate(d.getDate()-1);d=currentMonthStart(d,'fa');}
 }
 return d;
}
export function dateDisplay(date:string,lang:'en'|'fa',options:Intl.DateTimeFormatOptions):string{
 return new Intl.DateTimeFormat(lang==='fa'?'fa-IR-u-ca-persian':'en-US',options).format(new Date(date+'T12:00:00'));
}

/** Convert a Persian date to an ISO storage key without changing UTC time zones.
 *  The scan is bounded to one Persian year, and is only used for form submissions. */
export function solarToISO(value:string):string|null {
 const m=value.trim().replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
 if(!m)return null;
 const year=Number(m[1]),month=Number(m[2]),day=Number(m[3]);
 if(year<1200||year>1500||month<1||month>12||day<1||day>31)return null;
 const start=new Date(year+621,2,15,12);
 for(let i=0;i<380;i++){
  const key=toISO(start),p=solarParts(key);
  if(p.year===year&&p.month===month&&p.day===day)return key;
  start.setDate(start.getDate()+1);
 }
 return null;
}
export function isoToSolar(day:string):string {
 if(!/^\d{4}-\d\d-\d\d$/.test(day))return '';
 const p=solarParts(day);return `${p.year}/${String(p.month).padStart(2,'0')}/${String(p.day).padStart(2,'0')}`;
}
