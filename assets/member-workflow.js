(() => {
  "use strict";
  window.WBUB_WORKFLOW = {
    API: "https://script.google.com/macros/s/AKfycbw6IzUY7QJfKZ35R3KfIfX0PF8hibUviGvlFN2enHfhGiRJQXjf0yV3nTSaEbMHVNhfYg/exec",
    normalizeMobile(v){return String(v||"").replace(/\D/g,"").replace(/^91/,"").slice(-10)},
    validMobile(v){return /^[6-9]\d{9}$/.test(this.normalizeMobile(v))},
    validEmail(v){return !v||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim())},
    escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))},
    setBusy(b,busy,label){if(!b)return;if(busy){b.dataset.originalText=b.textContent;b.textContent=label||"প্রক্রিয়াকরণ হচ্ছে…"}else if(b.dataset.originalText)b.textContent=b.dataset.originalText;b.disabled=busy},
    showMessage(el,type,msg){if(!el)return;el.className="workflow-message "+type;el.textContent=msg;el.hidden=false},
    hideMessage(el){if(el)el.hidden=true},
    async request(url,options={}){const r=await fetch(url,{cache:"no-store",credentials:"omit",...options});const t=await r.text();let d=null;try{d=t?JSON.parse(t):null}catch(_){}if(!r.ok)throw new Error("NETWORK_HTTP_"+r.status);if(!d)throw new Error("INVALID_API_RESPONSE");return d},
    async submitApplication(payload){return this.request(this.API,{method:"POST",body:JSON.stringify(payload)})},
    async publicVerify(id){return this.request(this.API+"?id="+encodeURIComponent(id))},
    async lookupApplication(no,mobile){return this.request(this.API+"?action=application_status&application_no="+encodeURIComponent(no)+"&mobile="+encodeURIComponent(this.normalizeMobile(mobile)))},
    async lookupMember(no,mobile){return this.request(this.API+"?action=member_profile&application_no="+encodeURIComponent(no)+"&mobile="+encodeURIComponent(this.normalizeMobile(mobile)))}
  };
})();