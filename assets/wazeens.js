(() => {
  const esc = v => String(v ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const safeUrl = v => {
    try {
      const u = new URL(String(v || "").trim());
      return /^https?:$/.test(u.protocol) ? u.href : "";
    } catch (_) { return ""; }
  };
  const photoUrl = r => String(r?.photo_url || r?.photo || "").trim();

  async function loadMembers(){
    const res = await fetch("assets/master-member-database.json?v=20260928-10", {cache:"no-store"});
    if(!res.ok) throw new Error("member-db");
    const data = await res.json();
    return Array.isArray(data) ? data.filter(x => x && x.active !== false) : [];
  }

  function card(r){
    const src = photoUrl(r);
    const img = src
      ? '<img src="'+esc(src)+'" alt="'+esc(r.name || "Wazeen")+'" loading="lazy">'
      : '<div class="no-photo">و</div>';
    const area = r.address || [r.district, r.block].filter(Boolean).join(" • ") || "";
    return '<a class="wazeen-folder" href="wazeen-profile.html?id='+encodeURIComponent(r.member_id || '')+'">'+
      '<span class="folder-tab">'+esc(r.member_id || "")+'</span>'+img+
      '<h3>'+esc(r.name || "—")+'</h3>'+
      '<p>'+esc(r.designation || "WAYEJIN")+'</p>'+
      (area ? '<p>'+esc(area)+'</p>' : '')+
      '<span class="open">প্রোফাইল, ভিডিও ও যোগাযোগ →</span></a>';
  }

  function renderProfile(root, w, id){
    const name = w.name || "Wazeen";
    const social = [
      ["facebook","🔵 Facebook"],["youtube","▶️ YouTube"],["instagram","🟣 Instagram"],["website","🌐 Website"]
    ].map(([k,label]) => {
      const u = safeUrl(w[k] || w[k+"_url"]);
      return u ? '<a href="'+esc(u)+'" target="_blank" rel="noopener">'+label+'</a>' : "";
    }).filter(Boolean).join("");

    const videos = (Array.isArray(w.video_links) ? w.video_links : [])
      .map(v => v && safeUrl(v.url) ? '<a class="video-link" href="'+esc(safeUrl(v.url))+'" target="_blank" rel="noopener"><b>'+(String(v.platform||"").toLowerCase()==="facebook"?"🔵":"▶️")+'</b><span>'+esc(v.title||"ভিডিও")+'</span><em>দেখুন →</em></a>' : "")
      .join("");

    const phone = String(w.phone || "").replace(/\D/g,"").slice(-10);
    const youtube = safeUrl(w.youtube || w.youtube_url) || ("https://www.youtube.com/results?search_query="+encodeURIComponent(name));
    const facebook = safeUrl(w.facebook || w.facebook_url) || ("https://www.facebook.com/search/videos/?q="+encodeURIComponent(name));
    const image = photoUrl(w);
    const area = w.address || [w.district,w.block].filter(Boolean).join(" • ") || "—";

    root.innerHTML =
      '<div class="profile-card"><div class="profile-cover"></div><div class="profile-body">'+
      (image ? '<img class="profile-photo" src="'+esc(image)+'" alt="'+esc(name)+'">' : '<div class="profile-photo no-photo">و</div>')+
      '<div class="profile-role">'+esc(w.designation || "WAYEJIN • ULAMA BOARD")+'</div>'+
      '<h1>'+esc(name)+'</h1>'+
      (w.name_en && w.name_en !== name ? '<div class="profile-en">'+esc(w.name_en)+'</div>' : '')+
      (phone ? '<div class="member-phone">📱 '+esc(w.phone)+'</div>' : '')+
      '<div class="profile-grid">'+
      '<div><small>সদস্য আইডি</small><b>'+esc(w.member_id||"—")+'</b></div>'+
      '<div><small>পদ</small><b>'+esc(w.designation||"—")+'</b></div>'+
      '<div><small>জেলা / এলাকা</small><b>'+esc(area)+'</b></div>'+
      '<div><small>বৈধতা</small><b>'+esc(w.valid_till||w.validity||"—")+'</b></div>'+
      '</div>'+
      '<div class="profile-bio"><h2>পরিচিতি</h2><p>'+esc(w.bio || "WAYEJIN E FURFURA SHARIF-এর সঙ্গে যুক্ত ওয়েজিন।")+'</p></div>'+
      (phone ? '<div class="profile-contact"><a href="tel:+91'+phone+'">📞 কল করুন</a><a href="https://wa.me/91'+phone+'" target="_blank" rel="noopener">💬 WhatsApp</a></div>' : '')+
      '<section class="profile-media"><h2>সামাজিক যোগাযোগ ও মিডিয়া</h2>'+
      '<div class="profile-social">'+(social || '<span>সামাজিক লিংক এখনো যোগ করা হয়নি</span>')+'</div>'+
      '<div class="media-search"><a href="'+esc(youtube)+'" target="_blank" rel="noopener">▶️ YouTube ভিডিও খুঁজুন</a><a href="'+esc(facebook)+'" target="_blank" rel="noopener">🔵 Facebook ভিডিও খুঁজুন</a></div>'+
      (videos ? '<div class="video-links">'+videos+'</div>' : '')+
      '</section>'+
      '<div class="profile-actions"><a class="btn" href="wazeens.html">← সব ওয়েজিন</a><a class="btn" href="verification.html?id='+encodeURIComponent(w.member_id||id)+'">Member ID যাচাই</a><a class="btn" href="wazeen-car-board.html?id='+encodeURIComponent(w.member_id||id)+'">🚗 Car Board Download</a><a class="btn" href="wazeen-id-card.html?id='+encodeURIComponent(w.member_id||id)+'">🪪 ID Card Download</a>'+(w.card_url ? '<a class="btn" href="'+esc(w.card_url)+'" target="_blank" rel="noopener">🪪 ID Card দেখুন</a>' : "")+'<a class="btn profile-edit-link" href="member.html?id='+encodeURIComponent(w.member_id||id)+'">✏️ নিজের প্রোফাইল এডিট</a></div>'+
      '</div></div>';
  }

  async function init(){
    let members = [];
    try { members = await loadMembers(); } catch (_) {}

    const home = document.getElementById("homeWazeens");
    if(home){
      home.innerHTML = members.slice(0,6).map(card).join("") || '<div class="empty">ওয়েজিনদের তথ্য পাওয়া যায়নি।</div>';
    }

    const root = document.getElementById("wazeenProfile");
    if(!root) return;

    const id = new URLSearchParams(location.search).get("id") || "";
    const lower = id.toLowerCase();

    // Legacy profile slugs are mapped only to their matching master member, never to a default profile.
    const legacyNames = {
      "mehrab-uddin":"pirjada mehrabuddin siddique",
      "yunus-ali":"md younus ali baidya",
      "amanullah-aman":"maulana amanullah aman",
      "jamat-ali":"maulana jamat ali",
      "khairuzzaman":"maulana khairuzzaman"
    };

    let member = members.find(x => String(x.member_id||"").toLowerCase() === lower);
    if(!member && legacyNames[lower]){
      member = members.find(x => String(x.name||"").toLowerCase() === legacyNames[lower]);
    }

    if(!member){
      root.innerHTML='<div class="profile-card"><div class="profile-body"><h1>ওয়েজিনের প্রোফাইল পাওয়া যায়নি</h1><p>সার্চ ফলাফল থেকে আবার প্রোফাইলটি খুলুন।</p><a class="btn" href="wazeens.html">← ওয়েজিন ডিরেক্টরি</a></div></div>';
      return;
    }

    document.title = (member.name || "Wazeen") + " | WAYEJIN E FURFURA SHARIF";
    renderProfile(root, member, id);
  }

  init();
})();