const API_BASE = 'https://script.google.com/macros/s/AKfycby1D2s_vD4ExTx0J5vWOl5N6C4ghTqtkGuvmD9JzWg5YDIdNaqO2S3UPkWf_HpuwpSz/exec';

let token = localStorage.getItem('adminToken') || '';

const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

async function api(action, params = {}) {
  const url = new URL(API_BASE);
  url.searchParams.set('action', action);
  if (token) url.searchParams.set('token', token);
  Object.keys(params).forEach((k) => url.searchParams.set(k, params[k]));
  const res = await fetch(url.toString());
  return res.json();
}

const DOW_LABELS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
const STATUS_FA = { paid: 'پرداخت‌شده', pending: 'در انتظار پرداخت', cancelled: 'لغوشده', failed: 'ناموفق' };

// ----------------------------- ورود -----------------------------
$('#login-btn').addEventListener('click', async () => {
  const password = $('#admin-password').value;
  const res = await api('adminLogin', { password });
  if (!res.ok) { toast(res.error || 'رمز اشتباه است'); return; }
  token = res.token;
  localStorage.setItem('adminToken', token);
  showPanel();
});

async function showPanel() {
  $('#login-box').classList.add('hidden');
  $('#panel').classList.remove('hidden');
  loadBookings();
  loadServices();
  loadSettings();
}

// ----------------------------- تب‌ها -----------------------------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    $('#tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ----------------------------- نوبت‌ها -----------------------------
async function loadBookings() {
  const wrap = $('#bookings-list');
  wrap.innerHTML = '<div class="empty-note">در حال بارگذاری...</div>';
  const res = await api('adminGetBookings');
  if (!res.ok) { wrap.innerHTML = '<div class="empty-note">خطا در دریافت</div>'; return; }
  wrap.innerHTML = '';
  if (res.bookings.length === 0) { wrap.innerHTML = '<div class="empty-note">هنوز نوبتی ثبت نشده</div>'; return; }
  res.bookings.forEach((b) => {
    const item = el('div', 'list-item');
    item.innerHTML = `
      <div class="row">
        <strong>${b.customerName}</strong>
        <span class="badge ${b.status}">${STATUS_FA[b.status] || b.status}</span>
      </div>
      <div style="font-size:13px; color:var(--muted); margin-top:4px;">
        ${b.serviceName} — ${b.date} ساعت ${b.time}<br>${b.phone}
      </div>
      <div class="actions"></div>
    `;
    if (b.status !== 'cancelled') {
      const cancelBtn = el('button', 'small-btn danger', 'لغو نوبت');
      cancelBtn.addEventListener('click', async () => {
        if (!confirm('لغو این نوبت؟')) return;
        await api('adminCancelBooking', { id: b.id });
        loadBookings();
      });
      item.querySelector('.actions').appendChild(cancelBtn);
    }
    wrap.appendChild(item);
  });
}

