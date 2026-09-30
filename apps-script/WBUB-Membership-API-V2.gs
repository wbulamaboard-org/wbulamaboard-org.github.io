/**
 * WBUB Membership API V2
 * WAYEJIN E-FURFURA SHARIF / WEST BENGAL ULAMA BOARD
 *
 * Safe parallel backend:
 * - Uses the existing Applications sheet.
 * - Does NOT modify the old Apps Script deployment.
 * - Fixes duplicate PENDING/UNPAID applications by reusing them.
 * - Supports registration, Razorpay, Admin approval/reject,
 *   public verification, application status and profile edit requests.
 *
 * Script Properties required:
 * DATABASE_SHEET_ID
 * RAZORPAY_KEY_ID
 * RAZORPAY_KEY_SECRET
 * WBUB_ADMIN_KEY
 * Optional: PHOTO_FOLDER_ID
 */

var WBUB_YOUTH_HEADERS = ['youth_id','status','created_at','updated_at','name','mobile','whatsapp','age','district','block','education','profession','interests','address','photo_url','fee_amount','payment_status','transaction_id','payment_date'];

var WBUB_BASE_HEADERS = [
  'application_no','wazeen_id','member_id','status','created_at','updated_at',
  'name','father','mobile','whatsapp','district','block','area','address',
  'education','institution','religion','experience','designation',
  'password_hash','payment_ref','fee_amount','currency','fee_period',
  'payment_status','razorpay_order_id','razorpay_payment_id','payment_date',
  'valid_till','photo_url','approved_at','approved_by'
];

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    var action = String(p.action || '').trim().toLowerCase();

    // Public photo archive endpoint: ?album=all|conference|events|social|board|2026
    // Uses PHOTO_FOLDER_ID when configured; otherwise looks for "WBUB PHOTO ARCHIVE".
    if (action === 'photo_archive' || Object.prototype.hasOwnProperty.call(p,'album')) {
      return wbubPhotoArchive_(String(p.album || 'all').trim().toLowerCase());
    }

    if (action === 'youth_profile') {
      return wbubYouthProfile_(String(p.youth_id || p.id || '').trim());
    }

    if (action === 'verify' || action === 'member_profile' || p.id) {
      var id = String(p.id || p.member_id || '').trim();
    if (action === 'member_profile' && !id) {
        return wbubJson_({ok:false,found:false,error:'MEMBER_ID_REQUIRED'});
      }
      return wbubVerify_(id);
    }

    if (action === 'application_status' || action === 'status' || p.application_no) {
      return wbubApplicationStatus_(String(p.application_no || '').trim(), String(p.mobile || ''));
    }

    return wbubJson_({ok:true,service:'WBUB Membership API V2',status:'online'});
  } catch (err) {
    return wbubJson_({ok:false,error:String(err.message || err)});
  }
}

function doPost(e) {
  try {
    var p = wbubParsePost_(e);
    var action = String(p.action || '').trim().toLowerCase();

    if (action === 'register') return wbubRegister_(p);
    if (action === 'youth_register') return wbubYouthRegister_(p);
    if (action === 'youth_profile') return wbubYouthProfile_(String(p.youth_id || p.id || '').trim());
    if (action === 'razorpay_create_order') return wbubRazorpayCreateOrder_(p);
    if (action === 'razorpay_verify_payment') return wbubRazorpayVerifyPayment_(p);

    if (action === 'pending') {
      wbubRequireAdmin_(p);
      return wbubPending_();
    }
    if (action === 'approve') {
      wbubRequireAdmin_(p);
      return wbubApprove_(p);
    }
    if (action === 'reject') {
      wbubRequireAdmin_(p);
      return wbubReject_(p);
    }

    if (action === 'member_edit_request') return wbubMemberEditRequest_(p);
    if (action === 'member_edit_pending') {
      wbubRequireAdmin_(p);
      return wbubMemberEditPending_();
    }
    if (action === 'member_edit_approve') {
      wbubRequireAdmin_(p);
      return wbubMemberEditApprove_(p);
    }
    if (action === 'member_edit_reject') {
      wbubRequireAdmin_(p);
      return wbubMemberEditReject_(p);
    }

    return wbubJson_({ok:false,error:'UNSUPPORTED_ACTION',message:'Unsupported action: '+action});
  } catch (err) {
    return wbubJson_({ok:false,error:String(err.message || err)});
  }
}

function wbubProps_() {
  var p = PropertiesService.getScriptProperties();
  return {
    sheetId:String(p.getProperty('DATABASE_SHEET_ID') || '').trim(),
    keyId:String(p.getProperty('RAZORPAY_KEY_ID') || '').trim(),
    secret:String(p.getProperty('RAZORPAY_KEY_SECRET') || '').trim(),
    adminKey:String(p.getProperty('WBUB_ADMIN_KEY') || '').trim(),
    photoFolderId:String(p.getProperty('PHOTO_FOLDER_ID') || '').trim()
  };
}

