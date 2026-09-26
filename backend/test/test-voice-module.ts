import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
import * as http from 'http';
import FormData = require('form-data');

const API = 'http://localhost:3001/api';
let token: string | null = null;

function r(u: string, o: any = {}): Promise<any> {
  return new Promise((res, rej) => {
    const url = new URL(u);
    const req = http.request(
      {
        hostname: url.hostname,
        port: parseInt(url.port || '3001'),
        path: url.pathname + url.search,
        method: o.method || 'GET',
        headers: o.headers || {},
      },
      (resp) => {
        let d = '';
        resp.on('data', (c) => (d += c));
        resp.on('end', () => {
          let b: any;
          try {
            b = JSON.parse(d);
          } catch {
            b = d;
          }
          res({ s: resp.statusCode, b });
        });
      },
    );
    req.on('error', rej);
    if (o.body) req.write(o.body);
    req.end();
  });
}

function fr(u: string, fd: FormData, xh: any = {}): Promise<any> {
  return new Promise((res, rej) => {
    const url = new URL(u);
    const req = http.request(
      {
        hostname: url.hostname,
        port: parseInt(url.port || '3001'),
        path: url.pathname,
        method: 'POST',
        headers: { ...fd.getHeaders(), ...xh },
      },
      (resp) => {
        let d = '';
        resp.on('data', (c) => (d += c));
        resp.on('end', () => {
          let b: any;
          try {
            b = JSON.parse(d);
          } catch {
            b = d;
          }
          res({ s: resp.statusCode, b });
        });
      },
    );
    req.on('error', rej);
    fd.pipe(req);
  });
}

async function authFn(): Promise<string> {
  const lb = JSON.stringify({ email: 'citizen@samadhan.test', password: 'TestPass123!' });
  const h = { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(lb)) };
  let rr = await r(`${API}/auth/login`, { method: 'POST', headers: h, body: lb });
  if (rr.s === 200 || rr.s === 201) return rr.b?.accessToken || rr.b?.access_token || '';
  const rb = JSON.stringify({ name: 'VTest', email: 'citizen@samadhan.test', password: 'TestPass123!', role: 'CITIZEN' });
  await r(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(rb)) },
    body: rb,
  });
  rr = await r(`${API}/auth/login`, { method: 'POST', headers: h, body: lb });
  return rr.b?.accessToken || rr.b?.access_token || '';
}

let p = 0,
  f = 0;
const pass = (n: string) => {
  console.log('  PASS: ' + n);
  p++;
};
const fail = (n: string, e?: string) => {
  console.error('  FAIL: ' + n + (e ? ' - ' + e : ''));
  f++;
};

async function t1() {
  console.log('T1: Unauth transcribe 401');
  const fm = new FormData();
  fm.append('file', Buffer.from('x'), { filename: 'a.wav', contentType: 'audio/wav' });
  const rr = await fr(`${API}/v1/voice/transcribe`, fm);
  rr.s === 401 ? pass('T1 unauth 401') : fail('T1 unauth 401', `got ${rr.s}`);
}

async function t2() {
  console.log('T2: Unauth analyze-turn 401');
  const b = JSON.stringify({ transcript: 'x', conversationState: {} });
  const rr = await r(`${API}/v1/voice/analyze-turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(b)) },
    body: b,
  });
  rr.s === 401 ? pass('T2 unauth analyze 401') : fail('T2 unauth analyze 401', `got ${rr.s}`);
}

async function t3() {
  console.log('T3: Bad MIME 400');
  if (!token) {
    fail('T3', 'no token');
    return;
  }
  const fm = new FormData();
  fm.append('file', Buffer.from('x'), { filename: 't.pdf', contentType: 'application/pdf' });
  const rr = await fr(`${API}/v1/voice/transcribe`, fm, { Authorization: `Bearer ${token}` });
  rr.s === 400 ? pass('T3 bad mime 400') : fail('T3 bad mime 400', `got ${rr.s}`);
}

async function t4() {
  console.log('T4: Analyze-turn structured response');
  if (!token) {
    fail('T4', 'no token');
    return;
  }
  const b = JSON.stringify({
    currentTranscript: 'water scarcity',
    englishTranslation: 'water scarcity',
    detectedLanguage: 'en-IN',
  });
  const rr = await r(`${API}/v1/voice/analyze-turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(b)), Authorization: `Bearer ${token}` },
    body: b,
  });
  if (rr.s === 200 || rr.s === 201) {
    rr.b.category === 'Infrastructure' ? fail('T4', 'hardcoded Infrastructure') : pass('T4 structured ok');
  } else {
    fail('T4', `got ${rr.s}`);
  }
}

