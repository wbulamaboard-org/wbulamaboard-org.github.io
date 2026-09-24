/*
 * WAYEJIN E FURFURA SHARIF
 * MEMBER PROFILE EDIT -> ADMIN APPROVAL BACKEND
 *
 * Add this file's functions to the SAME Google Apps Script project that already
 * serves the current membership API.
 *
 * IMPORTANT:
 * 1) Do NOT create a second doPost(). Add the 6 action cases shown at the
 *    bottom of this file to the existing doPost() action router.
 * 2) Existing getSheet_(), SHEET_NAME and HEADERS from the current project are
 *    reused when available. The current database sheet is "Applications".
 * 3) Set Script Property ADMIN_KEY only if the existing project does not
 *    already expose an ADMIN_KEY constant/property.
 */

function wbubJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function wbubEditAdminKey_() {
  try {
    if (typeof ADMIN_KEY !== 'undefined' && ADMIN_KEY) return String(ADMIN_KEY);
  } catch (_) {}
  return String(PropertiesService.getScriptProperties().getProperty('ADMIN_KEY') || '');
}

function wbubRequireEditAdmin_(data) {
  const expected = wbubEditAdminKey_();
  if (!expected || String(data.admin_key || '') !== expected) {
    throw new Error('UNAUTHORIZED');
  }
}

function wbubEditSheet_() {
  // Reuse the existing getSheet_() from the current project when present.
  try {
    if (typeof getSheet_ === 'function') return getSheet_();
  } catch (_) {}

  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('DATABASE_SHEET_ID');
  if (!id) throw new Error('DATABASE_SHEET_ID_NOT_SET');
  const ss = SpreadsheetApp.openById(id);
  const sh = ss.getSheetByName('Applications');
  if (!sh) throw new Error('Applications sheet not found');
  return sh;
}

function wbubHeaderMap_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (!lastCol) throw new Error('APPLICATIONS_HEADERS_MISSING');
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};
  headers.forEach(function(h, i) {
    const k = String(h || '').trim().toLowerCase();
    if (k) map[k] = i + 1;
  });
  return map;
}

function wbubFindMemberRow_(sheet, memberId) {
  const map = wbubHeaderMap_(sheet);
  const candidates = ['wazeen_id', 'member_id', 'application_no'];
  const wanted = String(memberId || '').trim().toUpperCase();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('MEMBER_NOT_FOUND');

  for (let r = 2; r <= lastRow; r++) {
    for (let i = 0; i < candidates.length; i++) {
      const col = map[candidates[i]];
      if (!col) continue;
      const value = String(sheet.getRange(r, col).getDisplayValue() || '').trim().toUpperCase();
      if (value && value === wanted) return {row:r, map:map};
    }
  }
  throw new Error('MEMBER_NOT_FOUND');
}

function wbubSetIfColumn_(sheet, map, row, key, value) {
  const col = map[String(key).toLowerCase()];
  if (col) sheet.getRange(row, col).setValue(value == null ? '' : value);
}

