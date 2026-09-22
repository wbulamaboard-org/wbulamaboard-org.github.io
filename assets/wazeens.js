(() => {
  const WAZEENS = [
    {id:"mehrab-uddin",name:"Pirjada Mehrab Uddin Siddiqui Al Quraish",bn:"পিরজাদা মেহরাব উদ্দিন সিদ্দিকী আল কুরাইশ",role:"CONTROLLER • ULAMA BOARD",roleBn:"কেন্দ্রীয় নিয়ন্ত্রক",image:"assets/wazeen-mehrab-uddin-crop.jpg",district:"ফুরফুরা শরীফ",education:"—",experience:"উলামা বোর্ডের কেন্দ্রীয় দায়িত্ব",bio:"WAYEJIN E FURFURA SHARIF-এর সাংগঠনিক নেতৃত্ব ও উলামা ঐক্যের সঙ্গে যুক্ত।"},
    {id:"yunus-ali",name:"Md Younus Ali Baidya",bn:"মুফতি ইউনুস আলী ফতেহী",role:"STATE PRESIDENT • ULAMA BOARD",roleBn:"রাজ্য সভাপতি",image:"assets/file_00000000df888211b75f11be6eacb18a.png",district:"পশ্চিমবঙ্গ",education:"—",experience:"রাজ্য পর্যায়ের সাংগঠনিক দায়িত্ব",bio:"West Bengal Ulama Board-এর রাজ্য পর্যায়ের নেতৃত্বের সঙ্গে যুক্ত।"},
    {id:"amanullah-aman",name:"Maulana Amanullah Aman",bn:"মাওলানা আমানুল্লাহ আমান",role:"DIRECTOR • ULAMA BOARD",roleBn:"পরিচালক",image:"assets/FB_IMG_1789891992819.jpg",district:"ক্যানিং, দক্ষিণ ২৪ পরগনা",education:"—",experience:"সাংগঠনিক ও ডিজিটাল কার্যক্রম",bio:"বোর্ডের সাংগঠনিক ও ডিজিটাল কার্যক্রম পরিচালনার সঙ্গে যুক্ত।"},
    {id:"jamat-ali",name:"Maulana Jamat Ali",bn:"মাওলানা জামাত আলী",role:"CHIEF DIRECTOR • ADVISOR COMMITTEE",roleBn:"প্রধান পরিচালক • উপদেষ্টা কমিটি",image:"assets/wazeen-jamat-ali-crop.jpg",district:"পশ্চিমবঙ্গ",education:"—",experience:"উপদেষ্টা ও সাংগঠনিক দায়িত্ব",bio:"উপদেষ্টা কমিটি ও সাংগঠনিক পরিকল্পনার সঙ্গে যুক্ত।"},
    {id:"khairuzzaman",name:"Maulana Khairuzzaman",bn:"মাওলানা খায়রুজ্জামান",role:"GENERAL SECRETARY • ULAMA BOARD",roleBn:"সাধারণ সম্পাদক",image:"assets/wazeen-khairuzzaman-crop.jpg",district:"পশ্চিমবঙ্গ",education:"—",experience:"সাংগঠনিক ও প্রশাসনিক দায়িত্ব",bio:"West Bengal Ulama Board-এর সাধারণ সম্পাদক হিসেবে সাংগঠনিক কাজের সঙ্গে যুক্ত।"}
  ];
  window.WBUB_WAZEENS=WAZEENS;
  const esc=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const profileFiles={"mehrab-uddin":"wazeen-mehrab-uddin.html","yunus-ali":"wazeen-yunus-ali.html","amanullah-aman":"wazeen-amanullah-aman.html","jamat-ali":"wazeen-jamat-ali.html","khairuzzaman":"wazeen-khairuzzaman.html"};
  const folder=w=>'<a class="wazeen-folder" href="'+(profileFiles[w.id]||"wazeen-profile.html?id="+encodeURIComponent(w.id))+'"><span class="folder-tab">📁 PROFILE</span><img src="'+esc(w.image)+'" alt="'+esc(w.name)+'"><h3>'+esc(w.bn||w.name)+'</h3><p>'+esc(w.roleBn||w.role)+'</p><span class="open">প্রোফাইল খুলুন →</span></a>';
  const home=document.getElementById("homeWazeens"); if(home) home.innerHTML=WAZEENS.map(folder).join("");
  const directory=document.getElementById("wazeenDirectory");
  const search=document.getElementById("wazeenSearch");
  const render=()=>{if(!directory)return;const q=search?search.value.trim().toLowerCase():"";directory.innerHTML=WAZEENS.filter(w=>[w.name,w.bn,w.role,w.roleBn,w.district].join(" ").toLowerCase().includes(q)).map(folder).join("")||'<div class="empty">কোনো ওয়েজিন প্রোফাইল পাওয়া যায়নি।</div>'};
  if(search) search.addEventListener("input",render); render();
  const root=document.getElementById("wazeenProfile");
  if(root){
    const id=new URLSearchParams(location.search).get("id"),w=WAZEENS.find(x=>x.id===id)||WAZEENS[0];
    document.title=w.name+" | WAYEJIN E FURFURA SHARIF";
    root.innerHTML='<div class="profile-card"><div class="profile-cover"></div><div class="profile-body"><img class="profile-photo" src="'+esc(w.image)+'" alt="'+esc(w.name)+'"><div class="profile-role">'+esc(w.role)+'</div><h1>'+esc(w.bn||w.name)+'</h1><div class="profile-en">'+esc(w.name)+'</div><div class="profile-grid"><div><small>পদ</small><b>'+esc(w.roleBn||w.role)+'</b></div><div><small>জেলা / এলাকা</small><b>'+esc(w.district)+'</b></div><div><small>শিক্ষাগত যোগ্যতা</small><b>'+esc(w.education)+'</b></div><div><small>অভিজ্ঞতা</small><b>'+esc(w.experience)+'</b></div></div><div class="profile-bio"><h2>পরিচিতি</h2><p>'+esc(w.bio)+'</p></div><div class="profile-actions"><a class="btn" href="wazeens.html">← সব ওয়েজিন</a><a class="btn" href="verification.html">Member ID যাচাই</a></div></div></div>';
  }
})();