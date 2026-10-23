import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cfg = window.MAJAN_SUPABASE_CONFIG || {};
const ready = cfg.url?.startsWith('https://') && !cfg.url.includes('YOUR_PROJECT') && cfg.anonKey && !cfg.anonKey.includes('YOUR_');
const supabase = ready ? createClient(cfg.url, cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const note = (msg) => { const el=$('.mc-toast') || Object.assign(document.body.appendChild(document.createElement('div')),{className:'mc-toast'}); el.textContent=msg; setTimeout(()=>el.remove(),4500); };
const esc = (v) => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let session=null;
async function getSession(){ if(!supabase)return null; const {data}=await supabase.auth.getSession();session=data.session;return session; }
async function isAdmin(){ await getSession(); if(!session)return false; const {data,error}=await supabase.from('admin_users').select('user_id').eq('user_id',session.user.id).maybeSingle(); return !error && !!data; }
function setFeedback(msg){ const el=$('#mc-booking-feedback'); if(el)el.textContent=msg; else note(msg); }
function wa(message){const num=localStorage.getItem('majan_whatsapp_number')||'96892820633';window.open(`https://wa.me/${num}?text=${encodeURIComponent(message)}`,'_blank','noopener');}
function bookingMessage(b){return `Majan Cooling — Service Request\nName: ${b.name}\nPhone: ${b.phone}\nService: ${b.service}\nPreferred date: ${b.preferred_date||'Flexible'}\nPreferred time: ${b.preferred_time||'Flexible'}\nLocation: ${b.location||'Not provided'}\nDetails: ${b.details||'Not provided'}`;}
async function sendEmail(booking){ if(!supabase)return; try { await supabase.functions.invoke(cfg.emailFunctionName||'booking-email',{body:{booking_id:booking.id}}); } catch(e){ console.warn('Email notification could not be sent',e); } }
async function loadPublic(){
 if(!supabase)return;
 const {data:reviews,error}=await supabase.from('reviews').select('id,name,rating,body,service,created_at').eq('published',true).order('created_at',{ascending:false}).limit(50);
 if(error){console.warn('Public reviews:',error.message);return;}
 const list=$('#mc-review-list'),empty=$('#mc-review-empty'); if(!list)return;
 list.innerHTML=(reviews||[]).map(r=>`<article class="mc-panel mc-review-card"><div class="mc-review-stars">${'★'.repeat(Math.max(1,Math.min(5,Number(r.rating)||5)))}${'☆'.repeat(5-Math.max(1,Math.min(5,Number(r.rating)||5)))}</div><blockquote>“${esc(r.body)}”</blockquote><div class="mc-review-author">${esc(r.name)}</div>${r.service?`<div style="font-size:.84rem;color:#718096;margin-top:4px">${esc(r.service)}</div>`:''}</article>`).join(''); if(empty)empty.style.display=reviews?.length?'none':'block';
 const {data:content}=await supabase.from('site_content').select('content_key,content_value');
 if(content?.length){for(const item of content){const el=document.querySelector(`[data-edit-key="${CSS.escape(item.content_key)}"]`);if(el)el.innerHTML=item.content_value;}}
}
function authForm(){
 const login=$('#mc-admin-login'); if(!login)return;
 login.innerHTML=`<h3 style="font-weight:850;font-size:1.2rem;margin-bottom:8px">Secure admin sign in</h3><p style="color:#607086;margin-bottom:14px">Use the admin email account created in Supabase.</p><form id="mc-secure-login" style="display:flex;gap:10px;flex-wrap:wrap"><input name="email" type="email" autocomplete="username" required placeholder="Admin email" style="padding:12px;border:1px solid #cbd7e5;border-radius:8px;flex:1;min-width:180px"><input name="password" type="password" autocomplete="current-password" required placeholder="Password" style="padding:12px;border:1px solid #cbd7e5;border-radius:8px;flex:1;min-width:180px"><button class="mc-btn" type="submit">Sign in</button></form><p id="mc-secure-error" role="status" style="color:#b42318;margin-top:8px"></p>`;
 $('#mc-secure-login').addEventListener('submit',async e=>{e.preventDefault();if(!supabase){$('#mc-secure-error').textContent='Add your Supabase URL and publishable/anon key to supabase-config.js first.';return;}const fd=new FormData(e.currentTarget);const {error}=await supabase.auth.signInWithPassword({email:fd.get('email'),password:fd.get('password')});if(error){$('#mc-secure-error').textContent='Sign-in failed. Check credentials and admin access.';return;}if(!await isAdmin()){await supabase.auth.signOut();$('#mc-secure-error').textContent='This account is not authorized as a website admin.';return;}session=(await supabase.auth.getSession()).data.session;$('#mc-admin-login').style.display='none';$('#mc-admin-app').style.display='block';note('Signed in securely.');await refreshAdmin();});
}
async function refreshAdmin(){
 if(!supabase||!await isAdmin())return;
 const {data:bookings}=await supabase.from('bookings').select('*').order('created_at',{ascending:false}).limit(100);
 const {data:reviews}=await supabase.from('reviews').select('*').order('created_at',{ascending:false}).limit(100);
 const view=$('#mc-admin-view');if(!view)return;
 if(view.dataset.tab==='bookings') view.innerHTML=`<h3 style="font-weight:850;font-size:1.15rem">Bookings (${bookings?.length||0})</h3>${(bookings||[]).map(b=>`<article class="mc-admin-row"><strong>${esc(b.name)} — ${esc(b.service)}</strong><p>${esc(b.phone)} · ${esc(b.preferred_date||'No date')} · ${esc(b.preferred_time||'Flexible')}</p><p>${esc(b.location||'')} ${esc(b.details||'')}</p><label>Status <select data-booking-status="${esc(b.id)}"><option ${b.status==='new'?'selected':''}>new</option><option ${b.status==='contacted'?'selected':''}>contacted</option><option ${b.status==='confirmed'?'selected':''}>confirmed</option><option ${b.status==='completed'?'selected':''}>completed</option><option ${b.status==='cancelled'?'selected':''}>cancelled</option></select></label> <button class="mc-btn green" data-wa-id="${esc(b.id)}">WhatsApp</button></article>`).join('')||'<p>No bookings yet.</p>'}`;
 if(view.dataset.tab==='reviews') view.innerHTML=`<div class="mc-panel"><h3>Add review</h3><form id="mc-db-review-form" class="mc-booking-grid"><label class="mc-field">Customer name<input name="name" maxlength="100" required></label><label class="mc-field">Rating<select name="rating"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></label><label class="mc-field" style="grid-column:1/-1">Review<textarea name="body" maxlength="800" required></textarea></label><label class="mc-field">Service<input name="service" maxlength="100"></label><button class="mc-btn">Publish review</button></form></div>${(reviews||[]).map(r=>`<article class="mc-admin-row"><strong>${esc(r.name)} · ${r.rating}/5</strong><p>${esc(r.body)}</p><button class="mc-btn secondary" data-review-publish="${esc(r.id)}" data-published="${r.published}">${r.published?'Unpublish':'Publish'}</button> <button class="mc-btn secondary" data-review-delete="${esc(r.id)}">Delete</button></article>`).join('')}`;
}
// Booking: server save is authoritative; WhatsApp is an additional option, never the only record.
document.addEventListener('submit',async e=>{
 if(e.target.id==='mc-booking-form'){
  e.preventDefault();e.stopImmediatePropagation();const f=new FormData(e.target);const b={name:String(f.get('name')||'').trim(),phone:String(f.get('phone')||'').trim(),service:String(f.get('service')||''),preferred_date:String(f.get('date')||'')||null,preferred_time:String(f.get('time')||'')||null,location:String(f.get('location')||'').trim()||null,details:String(f.get('details')||'').trim()||null};
  if(!supabase){setFeedback('Booking backend is not configured yet. Please contact us on WhatsApp.');wa(bookingMessage(b));return;}
  const {data,error}=await supabase.from('bookings').insert(b).select('id,name,phone,service,preferred_date,preferred_time,location,details').single();
  if(error){console.error(error);setFeedback('We could not save your request. Please try WhatsApp or call us.');return;}
  setFeedback('Booking saved successfully. WhatsApp will open so you can also message our team.');wa(bookingMessage(data));sendEmail(data);e.target.reset();
 }
 if(e.target.id==='mc-secure-login') { /* handled by its own listener */ }
 if(e.target.id==='mc-db-review-form'){
  e.preventDefault();e.stopImmediatePropagation();if(!await isAdmin()){note('Admin sign-in required.');return;}const f=new FormData(e.target);const {error}=await supabase.from('reviews').insert({name:String(f.get('name')).trim(),rating:Number(f.get('rating')),body:String(f.get('body')).trim(),service:String(f.get('service')||'').trim()||null,published:true});if(error){note('Review could not be saved.');console.error(error);}else{note('Review published.');await loadPublic();await refreshAdmin();}
 }
},true);
document.addEventListener('click',async e=>{
 const status=e.target.closest('[data-booking-status]');if(status){if(!await isAdmin())return;const {error}=await supabase.from('bookings').update({status:status.value}).eq('id',status.dataset.bookingStatus);if(error)note('Status update failed.');return;}
 const waBtn=e.target.closest('[data-wa-id]');if(waBtn){const {data}=await supabase.from('bookings').select('*').eq('id',waBtn.dataset.waId).single();if(data)wa(bookingMessage({name:data.name,phone:data.phone,service:data.service,date:data.preferred_date,time:data.preferred_time,location:data.location,details:data.details}));return;}
 const pub=e.target.closest('[data-review-publish]');if(pub){if(!await isAdmin())return;const {error}=await supabase.from('reviews').update({published:pub.dataset.published!=='true'}).eq('id',pub.dataset.reviewPublish);if(error)note('Review update failed.');else{await loadPublic();await refreshAdmin();}return;}
 const del=e.target.closest('[data-review-delete]');if(del){if(!await isAdmin()||!confirm('Delete this review?'))return;const {error}=await supabase.from('reviews').delete().eq('id',del.dataset.reviewDelete);if(error)note('Delete failed.');else{await loadPublic();await refreshAdmin();}return;}
 // Existing inline editor stores its edits locally. Mirror those edits to the database after its handler runs.
 if(e.target.closest('#mc-save-content')) setTimeout(async()=>{if(!await isAdmin()||!supabase)return;const content=JSON.parse(localStorage.getItem('majan_content_v2')||'{}');for(const [content_key,content_value] of Object.entries(content)){const {error}=await supabase.from('site_content').upsert({content_key,content_value:String(content_value),updated_by:session.user.id},{onConflict:'content_key'});if(error)console.warn('Content sync failed',error.message);}await loadPublic();},800);
},true);
// Replace insecure browser-PIN form and prevent the old PIN login path.
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
async function init(){
 if(!supabase){note('Backend setup required: add Supabase project URL and publishable key.');return;}
 authForm();await loadPublic();
 const {data}=await supabase.auth.getSession();session=data.session;
 if(session&&await isAdmin()){const login=$('#mc-admin-login'),app=$('#mc-admin-app');if(login)login.style.display='none';if(app)app.style.display='block';}
 $$('.mc-admin-tab').forEach(btn=>btn.addEventListener('click',()=>setTimeout(refreshAdmin,50)));
 const logout=$('#mc-admin-logout');if(logout)logout.addEventListener('click',async()=>{await supabase.auth.signOut();session=null;$('#mc-admin-app').style.display='none';$('#mc-admin-login').style.display='block';authForm();});
 const originalLaunch=$('#mc-admin-launch');if(originalLaunch)originalLaunch.addEventListener('click',async()=>{if(!await isAdmin())authForm();});
}
