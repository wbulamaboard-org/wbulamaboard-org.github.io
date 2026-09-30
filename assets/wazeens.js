(() => {
  "use strict";
  const esc = v => String(v ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
  const url = v => { try { const u=new URL(String(v||"").trim(),location.href); return /^https?:$/.test(u.protocol)?u.href:""; } catch(e){ return ""; } };
  const photo = r => {
    const p=String(r?.photo_url||r?.photo||"").trim();
    return p ? p + (p.includes("?")?"&":"?") + "v=20260930-17" : "";
  };

  async function members(){
    const res=await fetch("assets/master-member-database.json?v=20260930-15",{cache:"no-store"});
    if(!res.ok) throw new Error("database");
    const data=await res.json();
    return Array.isArray(data)?data.filter(x=>x&&x.active!==false):[];
  }

  function directoryCard(r){
    const p=photo(r);
    const img=p?'<img src="'+esc(p)+'" alt="'+esc(r.name||"Wazeen")+'" loading="lazy" onerror="this.style.visibility=&quot;hidden&quot;">':'<div class="wazeen-card-photo no-photo">و</div>';
    return '<a class="wazeen-folder" href="wazeen-profile.html?id='+encodeURIComponent(r.member_id||"")+'"><span class="folder-tab">'+esc(r.member_id||"")+'</span>'+img+'<h3>'+esc(String(r.name||"—").toUpperCase())+'</h3><p>'+esc(r.designation||"WAYEJIN")+'</p><span class="open">প্রোফাইল দেখুন →</span></a>';
  }

  function render(root,w,id){
    const name=String(w.name||"Wazeen");
    const phone=String(w.phone||"").replace(/\D/g,"").slice(-10);
    const district=String(w.district||"").trim()||"—";
    const area=String(w.area||w.block||w.address||"").trim()||"—";
    const validity=String(w.valid_till||w.validity||"").trim()||"—";
    const p=photo(w);
    const social=[
      ["facebook","🔵 Facebook"],["youtube","▶️ YouTube"],["instagram","🟣 Instagram"],["website","🌐 Website"]
    ].map(([k,label])=>{const u=url(w[k]||w[k+"_url"]);return u?'<a href="'+esc(u)+'" target="_blank" rel="noopener">'+label+'</a>':""}).filter(Boolean).join("");
    const yt=url(w.youtube||w.youtube_url);
    const fb=url(w.facebook||w.facebook_url);
    const mediaSection=(social||yt||fb)?(
      '<section class="profile-section"><div class="section-title"><span>◆</span><h2>সামাজিক যোগাযোগ ও মিডিয়া</h2></div>'+
      (social?'<div class="social-grid">'+social+'</div>':"")+
      ((yt||fb)?'<div class="media-search">'+(yt?'<a href="'+esc(yt)+'" target="_blank" rel="noopener">▶ YouTube ভিডিও</a>':"")+(fb?'<a href="'+esc(fb)+'" target="_blank" rel="noopener">● Facebook ভিডিও</a>':"")+'</div>':"")+
      '</section>'
    ):"";

    root.innerHTML =
      '<div class="profile-card modern-profile">'+
      '<div class="profile-hero"><div class="hero-pattern"></div><div class="profile-badge">WAYEJIN</div></div>'+
      '<div class="profile-content">'+
      '<div class="photo-wrap">'+(p?'<img class="profile-photo" src="'+esc(p)+'" alt="'+esc(name)+'">':'<div class="profile-photo no-photo">و</div>')+'</div>'+
      '<div class="profile-kicker"><span>'+esc(w.designation||"WAYEJIN • ULAMA BOARD")+'</span></div>'+
      '<h1>'+esc(name)+'</h1>'+
      (w.name_en&&w.name_en!==name?'<div class="profile-en">'+esc(w.name_en)+'</div>':"")+
      (phone?'<div class="profile-phone">📱 '+esc(w.phone)+'</div>':"")+
      '<div class="info-grid">'+
      '<div class="info-item"><span>সদস্য আইডি</span><strong>'+esc(w.member_id||"—")+'</strong></div>'+
      '<div class="info-item"><span>পদ</span><strong>'+esc(w.designation||"—")+'</strong></div>'+
      '<div class="info-item"><span>জেলা</span><strong>'+esc(district)+'</strong></div>'+
      '<div class="info-item"><span>এলাকা</span><strong>'+esc(area)+'</strong></div>'+
      '<div class="info-item"><span>বৈধতা</span><strong>'+esc(validity)+'</strong></div>'+
      '</div>'+
      (phone?'<div class="quick-actions"><a href="tel:+91'+phone+'">📞 কল করুন</a><a href="https://wa.me/91'+phone+'" target="_blank" rel="noopener">💬 WhatsApp</a></div>':"")+
      '<section class="profile-section"><div class="section-title"><span>◆</span><h2>পরিচিতি</h2></div><p>'+esc(w.bio||"WAYEJIN E FURFURA SHARIF-এর সঙ্গে যুক্ত ওয়েজিন।")+'</p></section>'+
      mediaSection+      '<div class="profile-actions"><a class="btn" href="wazeens.html">← সব ওয়েজিন</a><a class="btn" href="verification.html?id='+encodeURIComponent(w.member_id||id)+'">✓ ID যাচাই</a></div>'+
      '<div class="download-actions"><a class="download-btn id" href="wazeen-id-card.html?id='+encodeURIComponent(w.member_id||id)+'">🪪 ID Card দেখুন / ডাউনলোড</a><a class="download-btn car" href="wazeen-car-board.html?id='+encodeURIComponent(w.member_id||id)+'">🚗 Car Board ডাউনলোড</a></div>'+
      '</div></div>';

    const im=root.querySelector(".profile-photo");
    if(im) im.addEventListener("error",()=>{ im.replaceWith(Object.assign(document.createElement("div"),{className:"profile-photo no-photo",textContent:"و"})); },{once:true});
  }

  async function init(){
    const root=document.getElementById("wazeenProfile");
    let list=[];
    try{ list=await members(); }catch(e){
      if(root) root.innerHTML='<div class="profile-card modern-profile"><div class="profile-content"><h1>প্রোফাইল লোড হচ্ছে না</h1><p>ডাটাবেস সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।</p></div></div>';
      return;
    }
    const home=document.getElementById("homeWazeens");
    if(home) home.innerHTML=list.slice(0,6).map(directoryCard).join("")||'<div class="empty">ওয়েজিনদের তথ্য পাওয়া যায়নি।</div>';
    if(!root) return;
    const id=new URLSearchParams(location.search).get("id")||"";
    const key=id.toLowerCase();
    const legacy={"mehrab-uddin":"pirjada mehrabuddin siddique","yunus-ali":"md younus ali baidya","amanullah-aman":"maulana amanullah aman","jamat-ali":"maulana jamat ali","khairuzzaman":"maulana khairuzzaman"};
    let w=list.find(x=>String(x.member_id||"").toLowerCase()===key);
    if(!w&&legacy[key]) w=list.find(x=>String(x.name||"").toLowerCase()===legacy[key]);
    if(!w){
      root.innerHTML='<div class="profile-card modern-profile"><div class="profile-content"><h1>ওয়েজিনের প্রোফাইল পাওয়া যায়নি</h1><a class="btn" href="wazeens.html">← ওয়েজিন ডিরেক্টরি</a></div></div>';
      return;
    }
    document.title=(w.name||"Wazeen")+" | WAYEJIN E FURFURA SHARIF";
    render(root,w,id);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
})();