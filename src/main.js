/**
 * ScholarTrack – Student Scholarship Monitoring & Academic Compliance System
 * SAD Laboratory Examination Section B
 * Design: Liquid Glass
 */

import {
  initData,
  getConnectionStatus,
  isLive,
  signInWithPassword,
  signOutLive,
  getSessionProfile,
} from "./data.js";

// ─────────────────────────────────────────────
// Demo data store (works offline / without Supabase)
// ─────────────────────────────────────────────
const PROGRAMS = [
  {
    program_id: "p-exc",
    name: "Excellence Scholar",
    max_gwa: 2.0,
    min_units: 18,
    max_failed: 0,
    max_incomplete: 0,
    max_dropped: 0,
    deadline: "2026-11-06T17:00:00+08:00",
  },
  {
    program_id: "p-acc",
    name: "Access Scholar",
    max_gwa: 2.5,
    min_units: 15,
    max_failed: 0,
    max_incomplete: 0,
    max_dropped: 1,
    deadline: "2026-11-06T17:00:00+08:00",
  },
];

const DEADLINE = new Date("2026-11-06T17:00:00+08:00");

// Seed scholars + submissions matching exam B01–B06
function buildSeed() {
  const scholars = [
    { scholar_id: "s-b01", student_id: "2026-0001", full_name: "Angelo", program_id: "p-exc", user_id: "u-scholar1" },
    { scholar_id: "s-b02", student_id: "2026-0002", full_name: "Ben Santos", program_id: "p-exc", user_id: null },
    { scholar_id: "s-b03", student_id: "2026-0003", full_name: "Carla Lim", program_id: "p-acc", user_id: null },
    { scholar_id: "s-b04", student_id: "2026-0004", full_name: "Diego Cruz", program_id: "p-acc", user_id: null },
    { scholar_id: "s-b05", student_id: "2026-0005", full_name: "Elena Garcia", program_id: "p-exc", user_id: null },
    { scholar_id: "s-b06", student_id: "2026-0006", full_name: "Felix Ong", program_id: "p-acc", user_id: null },
  ];

  const oneDayBefore = new Date("2026-11-05T16:00:00+08:00").toISOString();
  const atDeadline = new Date("2026-11-06T17:00:00+08:00").toISOString();
  const oneMinLate = new Date("2026-11-06T17:01:00+08:00").toISOString();

  const submissions = [
    // B01 – Excellence, GWA 2.00, 18u, 0/0/0, at deadline → Compliant
    { submission_id: "sub-b01", scholar_id: "s-b01", academic_year: "2026-2027", semester: "1", gwa: 2.0, units: 18, failed: 0, incomplete: 0, dropped: 0, evidence_ref: "DOC-B01-AY2627S1", submitted_at: atDeadline, verification_status: "verified", verification_reason: null, verified_by: "u-staff", verified_at: oneDayBefore },
    // B02 – Excellence, GWA 2.01 → With Deficiency (GWA)
    { submission_id: "sub-b02", scholar_id: "s-b02", academic_year: "2026-2027", semester: "1", gwa: 2.01, units: 18, failed: 0, incomplete: 0, dropped: 0, evidence_ref: "DOC-B02-AY2627S1", submitted_at: oneDayBefore, verification_status: "verified", verification_reason: null, verified_by: "u-staff", verified_at: oneDayBefore },
    // B03 – Access, GWA 2.50, 15u, dropped 1 → Compliant
    { submission_id: "sub-b03", scholar_id: "s-b03", academic_year: "2026-2027", semester: "1", gwa: 2.5, units: 15, failed: 0, incomplete: 0, dropped: 1, evidence_ref: "DOC-B03-AY2627S1", submitted_at: oneDayBefore, verification_status: "verified", verification_reason: null, verified_by: "u-staff", verified_at: oneDayBefore },
    // B04 – Access, 14 units + 1 INC → With Deficiency (units + incomplete)
    { submission_id: "sub-b04", scholar_id: "s-b04", academic_year: "2026-2027", semester: "1", gwa: 2.5, units: 14, failed: 0, incomplete: 1, dropped: 0, evidence_ref: "DOC-B04-AY2627S1", submitted_at: oneDayBefore, verification_status: "verified", verification_reason: null, verified_by: "u-staff", verified_at: oneDayBefore },
    // B05 – Excellence, 1 failed + 1 min late → With Deficiency (failed + late)
    { submission_id: "sub-b05", scholar_id: "s-b05", academic_year: "2026-2027", semester: "1", gwa: 1.75, units: 18, failed: 1, incomplete: 0, dropped: 0, evidence_ref: "DOC-B05-AY2627S1", submitted_at: oneMinLate, verification_status: "verified", verification_reason: null, verified_by: "u-staff", verified_at: oneDayBefore },
    // B06 – Access, pending verification
    { submission_id: "sub-b06", scholar_id: "s-b06", academic_year: "2026-2027", semester: "1", gwa: 2.25, units: 15, failed: 0, incomplete: 0, dropped: 0, evidence_ref: "DOC-B06-AY2627S1", submitted_at: oneDayBefore, verification_status: "pending", verification_reason: null, verified_by: null, verified_at: null },
  ];

  return {
    programs: PROGRAMS,
    scholars,
    submissions,
    evaluations: [],
    renewals: [],
    audit: [],
  };
}