function wbubSheet_() {
  var cfg = wbubProps_();
  if (!cfg.sheetId) throw new Error('DATABASE_SHEET_ID_NOT_SET');
  var ss = SpreadsheetApp.openById(cfg.sheetId);
  var sh = ss.getSheetByName('Applications') || ss.insertSheet('Applications');
  wbubEnsureHeaders_(sh);
  return sh;
}

function wbubEnsureHeaders_(sh) {
  var current = sh.getLastColumn() ? sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0] : [];
  var norm = current.map(function(x){return String(x||'').trim().toLowerCase();});
  WBUB_BASE_HEADERS.forEach(function(h) {
    if (norm.indexOf(h.toLowerCase()) < 0) {
      sh.getRange(1,sh.getLastColumn()+1).setValue(h);
      norm.push(h.toLowerCase());
    }
  });
}

function wbubMap_(sh) {
  var h = sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
  var m = {};
  h.forEach(function(v,i) {
    var k=String(v||'').trim().toLowerCase().replace(/[^a-z0-9_]+/g,'_');
    if(k) m[k]=i+1;
  });
  return m;
}

function wbubSet_(sh,map,row,key,value) {
  if (!map[key]) {
    var c=sh.getLastColumn()+1;
    sh.getRange(1,c).setValue(key);
    map[key]=c;
  }
  sh.getRange(row,map[key]).setValue(value);
}

function wbubGet_(sh,map,row,key) {
  return map[key] ? String(sh.getRange(row,map[key]).getDisplayValue() || '').trim() : '';
}

function wbubRows_(sh,map) {
  var last=sh.getLastRow();
  if(last<2) return [];
  var vals=sh.getRange(2,1,last-1,sh.getLastColumn()).getDisplayValues();
  var keys=Object.keys(map);
  return vals.map(function(row,i) {
    var o={};
    keys.forEach(function(k){o[k]=map[k] ? row[map[k]-1] : '';});
    o._row=i+2;
    return o;
  });
}

function wbubNormalizeMobile_(v) {
  return String(v||'').replace(/\D/g,'').replace(/^91/,'').slice(-10);
}

function wbubApplicationNo_(sh,map) {
  var max=0, last=sh.getLastRow();
  if(last>1 && map.application_no) {
    sh.getRange(2,map.application_no,last-1,1).getDisplayValues().forEach(function(a){
      var n=parseInt(String(a[0]||'').replace(/\D/g,''),10);
      if(!isNaN(n) && n>max) max=n;
    });
  }
  return String(max+1).padStart(8,'0');
}

function wbubFindRowByApplication_(sh,map,no) {
  var want=String(no||'').trim();
  var last=sh.getLastRow();
  if(last<2 || !map.application_no) return 0;
  var vals=sh.getRange(2,map.application_no,last-1,1).getDisplayValues();
  for(var i=0;i<vals.length;i++) if(String(vals[i][0]||'').trim()===want) return i+2;
  return 0;
}

function wbubFindMobile_(sh,map,mobile) {
  var want=wbubNormalizeMobile_(mobile), last=sh.getLastRow();
  if(last<2 || !map.mobile) return [];
  var vals=sh.getRange(2,map.mobile,last-1,1).getDisplayValues(), out=[];
  for(var i=0;i<vals.length;i++) {
    if(wbubNormalizeMobile_(vals[i][0])===want) out.push(i+2);
  }
  return out;
}

function wbubRegister_(p) {
  var mobile=wbubNormalizeMobile_(p.mobile);
  if(!/^[6-9]\d{9}$/.test(mobile)) throw new Error('INVALID_MOBILE');

  var sh=wbubSheet_(), map=wbubMap_(sh);
  var rows=wbubFindMobile_(sh,map,mobile);

  // Critical duplicate rule:
  // APPROVED/PAID blocks a new membership.
  // PENDING/UNPAID reuses the existing application.
  for(var i=rows.length-1;i>=0;i--) {
    var r=rows[i];
    var status=wbubGet_(sh,map,r,'status').toUpperCase();
    var pay=wbubGet_(sh,map,r,'payment_status').toUpperCase();
    if(status==='APPROVED' || pay==='PAID') {
      return wbubJson_({
        ok:false,error:'ACTIVE_MEMBERSHIP_EXISTS',
        message:'এই মোবাইল নম্বরে একটি Approved/Paid membership ইতিমধ্যে আছে।',
        application_no:wbubGet_(sh,map,r,'application_no'),
        member_id:wbubGet_(sh,map,r,'member_id') || wbubGet_(sh,map,r,'wazeen_id')
      });
    }
    if(status==='PENDING' || !pay || pay==='PENDING' || pay==='UNPAID') {
      wbubUpdateApplication_(sh,map,r,p);
      return wbubJson_({
        ok:true,reused:true,
        application_no:wbubGet_(sh,map,r,'application_no'),
        status:wbubGet_(sh,map,r,'status') || 'PENDING',
        payment_status:wbubGet_(sh,map,r,'payment_status') || 'UNPAID'
      });
    }
  }

  var row=sh.getLastRow()+1;
  var app=wbubApplicationNo_(sh,map);
  wbubUpdateApplication_(sh,map,row,p);
  wbubSet_(sh,map,row,'application_no',app);
  wbubSet_(sh,map,row,'status','PENDING');
  wbubSet_(sh,map,row,'payment_status','UNPAID');
  wbubSet_(sh,map,row,'created_at',new Date());
  wbubSet_(sh,map,row,'updated_at',new Date());
  return wbubJson_({ok:true,reused:false,application_no:app,status:'PENDING',payment_status:'UNPAID'});
}

