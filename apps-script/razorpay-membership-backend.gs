/*
 * WBUB Razorpay Membership Payment Backend
 * IMPORTANT:
 * 1) Paste this file into the SAME Google Apps Script project as Code.gs.
 * 2) Do NOT put the Razorpay secret in GitHub or HTML.
 * 3) Set Script Properties:
 *      RAZORPAY_KEY_ID
 *      RAZORPAY_KEY_SECRET
 * 4) Add these routes to doPost(e):
 *      if (action === 'razorpay_create_order') return json_(wbubRazorpayCreateOrder_(p));
 *      if (action === 'razorpay_verify_payment') return json_(wbubRazorpayVerifyPayment_(p));
 *
 * The webhook helper is optional. Apps Script web-app doPost does not expose
 * arbitrary HTTP headers, so Razorpay's X-Razorpay-Signature cannot be checked
 * directly here. If you use the webhook route, this code treats the webhook as
 * an untrusted trigger and re-checks the order/payment against Razorpay's API
 * before changing the member record.
 *
 * Amount is fixed server-side at ₹500 (50000 paise). The browser cannot choose it.
 */

function wbubRazorpayProps_() {
  var p = PropertiesService.getScriptProperties();
  var keyId = String(p.getProperty('RAZORPAY_KEY_ID') || '').trim();
  var secret = String(p.getProperty('RAZORPAY_KEY_SECRET') || '').trim();
  if (!keyId || !secret) throw new Error('RAZORPAY_KEYS_NOT_CONFIGURED');
  return {keyId:keyId, secret:secret};
}

function wbubRazorpayJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function wbubRazorpayAuth_(cfg) {
  return 'Basic ' + Utilities.base64Encode(cfg.keyId + ':' + cfg.secret);
}

function wbubRazorpayApi_(method, path, payload, cfg) {
  var opt = {
    method: method,
    headers: {Authorization: wbubRazorpayAuth_(cfg)},
    muteHttpExceptions: true
  };
  if (payload !== undefined && payload !== null) {
    opt.contentType = 'application/json';
    opt.payload = JSON.stringify(payload);
  }
  var r = UrlFetchApp.fetch('https://api.razorpay.com/v1' + path, opt);
  var code = r.getResponseCode();
  var text = r.getContentText();
  var data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (_) {}
  if (code < 200 || code >= 300) {
    throw new Error('RAZORPAY_API_' + code + ':' + String(data.error && (data.error.description || data.error.code) || text).slice(0,240));
  }
  return data;
}

function wbubRazorpaySheet_() {
  if (typeof getSheet_ === 'function') return getSheet_();
  if (typeof sheet_ === 'function') return sheet_();
  var id = PropertiesService.getScriptProperties().getProperty('DATABASE_SHEET_ID');
  if (!id) throw new Error('DATABASE_SHEET_ID_NOT_SET');
  var ss = SpreadsheetApp.openById(id);
  var sh = ss.getSheetByName('Applications');
  if (!sh) throw new Error('Applications sheet not found');
  return sh;
}

function wbubRazorpayMap_(sh) {
  var h = sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
  var m = {};
  h.forEach(function(v,i){m[String(v||'').trim().toLowerCase().replace(/[^a-z0-9_]+/g,'_')]=i+1;});
  return m;
}

function wbubRazorpayEnsureCol_(sh,map,name) {
  var key=String(name).toLowerCase();
  if (map[key]) return map[key];
  var col=sh.getLastColumn()+1;
  sh.getRange(1,col).setValue(name);
  map[key]=col;
  return col;
}

function wbubRazorpayFindApp_(sh, applicationNo) {
  var map=wbubRazorpayMap_(sh);
  var c=map.application_no;
  if(!c) throw new Error('APPLICATION_NO_COLUMN_MISSING');
  var last=sh.getLastRow();
  if(last<2) throw new Error('APPLICATION_NOT_FOUND');
  var vals=sh.getRange(2,c,last-1,1).getDisplayValues();
  var want=String(applicationNo||'').trim();
  for(var i=0;i<vals.length;i++) if(String(vals[i][0]||'').trim()===want) return i+2;
  throw new Error('APPLICATION_NOT_FOUND');
}