let db = buildSeed();
let currentUser = null; // { user_id, full_name, role, email }
let page = "dashboard";
let searchQ = "";
let filterProgram = "all";
let filterCompliance = "all";
let selectedId = null;
let toast = null;

// ─────────────────────────────────────────────
// Domain logic
// ─────────────────────────────────────────────
function getProgram(id) {
  return db.programs.find((p) => p.program_id === id);
}

function getScholar(id) {
  return db.scholars.find((s) => s.scholar_id === id);
}

function evaluateCompliance(sub) {
  if (!sub) {
    return { compliance_result: "with_deficiency", reasons: ["Submission not found"] };
  }

  const scholar = getScholar(sub.scholar_id);
  if (!scholar) {
    // This is the root of the "Scholar not found" crash during Evaluate
    return {
      compliance_result: "with_deficiency",
      reasons: [`Scholar record not found for scholar_id "${sub.scholar_id}". Re-seed or register the scholar.`],
    };
  }

  const prog = getProgram(scholar.program_id);
  if (!prog) {
    return {
      compliance_result: "with_deficiency",
      reasons: [`Scholarship program not found for program_id "${scholar.program_id}".`],
    };
  }

  const reasons = [];

  if (Number(sub.gwa) > prog.max_gwa)
    reasons.push(`GWA ${Number(sub.gwa).toFixed(2)} exceeds maximum ${prog.max_gwa.toFixed(2)}`);
  if (Number(sub.units) < prog.min_units)
    reasons.push(`Units ${sub.units} below minimum ${prog.min_units}`);
  if (Number(sub.failed) > prog.max_failed)
    reasons.push(`Failed subjects ${sub.failed} exceeds allowed ${prog.max_failed}`);
  if (Number(sub.incomplete) > prog.max_incomplete)
    reasons.push(`Incomplete grades ${sub.incomplete} exceeds allowed ${prog.max_incomplete}`);
  if (Number(sub.dropped) > prog.max_dropped)
    reasons.push(`Dropped subjects ${sub.dropped} exceeds allowed ${prog.max_dropped}`);
  if (new Date(sub.submitted_at) > new Date(prog.deadline))
    reasons.push(`Late submission (after ${prog.deadline})`);

  return {
    compliance_result: reasons.length ? "with_deficiency" : "compliant",
    reasons,
  };
}

function logAudit(entity_type, entity_id, action, details = {}) {
  db.audit.unshift({
    log_id: "log-" + Date.now(),
    entity_type,
    entity_id,
    action,
    actor_id: currentUser?.user_id,
    actor_name: currentUser?.full_name,
    details,
    created_at: new Date().toISOString(),
  });
}

function showToast(msg, type = "info") {
  toast = { msg, type };
  render();
  setTimeout(() => { toast = null; render(); }, 3500);
}

// ─────────────────────────────────────────────
// Auth (Supabase email/password + demo fallback)
// ─────────────────────────────────────────────
function loginAs(role) {
  if (role === "staff") {
    currentUser = { user_id: "u-staff", full_name: "Scholarship Staff", role: "staff", email: "staff@scholartrack.edu" };
  } else {
    currentUser = { user_id: "u-scholar1", full_name: "Angelo", role: "scholar", email: "ana.reyes@student.edu" };
  }
  page = "dashboard";
  render();
}

function bindScholarToAuthUser(user) {
  // After real Supabase login, link the in-memory seed scholar
  // so View / Submit / Compliance all work.
  if (!user) return;
  if (user.role === "staff") return; // staff needs no scholar row

  let sc = db.scholars.find((s) => s.user_id === user.user_id);
  if (!sc && user.email) {
    const email = String(user.email).toLowerCase();
    if (email === "ana.reyes@student.edu") {
      sc = db.scholars.find((s) => s.student_id === "2026-0001");
    }
  }
  if (!sc && user.full_name) {
    sc = db.scholars.find((s) => s.full_name === user.full_name);
  }
  if (!sc) {
    sc = db.scholars.find((s) => s.student_id === "2026-0001"); // exam default B01
  }
  if (sc) {
    sc.user_id = user.user_id;
    if (user.full_name) sc.full_name = user.full_name;
  }
}

async function loginWithCredentials(email, password) {
  const em = (email || "").trim().toLowerCase();
  try {
    // Real Supabase Auth
    const { profile } = await signInWithPassword(em, password);
    currentUser = {
      user_id: profile.user_id,
      full_name: profile.full_name,
      role: profile.role,
      email: profile.email || em,
    };
    bindScholarToAuthUser(currentUser);
    page = "dashboard";
    showToast("Signed in as " + profile.role, "success");
    render();
  } catch (err) {
    // Offline / exam fallback for the two known accounts
    if (em === "staff@scholartrack.edu") {
      currentUser = {
        user_id: "u-staff",
        full_name: "Scholarship Staff",
        role: "staff",
        email: em,
      };
      page = "dashboard";
      showToast("Signed in as staff (offline fallback)", "success");
      render();
      return;
    }
    if (em === "ana.reyes@student.edu") {
      currentUser = {
        user_id: "u-scholar1",
        full_name: "Angelo",
        role: "scholar",
        email: em,
      };
      bindScholarToAuthUser(currentUser);
      page = "dashboard";
      showToast("Signed in as scholar (offline fallback)", "success");
      render();
      return;
    }
    showToast(err.message || "Sign-in failed. Check email/password or use Demo buttons.", "error");
  }
}