function wbubUpdateApplication_(sh,map,row,p) {
  var fields=['name','father','mobile','whatsapp','district','block','area','address',
    'education','institution','religion','experience','designation'];
  fields.forEach(function(k){if(p[k]!==undefined) wbubSet_(sh,map,row,k,String(p[k]||'').trim());});
  if(p.email!==undefined) wbubSet_(sh,map,row,'email',String(p.email||'').trim());
  if(p.dob!==undefined) wbubSet_(sh,map,row,'dob',String(p.dob||'').trim());
  if(p.password) wbubSet_(sh,map,row,'password_hash',wbubHash_(String(p.password)));
  wbubSet_(sh,map,row,'fee_amount',500);
  wbubSet_(sh,map,row,'currency','INR');
  wbubSet_(sh,map,row,'fee_period','annual');
  if(!wbubGet_(sh,map,row,'payment_status')) wbubSet_(sh,map,row,'payment_status','UNPAID');
  if(p.payment_ref) wbubSet_(sh,map,row,'payment_ref',String(p.payment_ref).trim());
  if(p.photo_upload) {
    var url=wbubSavePhoto_(p.photo_upload,p.name||'member');
    if(url) wbubSet_(sh,map,row,'photo_url',url);
  }
  wbubSet_(sh,map,row,'updated_at',new Date());
}

function wbubHash_(s) {
  var b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s,Utilities.Charset.UTF_8);
  return b.map(function(x){var n=x<0?x+256:x;return ('0'+n.toString(16)).slice(-2);}).join('');
}

function wbubSavePhoto_(data,name) {
  var cfg=wbubProps_();
  try {
    var folder=null;
    if(cfg.photoFolderId) {
      folder=DriveApp.getFolderById(cfg.photoFolderId);
    } else {
      var folders=DriveApp.getFoldersByName('WBUB Youth Photos');
      folder=folders.hasNext()?folders.next():DriveApp.createFolder('WBUB Youth Photos');
    }
    var s=String(data||'');
    var m=s.match(/^data:([^;]+);base64,(.+)$/);
    if(!m) return '';
    var bytes=Utilities.base64Decode(m[2]);
    var safe=String(name||'member').replace(/[^a-zA-Z0-9_-]/g,'_');
    var blob=Utilities.newBlob(bytes,m[1],safe+'-'+Date.now()+'.jpg');
    return folder.createFile(blob).getUrl();
  } catch(e) { return ''; }
}

function wbubRazorpayCfg_() {
  var c=wbubProps_();
  if(!c.keyId || !c.secret) throw new Error('RAZORPAY_KEYS_NOT_CONFIGURED');
  return c;
}

function wbubRazorpayApi_(method,path,payload,cfg) {
  var opt={method:method,headers:{Authorization:'Basic '+Utilities.base64Encode(cfg.keyId+':'+cfg.secret)},muteHttpExceptions:true};
  if(payload!==undefined){opt.contentType='application/json';opt.payload=JSON.stringify(payload);}
  var r=UrlFetchApp.fetch('https://api.razorpay.com/v1'+path,opt);
  var code=r.getResponseCode(), text=r.getContentText(), d={};
  try{d=text?JSON.parse(text):{};}catch(_){}
  if(code<200||code>=300) throw new Error('RAZORPAY_API_'+code+':'+String(d.error&&(d.error.description||d.error.code)||text).slice(0,240));
  return d;
}

function wbubRazorpayCreateOrder_(p) {
  var app=String(p.application_no||'').trim(), mobile=wbubNormalizeMobile_(p.mobile);
  if(!app) throw new Error('APPLICATION_NO_REQUIRED');
  var sh=wbubSheet_(),map=wbubMap_(sh),row=wbubFindRowByApplication_(sh,map,app);
  if(!row) throw new Error('APPLICATION_NOT_FOUND');
  var stored=wbubNormalizeMobile_(wbubGet_(sh,map,row,'mobile'));
  if(stored && mobile && stored!==mobile) throw new Error('MOBILE_MISMATCH');

  var pay=wbubGet_(sh,map,row,'payment_status').toUpperCase();
  var member=wbubGet_(sh,map,row,'member_id')||wbubGet_(sh,map,row,'wazeen_id');
  if(pay==='PAID' && member) return wbubJson_({ok:true,paid:true,application_no:app,member_id:member});

  var existing=wbubGet_(sh,map,row,'razorpay_order_id');
  var cfg=wbubRazorpayCfg_();
  if(existing) {
    var old=wbubRazorpayApi_('get','/orders/'+encodeURIComponent(existing),null,cfg);
    if(String(old.status).toLowerCase()==='paid') return wbubFinalizeByOrder_(old);
    return wbubJson_({ok:true,key_id:cfg.keyId,order_id:old.id,amount:old.amount,currency:old.currency||'INR',application_no:app});
  }

  var order=wbubRazorpayApi_('post','/orders',{
    amount:50000,currency:'INR',receipt:app.slice(0,40),
    notes:{application_no:app,member_fee:'annual_500',source:'WBUB_WEBSITE_V2'}
  },cfg);
  wbubSet_(sh,map,row,'razorpay_order_id',order.id);
  wbubSet_(sh,map,row,'payment_status','PENDING');
  wbubSet_(sh,map,row,'fee_amount',500);
  wbubSet_(sh,map,row,'currency','INR');
  wbubSet_(sh,map,row,'fee_period','annual');
  wbubSet_(sh,map,row,'updated_at',new Date());
  return wbubJson_({ok:true,key_id:cfg.keyId,order_id:order.id,amount:order.amount,currency:order.currency||'INR',application_no:app});
}