async function t5() {
  console.log('T5: Severity enum valid');
  if (!token) {
    fail('T5', 'no token');
    return;
  }
  const b = JSON.stringify({
    currentTranscript: 'dying from water',
    englishTranslation: 'dying from water',
    detectedLanguage: 'en-IN',
  });
  const rr = await r(`${API}/v1/voice/analyze-turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(b)), Authorization: `Bearer ${token}` },
    body: b,
  });
  if (rr.s === 200 || rr.s === 201) {
    const ok = ['NOT_SURE', 'MODERATE', 'SERIOUS'];
    const sv = rr.b.severity;
    !sv || ok.includes(sv) ? pass('T5 severity ok') : fail('T5 severity', `got ${sv}`);
  } else {
    fail('T5', `got ${rr.s}`);
  }
}

async function t6() {
  console.log('T6: Alt route /api/voice/ registered');
  if (!token) {
    fail('T6', 'no token');
    return;
  }
  const b = JSON.stringify({
    currentTranscript: 'road broken',
    englishTranslation: 'road broken',
    detectedLanguage: 'en-IN',
  });
  const rr = await r(`${API}/voice/analyze-turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(b)), Authorization: `Bearer ${token}` },
    body: b,
  });
  rr.s !== 404 ? pass('T6 alt route ok') : fail('T6 alt route', 'got 404');
}

async function t7() {
  console.log('T7: Tamil clarification question in Tamil script');
  if (!token) {
    fail('T7', 'no token');
    return;
  }
  const b = JSON.stringify({
    currentTranscript: 'எங்கள் கிராமத்தில் குடிநீர் குழாய் உடைந்துவிட்டது, தண்ணீர் வீணாகிறது',
    englishTranslation: 'A drinking water pipe has burst in our village and water is being wasted',
    detectedLanguage: 'ta',
  });
  const rr = await r(`${API}/v1/voice/analyze-turn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(Buffer.byteLength(b)),
      Authorization: `Bearer ${token}`,
    },
    body: b,
  });
  if (rr.s === 200 || rr.s === 201) {
    const q = rr.b.follow_up_question || rr.b.followUpQuestion;
    const hasTamil = /[\u0B80-\u0BFF]/.test(q || '');
    if (q && hasTamil) {
      pass(`T7 Tamil clarification question in Tamil: "${q}"`);
    } else {
      fail('T7', `Question not in Tamil: "${q}"`);
    }
  } else {
    fail('T7', `got status ${rr.s}`);
  }
}

async function t8() {
  console.log('T8: Tamil multi-turn location resolution & state preservation');
  if (!token) {
    fail('T8', 'no token');
    return;
  }
  const previousState = {
    title: 'Broken drinking water pipe in village',
    problem_statement: 'A drinking water pipe has burst in our village and clean water is being wasted for three days.',
    problem: 'A drinking water pipe has burst in our village and clean water is being wasted for three days.',
    domain: 'Water',
    subDomain: 'Drinking Water Supply',
    facts: {
      what_is_happening: 'drinking water pipe burst',
      who_is_affected: 'villagers',
    },
    originalTranscript: 'எங்கள் கிராமத்தில் குடிநீர் குழாய் உடைந்துவிட்டது',
    detectedLanguage: 'ta',
  };

  const b = JSON.stringify({
    currentTranscript: 'நாங்கள் ராஞ்சி மாவட்டம் காங்கே வட்டாரத்தில் வசிக்கிறோம்',
    englishTranslation: 'We live in Ranchi district Kanke block',
    detectedLanguage: 'ta',
    previousState,
  });

  const rr = await r(`${API}/v1/voice/analyze-turn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(Buffer.byteLength(b)),
      Authorization: `Bearer ${token}`,
    },
    body: b,
  });

  if (rr.s === 200 || rr.s === 201) {
    const res = rr.b;
    const districtResolved = res.districtId && res.districtName?.toLowerCase().includes('ranchi');
    const blockResolved = res.blockId && res.blockName?.toLowerCase().includes('kanke');
    const problemPreserved = (res.problem_statement || res.problem || '').toLowerCase().includes('pipe') ||
      (res.problem_statement || res.problem || '').toLowerCase().includes('water');

    if (districtResolved && blockResolved && problemPreserved) {
      pass(`T8 Tamil multi-turn resolved: District=${res.districtName} (${res.districtId}), Block=${res.blockName} (${res.blockId}), Problem preserved`);
    } else {
      fail(
        'T8',
        `Resolution failed: district=${res.districtName} (${res.districtId}), block=${res.blockName} (${res.blockId}), problem=${res.problem_statement}`,
      );
    }
  } else {
    fail('T8', `got status ${rr.s}`);
  }
}

async function main() {
  console.log('=== SUITE 19: Voice Module ===');
  try {
    token = await authFn();
    console.log(token ? 'Auth ok' : 'No token - some tests will skip');
  } catch (e: any) {
    console.warn('auth err:', e.message);
  }
  await t1();
  await t2();
  await t3();
  await t4();
  await t5();
  await t6();
  await t7();
  await t8();
  console.log(`Suite 19: ${p} passed, ${f} failed`);
  if (f > 0) process.exit(1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