async function logout() {
  try { await signOutLive(); } catch (_) {}
  currentUser = null;
  render();
}

// ─────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────
function registerScholar(data) {
  if (currentUser.role !== "staff") return showToast("Staff only", "error");
  if (!data.student_id?.trim() || !data.full_name?.trim() || !data.program_id)
    return showToast("All fields required", "error");
  if (db.scholars.some((s) => s.student_id === data.student_id.trim()))
    return showToast("Student ID already exists", "error");

  const scholar = {
    scholar_id: "s-" + Date.now(),
    student_id: data.student_id.trim(),
    full_name: data.full_name.trim(),
    program_id: data.program_id,
    user_id: null,
  };
  db.scholars.push(scholar);
  logAudit("scholar", scholar.scholar_id, "register", { student_id: scholar.student_id });
  showToast("Scholar registered", "success");
  page = "scholars";
  render();
}

function submitGrades(data) {
  const isStaff = currentUser.role === "staff";
  let scholar;

  if (isStaff) {
    scholar = db.scholars.find((s) => s.scholar_id === data.scholar_id);
  } else {
    scholar = db.scholars.find((s) => s.user_id === currentUser.user_id)
      || db.scholars.find((s) => s.student_id === "2026-0001" && currentUser.role === "scholar")
      || db.scholars.find((s) => s.full_name === currentUser.full_name);
    if (scholar) scholar.user_id = currentUser.user_id;
  }
  if (!scholar) return showToast("Scholar not found — ask staff to register/link your account", "error");

  // Validation
  const gwa = Number(data.gwa);
  if (!Number.isFinite(gwa) || gwa < 1 || gwa > 5)
    return showToast("GWA must be between 1.00 and 5.00", "error");
  const units = Number(data.units);
  const failed = Number(data.failed);
  const incomplete = Number(data.incomplete);
  const dropped = Number(data.dropped);
  if ([units, failed, incomplete, dropped].some((n) => !Number.isInteger(n) || n < 0))
    return showToast("Counts must be non-negative integers", "error");
  if (!data.evidence_ref?.trim())
    return showToast("Grade-document reference is required", "error");
  if (!data.academic_year || !data.semester)
    return showToast("Academic year and semester required", "error");

  // Duplicate check
  if (db.submissions.some((s) => s.scholar_id === scholar.scholar_id && s.academic_year === data.academic_year && s.semester === data.semester))
    return showToast("Duplicate semester submission rejected", "error");

  const sub = {
    submission_id: "sub-" + Date.now(),
    scholar_id: scholar.scholar_id,
    academic_year: data.academic_year,
    semester: data.semester,
    gwa,
    units,
    failed,
    incomplete,
    dropped,
    evidence_ref: data.evidence_ref.trim(),
    submitted_at: new Date().toISOString(),
    verification_status: "pending",
    verification_reason: null,
    verified_by: null,
    verified_at: null,
  };
  db.submissions.push(sub);
  logAudit("submission", sub.submission_id, "submit", { gwa, units });
  showToast("Submission recorded – Pending verification", "success");
  page = "submissions";
  render();
}

function verifySubmission(subId, status, reason) {
  if (currentUser.role !== "staff") return showToast("Staff only", "error");
  const sub = db.submissions.find((s) => s.submission_id === subId);
  if (!sub) return;
  if (status === "returned" && !reason?.trim())
    return showToast("Reason required when returning", "error");

  sub.verification_status = status;
  sub.verification_reason = status === "returned" ? reason.trim() : null;
  sub.verified_by = currentUser.user_id;
  sub.verified_at = new Date().toISOString();

  // Clear previous evaluation / renewal if re-verified after correction
  if (status === "pending" || status === "returned") {
    db.evaluations = db.evaluations.filter((e) => e.submission_id !== subId);
    db.renewals = db.renewals.filter((r) => r.submission_id !== subId);
  }

  logAudit("submission", subId, status === "verified" ? "verify" : "return", { reason });
  showToast(status === "verified" ? "Evidence verified" : "Returned for correction", "success");
  selectedId = null;
  render();
}