function wbubUploadEditPhoto_(photoUpload, memberId) {
  if (!photoUpload || !photoUpload.data) return '';
  const match = String(photoUpload.data).match(/^data:(image\\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) throw new Error('PHOTO_DATA_INVALID');

  const bytes = Utilities.base64Decode(match[2]);
  const ext = match[1] === 'image/png' ? 'png' : 'jpg';
  const safeId = String(memberId || 'member').replace(/[^A-Za-z0-9_-]/g, '_');
  const blob = Utilities.newBlob(bytes, match[1], safeId + '-' + Date.now() + '.' + ext);

  const props = PropertiesService.getScriptProperties();
  const folderId = props.getProperty('MEMBER_PHOTO_FOLDER_ID');
  let folder;
  if (folderId) {
    folder = DriveApp.getFolderById(folderId);
  } else {
    const folders = DriveApp.getFoldersByName('WBUB Member Photos');
    folder = folders.hasNext() ? folders.next() : DriveApp.createFolder('WBUB Member Photos');
  }

  const file = folder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (_) {}
  return file.getUrl();
}

function wbubEditSummary_(obj) {
  return [
    'নাম: ' + (obj.name || '—'),
    'Designation: ' + (obj.designation || '—'),
    'District: ' + (obj.district || '—'),
    'Block/Area: ' + (obj.block || '—'),
    'Validity: ' + (obj.validity || '—'),
    'Address: ' + (obj.address || '—')
  ].join('\n');
}

function wbubEnsureEditSheet_() {
  const ss = wbubEditSheet_().getParent();
  let sh = ss.getSheetByName('MemberEditRequests');
  if (!sh) {
    sh = ss.insertSheet('MemberEditRequests');
    sh.getRange(1, 1, 1, 15).setValues([[
      'request_id','member_id','mobile','status','created_at','updated_at',
      'name','designation','district','block','validity','address',
      'photo_url','reason','admin_note'
    ]]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function wbubMemberEditRequest_(data) {
  const memberId = String(data.member_id || '').trim();
  const mobile = String(data.mobile || '').replace(/\\D/g, '').slice(-10);
  if (!memberId || !/^[6-9]\\d{9}$/.test(mobile)) throw new Error('INVALID_MEMBER_OR_MOBILE');

  const apps = wbubEditSheet_();
  const found = wbubFindMemberRow_(apps, memberId);
  const row = found.row;
  const map = found.map;

  const storedMobile = map.mobile ? String(apps.getRange(row, map.mobile).getDisplayValue() || '').replace(/\\D/g,'').slice(-10) : '';
  if (storedMobile && storedMobile !== mobile) throw new Error('MOBILE_MISMATCH');

  const status = map.status ? String(apps.getRange(row, map.status).getDisplayValue() || '').trim().toUpperCase() : '';
  if (status && status !== 'APPROVED') throw new Error('NOT_APPROVED');

  const req = wbubEnsureEditSheet_();
  const requestId = 'EDIT-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Kolkata', 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random()*9000+1000);
  const photoUrl = wbubUploadEditPhoto_(data.photo_upload, memberId);

  const current = {
    name: map.name ? apps.getRange(row,map.name).getDisplayValue() : '',
    designation: map.designation ? apps.getRange(row,map.designation).getDisplayValue() : '',
    district: map.district ? apps.getRange(row,map.district).getDisplayValue() : '',
    block: map.block ? apps.getRange(row,map.block).getDisplayValue() : (map.area ? apps.getRange(row,map.area).getDisplayValue() : ''),
    validity: map.valid_till ? apps.getRange(row,map.valid_till).getDisplayValue() : '',
    address: map.address ? apps.getRange(row,map.address).getDisplayValue() : ''
  };

  const newValues = {
    name: String(data.name || '').trim(),
    designation: String(data.designation || '').trim(),
    district: String(data.district || '').trim(),
    block: String(data.block || '').trim(),
    validity: String(data.validity || '').trim(),
    address: String(data.address || '').trim()
  };

  req.appendRow([
    requestId, memberId, mobile, 'PENDING', new Date(), new Date(),
    newValues.name, newValues.designation, newValues.district,
    newValues.block, newValues.validity, newValues.address,
    photoUrl, '', ''
  ]);

  // Store the old values as a note so Admin can see exactly what is changing.
  const rr = req.getLastRow();
  req.getRange(rr, 14).setValue(
    'CURRENT:\n' + wbubEditSummary_(current) +
    '\n\nREQUESTED:\n' + wbubEditSummary_(newValues)
  );

  return {ok:true,request_id:requestId,status:'PENDING'};
}

function wbubMemberEditPending_(data) {
  wbubRequireEditAdmin_(data);
  const sh = wbubEnsureEditSheet_();
  const values = sh.getDataRange().getDisplayValues();
  if (values.length < 2) return {ok:true,records:[]};

  const h = {};
  values[0].forEach(function(x,i){h[String(x).toLowerCase()]=i;});
  const records = [];
  for (let i=1;i<values.length;i++) {
    const r = values[i];
    if (String(r[h.status] || '').toUpperCase() !== 'PENDING') continue;

    const currentRequestNote = String(r[h.reason] || '');
    const parts = currentRequestNote.split('\n\nREQUESTED:\n');
    records.push({
      request_id:r[h.request_id],
      member_id:r[h.member_id],
      mobile:r[h.mobile],
      status:r[h.status],
      created_at:r[h.created_at],
      name:r[h.name],
      current_summary:(parts[0] || '').replace(/^CURRENT:\n/,''),
      request_summary:parts[1] || '',
      photo_url:r[h.photo_url]
    });
  }
  return {ok:true,records:records};
}

function wbubMemberEditApprove_(data) {
  wbubRequireEditAdmin_(data);
  const requestId = String(data.request_id || '').trim();
  if (!requestId) throw new Error('REQUEST_ID_REQUIRED');

  const req = wbubEnsureEditSheet_();
  const values = req.getDataRange().getValues();
  if (values.length < 2) throw new Error('REQUEST_NOT_FOUND');

  const h={};
  values[0].forEach(function(x,i){h[String(x).toLowerCase()]=i;});
  let rr=-1;
  for(let i=1;i<values.length;i++){
    if(String(values[i][h.request_id]||'')===requestId){rr=i+1;break;}
  }
  if(rr<0) throw new Error('REQUEST_NOT_FOUND');

  if(String(req.getRange(rr,h.status+1).getDisplayValue()||'').toUpperCase()!=='PENDING') {
    throw new Error('REQUEST_ALREADY_PROCESSED');
  }

  const memberId=String(req.getRange(rr,h.member_id+1).getDisplayValue()||'').trim();
  const apps=wbubEditSheet_();
  const found=wbubFindMemberRow_(apps,memberId);
  const row=found.row, map=found.map;

  wbubSetIfColumn_(apps,map,row,'name',req.getRange(rr,h.name+1).getValue());
  wbubSetIfColumn_(apps,map,row,'designation',req.getRange(rr,h.designation+1).getValue());
  wbubSetIfColumn_(apps,map,row,'district',req.getRange(rr,h.district+1).getValue());
  if(map.block) wbubSetIfColumn_(apps,map,row,'block',req.getRange(rr,h.block+1).getValue());
  else wbubSetIfColumn_(apps,map,row,'area',req.getRange(rr,h.block+1).getValue());
  wbubSetIfColumn_(apps,map,row,'valid_till',req.getRange(rr,h.validity+1).getValue());
  wbubSetIfColumn_(apps,map,row,'address',req.getRange(rr,h.address+1).getValue());

  const photoUrl=String(req.getRange(rr,h.photo_url+1).getValue()||'');
  if(photoUrl) wbubSetIfColumn_(apps,map,row,'photo',photoUrl);

  wbubSetIfColumn_(apps,map,row,'updated_at',new Date());

  req.getRange(rr,h.status+1).setValue('APPROVED');
  req.getRange(rr,h.updated_at+1).setValue(new Date());
  req.getRange(rr,h.admin_note+1).setValue('Approved and applied to Applications.');
  return {ok:true,status:'APPROVED',member_id:memberId};
}

function wbubMemberEditReject_(data) {
  wbubRequireEditAdmin_(data);
  const requestId=String(data.request_id||'').trim();
  if(!requestId) throw new Error('REQUEST_ID_REQUIRED');
  const sh=wbubEnsureEditSheet_();
  const values=sh.getDataRange().getValues();
  const h={};values[0].forEach(function(x,i){h[String(x).toLowerCase()]=i;});
  let rr=-1;
  for(let i=1;i<values.length;i++){if(String(values[i][h.request_id]||'')===requestId){rr=i+1;break;}}
  if(rr<0) throw new Error('REQUEST_NOT_FOUND');
  sh.getRange(rr,h.status+1).setValue('REJECTED');
  sh.getRange(rr,h.updated_at+1).setValue(new Date());
  sh.getRange(rr,h.admin_note+1).setValue(String(data.reason||'Rejected by Admin'));
  return {ok:true,status:'REJECTED',request_id:requestId};
}

/*
 * ADD THESE CASES INSIDE THE EXISTING doPost() ACTION ROUTER.
 *
 * Example:
 *
 * if (action === 'member_edit_request') return wbubJson_(wbubMemberEditRequest_(data));
 * if (action === 'member_edit_pending') return wbubJson_(wbubMemberEditPending_(data));
 * if (action === 'member_edit_approve') return wbubJson_(wbubMemberEditApprove_(data));
 * if (action === 'member_edit_reject') return wbubJson_(wbubMemberEditReject_(data));
 *
 * The existing doPost() must continue handling all existing registration,
 * pending, approve, reject and verification actions unchanged.
 */