function wbubRazorpayVerifyPayment_(p) {
  var app=String(p.application_no||'').trim(), orderId=String(p.razorpay_order_id||'').trim();
  var paymentId=String(p.razorpay_payment_id||'').trim(), sig=String(p.razorpay_signature||'').trim();
  if(!app||!orderId||!paymentId||!sig) throw new Error('PAYMENT_FIELDS_REQUIRED');
  var sh=wbubSheet_(),map=wbubMap_(sh),row=wbubFindRowByApplication_(sh,map,app);
  if(!row) throw new Error('APPLICATION_NOT_FOUND');
  if(wbubGet_(sh,map,row,'razorpay_order_id')!==orderId) throw new Error('ORDER_MISMATCH');

  var cfg=wbubRazorpayCfg_();
  var bytes=Utilities.computeHmacSha256Signature(orderId+'|'+paymentId,cfg.secret);
  var hex=bytes.map(function(b){var n=b<0?b+256:b;return ('0'+n.toString(16)).slice(-2);}).join('');
  if(hex.toLowerCase()!==sig.toLowerCase()) throw new Error('PAYMENT_SIGNATURE_INVALID');

  var order=wbubRazorpayApi_('get','/orders/'+encodeURIComponent(orderId),null,cfg);
  if(Number(order.amount)!==50000 || String(order.currency||'INR')!=='INR') throw new Error('PAYMENT_AMOUNT_MISMATCH');
  if(String(order.status||'').toLowerCase()!=='paid') throw new Error('PAYMENT_NOT_CAPTURED');

  var pays=wbubRazorpayApi_('get','/orders/'+encodeURIComponent(orderId)+'/payments',null,cfg);
  var items=(pays&&pays.items)||[], payment=null;
  for(var i=0;i<items.length;i++) if(String(items[i].id)===paymentId){payment=items[i];break;}
  if(!payment || String(payment.status||'').toLowerCase()!=='captured' || Number(payment.amount)!==50000) throw new Error('PAYMENT_NOT_CAPTURED');

  return wbubFinalizeApplication_(sh,map,row,app,payment,orderId);
}

function wbubNextMemberId_(sh,map) {
  var max=0,last=sh.getLastRow();
  ['member_id','wazeen_id'].forEach(function(k){
    if(!map[k]||last<2)return;
    sh.getRange(2,map[k],last-1,1).getDisplayValues().forEach(function(a){
      var m=String(a[0]||'').match(/^WBUB\/\d{4}\/(\d{5})$/);
      if(m)max=Math.max(max,Number(m[1]));
    });
  });
  var year=Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Asia/Kolkata','yyyy');
  return 'WBUB/'+year+'/'+String(max+1).padStart(5,'0');
}

function wbubFinalizeApplication_(sh,map,row,app,payment,orderId) {
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    var member=wbubGet_(sh,map,row,'member_id')||wbubGet_(sh,map,row,'wazeen_id');
    if(!member) member=wbubNextMemberId_(sh,map);
    wbubSet_(sh,map,row,'member_id',member);
    wbubSet_(sh,map,row,'wazeen_id',member);
    wbubSet_(sh,map,row,'status','APPROVED');
    wbubSet_(sh,map,row,'payment_status','PAID');
    wbubSet_(sh,map,row,'payment_ref',String(payment.id||''));
    wbubSet_(sh,map,row,'razorpay_order_id',String(orderId||payment.order_id||''));
    wbubSet_(sh,map,row,'razorpay_payment_id',String(payment.id||''));
    wbubSet_(sh,map,row,'payment_date',new Date());
    wbubSet_(sh,map,row,'fee_amount',500);
    wbubSet_(sh,map,row,'currency','INR');
    wbubSet_(sh,map,row,'fee_period','annual');
    if(!wbubGet_(sh,map,row,'valid_till')) {
      var d=new Date();d.setFullYear(d.getFullYear()+1);
      wbubSet_(sh,map,row,'valid_till',Utilities.formatDate(d,Session.getScriptTimeZone()||'Asia/Kolkata','dd MMM yyyy'));
    }
    wbubSet_(sh,map,row,'approved_at',new Date());
    wbubSet_(sh,map,row,'approved_by','Razorpay');
    wbubSet_(sh,map,row,'updated_at',new Date());
    return wbubJson_({ok:true,application_no:app,member_id:member,payment_id:String(payment.id||''),status:'APPROVED',payment_status:'PAID'});
  } finally {lock.releaseLock();}
}