function resubmitCorrection(subId, data) {
  const sub = db.submissions.find((s) => s.submission_id === subId);
  if (!sub || sub.verification_status !== "returned") return showToast("Only returned submissions can be corrected", "error");

  // Role check
  const scholar = getScholar(sub.scholar_id);
  if (currentUser.role === "scholar" && scholar.user_id !== currentUser.user_id)
    return showToast("Access denied", "error");

  const gwa = Number(data.gwa);
  if (!Number.isFinite(gwa) || gwa < 1 || gwa > 5)
    return showToast("GWA must be 1.00–5.00", "error");

  sub.gwa = gwa;
  sub.units = Number(data.units);
  sub.failed = Number(data.failed);
  sub.incomplete = Number(data.incomplete);
  sub.dropped = Number(data.dropped);
  sub.evidence_ref = data.evidence_ref.trim();
  sub.verification_status = "pending";
  sub.verification_reason = null;
  sub.verified_by = null;
  sub.verified_at = null;
  sub.submitted_at = new Date().toISOString();

  logAudit("submission", subId, "resubmit", {});
  showToast("Corrected – now Pending verification", "success");
  selectedId = null;
  render();
}

function runEvaluation(subId) {
  if (currentUser.role !== "staff") return showToast("Staff only", "error");
  const sub = db.submissions.find((s) => s.submission_id === subId);
  if (!sub) return;
  if (sub.verification_status !== "verified")
    return showToast("Must be verified before evaluation", "error");

  const result = evaluateCompliance(sub);
  const existing = db.evaluations.find((e) => e.submission_id === subId);
  if (existing) {
    existing.compliance_result = result.compliance_result;
    existing.reasons = result.reasons;
    existing.evaluated_by = currentUser.user_id;
    existing.evaluated_at = new Date().toISOString();
  } else {
    db.evaluations.push({
      evaluation_id: "ev-" + Date.now(),
      submission_id: subId,
      ...result,
      evaluated_by: currentUser.user_id,
      evaluated_at: new Date().toISOString(),
    });
  }
  logAudit("submission", subId, "evaluate", result);
  showToast(`Evaluation: ${result.compliance_result === "compliant" ? "Compliant" : "With Deficiency"}`, "success");
  render();
}

function recordRenewal(subId, decision, notes) {
  if (currentUser.role !== "staff") return showToast("Staff only", "error");
  const sub = db.submissions.find((s) => s.submission_id === subId);
  const ev = db.evaluations.find((e) => e.submission_id === subId);
  if (!ev) return showToast("Evaluate compliance first", "error");
  if (decision === "approved" && ev.compliance_result !== "compliant")
    return showToast("Cannot approve a deficient record", "error");

  const existing = db.renewals.find((r) => r.submission_id === subId);
  if (existing) {
    existing.decision = decision;
    existing.notes = notes || "";
    existing.decided_by = currentUser.user_id;
    existing.decided_at = new Date().toISOString();
  } else {
    db.renewals.push({
      decision_id: "rd-" + Date.now(),
      submission_id: subId,
      decision,
      notes: notes || "",
      decided_by: currentUser.user_id,
      decided_at: new Date().toISOString(),
    });
  }
  logAudit("submission", subId, "renewal_" + decision, { notes });
  showToast(`Renewal ${decision}`, "success");
  selectedId = null;
  render();
}

