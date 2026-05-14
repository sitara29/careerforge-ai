import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from "react";

export const Route = createFileRoute("/")({
  component: CareerForgeApp,
  head: () => ({
    meta: [
      { title: "CareerForge AI — Know Your Interview Readiness Score" },
      {
        name: "description",
        content:
          "Get a brutally honest recruiter-grade assessment of your interview readiness in under 2 minutes. Free, no signup.",
      },
      { property: "og:title", content: "CareerForge AI" },
      {
        property: "og:description",
        content: "AI-powered recruiter simulation, ambush questions, and a 7-day action plan.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
});

type StepId = "upload" | "role" | "assess" | "loading" | "results";

interface RoleDef {
  id: string;
  label: string;
  icon: string;
  avg: number;
}

interface QuestionDef {
  id: string;
  text: string;
  options: string[];
}

type MonologueType = "good" | "bad" | "warn" | "verdict";

interface Result {
  score: number;
  resume_score: number;
  technical_score: number;
  projects_score: number;
  communication_score: number;
  strengths: string[];
  weaknesses: string[];
  missing_skills: string[];
  recruiter_monologue: { type: MonologueType; text: string }[];
  ambush_questions: { q: string; reason: string }[];
  nearest_miss: { action: string; points: number }[];
  recruiter_concerns: string[];
  roadmap: { day: string; task: string; icon: string }[];
}

const ROLES: RoleDef[] = [
  { id: "sde", label: "Software Engineer", icon: "💻", avg: 71 },
  { id: "frontend", label: "Frontend Developer", icon: "🎨", avg: 68 },
  { id: "backend", label: "Backend Developer", icon: "⚙️", avg: 70 },
  { id: "data", label: "Data Analyst", icon: "📊", avg: 66 },
  { id: "product", label: "Product Manager", icon: "📱", avg: 64 },
];

const QUESTIONS: QuestionDef[] = [
  { id: "dsa", text: "Rate your DSA / Problem Solving skills", options: ["Beginner", "Intermediate", "Strong", "Expert"] },
  { id: "projects", text: "How many personal projects have you built?", options: ["None", "1–2 projects", "3–5 projects", "5+ projects"] },
  { id: "mock", text: "Have you done mock interviews before?", options: ["Never", "Once or twice", "Several times", "Regularly"] },
  { id: "communication", text: "How confident are you explaining your projects?", options: ["Not confident", "Somewhat", "Confident", "Very confident"] },
  { id: "portfolio", text: "Is your work visible online? (GitHub / Portfolio)", options: ["Nothing online", "GitHub only", "Portfolio only", "Both"] },
];

const LOADING_MSGS = [
  "Parsing your resume...",
  "Evaluating role fit...",
  "Running recruiter simulation...",
  "Benchmarking against 10,000+ profiles...",
  "Predicting interview ambush questions...",
  "Calculating hiring probability...",
  "Generating your personalized roadmap...",
];

const MOCK_RESULT: Result = {
  score: 74,
  resume_score: 18,
  technical_score: 16,
  projects_score: 22,
  communication_score: 18,
  strengths: [
    "Strong project portfolio shows real-world experience",
    "Resume is well-structured and readable",
    "Online presence gives recruiters easy access to your work",
  ],
  weaknesses: [
    "DSA skills need significant improvement for tech interviews",
    "No mock interview experience creates confidence gaps under pressure",
    "Resume lacks quantified achievements recruiters look for",
  ],
  missing_skills: [
    "LeetCode Practice",
    "System Design Basics",
    "Behavioral STAR Method",
    "SQL Fundamentals",
    "REST API Design",
    "Git Best Practices",
  ],
  recruiter_monologue: [
    { type: "bad", text: "No impact numbers anywhere — this looks like a task list, not achievements." },
    { type: "bad", text: "3 projects but none are deployed with a live URL. I can't show this to the hiring manager." },
    { type: "good", text: "GitHub is active and recent — at least they code regularly." },
    { type: "warn", text: "Strong on frontend but zero backend mentions — risky for a full-stack role." },
    { type: "bad", text: "No mention of team projects or collaboration. Red flag for culture fit." },
    { type: "verdict", text: "Would NOT shortlist today. Would reconsider with 2 targeted resume fixes." },
  ],
  ambush_questions: [
    { q: "You listed React but show no deployed frontend projects — walk me through a component you built from scratch.", reason: "Weak project deployment score" },
    { q: "How would you design a URL shortener like bit.ly at scale?", reason: "System design score is low" },
    { q: "Tell me about a time you disagreed with a teammate and how you resolved it.", reason: "No team collaboration evidence found" },
  ],
  nearest_miss: [
    { action: "Add 3 impact numbers to resume (e.g. 'reduced load time by 40%')", points: 4 },
    { action: "Deploy one project with a live URL and add it to resume", points: 4 },
    { action: "Solve 10 LeetCode Easy problems this week", points: 3 },
  ],
  recruiter_concerns: [
    "No measurable impact statements in resume",
    "Limited evidence of collaborative or team projects",
  ],
  roadmap: [
    { day: "Day 1–2", task: "Rewrite 3 resume bullets with numbers and impact", icon: "📄" },
    { day: "Day 3–4", task: "Solve 15 LeetCode Easy problems (Arrays + Strings)", icon: "💻" },
    { day: "Day 5", task: "Record a 2-min self-introduction and watch it back", icon: "🎥" },
    { day: "Day 6", task: "Read Grokking System Design — Chapters 1 & 2", icon: "📚" },
    { day: "Day 7", task: "Give one full mock interview on Pramp or with a friend", icon: "🎯" },
  ],
};

// ── Local mock analysis: deterministic from answers + role + resume presence ──
function generateMockResult(
  role: string | null,
  answers: Record<string, string>,
  hasResume: boolean,
): Result {
  const idx = (qid: string) => {
    const q = QUESTIONS.find((x) => x.id === qid);
    if (!q) return 0;
    return Math.max(0, q.options.indexOf(answers[qid] ?? ""));
  };
  const dsa = idx("dsa");
  const projects = idx("projects");
  const mock = idx("mock");
  const comm = idx("communication");
  const port = idx("portfolio");

  const technical_score = Math.min(25, 6 + dsa * 5);
  const projects_score = Math.min(25, 8 + projects * 4 + (port >= 2 ? 2 : 0));
  const communication_score = Math.min(25, 8 + comm * 4 + mock * 1);
  const resume_score = Math.min(25, (hasResume ? 16 : 7) + port * 2 + projects);
  const score = Math.min(
    99,
    Math.round(((technical_score + projects_score + communication_score + resume_score) / 100) * 100),
  );

  const strengths: string[] = [];
  if (dsa >= 2) strengths.push("Solid DSA foundation — interviewers will trust your problem-solving signal.");
  if (projects >= 2) strengths.push("Healthy project count gives concrete talking points in interviews.");
  if (comm >= 2) strengths.push("Confident communication helps you sell your work clearly under pressure.");
  if (port >= 2) strengths.push("Online presence makes it easy for recruiters to verify your work.");
  if (mock >= 2) strengths.push("Mock interview reps reduce panic in the real thing.");
  if (hasResume) strengths.push("Uploaded resume gives recruiters concrete material to evaluate against.");
  while (strengths.length < 3) strengths.push(MOCK_RESULT.strengths[strengths.length]);

  const weaknesses: string[] = [];
  if (dsa <= 1) weaknesses.push("DSA skills need significant improvement for tech screens.");
  if (projects <= 1) weaknesses.push("Project portfolio is thin — recruiters need 3+ deployed builds.");
  if (mock <= 1) weaknesses.push("Limited mock interview practice creates confidence gaps under pressure.");
  if (comm <= 1) weaknesses.push("Low confidence explaining projects will hurt behavioral rounds.");
  if (port <= 1) weaknesses.push("Weak online footprint — recruiters can't validate your claims.");
  if (!hasResume) weaknesses.push("No resume uploaded — recruiters have nothing tangible to skim.");
  while (weaknesses.length < 3) weaknesses.push(MOCK_RESULT.weaknesses[weaknesses.length]);

  const missing: string[] = [];
  if (dsa <= 1) missing.push("LeetCode Practice", "Big-O Analysis");
  if (projects <= 2) missing.push("End-to-end Deployment");
  if (comm <= 1) missing.push("Behavioral STAR Method");
  if (port <= 1) missing.push("GitHub README Polish");
  missing.push("System Design Basics", "REST API Design", "Git Best Practices", "SQL Fundamentals");
  const missing_skills = Array.from(new Set(missing)).slice(0, 7);

  const monologue: Result["recruiter_monologue"] = [];
  monologue.push(
    projects >= 2
      ? { type: "good", text: "Project section is meaty — at least there's something to discuss." }
      : { type: "bad", text: "Barely any projects listed. Hard to picture them shipping anything." },
  );
  monologue.push(
    port >= 2
      ? { type: "good", text: "GitHub + portfolio link present — I can verify in 30 seconds." }
      : { type: "bad", text: "No live links or GitHub. Nothing for me to verify." },
  );
  monologue.push(
    dsa >= 2
      ? { type: "warn", text: "Claims strong DSA — let's see if the screen backs that up." }
      : { type: "bad", text: "DSA looks shaky. Will likely fail the first coding screen." },
  );
  monologue.push(
    comm >= 2
      ? { type: "good", text: "Sounds articulate on paper. Should handle behavioral round fine." }
      : { type: "warn", text: "Communication signal unclear. Recruiter screen will tell." },
  );
  monologue.push(
    hasResume
      ? { type: "good", text: "Actual resume PDF attached — at least I have something concrete to skim before the call." }
      : { type: "bad", text: "No resume on file. I'm judging entirely off self-claims, which is a yellow flag." },
  );
  monologue.push({
    type: "bad",
    text: hasResume
      ? "Resume is here but I see no quantified impact — reads like a task list, not achievements."
      : "Without a resume I can't even check for impact statements — has to be inferred.",
  });
  monologue.push(
    score >= 75
      ? { type: "verdict", text: "Worth a phone screen. Forwarding to the hiring manager today." }
      : score >= 60
        ? { type: "verdict", text: "Borderline. Would reconsider with 2 targeted resume fixes." }
        : { type: "verdict", text: "Would NOT shortlist today. Major gaps to close first." },
  );

  const ambush: Result["ambush_questions"] = [];
  if (dsa <= 1)
    ambush.push({
      q: "Given an array of integers, find two numbers that sum to a target. Walk me through brute force, then optimize.",
      reason: "DSA self-rating is low — expect a fundamentals screen.",
    });
  if (projects <= 1 || port <= 1)
    ambush.push({
      q: "Pick your most complex project and walk me through the architecture decisions you made.",
      reason: "Few visible projects — interviewer will probe depth on whatever exists.",
    });
  if (mock <= 1 || comm <= 1)
    ambush.push({
      q: "Tell me about a time you disagreed with a teammate and how you resolved it.",
      reason: "Limited interview practice — behavioral questions are where most candidates freeze.",
    });
  while (ambush.length < 3) ambush.push(MOCK_RESULT.ambush_questions[ambush.length]);

  const nearest_miss: Result["nearest_miss"] = [
    { action: "Add 3 impact numbers to resume (e.g. 'reduced load time by 40%')", points: 4 },
    projects <= 2
      ? { action: "Deploy one project with a live URL and add it to resume", points: 4 }
      : { action: "Add a 2-line summary + tech stack to your top GitHub project", points: 3 },
    dsa <= 1
      ? { action: "Solve 10 LeetCode Easy problems this week", points: 3 }
      : { action: "Solve 5 LeetCode Medium problems on Arrays + Trees this week", points: 3 },
  ];

  const recruiter_concerns: string[] = [];
  if (!hasResume) recruiter_concerns.push("No resume uploaded — evaluation relies on self-reported signal only.");
  if (resume_score < 18) recruiter_concerns.push(
    hasResume
      ? "Uploaded resume lacks measurable impact statements."
      : "Resume evidence missing — impact claims unverifiable.",
  );
  if (projects_score < 18) recruiter_concerns.push("Limited evidence of shipped, deployed work.");
  if (recruiter_concerns.length < 2)
    recruiter_concerns.push("Limited evidence of collaborative or team projects.");

  const roadmap: Result["roadmap"] = [
    { day: "Day 1–2", task: "Rewrite 3 resume bullets with numbers and impact", icon: "📄" },
    {
      day: "Day 3–4",
      task: dsa <= 1 ? "Solve 15 LeetCode Easy problems (Arrays + Strings)" : "Solve 8 LeetCode Mediums (Trees + Graphs)",
      icon: "💻",
    },
    { day: "Day 5", task: "Record a 2-min self-introduction and watch it back", icon: "🎥" },
    {
      day: "Day 6",
      task:
        role === "frontend"
          ? "Build + deploy a small UI component library demo"
          : role === "data"
            ? "Complete one end-to-end SQL + chart case study"
            : "Read Grokking System Design — Chapters 1 & 2",
      icon: "📚",
    },
    { day: "Day 7", task: "Give one full mock interview on Pramp or with a friend", icon: "🎯" },
  ];

  return {
    score,
    resume_score,
    technical_score,
    projects_score,
    communication_score,
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    missing_skills,
    recruiter_monologue: monologue,
    ambush_questions: ambush.slice(0, 3),
    nearest_miss,
    recruiter_concerns: recruiter_concerns.slice(0, 2),
    roadmap,
  };
}

function computeHiring(score: number) {
  return {
    startup: Math.min(95, score + 15),
    mid: Math.max(5, score - 5),
    faang: Math.max(5, score - 30),
  };
}

function getLabel(score: number) {
  if (score < 40) return { label: "Needs Work", color: "#ef4444" };
  if (score < 60) return { label: "Developing", color: "#f97316" };
  if (score < 75) return { label: "Almost Ready", color: "#eab308" };
  if (score < 88) return { label: "Interview Ready", color: "#22c55e" };
  return { label: "Top Candidate", color: "#a855f7" };
}

function CircleScore({ score, size = 160 }: { score: number; size?: number }) {
  const { label, color } = getLabel(score);
  const r = 58;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e1e2e" strokeWidth={10} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div
        style={{
          marginTop: -size * 0.62,
          fontSize: 40,
          fontWeight: 800,
          color,
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        {score}
      </div>
      <div
        style={{
          marginTop: size * 0.12,
          fontSize: 13,
          fontWeight: 600,
          color,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function MiniBar({ value, max = 25, color }: { value: number; max?: number; color: string }) {
  return (
    <div style={{ background: "#1e1e2e", borderRadius: 4, height: 6, width: "100%", overflow: "hidden" }}>
      <div
        style={{
          width: `${(value / max) * 100}%`,
          height: "100%",
          background: color,
          borderRadius: 4,
          transition: "width 1s ease",
        }}
      />
    </div>
  );
}

function Tag({ children, color = "#7c3aed" }: { children: ReactNode; color?: string }) {
  return (
    <span
      style={{
        background: color + "22",
        color,
        border: `1px solid ${color}44`,
        borderRadius: 20,
        padding: "4px 12px",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

function Card({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid #1f2937",
        borderRadius: 16,
        padding: "20px 24px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children, accent }: { children: ReactNode; accent?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <div style={{ width: 3, height: 18, background: accent || "#7c3aed", borderRadius: 2 }} />
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f1f5f9", letterSpacing: 0.3 }}>
        {children}
      </h3>
    </div>
  );
}

function CareerForgeApp() {
  const [step, setStep] = useState<StepId>("upload");
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [loadingIdx, setLoadingIdx] = useState(0);
  const [error, setError] = useState("");
  const [animateScore, setAnimateScore] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (step === "loading") {
      let i = 0;
      const t = setInterval(() => {
        i++;
        setLoadingIdx(i);
        if (i >= LOADING_MSGS.length - 1) clearInterval(t);
      }, 800);
      return () => clearInterval(t);
    }
  }, [step]);

  useEffect(() => {
    if (step === "results") {
      const t = setTimeout(() => setAnimateScore(true), 300);
      return () => clearTimeout(t);
    }
    setAnimateScore(false);
  }, [step]);

  function runAnalysis() {
    setStep("loading");
    setLoadingIdx(0);
    // Mock-only: simulate the full loader cycle, then compute deterministic result locally.
    const totalDelay = LOADING_MSGS.length * 800 + 400;
    setTimeout(() => {
      try {
        const generated = generateMockResult(role, answers, !!resumeText);
        setResult(generated);
      } catch (e) {
        console.error(e);
        setResult(MOCK_RESULT);
      }
      setStep("results");
    }, totalDelay);
  }

  function handleFile(file: File | undefined | null) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      return;
    }
    setFileName(file.name);
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      setResumeText(
        `[PDF uploaded: ${file.name}] — candidate has uploaded their resume. Evaluation uses self-assessment since text extraction is not available client-side.`,
      );
    };
    reader.readAsArrayBuffer(file);
  }

  const allAnswered = QUESTIONS.every((q) => answers[q.id]);
  const hiring = result ? computeHiring(result.score) : null;
  const roleObj = ROLES.find((r) => r.id === role);
  const nearMissTotal = result?.nearest_miss?.reduce((a, b) => a + b.points, 0) || 0;

  // ── LANDING ──
  if (step === "upload")
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0a0a0f 0%, #0d0d1a 50%, #0a0f0a 100%)",
          fontFamily: "'Space Grotesk', 'Segoe UI', sans-serif",
          color: "#f1f5f9",
        }}
      >
        <nav
          style={{
            padding: "20px 40px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #1f2937",
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              background: "linear-gradient(90deg, #7c3aed, #2563eb)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            CareerForge AI
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#6b7280",
              background: "#111827",
              border: "1px solid #1f2937",
              padding: "6px 14px",
              borderRadius: 20,
            }}
          >
            Free · No signup required
          </div>
        </nav>

        <div style={{ maxWidth: 800, margin: "0 auto", padding: "80px 24px 40px", textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              background: "#7c3aed22",
              border: "1px solid #7c3aed44",
              color: "#a78bfa",
              fontSize: 12,
              fontWeight: 600,
              padding: "6px 16px",
              borderRadius: 20,
              marginBottom: 24,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            AI-Powered · Under 2 Minutes
          </div>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 20px" }}>
            Know Your Interview
            <br />
            <span
              style={{
                background: "linear-gradient(90deg, #7c3aed, #2563eb, #06b6d4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Readiness Score
            </span>
          </h1>
          <p style={{ fontSize: 18, color: "#94a3b8", maxWidth: 540, margin: "0 auto 40px", lineHeight: 1.7 }}>
            Get a brutally honest recruiter-grade assessment before your real interview. See what they actually
            think reading your resume.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 40, marginBottom: 48, flexWrap: "wrap" }}>
            {(
              [
                ["~2 min", "Assessment Time"],
                ["25 pts", "Per Scoring Pillar"],
                ["7-day", "Action Roadmap"],
                ["100%", "Runs Locally"],
              ] as const
            ).map(([v, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#a78bfa" }}>{v}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files[0]);
            }}
            style={{
              border: `2px dashed ${fileName ? "#22c55e" : "#374151"}`,
              borderRadius: 20,
              padding: "40px 24px",
              cursor: "pointer",
              background: fileName ? "#052e16" : "#0d1117",
              transition: "all 0.2s",
              marginBottom: 16,
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {fileName ? (
              <div>
                <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#22c55e" }}>{fileName}</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                  Resume uploaded — click to change
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>Drop your resume PDF here</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>or click to browse · PDF only</div>
              </div>
            )}
          </div>

          {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 auto 24px", maxWidth: 400 }}>
            <div style={{ flex: 1, height: 1, background: "#1f2937" }} />
            <span style={{ fontSize: 13, color: "#6b7280" }}>or continue without resume</span>
            <div style={{ flex: 1, height: 1, background: "#1f2937" }} />
          </div>

          <button
            onClick={() => setStep("role")}
            style={{
              background: "linear-gradient(90deg, #7c3aed, #2563eb)",
              border: "none",
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              padding: "16px 48px",
              borderRadius: 12,
              cursor: "pointer",
              width: "100%",
              maxWidth: 400,
            }}
          >
            Start Free Assessment →
          </button>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
              marginTop: 60,
              textAlign: "left",
            }}
          >
            {(
              [
                ["🎭", "Recruiter's Inner Monologue", "See exactly what a recruiter thinks reading your profile for the first 10 seconds."],
                ["⚡", "Interview Ambush Predictor", "Know the 3 exact questions you'll be asked based on your specific gaps."],
                ["🎯", "Nearest Miss Analysis", "See exactly what 3 actions push you past the shortlisting threshold."],
                ["📊", "Hiring Probability Score", "Your real chance at startups, mid-size, and FAANG companies."],
              ] as const
            ).map(([icon, title, desc]) => (
              <Card key={title} style={{ padding: "20px" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>{desc}</div>
              </Card>
            ))}
          </div>
        </div>

        <div
          style={{
            textAlign: "center",
            padding: "24px",
            borderTop: "1px solid #1f2937",
            color: "#374151",
            fontSize: 12,
            marginTop: 40,
          }}
        >
          CareerForge AI © 2026 · Built for AI CareerForge Hackathon
        </div>
      </div>
    );

  // ── ROLE SELECTION ──
  if (step === "role")
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0f",
          fontFamily: "'Space Grotesk', sans-serif",
          color: "#f1f5f9",
          padding: "40px 24px",
        }}
      >
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: "#6b7280" }}>Step 1 of 3</div>
          <div style={{ background: "#1f2937", borderRadius: 4, height: 4, marginBottom: 32 }}>
            <div
              style={{
                width: "33%",
                height: "100%",
                background: "linear-gradient(90deg, #7c3aed, #2563eb)",
                borderRadius: 4,
              }}
            />
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>What role are you targeting?</h2>
          <p style={{ color: "#6b7280", marginBottom: 32 }}>
            This personalizes your recruiter simulation and benchmark comparison.
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            {ROLES.map((r) => (
              <div
                key={r.id}
                onClick={() => setRole(r.id)}
                style={{
                  background: role === r.id ? "#1e1b4b" : "#111827",
                  border: `2px solid ${role === r.id ? "#7c3aed" : "#1f2937"}`,
                  borderRadius: 14,
                  padding: "18px 24px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 24 }}>{r.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{r.label}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Avg readiness score: {r.avg}/100</div>
                  </div>
                </div>
                {role === r.id && (
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      background: "#7c3aed",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      color: "#fff",
                    }}
                  >
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            disabled={!role}
            onClick={() => setStep("assess")}
            style={{
              marginTop: 24,
              width: "100%",
              padding: "16px",
              background: role ? "linear-gradient(90deg, #7c3aed, #2563eb)" : "#1f2937",
              border: "none",
              borderRadius: 12,
              color: role ? "#fff" : "#374151",
              fontSize: 15,
              fontWeight: 700,
              cursor: role ? "pointer" : "not-allowed",
            }}
          >
            Continue →
          </button>
        </div>
        <div style={{ textAlign: "center", padding: "24px", borderTop: "1px solid #1f2937", color: "#374151", fontSize: 12, marginTop: 40 }}>
          CareerForge AI © 2026 · Built for AI CareerForge Hackathon
        </div>
      </div>
    );
  if (step === "assess")
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0f",
          fontFamily: "'Space Grotesk', sans-serif",
          color: "#f1f5f9",
          padding: "40px 24px",
        }}
      >
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: "#6b7280" }}>Step 2 of 3</div>
          <div style={{ background: "#1f2937", borderRadius: 4, height: 4, marginBottom: 32 }}>
            <div
              style={{
                width: "66%",
                height: "100%",
                background: "linear-gradient(90deg, #7c3aed, #2563eb)",
                borderRadius: 4,
              }}
            />
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Quick self-assessment</h2>
          <p style={{ color: "#6b7280", marginBottom: 32 }}>
            Be honest — this is what makes the AI feedback accurate.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {QUESTIONS.map((q, qi) => (
              <Card key={q.id}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 14 }}>
                  <span style={{ color: "#7c3aed", marginRight: 8 }}>Q{qi + 1}.</span>
                  {q.text}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {q.options.map((opt) => (
                    <div
                      key={opt}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                      style={{
                        background: answers[q.id] === opt ? "#1e1b4b" : "#0d1117",
                        border: `1.5px solid ${answers[q.id] === opt ? "#7c3aed" : "#1f2937"}`,
                        borderRadius: 10,
                        padding: "10px 14px",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: answers[q.id] === opt ? 700 : 400,
                        color: answers[q.id] === opt ? "#a78bfa" : "#94a3b8",
                        transition: "all 0.12s",
                      }}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
          <button
            disabled={!allAnswered}
            onClick={runAnalysis}
            style={{
              marginTop: 24,
              width: "100%",
              padding: "16px",
              background: allAnswered ? "linear-gradient(90deg, #7c3aed, #2563eb)" : "#1f2937",
              border: "none",
              borderRadius: 12,
              color: allAnswered ? "#fff" : "#374151",
              fontSize: 15,
              fontWeight: 700,
              cursor: allAnswered ? "pointer" : "not-allowed",
            }}
          >
            Generate My Readiness Report →
          </button>
        </div>
      </div>
    );

  // ── LOADING ──
  if (step === "loading")
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0f",
          fontFamily: "'Space Grotesk', sans-serif",
          color: "#f1f5f9",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
        }}
      >
        <style>{`@keyframes cf-spin { to { transform: rotate(360deg); }}`}</style>
        <div style={{ position: "relative", width: 80, height: 80 }}>
          <svg width="80" height="80" style={{ animation: "cf-spin 1.2s linear infinite" }}>
            <circle cx="40" cy="40" r="32" fill="none" stroke="#1f2937" strokeWidth="4" />
            <circle
              cx="40"
              cy="40"
              r="32"
              fill="none"
              stroke="url(#cf-grad)"
              strokeWidth="4"
              strokeDasharray="80 120"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="cf-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Analyzing your profile...</h2>
          <p style={{ color: "#7c3aed", fontSize: 15, minHeight: 24, transition: "all 0.3s" }}>
            {LOADING_MSGS[Math.min(loadingIdx, LOADING_MSGS.length - 1)]}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {LOADING_MSGS.map((_, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: i <= loadingIdx ? "#7c3aed" : "#1f2937",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>
      </div>
    );

  // ── RESULTS ──
  if (step === "results" && result && hiring) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0f",
          fontFamily: "'Space Grotesk', sans-serif",
          color: "#f1f5f9",
        }}
      >
        <div
          style={{
            background: "#0d1117",
            borderBottom: "1px solid #1f2937",
            padding: "16px 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              background: "linear-gradient(90deg, #7c3aed, #2563eb)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            CareerForge AI
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => {
                setStep("upload");
                setResult(null);
                setAnswers({});
                setRole(null);
                setFileName("");
                setResumeText("");
              }}
              style={{
                background: "#111827",
                border: "1px solid #374151",
                color: "#94a3b8",
                padding: "8px 16px",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              ↺ Retake
            </button>
            <button
              onClick={() => window.print()}
              style={{
                background: "linear-gradient(90deg, #7c3aed, #2563eb)",
                border: "none",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              ↓ Download Report
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
          <Card
            style={{
              background: "linear-gradient(135deg, #0d0d1a, #1a0d2e)",
              border: "1px solid #2d1b69",
              marginBottom: 24,
              textAlign: "center",
              padding: "40px 24px",
            }}
          >
            <div style={{ marginBottom: 8, fontSize: 13, color: "#6b7280" }}>
              {roleObj?.label} · {roleObj?.icon} · Assessed just now
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              {animateScore && <CircleScore score={result.score} />}
            </div>
            <div style={{ fontSize: 14, color: "#94a3b8" }}>
              Better than{" "}
              <span style={{ color: "#a78bfa", fontWeight: 700 }}>{Math.max(5, result.score - 10)}%</span> of{" "}
              {roleObj?.label} applicants
            </div>
          </Card>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 24,
            }}
          >
            {(
              [
                ["Resume Quality", result.resume_score, "#06b6d4"],
                ["Technical Skills", result.technical_score, "#7c3aed"],
                ["Project Portfolio", result.projects_score, "#22c55e"],
                ["Communication", result.communication_score, "#f97316"],
              ] as const
            ).map(([label, val, color]) => (
              <Card key={label} style={{ padding: "16px 20px" }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color, marginBottom: 8 }}>
                  {val}
                  <span style={{ fontSize: 14, color: "#374151", fontWeight: 400 }}>/25</span>
                </div>
                <MiniBar value={val} color={color} />
              </Card>
            ))}
          </div>

          <Card style={{ marginBottom: 24 }}>
            <SectionTitle accent="#22c55e">📊 Your Hiring Probability by Company Tier</SectionTitle>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
              }}
            >
              {(
                [
                  ["🚀 Startups", hiring.startup, "#22c55e", "Fast-moving, value potential"],
                  ["🏢 Mid-size", hiring.mid, "#06b6d4", "Structured hiring, balanced bar"],
                  ["💎 FAANG+", hiring.faang, "#a855f7", "High bar, system design focus"],
                ] as const
              ).map(([tier, pct, c, desc]) => (
                <div
                  key={tier}
                  style={{ background: "#0d1117", borderRadius: 12, padding: "20px", textAlign: "center" }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{tier}</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: c, margin: "8px 0" }}>{pct}%</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{desc}</div>
                  <div
                    style={{
                      background: "#1f2937",
                      borderRadius: 4,
                      height: 6,
                      marginTop: 12,
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ width: `${pct}%`, height: "100%", background: c, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: "#374151" }}>
              Based on typical screening benchmarks for {roleObj?.label} roles
            </div>
          </Card>

          <Card style={{ marginBottom: 24, border: "1px solid #374151" }}>
            <SectionTitle accent="#ef4444">🎭 Recruiter's Inner Monologue</SectionTitle>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20, marginTop: -8 }}>
              What a recruiter actually thinks reading your profile for the first 10 seconds...
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {result.recruiter_monologue?.map((item, i) => {
                const cfg = (
                  {
                    good: { bg: "#052e16", border: "#166534", icon: "✅", color: "#86efac" },
                    bad: { bg: "#1c0a0a", border: "#7f1d1d", icon: "❌", color: "#fca5a5" },
                    warn: { bg: "#1c1600", border: "#78350f", icon: "⚠️", color: "#fcd34d" },
                    verdict: { bg: "#1a0a2e", border: "#581c87", icon: "🔴", color: "#c084fc" },
                  } as const
                )[item.type] ?? { bg: "#111", border: "#222", icon: "•", color: "#fff" };
                return (
                  <div
                    key={i}
                    style={{
                      background: cfg.bg,
                      border: `1px solid ${cfg.border}`,
                      borderRadius: 10,
                      padding: "12px 16px",
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                    <span
                      style={{
                        fontSize: 13,
                        color: cfg.color,
                        lineHeight: 1.6,
                        fontStyle: item.type === "verdict" ? "italic" : "normal",
                        fontWeight: item.type === "verdict" ? 600 : 400,
                      }}
                    >
                      {item.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card style={{ marginBottom: 24 }}>
            <SectionTitle accent="#f97316">⚡ Interview Ambush Predictor</SectionTitle>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20, marginTop: -8 }}>
              Based on your gaps, these are the exact questions you'll be asked — and likely struggle with.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {result.ambush_questions?.map((item, i) => (
                <div
                  key={i}
                  style={{
                    background: "#0d1117",
                    border: "1px solid #1f2937",
                    borderLeft: "3px solid #f97316",
                    borderRadius: 10,
                    padding: "16px 20px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#e2e8f0",
                      marginBottom: 8,
                      lineHeight: 1.5,
                    }}
                  >
                    Q{i + 1}: "{item.q}"
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    <span style={{ color: "#f97316" }}>Why you'll get this: </span>
                    {item.reason}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ marginBottom: 24, border: "1px solid #1e3a5f" }}>
            <SectionTitle accent="#06b6d4">🎯 Nearest Miss Analysis</SectionTitle>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20, marginTop: -8 }}>
              You are{" "}
              <span style={{ color: "#06b6d4", fontWeight: 700 }}>{nearMissTotal} points</span> away from the next
              level. Do these 3 things:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {result.nearest_miss?.map((item, i) => (
                <div
                  key={i}
                  style={{
                    background: "#0a1628",
                    border: "1px solid #1e3a5f",
                    borderRadius: 10,
                    padding: "14px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.5 }}>→ {item.action}</div>
                  <div
                    style={{
                      background: "#06b6d422",
                      color: "#06b6d4",
                      border: "1px solid #06b6d444",
                      borderRadius: 8,
                      padding: "4px 12px",
                      fontSize: 13,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    +{item.points} pts
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 16,
                background: "#052e16",
                border: "1px solid #166534",
                borderRadius: 10,
                padding: "12px 18px",
                fontSize: 14,
                color: "#86efac",
                fontWeight: 600,
              }}
            >
              ✅ Projected new score: {result.score + nearMissTotal}/100 · New startup hiring probability:{" "}
              {Math.min(95, hiring.startup + 8)}%
            </div>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <Card>
              <SectionTitle accent="#22c55e">✅ Strengths</SectionTitle>
              {result.strengths?.map((s, i) => (
                <div
                  key={i}
                  style={{
                    background: "#052e16",
                    border: "1px solid #166534",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 13,
                    color: "#86efac",
                    marginBottom: 8,
                    lineHeight: 1.5,
                  }}
                >
                  {s}
                </div>
              ))}
            </Card>
            <Card>
              <SectionTitle accent="#ef4444">❌ Weaknesses</SectionTitle>
              {result.weaknesses?.map((w, i) => (
                <div
                  key={i}
                  style={{
                    background: "#1c0a0a",
                    border: "1px solid #7f1d1d",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 13,
                    color: "#fca5a5",
                    marginBottom: 8,
                    lineHeight: 1.5,
                  }}
                >
                  {w}
                </div>
              ))}
            </Card>
          </div>

          <Card style={{ marginBottom: 24 }}>
            <SectionTitle accent="#a855f7">🧩 Missing Skills</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {result.missing_skills?.map((s) => (
                <Tag key={s}>{s}</Tag>
              ))}
            </div>
          </Card>

          <Card style={{ marginBottom: 24 }}>
            <SectionTitle accent="#7c3aed">🗺️ 7-Day Action Plan</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {result.roadmap?.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 16, position: "relative" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        background: "#1e1b4b",
                        border: "2px solid #7c3aed",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </div>
                    {i < result.roadmap.length - 1 && (
                      <div style={{ width: 2, flex: 1, background: "#1f2937", margin: "4px 0" }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: 20, paddingTop: 6 }}>
                    <div style={{ fontSize: 12, color: "#7c3aed", fontWeight: 700, marginBottom: 2 }}>
                      {item.day}
                    </div>
                    <div style={{ fontSize: 14, color: "#e2e8f0", lineHeight: 1.5 }}>{item.task}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <button
            onClick={() => {
              setStep("upload");
              setResult(null);
              setAnswers({});
              setRole(null);
              setFileName("");
              setResumeText("");
            }}
            style={{
              width: "100%",
              padding: "16px",
              background: "#111827",
              border: "1px solid #374151",
              borderRadius: 12,
              color: "#94a3b8",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ↺ Start New Assessment
          </button>
        </div>

        <div
          style={{
            textAlign: "center",
            padding: "24px",
            borderTop: "1px solid #1f2937",
            color: "#374151",
            fontSize: 12,
          }}
        >
          CareerForge AI © 2026 · Built for AI CareerForge Hackathon
        </div>
      </div>
    );
  }

  return null;
}