function wbubRazorpaySet_(sh,map,row,name,value) {
  var c=wbubRazorpayEnsureCol_(sh,map,name);
  sh.getRange(row,c).setValue(value);
}

function wbubRazorpayCreateOrder_(p) {
  var applicationNo=String(p.application_no||'').trim();
  var mobile=String(p.mobile||'').replace(/\D/g,'').slice(-10);
  if(!applicationNo) throw new Error('APPLICATION_NO_REQUIRED');

  var sh=wbubRazorpaySheet_(), map=wbubRazorpayMap_(sh), row=wbubRazorpayFindApp_(sh,applicationNo);
  var storedMobile=map.mobile?String(sh.getRange(row,map.mobile).getDisplayValue()||'').replace(/\D/g,'').slice(-10):'';
  if(storedMobile && mobile && storedMobile!==mobile) throw new Error('MOBILE_MISMATCH');

  var existingStatus=map.payment_status?String(sh.getRange(row,map.payment_status).getDisplayValue()||'').trim().toUpperCase():'';
  var existingOrder=map.razorpay_order_id?String(sh.getRange(row,map.razorpay_order_id).getDisplayValue()||'').trim():'';
  if(existingStatus==='PAID') {
    var mid=map.wazeen_id?String(sh.getRange(row,map.wazeen_id).getDisplayValue()||'').trim():'';
    if(!mid && map.member_id) mid=String(sh.getRange(row,map.member_id).getDisplayValue()||'').trim();
    return {ok:true,paid:true,application_no:applicationNo,member_id:mid};
  }

  var cfg=wbubRazorpayProps_();
  if(existingOrder) {
    var old=wbubRazorpayApi_('get','/orders/'+encodeURIComponent(existingOrder),null,cfg);
    if(old && old.status==='paid') return wbubRazorpayFinalizeByOrder_(old, null);
    return {ok:true,key_id:cfg.keyId,order_id:old.id,amount:old.amount,currency:old.currency||'INR',application_no:applicationNo};
  }

  var order=wbubRazorpayApi_('post','/orders',{
    amount:50000,currency:'INR',receipt:String(applicationNo).slice(0,40),
    notes:{application_no:applicationNo,member_fee:'annual_500',source:'WBUB_WEBSITE'}
  },cfg);

  wbubRazorpaySet_(sh,map,row,'razorpay_order_id',order.id);
  wbubRazorpaySet_(sh,map,row,'payment_status','PENDING');
  wbubRazorpaySet_(sh,map,row,'fee_amount',500);
  wbubRazorpaySet_(sh,map,row,'currency','INR');
  wbubRazorpaySet_(sh,map,row,'fee_period','annual');
  if(map.updated_at) sh.getRange(row,map.updated_at).setValue(new Date());

  return {ok:true,key_id:cfg.keyId,order_id:order.id,amount:order.amount,currency:order.currency||'INR',application_no:applicationNo};
}

