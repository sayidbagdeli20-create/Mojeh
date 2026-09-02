// =====================================================================
// تبدیل تاریخ میلادی به شمسی + اسم روزها و ماه‌ها (بدون نیاز به کتابخانه‌ی جانبی)
// =====================================================================

const PERSIAN_WEEKDAYS_FULL = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
const PERSIAN_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + (parseInt((gy2 + 3) / 4)) - (parseInt((gy2 + 99) / 100)) + (parseInt((gy2 + 399) / 400)) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * (parseInt(days / 12053));
  days %= 12053;
  jy += 4 * (parseInt(days / 1461));
  days %= 1461;
  if (days > 365) {
    jy += parseInt((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = (days < 186) ? 1 + parseInt(days / 31) : 7 + parseInt((days - 186) / 30);
  const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return { jy, jm, jd };
}

// dateStr: رشته‌ی "YYYY-MM-DD" میلادی (همون فرمتی که بک‌اند استفاده می‌کنه)
function toJalaliFromISO(dateStr) {
  const [gy, gm, gd] = dateStr.split('-').map(Number);
  return gregorianToJalali(gy, gm, gd);
}

function pad2_(n) {
  return String(n).padStart(2, '0');
}

// فرمت کامل عددی مثل 1405/08/20
function jalaliNumeric(dateStr) {
  const { jy, jm, jd } = toJalaliFromISO(dateStr);
  return `${jy}/${pad2_(jm)}/${pad2_(jd)}`;
}

// فرمت هماهنگ با تنظیم «نوع تقویم» — یا شمسی یا میلادی، هردو با فرمت YYYY/MM/DD
function formatDateAny(dateStr, calendarType) {
  const [gy, gm, gd] = dateStr.split('-').map(Number);
  if (calendarType === 'gregorian') {
    return `${gy}/${pad2_(gm)}/${pad2_(gd)}`;
  }
  const { jy, jm, jd } = gregorianToJalali(gy, gm, gd);
  return `${jy}/${pad2_(jm)}/${pad2_(jd)}`;
}

// فرمت خوانا مثل «یکشنبه ۲۰ آبان ۱۴۰۵»
function jalaliReadable(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const { jy, jm, jd } = toJalaliFromISO(dateStr);
  const weekday = PERSIAN_WEEKDAYS_FULL[d.getDay()];
  return `${weekday} ${jd} ${PERSIAN_MONTHS[jm - 1]} ${jy}`;
}
