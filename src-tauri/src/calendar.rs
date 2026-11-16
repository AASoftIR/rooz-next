//! Pure date conversion, compatible with Persian civil calendar for supported years.
use chrono::{Datelike,NaiveDate};
fn div(a:i64,b:i64)->i64{a/b}
fn imod(a:i64,b:i64)->i64{a%b}
fn g2d(gy:i64,gm:i64,gd:i64)->i64{
 let d=div((gy+div(gm-8,6)+100100)*1461,4)+div(153*imod(gm+9,12)+2,5)+gd-34840408;
 d-div(div(gy+100100+div(gm-8,6),100)*3,4)+752
}
fn jalcal(jy:i64)->(i64,i64){
 let breaks=[-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
 let gy=jy+621; let mut leap_j=-14;let mut jp=breaks[0];let mut jump=0;
 for &jm in &breaks[1..] {jump=jm-jp;if jy<jm {break;}leap_j+=div(jump,33)*8+div(imod(jump,33),4);jp=jm;}
 let n=jy-jp;leap_j+=div(n,33)*8+div(imod(n,33)+3,4);
 if imod(jump,33)==4 && jump-n==4 {leap_j+=1;}
 let leap_g=div(gy,4)-div((div(gy,100)+1)*3,4)-150;
 (gy,20+leap_j-leap_g)
}
/// Gregorian -> Jalali (year, month, day). Supports common modern Persian years.
pub(crate) fn to_jalali(date:NaiveDate)->(i32,u32,u32){
 let y=date.year() as i64;let m=date.month() as i64;let d=date.day() as i64;
 let jy=y-621;let (gy,march)=jalcal(jy);
 let mut k=g2d(y,m,d)-g2d(gy,3,march);
 let (y,m,d)=if k>=0{
  if k<=185 {(jy,1+div(k,31),imod(k,31)+1)}
  else {k-=186;(jy,7+div(k,30),imod(k,30)+1)}
 } else {
  let (prevgy,prevmarch)=jalcal(jy-1);
  k=g2d(y,m,d)-g2d(prevgy,3,prevmarch);
  if k<=185{(jy-1,1+div(k,31),imod(k,31)+1)}
  else{k-=186;(jy-1,7+div(k,30),imod(k,30)+1)}
 };
 (y as i32,m as u32,d as u32)
}
#[cfg(test)]mod tests{use super::*;#[test]fn jalali(){assert_eq!(to_jalali(NaiveDate::from_ymd_opt(2024,3,20).unwrap()),(1403,1,1));assert_eq!(to_jalali(NaiveDate::from_ymd_opt(2024,3,21).unwrap()),(1403,1,2));assert_eq!(to_jalali(NaiveDate::from_ymd_opt(2025,3,21).unwrap()),(1404,1,1));}}