function wbubRazorpayVerifyPayment_(p) {
  var applicationNo=String(p.application_no||'').trim();
  var orderId=String(p.razorpay_order_id||'').trim();
  var paymentId=String(p.razorpay_payment_id||'').trim();
  var signature=String(p.razorpay_signature||'').trim();
  if(!applicationNo||!orderId||!paymentId||!signature) throw new Error('PAYMENT_FIELDS_REQUIRED');

  var sh=wbubRazorpaySheet_(),map=wbubRazorpayMap_(sh),row=wbubRazorpayFindApp_(sh,applicationNo);
  var storedOrder=map.razorpay_order_id?String(sh.getRange(row,map.razorpay_order_id).getDisplayValue()||'').trim():'';
  if(!storedOrder || storedOrder!==orderId) throw new Error('ORDER_MISMATCH');

  var cfg=wbubRazorpayProps_();
  var bytes=Utilities.computeHmacSha256Signature(orderId+'|'+paymentId,cfg.secret);
  var generated=bytes.map(function(b){var n=(b<0?b+256:b).toString(16);return n.length===1?'0'+n:n;}).join('');
  if(generated.toLowerCase()!==signature.toLowerCase()) throw new Error('PAYMENT_SIGNATURE_INVALID');

  var order=wbubRazorpayApi_('get','/orders/'+encodeURIComponent(storedOrder),null,cfg);
  if(String(order.id)!==storedOrder) throw new Error('ORDER_NOT_FOUND');
  if(Number(order.amount)!==50000 || String(order.currency||'INR')!=='INR') throw new Error('PAYMENT_AMOUNT_MISMATCH');
  if(String(order.status||'').toLowerCase()!=='paid') throw new Error('PAYMENT_NOT_CAPTURED');

  var pays=wbubRazorpayApi_('get','/orders/'+encodeURIComponent(storedOrder)+'/payments',null,cfg);
  var items=(pays&&pays.items)||[];
  var payment=null;
  for(var i=0;i<items.length;i++) if(String(items[i].id)===paymentId) {payment=items[i];break;}
  if(!payment) throw new Error('PAYMENT_NOT_FOUND');
  if(String(payment.status||'').toLowerCase()!=='captured' || Number(payment.amount)!==50000) throw new Error('PAYMENT_NOT_CAPTURED');

  return wbubRazorpayFinalizeApplication_(sh,map,row,applicationNo,payment,storedOrder);
}

function wbubRazorpayFinalizeByOrder_(order,payment) {
  var notes=order&&order.notes||{};
  var appNo=String(notes.application_no||order.receipt||'').trim();
  if(!appNo) throw new Error('APPLICATION_NO_IN_ORDER');
  var sh=wbubRazorpaySheet_(),map=wbubRazorpayMap_(sh),row=wbubRazorpayFindApp_(sh,appNo);
  var cfg=wbubRazorpayProps_();
  var pays=wbubRazorpayApi_('get','/orders/'+encodeURIComponent(order.id)+'/payments',null,cfg);
  var items=(pays&&pays.items)||[];
  var paid=payment;
  if(!paid) for(var i=0;i<items.length;i++) if(String(items[i].status||'').toLowerCase()==='captured'){paid=items[i];break;}
  if(!paid || Number(paid.amount)!==50000) throw new Error('WEBHOOK_PAYMENT_NOT_CONFIRMED');
  return wbubRazorpayFinalizeApplication_(sh,map,row,appNo,paid,order.id);
}