function wbubFinalizeByOrder_(order) {
  var app=String(order.notes&&order.notes.application_no||order.receipt||'').trim();
  if(!app) throw new Error('APPLICATION_NO_IN_ORDER');
  var cfg=wbubRazorpayCfg_();
  var pays=wbubRazorpayApi_('get','/orders/'+encodeURIComponent(order.id)+'/payments',null,cfg);
  var items=(pays&&pays.items)||[], payment=null;
  for(var i=0;i<items.length;i++) if(String(items[i].status).toLowerCase()==='captured'){payment=items[i];break;}
  if(!payment) throw new Error('PAYMENT_NOT_CONFIRMED');
  var sh=wbubSheet_(),map=wbubMap_(sh),row=wbubFindRowByApplication_(sh,map,app);
  if(!row) throw new Error('APPLICATION_NOT_FOUND');
  return wbubFinalizeApplication_(sh,map,row,app,payment,order.id);
}

function wbubPending_() {
  var sh=wbubSheet_(),map=wbubMap_(sh);
  var rows=wbubRows_(sh,map).filter(function(r){return String(r.status||'').toUpperCase()==='PENDING';});
  return wbubJson_({ok:true,records:rows});
}

function wbubApprove_(p) {
  var sh=wbubSheet_(),map=wbubMap_(sh),row=wbubFindRowByApplication_(sh,map,String(p.application_no||''));
  if(!row) throw new Error('APPLICATION_NOT_FOUND');
  var member=wbubGet_(sh,map,row,'member_id')||wbubGet_(sh,map,row,'wazeen_id');
  if(!member) member=wbubNextMemberId_(sh,map);
  wbubSet_(sh,map,row,'member_id',member);wbubSet_(sh,map,row,'wazeen_id',member);
  wbubSet_(sh,map,row,'status','APPROVED');wbubSet_(sh,map,row,'approved_at',new Date());
  wbubSet_(sh,map,row,'approved_by','Admin');wbubSet_(sh,map,row,'updated_at',new Date());
  if(!wbubGet_(sh,map,row,'valid_till')){var d=new Date();d.setFullYear(d.getFullYear()+1);wbubSet_(sh,map,row,'valid_till',Utilities.formatDate(d,Session.getScriptTimeZone()||'Asia/Kolkata','dd MMM yyyy'));}
  return wbubJson_({ok:true,application_no:p.application_no,member_id:member,status:'APPROVED'});
}

function wbubReject_(p) {
  var sh=wbubSheet_(),map=wbubMap_(sh),row=wbubFindRowByApplication_(sh,map,String(p.application_no||''));
  if(!row) throw new Error('APPLICATION_NOT_FOUND');
  wbubSet_(sh,map,row,'status','REJECTED');wbubSet_(sh,map,row,'updated_at',new Date());
  return wbubJson_({ok:true,application_no:p.application_no,status:'REJECTED'});
}

function wbubVerify_(id) {
  var sh=wbubSheet_(),map=wbubMap_(sh),want=String(id||'').trim().toUpperCase().replace(/\s/g,'');
  if(!want) return wbubJson_({ok:true,found:false,record:null});
  var rows=wbubRows_(sh,map);
  for(var i=0;i<rows.length;i++){
    var mid=String(rows[i].member_id||rows[i].wazeen_id||'').trim().toUpperCase().replace(/\s/g,'');
    if(mid===want && String(rows[i].status||'').toUpperCase()==='APPROVED') {
      delete rows[i]._row;
      return wbubJson_({ok:true,found:true,record:rows[i]});
    }
  }
  return wbubJson_({ok:true,found:false,record:null});
}

function wbubApplicationStatus_(no,mobile) {
  var sh=wbubSheet_(),map=wbubMap_(sh),row=wbubFindRowByApplication_(sh,map,no);
  if(!row) return wbubJson_({ok:true,found:false,record:null});
  var stored=wbubNormalizeMobile_(wbubGet_(sh,map,row,'mobile'));
  if(mobile && stored!==wbubNormalizeMobile_(mobile)) return wbubJson_({ok:true,found:false,record:null});
  var r=wbubRows_(sh,map).filter(function(x){return x._row===row;})[0]||{};
  delete r._row;
  return wbubJson_({ok:true,found:true,record:r});
}

function wbubRequireAdmin_(p) {
  var expected=wbubProps_().adminKey;
  if(!expected || String(p.admin_key||'')!==expected) throw new Error('INVALID_ADMIN_KEY');
}

