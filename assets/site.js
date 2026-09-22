(() => {
  const LANGS = {
    bn:{label:'বাংলা', dir:'ltr'},
    en:{label:'English', dir:'ltr'},
    ar:{label:'العربية', dir:'rtl'},
    hi:{label:'हिन्दी', dir:'ltr'},
    ur:{label:'اردو', dir:'rtl'}
  };
  const T = {
    'Home':{bn:'হোম',en:'Home',ar:'الرئيسية',hi:'होम',ur:'ہوم'},
    'About':{bn:'আমাদের সম্পর্কে',en:'About',ar:'من نحن',hi:'हमारे बारे में',ur:'ہمارے بارے میں'},
    'About Us':{bn:'আমাদের সম্পর্কে',en:'About Us',ar:'من نحن',hi:'हमारे बारे میں',ur:'ہمارے بارے میں'},
    'Membership':{bn:'সদস্যপদ',en:'Membership',ar:'العضوية',hi:'सदस्यता',ur:'رکنیت'},
    'Projects':{bn:'প্রকল্প',en:'Projects',ar:'المشاريع',hi:'परियोजनाएँ',ur:'منصوبے'},
    'News & Events':{bn:'সংবাদ ও অনুষ্ঠান',en:'News & Events',ar:'الأخبار والفعاليات',hi:'समाचार व कार्यक्रम',ur:'خبریں و تقریبات'},
    'Gallery':{bn:'গ্যালারি',en:'Gallery',ar:'المعرض',hi:'गैलरी',ur:'گیلری'},
    'Contact':{bn:'যোগাযোগ',en:'Contact',ar:'اتصل بنا',hi:'संपर्क',ur:'رابطہ'},
    'Join Now →':{bn:'এখনই যোগ দিন →',en:'Join Now →',ar:'انضم الآن →',hi:'अभी जुड़ें →',ur:'اب شامل ہوں →'},
    'Become a Member →':{bn:'সদস্য হোন →',en:'Become a Member →',ar:'كن عضوًا →',hi:'सदस्य बनें →',ur:'رکن بنیں →'},
    'Learn More':{bn:'আরও জানুন',en:'Learn More',ar:'اعرف المزيد',hi:'और जानें',ur:'مزید جانیں'},
    'Read More →':{bn:'আরও পড়ুন →',en:'Read More →',ar:'اقرأ المزيد →',hi:'और पढ़ें →',ur:'مزید پڑھیں →'},
    'View All →':{bn:'সব দেখুন →',en:'View All →',ar:'عرض الكل →',hi:'सभी देखें →',ur:'سب دیکھیں →'},
    'Registration':{bn:'নিবন্ধন',en:'Registration',ar:'التسجيل',hi:'पंजीकरण',ur:'رجسٹریشن'},
    'Verification':{bn:'ভেরিফিকেশন',en:'Verification',ar:'التحقق',hi:'सत्यापन',ur:'تصدیق'},
    'Live Location':{bn:'লাইভ লোকেশন',en:'Live Location',ar:'الموقع المباشر',hi:'लाइव लोकेशन',ur:'لائیو لوکیشن'},
    'Digital Member Services':{bn:'ডিজিটাল সদস্য সেবা',en:'Digital Member Services',ar:'خدمات الأعضاء الرقمية',hi:'डिजिटल सदस्य सेवाएँ',ur:'ڈیجیٹل ممبر سروسز'},
    'Wazeen Directory':{bn:'ওয়েজিন ডিরেক্টরি',en:'Wazeen Directory',ar:'دليل الواعظين',hi:'वाज़ेइन निर्देशिका',ur:'واعظین ڈائریکٹری'},
    'Latest News & Events':{bn:'সর্বশেষ সংবাদ ও অনুষ্ঠান',en:'Latest News & Events',ar:'آخر الأخبار والفعاليات',hi:'नवीनतम समाचार व कार्यक्रम',ur:'تازہ خبریں و تقریبات'},
    'Leadership':{bn:'নেতৃত্ব',en:'Leadership',ar:'القيادة',hi:'नेतृत्व',ur:'قیادت'},
    'Support Our Projects →':{bn:'আমাদের প্রকল্পে সহায়তা করুন →',en:'Support Our Projects →',ar:'ادعم مشاريعنا →',hi:'हमारी परियोजनाओं का समर्थन करें →',ur:'ہمارے منصوبوں کی حمایت کریں →'},
    'Unity • Education • Social Reform':{bn:'ঐক্য • শিক্ষা • সমাজ সংস্কার',en:'Unity • Education • Social Reform',ar:'الوحدة • التعليم • الإصلاح الاجتماعي',hi:'एकता • शिक्षा • सामाजिक सुधार',ur:'اتحاد • تعلیم • سماجی اصلاح'}
  };
  const original = new Map();
  function translateText(root, lang){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n=>{
      const raw=(original.get(n) ?? n.nodeValue).trim();
      if(!raw || raw.length>120) return;
      const key=raw;
      if(T[key] && T[key][lang]){
        if(!original.has(n)) original.set(n,n.nodeValue);
        const leading=n.nodeValue.match(/^\s*/)?.[0]||'';
        const trailing=n.nodeValue.match(/\s*$/)?.[0]||'';
        n.nodeValue=leading+T[key][lang]+trailing;
      }
    });
    document.documentElement.lang=lang;
    document.documentElement.dir=LANGS[lang].dir;
  }
  function addLanguageSelector(){
    if(document.querySelector('.site-language')) return;
    const box=document.createElement('div');
    box.className='site-language';
    box.innerHTML='<span>🌐</span><select aria-label="Language"><option value="bn">বাংলা</option><option value="en">English</option><option value="ar">العربية</option><option value="hi">हिन्दी</option><option value="ur">اردو</option></select>';
    const header=document.querySelector('header .nav') || document.querySelector('header');
    if(header) header.appendChild(box); else document.body.appendChild(box);
    const select=box.querySelector('select');
    const saved=localStorage.getItem('wbub-language') || 'bn';
    select.value=LANGS[saved]?saved:'bn';
    select.addEventListener('change',()=>{
      const lang=select.value;
      localStorage.setItem('wbub-language',lang);
      translateText(document.body,lang);
      select.value=lang;
    });
    translateText(document.body,select.value);
  }
  const nav=document.querySelector('header .nav nav');
  let button=document.querySelector('header .menu-btn');
  if(nav&&!button){
    button=document.createElement('button');
    button.className='menu-btn';
    button.innerHTML='☰ <span>মেনু</span>';
    button.setAttribute('aria-label','নেভিগেশন মেনু খুলুন');
    nav.parentElement.append(button);
  }
  if(nav&&button){
    button.type='button';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','primary-navigation');nav.id='primary-navigation';
    button.addEventListener('click',()=>{const isOpen=nav.classList.toggle('open');button.setAttribute('aria-expanded',String(isOpen));});
    nav.querySelectorAll('a').forEach(link=>{
      try{if(new URL(link.href).pathname===location.pathname)link.setAttribute('aria-current','page');}catch(_){}
      link.addEventListener('click',()=>{nav.classList.remove('open');button.setAttribute('aria-expanded','false');});
    });
  }
  addLanguageSelector();
})();