(() => {
  const WAZEENS = [
    {id:"mehrab-uddin",name:"Pirjada Mehrab Uddin Siddiqui Al Quraish",bn:"পিরজাদা মেহরাব উদ্দিন সিদ্দিকী আল কুরাইশ",role:"CONTROLLER • ULAMA BOARD",roleBn:"কেন্দ্রীয় নিয়ন্ত্রক",image:"assets/PIRJADA MEHRABUDDIN SIDDIQUE.jpg",phone:"+91 99326 29118",district:"ফুরফুরা শরীফ",education:"—",experience:"উলামা বোর্ডের কেন্দ্রীয় দায়িত্ব",bio:"WAYEJIN E FURFURA SHARIF-এর সাংগঠনিক নেতৃত্ব ও উলামা ঐক্যের সঙ্গে যুক্ত।"},
    {id:"yunus-ali",name:"Md Younus Ali Baidya",bn:"মুফতি ইউনুস আলী ফতেহী",role:"STATE PRESIDENT • ULAMA BOARD",roleBn:"রাজ্য সভাপতি",image:"assets/file_00000000df888211b75f11be6eacb18a.png",district:"পশ্চিমবঙ্গ",education:"—",experience:"রাজ্য পর্যায়ের সাংগঠনিক দায়িত্ব",bio:"West Bengal Ulama Board-এর রাজ্য পর্যায়ের নেতৃত্বের সঙ্গে যুক্ত।"},
    {id:"amanullah-aman",name:"Maulana Amanullah Aman",bn:"মাওলানা আমানুল্লাহ আমান",role:"DIRECTOR • ULAMA BOARD",roleBn:"পরিচালক",image:"assets/amanullah-9732111888-square-1.jpg",district:"ক্যানিং, দক্ষিণ ২৪ পরগনা",education:"—",experience:"সাংগঠনিক ও ডিজিটাল কার্যক্রম",bio:"বোর্ডের সাংগঠনিক ও ডিজিটাল কার্যক্রম পরিচালনার সঙ্গে যুক্ত।"},
    {id:"jamat-ali",name:"Maulana Jamat Ali",bn:"মাওলানা জামাত আলী",role:"CHIEF DIRECTOR • ADVISOR COMMITTEE",roleBn:"প্রধান পরিচালক • উপদেষ্টা কমিটি",image:"assets/wazeen-jamat-ali-crop.jpg",district:"পশ্চিমবঙ্গ",education:"—",experience:"উপদেষ্টা ও সাংগঠনিক দায়িত্ব",bio:"উপদেষ্টা কমিটি ও সাংগঠনিক পরিকল্পনার সঙ্গে যুক্ত।"},
    {id:"khairuzzaman",name:"Maulana Khairuzzaman",bn:"মাওলানা খায়রুজ্জামান",role:"GENERAL SECRETARY • ULAMA BOARD",roleBn:"সাধারণ সম্পাদক",image:"assets/wazeen-khairuzzaman-crop.jpg",district:"পশ্চিমবঙ্গ",education:"—",experience:"সাংগঠনিক ও প্রশাসনিক দায়িত্ব",bio:"West Bengal Ulama Board-এর সাধারণ সম্পাদক হিসেবে সাংগঠনিক কাজের সঙ্গে যুক্ত।"},
    {id:"moyarrekhin-siddiqui",name:"Pirjada Moyarrekhin Siddiqui",bn:"পিরজাদা মোয়াররেখীন সিদ্দিকী",role:"STATE VICE PRESIDENT • ULAMA BOARD",roleBn:"রাজ্য সহ-সভাপতি",image:"assets/pirjada-moyarrekhin-siddiqui.jpg",district:"পশ্চিমবঙ্গ",education:"—",experience:"রাজ্য পর্যায়ের সাংগঠনিক দায়িত্ব",bio:"West Bengal Ulama Board-এর রাজ্য ভাইস প্রেসিডেন্ট হিসেবে সাংগঠনিক কার্যক্রমের সঙ্গে যুক্ত।"},  ];
  window.WBUB_WAZEENS=WAZEENS;
  const esc=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const profileFiles={"mehrab-uddin":"wazeen-mehrab-uddin.html","yunus-ali":"wazeen-yunus-ali.html","amanullah-aman":"wazeen-amanullah-aman.html","jamat-ali":"wazeen-jamat-ali.html","khairuzzaman":"wazeen-khairuzzaman.html"};
  const folder=w=>'<a class="wazeen-folder" href="'+(profileFiles[w.id]||"wazeen-profile.html?id="+encodeURIComponent(w.id))+'"><span class="folder-tab">📁 PROFILE</span><img src="'+esc(w.image)+'" alt="'+esc(w.name)+'"><h3>'+esc(w.bn||w.name)+'</h3><p>'+esc(w.roleBn||w.role)+'</p>'+(w.phone?'<p class="member-phone">📱 '+esc(w.phone)+'</p>':'')+'<span class="open">প্রোফাইল খুলুন →</span></a>';
  const home=document.getElementById("homeWazeens"); if(home) home.innerHTML=WAZEENS.map(folder).join("");
  const directory=document.getElementById("wazeenDirectory");
  const search=document.getElementById("wazeenSearch");
  const render=()=>{if(!directory)return;const q=search?search.value.trim().toLowerCase():"";directory.innerHTML=WAZEENS.filter(w=>[w.name,w.bn,w.role,w.roleBn,w.district,w.phone].join(" ").toLowerCase().includes(q)).map(folder).join("")||'<div class="empty">কোনো ওয়েজিন প্রোফাইল পাওয়া যায়নি।</div>'};
  if(search) search.addEventListener("input",render); render();
  const root=document.getElementById("wazeenProfile");
  if(root){
    const id=new URLSearchParams(location.search).get("id")||"";
    const staticW=WAZEENS.find(x=>x.id===id);
    const safeUrl=v=>{try{const u=new URL(String(v||"").trim());return /^https?:$/.test(u.protocol)?u.href:""}catch(_){return ""}};
    const phoneNorm=v=>String(v||"").replace(/\D/g,"").slice(-10);
    function renderProfile(w){
      document.title=(w.name||"Wazeen")+" | WAYEJIN E FURFURA SHARIF";
      const social=[["facebook","🔵 Facebook"],["youtube","▶️ YouTube"],["instagram","🟣 Instagram"],["website","🌐 Website"]].map(([k,label])=>{
        const u=safeUrl(w[k]||w[k+"_url"]); return u?'<a href="'+esc(u)+'" target="_blank" rel="noopener">'+label+'</a>':'';
      }).filter(Boolean).join("");
      const vids=(Array.isArray(w.video_links)?w.video_links:[]).filter(v=>v&&safeUrl(v.url)).map(v=>'<a class="video-link" href="'+esc(safeUrl(v.url))+'" target="_blank" rel="noopener"><b>'+(String(v.platform).toLowerCase()==="facebook"?"🔵":"▶️")+'</b><span>'+esc(v.title||"ভিডিও")+'</span><em>দেখুন →</em></a>').join("");
      const phone=phoneNorm(w.phone);
      const yt=safeUrl(w.youtube||w.youtube_url)||("https://www.youtube.com/results?search_query="+encodeURIComponent(w.name||""));
      const fb=safeUrl(w.facebook||w.facebook_url)||("https://www.facebook.com/search/videos/?q="+encodeURIComponent(w.name||""));
      root.innerHTML='<div class="profile-card"><div class="profile-cover"></div><div class="profile-body"><img class="profile-photo" src="'+esc(w.image||w.photo_url||"")+'" alt="'+esc(w.name||"Wazeen")+'"><div class="profile-role">'+esc(w.role||w.designation||"WAYEJIN • ULAMA BOARD")+'</div><h1>'+esc(w.bn||w.name||"")+'</h1><div class="profile-en">'+esc(w.name||"")+'</div>'+(w.phone?'<div class="member-phone">📱 '+esc(w.phone)+'</div>':'')+'<div class="profile-grid"><div><small>পদ</small><b>'+esc(w.roleBn||w.designation||w.role||"—")+'</b></div><div><small>জেলা / এলাকা</small><b>'+esc(w.district||w.address||"—")+'</b></div><div><small>শিক্ষাগত যোগ্যতা</small><b>'+esc(w.education||"—")+'</b></div><div><small>অভিজ্ঞতা</small><b>'+esc(w.experience||"—")+'</b></div></div><div class="profile-bio"><h2>পরিচিতি</h2><p>'+esc(w.bio||"WAYEJIN E FURFURA SHARIF-এর সঙ্গে যুক্ত ওয়েজিন।")+'</p></div>'+(phone?'<div class="profile-contact"><a href="tel:+91'+phone+'">📞 কল করুন</a><a href="https://wa.me/91'+phone+'" target="_blank" rel="noopener">💬 WhatsApp</a></div>':'')+'<section class="profile-media"><h2>সামাজিক যোগাযোগ ও মিডিয়া</h2><div class="profile-social">'+(social||'<span>সামাজিক লিংক এখনো যোগ করা হয়নি</span>')+'</div><div class="media-search"><a href="'+esc(yt)+'" target="_blank" rel="noopener">▶️ YouTube ভিডিও খুঁজুন</a><a href="'+esc(fb)+'" target="_blank" rel="noopener">🔵 Facebook ভিডিও খুঁজুন</a></div>'+(vids?'<div class="video-links">'+vids+'</div>':'')+'</section><div class="profile-actions"><a class="btn" href="wazeens.html">← সব ওয়েজিন</a><a class="btn" href="verification.html?id='+encodeURIComponent(w.member_id||id)+'">Member ID যাচাই</a></div></div></div>';
    }
    if(staticW){
      renderProfile(staticW);
    }else{
      fetch("assets/master-member-database.json?v=20260928-4",{cache:"no-store"}).then(r=>r.json()).then(list=>{
        const w=list.find(x=>String(x.member_id||"").toUpperCase()===id.toUpperCase() || String(x.id||"")===id);
        if(!w){root.innerHTML='<div class="profile-card"><div class="profile-body"><h1>ওয়েজিনের প্রোফাইল পাওয়া যায়নি</h1><a class="btn" href="wazeens.html">← ওয়েজিন ডিরেক্টরি</a></div></div>';return;}
        w.bn=w.name; w.role=w.designation||"WAYEJIN • ULAMA BOARD"; w.roleBn=w.designation||w.role; w.image=w.photo_url||((String(w.member_id||"").match(/^WBUB-(\d{4})$/))?("assets/member-photos/"+w.member_id+(RegExp.$1==="0185"?".jpg":".png")):""); w.district=w.address||[w.district,w.block].filter(Boolean).join(" • "); renderProfile(w);
      }).catch(()=>{root.innerHTML='<div class="profile-card"><div class="profile-body"><h1>প্রোফাইল লোড করা যাচ্ছে না</h1><a class="btn" href="wazeens.html">← ফিরে যান</a></div></div>'});
    }
  }
})();