function wbubMemberEditRequest_(p) {
  var sh=wbubSheet_(),map=wbubMap_(sh),member=String(p.member_id||'').trim();
  if(!member) throw new Error('MEMBER_ID_REQUIRED');
  var rows=wbubRows_(sh,map),row=0;
  for(var i=0;i<rows.length;i++){
    var mid=String(rows[i].member_id||rows[i].wazeen_id||'').trim().toUpperCase();
    if(mid===member.toUpperCase() && String(rows[i].status||'').toUpperCase()==='APPROVED'){row=rows[i]._row;break;}
  }
  if(!row) throw new Error('APPROVED_MEMBER_NOT_FOUND');

  var reqSheet=SpreadsheetApp.openById(wbubProps_().sheetId).getSheetByName('ProfileEdits') ||
    SpreadsheetApp.openById(wbubProps_().sheetId).insertSheet('ProfileEdits');
  var headers=['request_id','created_at','status','member_id','mobile','name','designation','district','block','validity','address','photo_url','reason'];
  var existing=reqSheet.getLastColumn()?reqSheet.getRange(1,1,1,reqSheet.getLastColumn()).getDisplayValues()[0]:[];
  headers.forEach(function(h){if(existing.indexOf(h)<0)reqSheet.getRange(1,reqSheet.getLastColumn()+1).setValue(h);});
  var rid='EDIT-'+Date.now();
  var photo=wbubSavePhoto_(p.photo_upload,p.name||member);
  var vals=[rid,new Date(),'PENDING',member,p.mobile||'',p.name||'',p.designation||'',p.district||'',p.block||'',p.validity||'',p.address||'',photo,''];
  reqSheet.getRange(reqSheet.getLastRow()+1,1,1,vals.length).setValues([vals]);
  return wbubJson_({ok:true,request_id:rid,status:'PENDING'});
}

function wbubMemberEditPending_() {
  var ss=SpreadsheetApp.openById(wbubProps_().sheetId),sh=ss.getSheetByName('ProfileEdits');
  if(!sh||sh.getLastRow()<2)return wbubJson_({ok:true,records:[]});
  var h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0], rows=sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getDisplayValues();
  var out=[];
  rows.forEach(function(a){var o={};h.forEach(function(k,i){o[String(k).trim()]=a[i]||'';});if(String(o.status).toUpperCase()==='PENDING'){
    var app=wbubFindMemberRecord_(o.member_id);o.current_summary=app?('Name: '+app.name+'\nDesignation: '+app.designation+'\nDistrict: '+app.district+'\nBlock: '+(app.block||app.area)+'\nValidity: '+(app.valid_till||'')+'\nAddress: '+app.address):'—';
    o.request_summary='Name: '+o.name+'\nDesignation: '+o.designation+'\nDistrict: '+o.district+'\nBlock: '+o.block+'\nValidity: '+o.validity+'\nAddress: '+o.address;
    out.push(o);
  }});
  return wbubJson_({ok:true,records:out});
}

function wbubFindMemberRecord_(member) {
  var sh=wbubSheet_(),map=wbubMap_(sh),rows=wbubRows_(sh,map),want=String(member||'').trim().toUpperCase();
  for(var i=0;i<rows.length;i++){var mid=String(rows[i].member_id||rows[i].wazeen_id||'').trim().toUpperCase();if(mid===want){delete rows[i]._row;return rows[i];}}
  return null;
}

function wbubMemberEditApprove_(p) {
  return wbubMemberEditDecision_(p,'APPROVED');
}
function wbubMemberEditReject_(p) {
  return wbubMemberEditDecision_(p,'REJECTED');
}
function wbubMemberEditDecision_(p,newStatus) {
  var ss=SpreadsheetApp.openById(wbubProps_().sheetId),sh=ss.getSheetByName('ProfileEdits');
  if(!sh||sh.getLastRow()<2)throw new Error('PROFILE_EDIT_NOT_FOUND');
  var h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0],map={};h.forEach(function(k,i){map[String(k).trim()]=i+1;});
  var rid=String(p.request_id||'').trim(),row=0;
  for(var r=2;r<=sh.getLastRow();r++)if(String(sh.getRange(r,map.request_id).getDisplayValue()||'').trim()===rid){row=r;break;}
  if(!row)throw new Error('PROFILE_EDIT_NOT_FOUND');
  if(String(sh.getRange(row,map.status).getDisplayValue()||'').toUpperCase()!=='PENDING')throw new Error('PROFILE_EDIT_ALREADY_PROCESSED');

  if(newStatus==='APPROVED'){
    var app=wbubFindMemberRecord_(String(sh.getRange(row,map.member_id).getDisplayValue()||''));
    if(!app)throw new Error('MEMBER_NOT_FOUND');
    var main=wbubSheet_(),mm=wbubMap_(main),mr=wbubFindMemberRow_(main,mm,String(sh.getRange(row,map.member_id).getDisplayValue()||''));
    if(!mr)throw new Error('MEMBER_NOT_FOUND');
    ['name','designation','district','block','validity','address'].forEach(function(k){
      var c=map[k],v=c?sh.getRange(row,c).getDisplayValue():'';
      if(k==='validity')wbubSet_(main,mm,mr,'valid_till',v);else wbubSet_(main,mm,mr,k,v);
    });
    var ph=map.photo_url?String(sh.getRange(row,map.photo_url).getDisplayValue()||''):'';
    if(ph)wbubSet_(main,mm,mr,'photo_url',ph);
    wbubSet_(main,mm,mr,'updated_at',new Date());
  }
  sh.getRange(row,map.status).setValue(newStatus);
  if(map.reason&&p.reason)sh.getRange(row,map.reason).setValue(String(p.reason));
  return wbubJson_({ok:true,request_id:rid,status:newStatus});
}

