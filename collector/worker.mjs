import study from "./trials.json" with { type: "json" };

const origins = new Set(["https://jacksonyao-mao.github.io"]);
const metrics = ["similarity", "naturalness", "intelligibility"];
const alphabet = new Set(study.ids);
const encoder = new TextEncoder();

async function participantID(secret) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(secret)));
  return "RK-" + Array.from(bytes.slice(0, 10), b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function ratings(body) {
  if (body?.version !== study.version || !/^[a-f0-9]{64}$/.test(body?.secret ?? "")) return;
  if (!Array.isArray(body.order) || body.order.length !== alphabet.size ||
      new Set(body.order).size !== alphabet.size || !body.order.every(id => alphabet.has(id))) return;
  if (!body.answers || Object.keys(body.answers).length !== alphabet.size) return;
  const clean = {};
  for (const id of body.order) {
    const response = body.answers[id];
    if (!metrics.every(k => Number.isInteger(response?.[k]) && response[k] >= 1 && response[k] <= 5)) return;
    clean[id] = Object.fromEntries(metrics.map(k => [k, response[k]]));
  }
  return JSON.stringify({order:body.order, answers:clean});
}

export default {async fetch(request, env) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  const headers = {"Cache-Control":"no-store", "Vary":"Origin"};
  if (origins.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  const reply = (status, data) => Response.json(data, {status, headers});
  if (origin && !origins.has(origin)) return reply(403, {error:"Unknown study origin."});
  try {
    if (request.method === "GET" && ["/", "/health"].includes(url.pathname)) {
      await env.DB.prepare("SELECT participant FROM submissions LIMIT 1").first();
      return reply(200, {study:study.version, ready:true});
    }
    if (url.pathname === "/api/export" && request.method === "GET") {
      const auth = request.headers.get("Authorization") || "";
      if (!/^Bearer [a-f0-9]{64}$/.test(auth)) return reply(401,{error:"Organizer credentials required."});
      const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(auth.slice(7))));
      const digest = Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
      if (digest !== "5904a5006e1a6d790c065015eda50a6e40df6cc6e9f097fe99acd814b7f40d77") return reply(403,{error:"Access denied."});
      const after=url.searchParams.get("after")||"";
      const rows=await env.DB.prepare("SELECT participant,submitted,receipt,ratings FROM submissions WHERE study=? AND participant>? ORDER BY participant LIMIT 50")
        .bind(study.version,after).all();
      return reply(200,{version:study.version,responses:rows.results.map(r=>({...r,ratings:JSON.parse(r.ratings)})),
        next:rows.results.length===50?rows.results.at(-1).participant:null});
    }
    if (url.pathname !== "/api/submit") return reply(404, {error:"Unknown route."});
    if (request.method !== "POST") return reply(405, {error:"POST required."});
    if (Number(request.headers.get("Content-Length")) > 16384) return reply(413, {error:"Submission too large."});
    const text = await request.text();
    if (text.length > 16384) return reply(413, {error:"Submission too large."});
    let body;
    try {body=JSON.parse(text);} catch {return reply(400,{error:"Invalid JSON."});}
    const payload = ratings(body);
    if (!payload) return reply(422,{error:"All 40 trials need three ratings from 1 to 5."});
    const id = await participantID(body.secret);
    const version = url.searchParams.get("qa")==="1" ? study.version+"/qa" : study.version;
    await env.DB.prepare("INSERT INTO submissions (study,participant,receipt,submitted,ratings) VALUES (?,?,?,?,?) ON CONFLICT(study,participant) DO NOTHING")
      .bind(version,id,crypto.randomUUID(),new Date().toISOString(),payload).run();
    const row = await env.DB.prepare("SELECT receipt,ratings FROM submissions WHERE study=? AND participant=?")
      .bind(version,id).first();
    if (!row) return reply(503,{error:"Please retry your submission."});
    if (row.ratings !== payload) return reply(409,{error:"A different completed response is already saved for this participant."});
    return reply(200,{participant:id,receipt:row.receipt,version:study.version});
  } catch {
    return reply(503,{error:"Storage is temporarily unavailable. Your answers can be submitted again."});
  }
}};