function wbubRazorpayFinalizeApplication_(sh,map,row,applicationNo,payment,orderId) {
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    var currentStatus=map.payment_status?String(sh.getRange(row,map.payment_status).getDisplayValue()||'').trim().toUpperCase():'';
    var memberId=map.wazeen_id?String(sh.getRange(row,map.wazeen_id).getDisplayValue()||'').trim():'';
    if(!memberId && map.member_id) memberId=String(sh.getRange(row,map.member_id).getDisplayValue()||'').trim();

    if(!memberId) {
      var last=sh.getLastRow(), cands=[];
      var idCols=[];
      if(map.wazeen_id) idCols.push(map.wazeen_id);
      if(map.member_id) idCols.push(map.member_id);
      idCols.forEach(function(c){
        if(last>1) {
          var vs=sh.getRange(2,c,last-1,1).getDisplayValues();
          vs.forEach(function(a){var s=String(a[0]||'').trim();var m=s.match(/^WBUB\\/\\d{4}\\/(\\d{5})$/);if(m)cands.push(Number(m[1]));});
        }
      });
      var next=(cands.length?Math.max.apply(null,cands):0)+1;
      var year=Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Asia/Kolkata','yyyy');
      memberId='WBUB/'+year+'/'+('00000'+next).slice(-5);
    }

    wbubRazorpaySet_(sh,map,row,'wazeen_id',memberId);
    wbubRazorpaySet_(sh,map,row,'member_id',memberId);
    wbubRazorpaySet_(sh,map,row,'status','APPROVED');
    wbubRazorpaySet_(sh,map,row,'payment_status','PAID');
    wbubRazorpaySet_(sh,map,row,'payment_ref',String(payment.id||''));
    wbubRazorpaySet_(sh,map,row,'razorpay_order_id',String(orderId||payment.order_id||''));
    wbubRazorpaySet_(sh,map,row,'razorpay_payment_id',String(payment.id||''));
    wbubRazorpaySet_(sh,map,row,'payment_date',new Date());
    wbubRazorpaySet_(sh,map,row,'fee_amount',500);
    wbubRazorpaySet_(sh,map,row,'currency','INR');
    wbubRazorpaySet_(sh,map,row,'fee_period','annual');
    if(!map.valid_till) {
      var c=wbubRazorpayEnsureCol_(sh,map,'valid_till');
      var d=new Date();d.setFullYear(d.getFullYear()+1);
      sh.getRange(row,c).setValue(Utilities.formatDate(d,Session.getScriptTimeZone()||'Asia/Kolkata','dd MMM yyyy'));
    }
    if(map.updated_at) sh.getRange(row,map.updated_at).setValue(new Date());
    return {ok:true,application_no:applicationNo,member_id:memberId,payment_id:String(payment.id||''),status:'APPROVED',payment_status:'PAID'};
  } finally {lock.releaseLock();}
}

/*
 * Optional webhook route:
 * if (e && e.parameter && e.parameter.razorpay_webhook === '1') {
 *   return wbubRazorpayWebhook_(e);
 * }
 *
 * Configure Razorpay Webhook URL as:
 * https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?razorpay_webhook=1
 *
 * Because Apps Script web-app doPost does not expose arbitrary HTTP headers,
 * this helper does NOT pretend to validate X-Razorpay-Signature. Instead it
 * uses the webhook only as a trigger and re-queries Razorpay using the secret
 * key before updating the Sheet. For a strict HMAC-verified webhook, use a
 * serverless receiver that can read HTTP headers.
 */
function wbubRazorpayWebhook_(e) {
  var raw=String(e && e.postData && e.postData.contents || '');
  if(!raw) return wbubRazorpayJson_({ok:false,error:'EMPTY_WEBHOOK'});
  var body={};try{body=JSON.parse(raw)}catch(_){return wbubRazorpayJson_({ok:false,error:'INVALID_WEBHOOK_JSON'})}
  var event=String(body.event||'');
  if(event!=='order.paid' && event!=='payment.captured') return wbubRazorpayJson_({ok:true,ignored:true,event:event});
  var entity=event==='order.paid' ? body.payload && body.payload.order && body.payload.order.entity : body.payload && body.payload.payment && body.payload.payment.entity;
  var orderId=String(entity && (entity.order_id||entity.id) || '').trim();
  if(!orderId) return wbubRazorpayJson_({ok:false,error:'ORDER_ID_MISSING'});
  try {
    var cfg=wbubRazorpayProps_();
    var order=wbubRazorpayApi_('get','/orders/'+encodeURIComponent(orderId),null,cfg);
    if(String(order.status||'').toLowerCase()!=='paid' || Number(order.amount)!==50000) throw new Error('ORDER_NOT_PAID');
    var result=wbubRazorpayFinalizeByOrder_(order,null);
    return wbubRazorpayJson_(result);
  } catch(err) {
    return wbubRazorpayJson_({ok:false,error:String(err&&err.message||err)});
  }
}
