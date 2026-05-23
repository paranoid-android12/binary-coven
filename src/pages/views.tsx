import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import styles from "@/styles/Views.module.css";

interface Stats {
  total: number;
  daily: { date: string; count: number }[];
  hourly: { hour: number; count: number }[];
  firstView: string | null;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatHour(h: number) {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

export default function ViewsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/page-views-stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setError(true));
  }, []);

  const sinceText = stats?.firstView
    ? new Date(stats.firstView).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const daily = useMemo(() => stats?.daily ?? [], [stats]);

  return (
    <>
      <Head>
        <title>Page Views — Binary Coven</title>
        <meta name="robots" content="noindex" />
        <link rel="icon" href="/wheat.ico" />
      </Head>

      <div className={styles.page}>
        <nav className={styles.nav}>
          <Link href="/" className={styles.back}>
            ← Back
          </Link>
          <img src="/title.png" alt="Binary Coven" className={styles.navLogo} />
        </nav>

        <main className={styles.main}>
          <h1 className={styles.title}>Page Views</h1>
          {sinceText && (
            <p className={styles.since}>Tracking since {sinceText}</p>
          )}

          {error && <p className={styles.error}>Failed to load stats.</p>}

          {!stats && !error && <p className={styles.loading}>Loading…</p>}

          {stats && (
            <>
              <div className={styles.statCards}>
                <div className={styles.statCard}>
                  <span className={styles.statValue}>
                    {stats.total.toLocaleString()}
                  </span>
                  <span className={styles.statLabel}>Total Views</span>
                </div>
              </div>

              <section className={styles.chartSection}>
                <h2 className={styles.chartTitle}>Daily Views — All Time</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={daily} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e8b44c" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#e8b44c" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3a1a28" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d, i) => i % 5 === 0 ? formatDate(d) : ""}
                      tick={{ fill: "#d8a888", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#d8a888", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ background: "#210714", border: "1px solid #6b3a2a", color: "#f5d6b8", fontSize: 12 }}
                      labelFormatter={(d) => formatDate(d)}
                      formatter={(v: number) => [v, "views"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#e8b44c"
                      strokeWidth={2}
                      fill="url(#areaGrad)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </section>

              <section className={styles.chartSection}>
                <h2 className={styles.chartTitle}>Views by Hour of Day</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.hourly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3a1a28" />
                    <XAxis
                      dataKey="hour"
                      tickFormatter={formatHour}
                      interval={3}
                      tick={{ fill: "#d8a888", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#d8a888", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ background: "#210714", border: "1px solid #6b3a2a", color: "#f5d6b8", fontSize: 12 }}
                      labelFormatter={(h) => formatHour(Number(h))}
                      formatter={(v: number) => [v, "views"]}
                    />
                    <Bar dataKey="count" fill="#c45e8a" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </section>
            </>
          )}
        </main>
      </div>
    </>
  );
}
