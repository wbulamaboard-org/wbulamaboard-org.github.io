(() => {
  const esc = v => String(v ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
  const safeUrl = v => { try { const u = new URL(String(v || "").trim()); return /^https?:$/.test(u.protocol) ? u.href : ""; } catch (_) { return ""; } };
  const photoUrl = r => { const raw = String(r?.photo_url || r?.photo || "").trim(); return raw ? raw + (raw.includes("?") ? "&" : "?") + "v=20260930-7" : ""; };

  async function loadMembers(){
    const res = await fetch("assets/master-member-database.json?v=20260930-14",{cache:"no-store"});
    if(!res.ok) throw new Error("member-db");
    const data = await res.json();
    return Array.isArray(data) ? data.filter(x=>x && x.active!==false).sort((a,b)=>(Number(a.serial)||999999)-(Number(b.serial)||999999)) : [];
  }

  function card(r){
    const src=photoUrl(r);
    const img=src ? '<img class="wazeen-card-photo" src="'+esc(src)+'" alt="'+esc(r.name||"Wazeen")+'" loading="lazy" onerror="this.remove()">' : '<div class="wazeen-card-photo no-photo">و</div>';
    return '<a class="wazeen-folder" href="wazeen-profile.html?id='+encodeURIComponent(r.member_id||"")+'">'+
      '<span class="folder-tab">'+esc(r.member_id||"")+'</span>'+img+
      '<h3>'+esc(String(r.name||"—").toUpperCase())+'</h3><p>'+esc(r.designation||"WAYEJIN")+'</p>'+
      '<span class="open">প্রোফাইল দেখুন →</span></a>';
  }

  function renderProfile(root,w,id){
    const name=String(w.name||"Wazeen");
    const phone=String(w.phone||"").replace(/\D/g,"").slice(-10);
    const image=photoUrl(w);
    const district=String(w.district||"").trim()||"—";
    const area=String(w.area||w.block||w.address||"").trim()||"—";
    const validity=String(w.valid_till||w.validity||"").trim()||"—";
    const social=[
      ["facebook","🔵 Facebook"],["youtube","▶️ YouTube"],["instagram","🟣 Instagram"],["website","🌐 Website"]
    ].map(([k,label])=>{const u=safeUrl(w[k]||w[k+"_url"]);return u?'<a href="'+esc(u)+'" target="_blank" rel="noopener">'+label+'</a>':""}).filter(Boolean).join("");
    const youtube=safeUrl(w.youtube||w.youtube_url)||("https://www.youtube.com/results?search_query="+encodeURIComponent(name));
    const facebook=safeUrl(w.facebook||w.facebook_url)||("https://www.facebook.com/search/videos/?q="+encodeURIComponent(name));
    const videos=(Array.isArray(w.video_links)?w.video_links:[]).map(v=>v&&safeUrl(v.url)?'<a class="video-link" href="'+esc(safeUrl(v.url))+'" target="_blank" rel="noopener"><b>▶</b><span>'+esc(v.title||"ভিডিও")+'</span><em>দেখুন</em></a>':"").join("");

    root.innerHTML='<div class="profile-card modern-profile">'+
      '<div class="profile-hero"><div class="hero-pattern"></div><div class="profile-badge">WAYEJIN</div></div>'+
      '<div class="profile-content">'+
      '<div class="photo-wrap">'+(image?'<img class="profile-photo" src="'+esc(image)+'" alt="'+esc(name)+'" onerror="this.onerror=null;this.remove()">':'<div class="profile-photo no-photo">و</div>')+'</div>'+
      '<div class="profile-kicker">'+esc(w.designation||"WAYEJIN • ULAMA BOARD")+'</div>'+
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
      '<section class="profile-section"><div class="section-title"><span>◆</span><h2>সামাজিক যোগাযোগ ও মিডিয়া</h2></div>'+
      '<div class="social-grid">'+(social||'<span class="empty-social">সামাজিক লিংক এখনো যোগ করা হয়নি</span>')+'</div>'+
      '<div class="media-search"><a href="'+esc(youtube)+'" target="_blank" rel="noopener">▶ YouTube ভিডিও</a><a href="'+esc(facebook)+'" target="_blank" rel="noopener">● Facebook ভিডিও</a></div>'+
      (videos?'<div class="video-links">'+videos+'</div>':"")+'</section>'+
      '<div class="profile-actions"><a class="btn" href="wazeens.html">← সব ওয়েজিন</a><a class="btn" href="verification.html?id='+encodeURIComponent(w.member_id||id)+'">✓ ID যাচাই</a><a class="btn" href="wazeen-car-board.html?id='+encodeURIComponent(w.member_id||id)+'">🚗 Car Board</a><a class="btn gold" href="wazeen-id-card.html?id='+encodeURIComponent(w.member_id||id)+'">🪪 ID Card</a></div>'+
      '<a class="car-download" href="wazeen-car-board.html?id='+encodeURIComponent(w.member_id||id)+'">⬇️ Car Board ডাউনলোড</a>'+
      '</div></div>';
  }

  async function init(){
    let members=[]; try{members=await loadMembers();}catch(_){}
    const home=document.getElementById("homeWazeens"); if(home) home.innerHTML=members.slice(0,6).map(card).join("")||'<div class="empty">ওয়েজিনদের তথ্য পাওয়া যায়নি।</div>';
    const root=document.getElementById("wazeenProfile"); if(!root)return;
    const id=new URLSearchParams(location.search).get("id")||"", lower=id.toLowerCase();
    const legacyNames={"mehrab-uddin":"pirjada mehrabuddin siddique","yunus-ali":"md younus ali baidya","amanullah-aman":"maulana amanullah aman","jamat-ali":"maulana jamat ali","khairuzzaman":"maulana khairuzzaman"};
    let member=members.find(x=>String(x.member_id||"").toLowerCase()===lower);
    if(!member&&legacyNames[lower]) member=members.find(x=>String(x.name||"").toLowerCase()===legacyNames[lower]);
    if(!member){root.innerHTML='<div class="profile-card modern-profile"><div class="profile-content"><h1>ওয়েজিনের প্রোফাইল পাওয়া যায়নি</h1><a class="btn" href="wazeens.html">← ওয়েজিন ডিরেক্টরি</a></div></div>';return;}
    document.title=(member.name||"Wazeen")+" | WAYEJIN E FURFURA SHARIF";
    renderProfile(root,member,id);
  }
  init();
})();