function wbubFindMemberRow_(sh,map,member) {
  var want=String(member||'').trim().toUpperCase(),last=sh.getLastRow();
  for(var r=2;r<=last;r++){
    var mid=String((map.member_id?sh.getRange(r,map.member_id).getDisplayValue():'') || (map.wazeen_id?sh.getRange(r,map.wazeen_id).getDisplayValue():'')).trim().toUpperCase();
    if(mid===want)return r;
  }
  return 0;
}

function wbubParsePost_(e) {
  var out={};
  if(e&&e.postData&&e.postData.contents){
    var raw=String(e.postData.contents||'');
    try { var j=JSON.parse(raw); if(j&&typeof j==='object')return j; } catch(_){}
    try {
      raw.split('&').forEach(function(part){
        var kv=part.split('='),k=decodeURIComponent(kv.shift()||''),v=decodeURIComponent(kv.join('=')||'').replace(/\+/g,' ');
        if(k)out[k]=v;
      });
    } catch(_){}
  }
  if(e&&e.parameter)Object.keys(e.parameter).forEach(function(k){if(out[k]===undefined)out[k]=e.parameter[k];});
  return out;
}

function wbubJson_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}


function wbubPhotoArchiveFolder_() {
  var cfg=wbubProps_();
  if(cfg.photoFolderId) return DriveApp.getFolderById(cfg.photoFolderId);
  // Main public Photo Archive folder supplied for the website.
  return DriveApp.getFolderById('15wBDUmaWkjt_C-ixRDuD-Rq54cZ5NqE5');
  var folders=DriveApp.getFoldersByName('WBUB PHOTO ARCHIVE');
  if(folders.hasNext()) return folders.next();
  // Backward-compatible fallback for an older folder name.
  folders=DriveApp.getFoldersByName('WBUB PHOTO ARCHIVE');
  if(folders.hasNext()) return folders.next();
  throw new Error('PHOTO_ARCHIVE_FOLDER_NOT_FOUND');
}

function wbubPhotoAlbumFolder_(root,album) {
  if(!album || album==='all') return root;
  var names={
    conference:['conference','উলামা সম্মেলন'],
    events:['events','মাহফিল ও অনুষ্ঠান'],
    social:['social','সমাজসেবা'],
    board:['board','উলামা বোর্ড'],
    '2026':['2026','২০২৬']
  };
  var list=names[album]||[];
  for(var i=0;i<list.length;i++){
    var it=root.getFoldersByName(list[i]);
    if(it.hasNext()) return it.next();
  }
  return root;
}

function wbubCollectPhotoFiles_(folder, files, seenFolders) {
  var folderId=folder.getId();
  if(seenFolders[folderId]) return;
  seenFolders[folderId]=true;

  var it=folder.getFiles();
  while(it.hasNext()){
    var file=it.next(), mime=String(file.getMimeType()||'').toLowerCase();
    if(mime.indexOf('image/')!==0) continue;
    var id=file.getId();
    // Gallery images should be viewable without a Google login.
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW); } catch(_){}
    files.push({
      id:id,
      name:file.getName(),
      url:'https://drive.google.com/thumbnail?id='+encodeURIComponent(id)+'&sz=w1600',
      original:'https://drive.google.com/file/d/'+encodeURIComponent(id)+'/view',
      modified:file.getLastUpdated().getTime()
    });
  }

  // Also include images inside nested subfolders.
  var dirs=folder.getFolders();
  while(dirs.hasNext()) wbubCollectPhotoFiles_(dirs.next(),files,seenFolders);
}

function wbubPhotoArchive_(album) {
  try {
    var root=wbubPhotoArchiveFolder_();
    var folder=wbubPhotoAlbumFolder_(root,album);
    var files=[];
    wbubCollectPhotoFiles_(folder,files,{});

    // Prevent duplicate Drive entries from appearing in the gallery.
    var seen={}, unique=[];
    files.forEach(function(f){
      if(!seen[f.id]) { seen[f.id]=true; unique.push(f); }
    });
    unique.sort(function(a,b){return b.modified-a.modified;});

    return wbubJson_({
      ok:true,
      album:album||'all',
      count:unique.length,
      files:unique
    });
  } catch(e) {
    return wbubJson_({ok:false,error:String(e.message||e),files:[]});
  }
}

