// =====================================================================
// این خط را بعد از دیپلوی Apps Script با آدرس exec خودت جایگزین کن
// =====================================================================
const API_BASE = 'https://script.google.com/macros/s/AKfycbyzrAbREITal0EnMVVYNySfNjfjnvSL0wnB-c3_8CaeExkcQ2WKXb-dkK-g8URBhD5J/exec';

const state = {
  services: [],
  selectedService: null,
  selectedDate: null,
  selectedTime: null,
};

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

const PERSIAN_WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
const PERSIAN_DOW_SHORT = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'];

function toman(n) {
  return Number(n).toLocaleString('fa-IR') + ' تومان';
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3200);
}

async function api(action, params = {}) {
  const url = new URL(API_BASE);
  url.searchParams.set('action', action);
  Object.keys(params).forEach((k) => url.searchParams.set(k, params[k]));
  const res = await fetch(url.toString());
  return res.json();
}

// ----------------------------- خدمات -----------------------------
async function loadServices() {
  const wrap = $('#services');
  wrap.innerHTML = '<div class="empty-note">در حال بارگذاری...</div>';
  const data = await api('getServices');
  if (!data.ok) { wrap.innerHTML = '<div class="empty-note">خطا در دریافت خدمات</div>'; return; }

  state.services = data.services;
  wrap.innerHTML = '';
  data.services.forEach((s) => {
    const isPayInPerson = String(s.payInPerson).toUpperCase() === 'TRUE';
    const card = el('div', 'service-card');
    card.innerHTML = `
      <div>
        <div class="name">${s.name}</div>
        <div class="meta">${s.duration} دقیقه${isPayInPerson ? ' · پرداخت حضوری' : ''}</div>
      </div>
      <div class="price">${toman(s.price)}</div>
    `;
    card.addEventListener('click', () => selectService(s, card));
    wrap.appendChild(card);
  });
}

function selectService(service, cardEl) {
  document.querySelectorAll('.service-card').forEach((c) => c.classList.remove('selected'));
  cardEl.classList.add('selected');
  state.selectedService = service;
  state.selectedTime = null;
  $('#date-section').classList.remove('hidden');
  buildDateScroller();
  updatePayBar();
}

function toLocalDateStr_(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ----------------------------- تاریخ -----------------------------
function buildDateScroller() {
  const wrap = $('#date-scroller');
  wrap.innerHTML = '';
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = toLocalDateStr_(d);
    const chip = el('div', 'date-chip');
    chip.innerHTML = `<div class="dow">${PERSIAN_DOW_SHORT[d.getDay()]}</div><div class="dom">${d.getDate()}</div>`;
    chip.addEventListener('click', () => selectDate(iso, chip));
    wrap.appendChild(chip);
  }
}

async function selectDate(iso, chipEl) {
  document.querySelectorAll('.date-chip').forEach((c) => c.classList.remove('selected'));
  chipEl.classList.add('selected');
  state.selectedDate = iso;
  state.selectedTime = null;
  $('#time-section').classList.remove('hidden');
  const grid = $('#slot-grid');
  grid.innerHTML = '<div class="empty-note">در حال بررسی ساعت‌های خالی...</div>';
  updatePayBar();

  const data = await api('getAvailability', { date: iso });
  grid.innerHTML = '';
  if (!data.ok || data.slots.length === 0) {
    grid.innerHTML = '<div class="empty-note">برای این روز نوبت خالی نیست 🌙</div>';
    return;
  }
  data.slots.forEach((t) => {
    const slot = el('div', 'slot', t);
    slot.addEventListener('click', () => selectTime(t, slot));
    grid.appendChild(slot);
  });
}

function selectTime(t, slotEl) {
  document.querySelectorAll('.slot').forEach((s) => s.classList.remove('selected'));
  slotEl.classList.add('selected');
  state.selectedTime = t;
  $('#form-section').classList.remove('hidden');
  updatePayBar();
}

// ----------------------------- فرم و پرداخت -----------------------------
function updatePayBar() {
  const bar = $('#pay-bar');
  const ready = state.selectedService && state.selectedDate && state.selectedTime;
  if (!ready) { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  const isPayInPerson = String(state.selectedService.payInPerson).toUpperCase() === 'TRUE';
  $('#total-amount').textContent = toman(state.selectedService.price);
  document.querySelector('.pay-bar .total-label').textContent = isPayInPerson ? 'پرداخت حضوری' : 'مبلغ قابل پرداخت';
  $('#submit-btn').textContent = isPayInPerson ? 'ثبت نوبت' : 'پرداخت و ثبت نوبت';
}

async function submitBooking() {
  const name = $('#customer-name').value.trim();
  const phone = $('#customer-phone').value.trim();
  if (!name || !phone) { toast('لطفاً نام و شماره تماس را وارد کن'); return; }
  if (!/^09\d{9}$/.test(phone)) { toast('شماره موبایل را درست وارد کن'); return; }

  const btn = $('#submit-btn');
  btn.disabled = true;
  btn.innerHTML = 'در حال ثبت... <span class="spinner"></span>';

  const created = await api('createBooking', {
    serviceId: state.selectedService.id,
    date: state.selectedDate,
    time: state.selectedTime,
    name, phone,
  });

  if (!created.ok) {
    toast(created.error || 'خطا در ثبت نوبت');
    btn.disabled = false;
    btn.textContent = 'پرداخت و ثبت نوبت';
    return;
  }

  if (created.payInPerson) {
    window.location.href = `result.html?status=success&inperson=1&bookingId=${created.bookingId}`;
    return;
  }

  const payment = await api('startPayment', { bookingId: created.bookingId });
  if (!payment.ok) {
    toast(payment.error || 'خطا در اتصال به درگاه پرداخت');
    btn.disabled = false;
    btn.textContent = 'پرداخت و ثبت نوبت';
    return;
  }

  window.location.href = payment.paymentUrl;
}

// ----------------------------- init -----------------------------
window.addEventListener('DOMContentLoaded', () => {
  loadServices();
  $('#submit-btn').addEventListener('click', submitBooking);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