// ----------------------------- خدمات -----------------------------
async function loadServices() {
  const wrap = $('#services-list');
  wrap.innerHTML = '<div class="empty-note">در حال بارگذاری...</div>';
  const res = await api('adminServices');
  if (!res.ok) { wrap.innerHTML = '<div class="empty-note">خطا در دریافت</div>'; return; }
  wrap.innerHTML = '';
  res.services.forEach((s) => {
    const active = String(s.active).toUpperCase() === 'TRUE';
    const item = el('div', 'list-item');
    item.innerHTML = `
      <div class="row">
        <strong>${s.name}</strong>
        <span>${Number(s.price).toLocaleString('fa-IR')} تومان</span>
      </div>
      <div style="font-size:13px; color:var(--muted); margin-top:4px;">${s.duration} دقیقه</div>
      <div class="actions"></div>
      <div class="edit-form hidden" style="margin-top:12px; padding-top:12px; border-top:1px solid var(--line);">
        <div class="field"><label>نام خدمت</label><input class="edit-name" value="${s.name}"></div>
        <div class="field"><label>قیمت (تومان)</label><input class="edit-price" type="number" value="${s.price}"></div>
        <div class="field"><label>مدت زمان (دقیقه)</label><input class="edit-duration" type="number" value="${s.duration}"></div>
        <button class="btn btn-block save-edit-btn">ذخیره تغییرات</button>
      </div>
    `;

    const editBtn = el('button', 'small-btn', 'ویرایش قیمت / نام');
    const toggleBtn = el('button', 'small-btn', active ? 'غیرفعال کردن' : 'فعال کردن');
    const editForm = item.querySelector('.edit-form');

    editBtn.addEventListener('click', () => {
      editForm.classList.toggle('hidden');
    });

    toggleBtn.addEventListener('click', async () => {
      await api('adminEditService', { id: s.id, name: s.name, price: s.price, duration: s.duration, active: active ? 'false' : 'true' });
      loadServices();
    });

    item.querySelector('.save-edit-btn').addEventListener('click', async () => {
      const name = item.querySelector('.edit-name').value.trim();
      const price = item.querySelector('.edit-price').value;
      const duration = item.querySelector('.edit-duration').value;
      if (!name || !price || !duration) { toast('همه فیلدها را پر کن'); return; }
      const btn = item.querySelector('.save-edit-btn');
      btn.disabled = true;
      btn.textContent = 'در حال ذخیره...';
      await api('adminEditService', { id: s.id, name, price, duration, active: active ? 'true' : 'false' });
      toast('قیمت و مشخصات خدمت به‌روزرسانی شد ✅');
      loadServices();
    });

    item.querySelector('.actions').appendChild(editBtn);
    item.querySelector('.actions').appendChild(toggleBtn);
    wrap.appendChild(item);
  });
}

$('#add-service-btn').addEventListener('click', async () => {
  const name = $('#new-service-name').value.trim();
  const price = $('#new-service-price').value;
  const duration = $('#new-service-duration').value;
  if (!name || !price || !duration) { toast('همه فیلدها را پر کن'); return; }
  await api('adminAddService', { name, price, duration });
  $('#new-service-name').value = '';
  $('#new-service-price').value = '';
  $('#new-service-duration').value = '';
  toast('خدمت اضافه شد');
  loadServices();
});

// ----------------------------- تنظیمات -----------------------------
async function loadSettings() {
  const daysWrap = $('#working-days');
  daysWrap.innerHTML = '';
  DOW_LABELS.forEach((label, i) => {
    const l = el('label', '', `<input type="checkbox" value="${i}"> ${label}`);
    daysWrap.appendChild(l);
  });

  const res = await api('adminGetSettings');
  if (!res.ok) return;
  const s = res.settings;
  const workingDays = (s.workingDays || '').split(',').map((x) => x.trim());
  document.querySelectorAll('#working-days input').forEach((cb) => {
    cb.checked = workingDays.includes(cb.value);
  });
  $('#start-time').value = s.startTime || '10:00';
  $('#end-time').value = s.endTime || '19:00';
  $('#slot-interval').value = s.slotInterval || 60;
  try {
    const blocked = JSON.parse(s.blockedDates || '[]');
    $('#blocked-dates').value = blocked.join('\n');
  } catch (e) { $('#blocked-dates').value = ''; }
}

$('#save-settings-btn').addEventListener('click', async () => {
  const checked = Array.from(document.querySelectorAll('#working-days input:checked')).map((cb) => cb.value);
  const blockedLines = $('#blocked-dates').value.split('\n').map((l) => l.trim()).filter(Boolean);

  await api('adminSaveSettings', {
    workingDays: checked.join(','),
    startTime: $('#start-time').value,
    endTime: $('#end-time').value,
    slotInterval: $('#slot-interval').value,
    blockedDates: JSON.stringify(blockedLines),
  });
  toast('تنظیمات ذخیره شد');
});

// ----------------------------- init -----------------------------
if (token) showPanel();