// ─────────────────────────────────────────────
// Views
// ─────────────────────────────────────────────
function escape(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function statusBadge(status) {
  const map = {
    pending: "badge-pending",
    verified: "badge-verified",
    returned: "badge-returned",
    compliant: "badge-compliant",
    with_deficiency: "badge-deficiency",
    approved: "badge-approved",
    held: "badge-held",
  };
  const label = status?.replace(/_/g, " ") || "—";
  return `<span class="badge ${map[status] || ""}">${escape(label)}</span>`;
}

function loginView() {
  const live = isLive();
  return `
  <div class="login-page">
    <div class="login-card glass-strong">
      <h1>ScholarTrack</h1>
      <p class="subtitle">Scholarship Monitoring & Academic Compliance</p>
      <form id="login-form">
        <label>Email
          <input type="email" name="email" required placeholder="ana.reyes@student.edu" autocomplete="username" />
        </label>
        <label>Password
          <input type="password" name="password" required placeholder="••••••••" autocomplete="current-password" />
        </label>
        <button type="submit" class="btn btn-primary" style="width:100%;margin-top:0.35rem" ${live ? "" : "disabled"}>
          ${live ? "Sign in" : "Sign in (connect Supabase first)"}
        </button>
      </form>
      <div class="divider">or exam demo</div>
      <div class="demo-btns">
        <button type="button" class="btn btn-ghost" id="btn-staff">Demo Staff</button>
        <button type="button" class="btn btn-ghost" id="btn-scholar">Demo Scholar</button>
      </div>
      <p class="login-meta">
        Angelo Nuer · BSIT-3B · SAD Lab Exam Section B<br/>
        Seeded B01–B06 · AY 2026-2027 Sem 1<br/>
        <span id="conn-status">Mode: …</span>
      </p>
    </div>
  </div>`;
}

function sidebar() {
  const items = currentUser.role === "staff"
    ? [
        ["dashboard", "Dashboard"],
        ["scholars", "Scholars"],
        ["submissions", "Submissions"],
        ["audit", "Audit Log"],
      ]
    : [
        ["dashboard", "My Status"],
        ["submit", "Submit Grades"],
        ["submissions", "My Submissions"],
      ];

  return `
  <aside class="sidebar">
    <div class="brand"><div class="logo">🎓</div><span>ScholarTrack</span></div>
    ${items.map(([id, label]) =>
      `<button class="nav-btn ${page === id ? "active" : ""}" data-page="${id}">${label}</button>`
    ).join("")}
    <div style="flex:1"></div>
    <button class="nav-btn" id="btn-logout">Sign out</button>
  </aside>`;
}

function topbar(title) {
  return `
  <div class="topbar">
    <h1>${escape(title)}</h1>
    <div class="user-chip glass">
      ${escape(currentUser.full_name)}
      <span class="badge ${currentUser.role === "staff" ? "badge-staff" : "badge-scholar"}">${currentUser.role}</span>
    </div>
  </div>`;
}

function dashboardView() {
  const isStaff = currentUser.role === "staff";
  let subs = db.submissions;

  if (!isStaff) {
    const myScholar = db.scholars.find((s) => s.user_id === currentUser.user_id)
      || db.scholars.find((s) => s.student_id === "2026-0001" && currentUser.role === "scholar")
      || db.scholars.find((s) => s.full_name === currentUser.full_name);
    if (myScholar) myScholar.user_id = currentUser.user_id;
    subs = myScholar ? db.submissions.filter((s) => s.scholar_id === myScholar.scholar_id) : [];
  }

  const pending = subs.filter((s) => s.verification_status === "pending").length;
  const verified = subs.filter((s) => s.verification_status === "verified").length;
  const compliant = db.evaluations.filter((e) => e.compliance_result === "compliant" && subs.some((s) => s.submission_id === e.submission_id)).length;
  const deficient = db.evaluations.filter((e) => e.compliance_result === "with_deficiency" && subs.some((s) => s.submission_id === e.submission_id)).length;

  return `
  ${topbar(isStaff ? "Dashboard" : "My Scholarship Status")}
  <div class="stats">
    <div class="stat-card glass">
      <div class="label">${isStaff ? "Assigned Scholars" : "My Submissions"}</div>
      <div class="value">${isStaff ? db.scholars.length : subs.length}</div>
    </div>
    <div class="stat-card glass">
      <div class="label">Pending Verification</div>
      <div class="value" style="color:var(--warning)">${pending}</div>
    </div>
    <div class="stat-card glass">
      <div class="label">Compliant</div>
      <div class="value" style="color:var(--success)">${compliant}</div>
    </div>
    <div class="stat-card glass">
      <div class="label">With Deficiency</div>
      <div class="value" style="color:var(--danger)">${deficient}</div>
    </div>
  </div>
  <div class="glass" style="padding:1.25rem">
    <h3 style="margin-bottom:1rem;font-size:1rem">Recent Activity</h3>
    ${db.audit.slice(0, 6).map((a) => `
      <div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.85rem">
        <span>${escape(a.action)} · ${escape(a.entity_type)}</span>
        <span style="color:var(--text-muted)">${new Date(a.created_at).toLocaleString()}</span>
      </div>
    `).join("") || '<p class="empty">No activity yet</p>'}
  </div>`;
}

function scholarsView() {
  return `
  ${topbar("Scholars")}
  <div style="margin-bottom:1.25rem">
    <button class="btn btn-primary" id="btn-add-scholar">+ Register Scholar</button>
  </div>
  <div class="table-wrap glass">
    <table>
      <thead><tr>
        <th>Student ID</th><th>Name</th><th>Program</th><th>Submissions</th>
      </tr></thead>
      <tbody>
        ${db.scholars.map((s) => {
          const prog = getProgram(s.program_id);
          const count = db.submissions.filter((sub) => sub.scholar_id === s.scholar_id).length;
          return `<tr>
            <td>${escape(s.student_id)}</td>
            <td>${escape(s.full_name)}</td>
            <td>${escape(prog?.name)}</td>
            <td>${count}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  </div>`;
}

function submissionsView() {
  const isStaff = currentUser.role === "staff";
  let list = db.submissions;

  if (!isStaff) {
    const my = db.scholars.find((s) => s.user_id === currentUser.user_id)
      || db.scholars.find((s) => s.student_id === "2026-0001" && currentUser.role === "scholar")
      || db.scholars.find((s) => s.full_name === currentUser.full_name);
    if (my) my.user_id = currentUser.user_id;
    list = my ? list.filter((s) => s.scholar_id === my.scholar_id) : [];
  }

  // Filters
  if (searchQ) {
    const q = searchQ.toLowerCase();
    list = list.filter((s) => {
      const sc = getScholar(s.scholar_id);
      return sc?.student_id.toLowerCase().includes(q) || sc?.full_name.toLowerCase().includes(q);
    });
  }
  if (filterProgram !== "all") {
    list = list.filter((s) => getScholar(s.scholar_id)?.program_id === filterProgram);
  }
  if (filterCompliance !== "all") {
    list = list.filter((s) => {
      const ev = db.evaluations.find((e) => e.submission_id === s.submission_id);
      if (filterCompliance === "pending_eval") return s.verification_status === "verified" && !ev;
      return ev?.compliance_result === filterCompliance;
    });
  }

  return `
  ${topbar(isStaff ? "All Submissions" : "My Submissions")}
  <div class="filters">
    <input type="search" id="search-input" placeholder="Search student ID or name…" value="${escape(searchQ)}" />
    ${isStaff ? `
    <select id="filter-program">
      <option value="all">All programs</option>
      ${db.programs.map((p) => `<option value="${p.program_id}" ${filterProgram === p.program_id ? "selected" : ""}>${escape(p.name)}</option>`).join("")}
    </select>
    <select id="filter-compliance">
      <option value="all">All compliance</option>
      <option value="compliant" ${filterCompliance === "compliant" ? "selected" : ""}>Compliant</option>
      <option value="with_deficiency" ${filterCompliance === "with_deficiency" ? "selected" : ""}>With Deficiency</option>
      <option value="pending_eval" ${filterCompliance === "pending_eval" ? "selected" : ""}>Pending evaluation</option>
    </select>` : ""}
  </div>
  <div class="table-wrap glass">
    <table>
      <thead><tr>
        <th>Student</th><th>Program</th><th>GWA</th><th>Units</th>
        <th>Verification</th><th>Compliance</th><th>Renewal</th><th></th>
      </tr></thead>
      <tbody>
        ${list.map((s) => {
          const sc = getScholar(s.scholar_id);
          const prog = getProgram(sc?.program_id);
          const ev = db.evaluations.find((e) => e.submission_id === s.submission_id);
          const ren = db.renewals.find((r) => r.submission_id === s.submission_id);
          return `<tr>
            <td>
              <div style="font-weight:500">${escape(sc?.full_name)}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${escape(sc?.student_id)}</div>
            </td>
            <td>${escape(prog?.name)}</td>
            <td>${Number(s.gwa).toFixed(2)}</td>
            <td>${s.units}</td>
            <td>${statusBadge(s.verification_status)}</td>
            <td>${ev ? statusBadge(ev.compliance_result) : "—"}</td>
            <td>${ren ? statusBadge(ren.decision) : "—"}</td>
            <td><button class="btn btn-ghost" style="padding:0.35rem 0.7rem;font-size:0.8rem" data-view="${s.submission_id}">View</button></td>
          </tr>`;
        }).join("") || '<tr><td colspan="8" class="empty">No submissions found</td></tr>'}
      </tbody>
    </table>
  </div>`;
}

function submitFormView() {
  const isStaff = currentUser.role === "staff";
  return `
  ${topbar("Submit Semester Grades")}
  <div class="glass" style="padding:1.5rem;max-width:640px">
    <form id="submit-form" class="form-grid">
      ${isStaff ? `
      <label class="full">Scholar
        <select name="scholar_id" required>
          <option value="">Select scholar…</option>
          ${db.scholars.map((s) => `<option value="${s.scholar_id}">${escape(s.student_id)} – ${escape(s.full_name)}</option>`).join("")}
        </select>
      </label>` : ""}
      <label>Academic Year
        <select name="academic_year" required>
          <option value="2026-2027">2026-2027</option>
          <option value="2025-2026">2025-2026</option>
        </select>
      </label>
      <label>Semester
        <select name="semester" required>
          <option value="1">1st Semester</option>
          <option value="2">2nd Semester</option>
        </select>
      </label>
      <label>GWA (1.00 – 5.00)
        <input type="number" name="gwa" step="0.01" min="1" max="5" required placeholder="e.g. 1.75" />
      </label>
      <label>Enrolled Units
        <input type="number" name="units" min="0" step="1" required placeholder="e.g. 18" />
      </label>
      <label>Failed Subjects
        <input type="number" name="failed" min="0" step="1" value="0" required />
      </label>
      <label>Incomplete Grades
        <input type="number" name="incomplete" min="0" step="1" value="0" required />
      </label>
      <label>Dropped Subjects
        <input type="number" name="dropped" min="0" step="1" value="0" required />
      </label>
      <label class="full">Grade Document Reference
        <input type="text" name="evidence_ref" required placeholder="e.g. DOC-2026-0001-S1" />
      </label>
      <div class="full" style="margin-top:0.5rem">
        <button type="submit" class="btn btn-primary">Submit Academic Summary</button>
      </div>
    </form>
  </div>`;
}

function auditView() {
  return `
  ${topbar("Audit History")}
  <div class="table-wrap glass">
    <table>
      <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
      <tbody>
        ${db.audit.map((a) => `
          <tr>
            <td style="white-space:nowrap;font-size:0.8rem">${new Date(a.created_at).toLocaleString()}</td>
            <td>${escape(a.actor_name || a.actor_id)}</td>
            <td>${escape(a.action)}</td>
            <td>${escape(a.entity_type)}</td>
            <td style="font-size:0.8rem;color:var(--text-muted)">${escape(JSON.stringify(a.details || {}))}</td>
          </tr>
        `).join("") || '<tr><td colspan="5" class="empty">No audit entries</td></tr>'}
      </tbody>
    </table>
  </div>`;
}

function detailModal() {
  if (!selectedId) return "";
  const sub = db.submissions.find((s) => s.submission_id === selectedId);
  if (!sub) return "";
  const sc = getScholar(sub.scholar_id);
  const prog = getProgram(sc?.program_id);
  const ev = db.evaluations.find((e) => e.submission_id === selectedId);
  const ren = db.renewals.find((r) => r.submission_id === selectedId);
  const isStaff = currentUser.role === "staff";
  const isOwner = sc?.user_id === currentUser.user_id;

  return `
  <div class="modal-overlay" id="modal-overlay">
    <div class="modal glass-strong">
      <h2>${escape(sc?.full_name)} · ${escape(sc?.student_id)}</h2>
      <div class="detail-grid">
        <div class="detail-item"><div class="lbl">Program</div><div class="val">${escape(prog?.name)}</div></div>
        <div class="detail-item"><div class="lbl">Term</div><div class="val">${escape(sub.academic_year)} Sem ${escape(sub.semester)}</div></div>
        <div class="detail-item"><div class="lbl">GWA</div><div class="val">${Number(sub.gwa).toFixed(2)}</div></div>
        <div class="detail-item"><div class="lbl">Units</div><div class="val">${sub.units}</div></div>
        <div class="detail-item"><div class="lbl">Failed / INC / Dropped</div><div class="val">${sub.failed} / ${sub.incomplete} / ${sub.dropped}</div></div>
        <div class="detail-item"><div class="lbl">Evidence</div><div class="val">${escape(sub.evidence_ref)}</div></div>
        <div class="detail-item"><div class="lbl">Submitted</div><div class="val">${new Date(sub.submitted_at).toLocaleString()}</div></div>
        <div class="detail-item"><div class="lbl">Verification</div><div class="val">${statusBadge(sub.verification_status)}</div></div>
      </div>
      ${sub.verification_reason ? `<div class="alert alert-info">Return reason: ${escape(sub.verification_reason)}</div>` : ""}
      ${ev ? `
        <div style="margin:1rem 0">
          <strong>Compliance:</strong> ${statusBadge(ev.compliance_result)}
          ${ev.reasons?.length ? `<ul class="reasons-list">${ev.reasons.map((r) => `<li>${escape(r)}</li>`).join("")}</ul>` : '<p style="color:var(--success);margin-top:0.5rem">All policy checks passed</p>'}
        </div>` : ""}
      ${ren ? `<div style="margin-bottom:1rem"><strong>Renewal:</strong> ${statusBadge(ren.decision)} ${ren.notes ? `– ${escape(ren.notes)}` : ""}</div>` : ""}

      ${isStaff && sub.verification_status === "pending" ? `
        <div style="display:flex;gap:0.75rem;margin-top:1rem">
          <button class="btn btn-success" id="btn-verify">Mark Verified</button>
          <button class="btn btn-danger" id="btn-return">Return with Reason</button>
        </div>
        <div id="return-form" style="display:none;margin-top:1rem">
          <label>Reason<textarea id="return-reason" placeholder="Explain what needs correction…"></textarea></label>
          <button class="btn btn-danger" id="btn-confirm-return" style="margin-top:0.5rem">Confirm Return</button>
        </div>` : ""}

      ${isStaff && sub.verification_status === "verified" && !ev ? `
        <button class="btn btn-primary" id="btn-evaluate" style="margin-top:1rem">Evaluate Compliance</button>` : ""}

      ${isStaff && ev && !ren ? `
        <div style="display:flex;gap:0.75rem;margin-top:1rem;flex-wrap:wrap">
          <button class="btn btn-success" id="btn-approve" ${ev.compliance_result !== "compliant" ? "disabled" : ""}>Approve Renewal</button>
          <button class="btn btn-ghost" id="btn-hold">Hold Renewal</button>
        </div>
        <input type="text" id="renewal-notes" placeholder="Optional notes…" style="margin-top:0.75rem;width:100%" />` : ""}

      ${((isStaff || isOwner) && sub.verification_status === "returned") ? `
        <div style="margin-top:1.25rem;padding-top:1rem;border-top:1px solid var(--glass-border)">
          <h3 style="font-size:0.95rem;margin-bottom:0.75rem">Correct & Resubmit</h3>
          <form id="correct-form" class="form-grid">
            <label>GWA<input type="number" name="gwa" step="0.01" min="1" max="5" value="${sub.gwa}" required /></label>
            <label>Units<input type="number" name="units" min="0" value="${sub.units}" required /></label>
            <label>Failed<input type="number" name="failed" min="0" value="${sub.failed}" required /></label>
            <label>Incomplete<input type="number" name="incomplete" min="0" value="${sub.incomplete}" required /></label>
            <label>Dropped<input type="number" name="dropped" min="0" value="${sub.dropped}" required /></label>
            <label class="full">Evidence Ref<input type="text" name="evidence_ref" value="${escape(sub.evidence_ref)}" required /></label>
            <div class="full"><button type="submit" class="btn btn-primary">Resubmit</button></div>
          </form>
        </div>` : ""}

      <div class="modal-actions">
        <button class="btn btn-ghost" id="btn-close-modal">Close</button>
      </div>
    </div>
  </div>`;
}

function registerModal() {
  if (page !== "scholars" || !window._showRegister) return "";
  return `
  <div class="modal-overlay" id="reg-overlay">
    <div class="modal glass-strong">
      <h2>Register Scholar</h2>
      <form id="reg-form" class="form-grid">
        <label>Student ID<input name="student_id" required placeholder="2026-XXXX" /></label>
        <label>Full Name<input name="full_name" required /></label>
        <label class="full">Scholarship Program
          <select name="program_id" required>
            ${db.programs.map((p) => `<option value="${p.program_id}">${escape(p.name)} (max GWA ${p.max_gwa}, min units ${p.min_units})</option>`).join("")}
          </select>
        </label>
        <div class="full modal-actions">
          <button type="button" class="btn btn-ghost" id="btn-cancel-reg">Cancel</button>
          <button type="submit" class="btn btn-primary">Register</button>
        </div>
      </form>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
// Render & events
// ─────────────────────────────────────────────
function render() {
  const app = document.getElementById("app");
  if (!currentUser) {
    app.innerHTML = loginView();
    document.getElementById("btn-staff")?.addEventListener("click", () => loginAs("staff"));
    document.getElementById("btn-scholar")?.addEventListener("click", () => loginAs("scholar"));
    document.getElementById("login-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      loginWithCredentials(fd.get("email"), fd.get("password"));
    });
    return;
  }

  let content = "";
  if (page === "dashboard") content = dashboardView();
  else if (page === "scholars") content = scholarsView();
  else if (page === "submissions") content = submissionsView();
  else if (page === "submit") content = submitFormView();
  else if (page === "audit") content = auditView();

  app.innerHTML = `
  <div class="layout">
    ${sidebar()}
    <main class="main">
      ${toast ? `<div class="alert alert-${toast.type === "error" ? "error" : toast.type === "success" ? "success" : "info"}">${escape(toast.msg)}</div>` : ""}
      ${content}
    </main>
  </div>
  ${detailModal()}
  ${registerModal()}`;

  bindEvents();
}

function bindEvents() {
  document.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => { page = btn.dataset.page; selectedId = null; render(); });
  });
  document.getElementById("btn-logout")?.addEventListener("click", logout);

  document.getElementById("btn-add-scholar")?.addEventListener("click", () => {
    window._showRegister = true; render();
  });
  document.getElementById("btn-cancel-reg")?.addEventListener("click", () => {
    window._showRegister = false; render();
  });
  document.getElementById("reg-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    registerScholar(Object.fromEntries(fd));
    window._showRegister = false;
  });

  document.getElementById("submit-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    submitGrades(Object.fromEntries(fd));
  });

  document.getElementById("search-input")?.addEventListener("input", (e) => {
    searchQ = e.target.value; render();
  });
  document.getElementById("filter-program")?.addEventListener("change", (e) => {
    filterProgram = e.target.value; render();
  });
  document.getElementById("filter-compliance")?.addEventListener("change", (e) => {
    filterCompliance = e.target.value; render();
  });

  document.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => { selectedId = btn.dataset.view; render(); });
  });
  document.getElementById("btn-close-modal")?.addEventListener("click", () => { selectedId = null; render(); });
  document.getElementById("modal-overlay")?.addEventListener("click", (e) => {
    if (e.target.id === "modal-overlay") { selectedId = null; render(); }
  });

  document.getElementById("btn-verify")?.addEventListener("click", () => verifySubmission(selectedId, "verified"));
  document.getElementById("btn-return")?.addEventListener("click", () => {
    document.getElementById("return-form").style.display = "block";
  });
  document.getElementById("btn-confirm-return")?.addEventListener("click", () => {
    const reason = document.getElementById("return-reason")?.value;
    verifySubmission(selectedId, "returned", reason);
  });
  document.getElementById("btn-evaluate")?.addEventListener("click", () => runEvaluation(selectedId));
  document.getElementById("btn-approve")?.addEventListener("click", () => {
    const notes = document.getElementById("renewal-notes")?.value;
    recordRenewal(selectedId, "approved", notes);
  });
  document.getElementById("btn-hold")?.addEventListener("click", () => {
    const notes = document.getElementById("renewal-notes")?.value;
    recordRenewal(selectedId, "held", notes);
  });
  document.getElementById("correct-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    resubmitCorrection(selectedId, Object.fromEntries(fd));
  });
}

// Boot
(async () => {
  await initData();
  if (isLive()) {
    try {
      const profile = await getSessionProfile();
      if (profile) {
        currentUser = {
          user_id: profile.user_id,
          full_name: profile.full_name,
          role: profile.role,
          email: profile.email,
        };
        bindScholarToAuthUser(currentUser);
      }
    } catch (_) {}
  }
  render();
  const el = document.getElementById("conn-status");
  if (el) {
    const status = getConnectionStatus();
    el.textContent = status === "live"
      ? "Mode: live (Supabase Auth)"
      : status === "error"
        ? "Mode: demo (Supabase unreachable)"
        : "Mode: demo";
  }
})();