/* ================= YOUTH WING ================= */
function wbubYouthSheet_() {
  var cfg=wbubProps_();
  if(!cfg.sheetId) throw new Error('DATABASE_SHEET_ID_NOT_SET');
  var ss=SpreadsheetApp.openById(cfg.sheetId);
  var sh=ss.getSheetByName('Youth') || ss.insertSheet('Youth');
  var current=sh.getLastColumn()?sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0]:[];
  var norm=current.map(function(x){return String(x||'').trim().toLowerCase();});
  WBUB_YOUTH_HEADERS.forEach(function(h){if(norm.indexOf(h.toLowerCase())<0){sh.getRange(1,sh.getLastColumn()+1).setValue(h);norm.push(h.toLowerCase());}});
  return sh;
}
function wbubYouthMap_(sh){
  var h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0],m={};
  h.forEach(function(v,i){var k=String(v||'').trim().toLowerCase().replace(/[^a-z0-9_]+/g,'_');if(k)m[k]=i+1;});
  return m;
}
function wbubYouthGet_(sh,map,row,key){return map[key]?String(sh.getRange(row,map[key]).getDisplayValue()||'').trim():'';}
function wbubYouthSet_(sh,map,row,key,value){if(!map[key]){var col=sh.getLastColumn()+1;sh.getRange(1,col).setValue(key);map[key]=col;}sh.getRange(row,map[key]).setValue(value);}
function wbubYouthRegister_(p){
  var mobile=wbubNormalizeMobile_(p.mobile);
  if(!/^[6-9]\\d{9}$/.test(mobile)) throw new Error('INVALID_MOBILE');
  var name=String(p.name||'').trim(); if(name.length<2) throw new Error('NAME_REQUIRED');
  var transactionId=String(p.transaction_id||'').trim();
  if(transactionId.length<4) throw new Error('TRANSACTION_ID_REQUIRED');
  var sh=wbubYouthSheet_(),map=wbubYouthMap_(sh),last=sh.getLastRow();
  if(last>1 && map.mobile){var vals=sh.getRange(2,map.mobile,last-1,1).getDisplayValues();for(var i=0;i<vals.length;i++){if(wbubNormalizeMobile_(vals[i][0])===mobile){var row=i+2;if(p.photo_upload){var ep=wbubSavePhoto_(p.photo_upload,p.name||wbubYouthGet_(sh,map,row,'youth_id'));if(ep)wbubYouthSet_(sh,map,row,'photo_url',ep);}wbubYouthSet_(sh,map,row,'fee_amount','100');wbubYouthSet_(sh,map,row,'payment_status','SUBMITTED');wbubYouthSet_(sh,map,row,'transaction_id',transactionId);wbubYouthSet_(sh,map,row,'payment_date',new Date());return wbubJson_({ok:true,existing:true,youth_id:wbubYouthGet_(sh,map,row,'youth_id'),status:wbubYouthGet_(sh,map,row,'status')||'ACTIVE',photo_url:wbubYouthGet_(sh,map,row,'photo_url'),fee_amount:'100',payment_status:'SUBMITTED'});}}}
  var max=0;
  if(last>1 && map.youth_id){sh.getRange(2,map.youth_id,last-1,1).getDisplayValues().forEach(function(a){var m=String(a[0]||'').match(/WBU-YOUTH\\/(\\d{5})\\/\\d{4}/);if(m)max=Math.max(max,Number(m[1]));});}
  var year=Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Asia/Kolkata','yyyy');
  var youthId='WBU-YOUTH/'+String(max+1).padStart(5,'0')+'/'+year,row=sh.getLastRow()+1;
  ['name','mobile','whatsapp','age','district','block','education','profession','interests','address'].forEach(function(k){if(p[k]!==undefined)wbubYouthSet_(sh,map,row,k,String(p[k]||'').trim());});
  wbubYouthSet_(sh,map,row,'youth_id',youthId);wbubYouthSet_(sh,map,row,'status','ACTIVE');wbubYouthSet_(sh,map,row,'created_at',new Date());wbubYouthSet_(sh,map,row,'updated_at',new Date());wbubYouthSet_(sh,map,row,'fee_amount','100');wbubYouthSet_(sh,map,row,'payment_status','SUBMITTED');wbubYouthSet_(sh,map,row,'transaction_id',transactionId);wbubYouthSet_(sh,map,row,'payment_date',new Date());
  if(p.photo_upload){
    var youthPhoto=wbubSavePhoto_(p.photo_upload,p.name||youthId);
    if(youthPhoto) wbubYouthSet_(sh,map,row,'photo_url',youthPhoto);
  }
  return wbubJson_({ok:true,existing:false,youth_id:youthId,status:'ACTIVE',photo_url:wbubYouthGet_(sh,map,row,'photo_url'),fee_amount:'100',payment_status:'SUBMITTED'});
}
function wbubYouthProfile_(id){
  id=String(id||'').trim().toUpperCase(); if(!id) return wbubJson_({ok:false,found:false,error:'YOUTH_ID_REQUIRED'});
  var sh=wbubYouthSheet_(),map=wbubYouthMap_(sh),last=sh.getLastRow();
  if(last<2) return wbubJson_({ok:true,found:false});
  var row=0; for(var i=2;i<=last;i++){if(wbubYouthGet_(sh,map,i,'youth_id').toUpperCase()===id){row=i;break;}}
  if(!row) return wbubJson_({ok:true,found:false});
  var record={}; Object.keys(map).forEach(function(k){record[k]=wbubYouthGet_(sh,map,row,k);});
  /* Never expose phone/address publicly through verification. */
  delete record.mobile; delete record.whatsapp; delete record.address;
  return wbubJson_({ok:true,found:true,record:record});
}
