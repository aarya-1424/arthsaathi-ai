import { useEffect, useState } from "react";

type Status = "checking" | "ok" | "down";

export default function App() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok ? setStatus("ok") : setStatus("down")))
      .catch(() => setStatus("down"));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 px-4">
      <h1 className="text-3xl font-semibold">ArthSaathi</h1>
      <p>Your personal financial companion.</p>
      <p role="status" className="text-sm opacity-70">
        {status === "checking" && "Checking server..."}
        {status === "ok" && "Server connected."}
        {status === "down" && "Server is not reachable right now."}
      </p>
    </main>
  );
}
