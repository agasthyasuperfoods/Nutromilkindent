// src/pages/Alogin.js
import { useState, useEffect } from "react";
import Head from "next/head";
import Image from "next/image";
import Swal from "sweetalert2";
import { useRouter } from "next/router";

// THEME — main color palette (amber)
const PRIMARY_HEX = "#D97706"; // amber-600
const BTN_SOLID = "bg-amber-600 hover:bg-amber-700";
const RING_FOCUS =
  "focus:outline-none focus:ring-4 focus:ring-amber-400/30 focus:border-amber-600";
const LINK_TEXT = "text-amber-600 hover:underline";

function CheckIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path strokeWidth="2" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function Alogin() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false); // show micro-animation on success

  // Prefetch Dashboard route so navigation is fast
  useEffect(() => {
    if (router && router.prefetch) {
      router.prefetch("/Dashboard").catch(() => {});
    }
  }, [router]);

  const onSubmit = async (e) => {
    e.preventDefault();

    const idTrim = identifier.trim();
    const pwdTrim = password.trim();

    if (!idTrim || !pwdTrim) {
      Swal.fire({
        icon: "warning",
        title: "Missing details",
        text: "Please enter both your email or employee ID and password.",
        confirmButtonColor: PRIMARY_HEX,
      });
      return;
    }

    try {
      setLoading(true);

      // Start network request immediately — we await it, but we still prefetch and navigate quickly after success.
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: idTrim, password: pwdTrim }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Login failed");

      const u = json?.user || null;
      if (!u || !u.id) throw new Error("Login failed");

      // Client-side storage (minimal non-sensitive)
      if (typeof window !== "undefined") {
        const store = remember ? localStorage : sessionStorage;
        store.setItem("auth", "1");
        const displayName =
          (u.profile && u.profile.full_name) ? u.profile.full_name : (u.email || "");
        if (displayName) store.setItem("name", displayName);
        if (u.email) store.setItem("email", u.email);
        const employeeId =
          (u.profile && u.profile.employee_id) ? u.profile.employee_id : u.id;
        if (employeeId) store.setItem("employeeid", employeeId);
        if (remember) localStorage.setItem("remember", "1");
        else localStorage.removeItem("remember");

        // cleanup legacy keys
        localStorage.removeItem("hr_auth");
        localStorage.removeItem("hr_role");
        localStorage.removeItem("hr_name");
        localStorage.removeItem("hr_email");
        localStorage.removeItem("hr_employeeid");
      }

      // show micro-success then navigate immediately (no long setTimeout)
      setSuccess(true);

      // Give the browser one paint so user sees the success overlay, then navigate.
      // This is effectively instantaneous but allows the overlay to render.
      requestAnimationFrame(() => {
        router.replace("/Dashboard");
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Login failed",
        text: err.message || "Something went wrong",
        confirmButtonColor: PRIMARY_HEX,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>A Sign In • Agasthya Super Foods</title>
        <meta name="robots" content="noindex" />
      </Head>

      <main className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-gray-50 via-white to-gray-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="relative bg-white/80 backdrop-blur border border-gray-100 rounded-2xl shadow-xl p-8">
            {/* small success overlay */}
            {success && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 rounded-2xl pointer-events-none">
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-full bg-amber-600 p-3 shadow-lg">
                    <svg
                      className="h-10 w-10 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden
                    >
                      <path strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-sm font-medium text-gray-900">Authenticated</div>
                </div>
              </div>
            )}

            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4 mx-auto h-28 w-28 md:h-36 md:w-36">
                <Image src="/logo.png" alt="Agasthya Super Foods" fill className="object-contain" priority />
              </div>
              <h1 className="text-xl font-semibold text-gray-900"> Login</h1>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">
                  Email or Employee ID
                </label>
                <div className="mt-1 relative">
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className={`block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-gray-900 placeholder:text-gray-400 ${RING_FOCUS}`}
                    placeholder="EMP175 or user@agasthya.co.in"
                    aria-invalid={!identifier.trim() ? "true" : "false"}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    {identifier.trim() ? (
                      <span className="text-amber-600">
                        <CheckIcon className="h-5 w-5" />
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <a href="/forgot-password" className={`text-xs ${LINK_TEXT}`}>Forgot password?</a>
                </div>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPwd ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-gray-900 placeholder:text-gray-400 ${RING_FOCUS}`}
                    placeholder="••••••••"
                    aria-invalid={!password.trim() ? "true" : "false"}
                  />
                  <div className="absolute inset-y-0 right-10 pr-3 flex items-center">
                    {password.trim() ? (
                      <span className="text-amber-600">
                        <CheckIcon className="h-5 w-5" />
                      </span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                    title={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? ( /* eye-off */ 
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeWidth="2" d="M3 3l18 18M10.58 10.58a3 3 0 104.24 4.24M9.88 5.5A9.77 9.77 0 0121 12c-.6 1.03-1.36 1.99-2.25 2.82M6.26 6.26A9.77 9.77 0 003 12c.6 1.03 1.36 1.99 2.25 2.82" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeWidth="2" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                        <circle cx="12" cy="12" r="3" strokeWidth="2" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-600"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Remember me
                </label>
                <span className="text-xs text-gray-400">v1.0</span>
              </div>

              <button
                type="submit"
                disabled={loading || success}
                className={`w-full inline-flex items-center justify-center rounded-lg ${BTN_SOLID} text-white font-medium py-2.5 ${loading || success ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                ) : null}
                {loading ? "Signing in…" : "Sign in"}
              </button>

              <p className="text-center text-xs text-gray-500">
                By signing in, you acknowledge our{" "}
                <a href="/Hlogin" className={LINK_TEXT}>Privacy Policy</a>.
              </p>
            </form>
          </div>

          <div className="text-center text-xs text-gray-400 mt-6">
            © {new Date().getFullYear()} Agasthya Super Foods. All rights reserved.
          </div>
        </div>
      </main>
    </>
  );
}
