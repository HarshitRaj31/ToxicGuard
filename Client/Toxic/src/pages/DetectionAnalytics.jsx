
import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import "./DetectionAnalytics.css";

const API_URL = "http://localhost:5000/api/analysis/stats";
const EXPORT_URL = "http://localhost:5000/api/analysis/export";

const DetectionAnalytics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [appliedDates, setAppliedDates] = useState({
    startDate: "",
    endDate: "",
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");

    return {
      Authorization: `Bearer ${token || ""}`,
    };
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(API_URL, {
          params: {
            startDate: appliedDates.startDate || undefined,
            endDate: appliedDates.endDate || undefined,
          },
          headers: getAuthHeaders(),
        });

        setStats(response.data);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load detection analytics."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [appliedDates]);

  const handleApplyFilter = () => {
    if (startDate && endDate && startDate > endDate) {
      setError("Start date cannot be after end date.");
      return;
    }

    setError("");
    setAppliedDates({ startDate, endDate });
  };

  const handleResetFilter = () => {
    setStartDate("");
    setEndDate("");
    setError("");
    setAppliedDates({ startDate: "", endDate: "" });
  };

  const getExportParams = () => ({
    startDate: appliedDates.startDate || undefined,
    endDate: appliedDates.endDate || undefined,
  });

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      setError("");

      const response = await axios.get(
        `${EXPORT_URL}/csv`,
        {
          params: getExportParams(),
          headers: getAuthHeaders(),
          responseType: "blob",
        }
      );

      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");

      link.href = url;
      link.download = "toxic-detection-report.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        "Unable to export CSV. Check your admin login and backend."
      );
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      setError("");

      const response = await axios.get(
        `${EXPORT_URL}/data`,
        {
          params: getExportParams(),
          headers: getAuthHeaders(),
        }
      );

      const records = response.data;

      if (!Array.isArray(records)) {
        throw new Error("Invalid report data.");
      }

      const doc = new jsPDF();

      const toxicCount = records.filter(
        (record) => record.result === "Toxic"
      ).length;

      const safeCount = records.filter(
        (record) => record.result === "Safe"
      ).length;

      doc.setFontSize(18);
      doc.text("Toxic & Hate Speech Detection Report", 14, 20);

      doc.setFontSize(10);
      doc.text(
        `Generated: ${new Date().toLocaleString()}`,
        14,
        29
      );

      doc.text(`Total Analyses: ${records.length}`, 14, 37);
      doc.text(`Toxic: ${toxicCount}`, 14, 45);
      doc.text(`Safe: ${safeCount}`, 14, 53);

      const dateRange =
        appliedDates.startDate || appliedDates.endDate
          ? `Date Range: ${
              appliedDates.startDate || "All dates"
            } to ${appliedDates.endDate || "Present"}`
          : "Date Range: All records";

      doc.text(dateRange, 14, 61);

      autoTable(doc, {
        startY: 68,
        head: [[
          "Date",
          "Comment",
          "Result",
          "Category",
          "Confidence",
        ]],
        body: records.map((record) => [
          record.createdAt
            ? new Date(record.createdAt).toLocaleDateString()
            : "N/A",
          record.comment || "",
          record.result || "",
          record.category || "",
          record.confidence != null
            ? `${record.confidence}%`
            : "N/A",
        ]),
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: "linebreak",
        },
        columnStyles: {
          1: { cellWidth: 65 },
        },
        headStyles: {
          fillColor: [37, 99, 235],
        },
        margin: { left: 14, right: 14 },
      });

      doc.save("toxic-detection-report.pdf");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to export PDF. Check your admin login and backend."
      );
    } finally {
      setExporting(false);
    }
  };

  const total = Number(stats?.totalAnalyses) || 0;
  const toxic = Number(stats?.toxicComments) || 0;
  const safe = Number(stats?.safeComments) || 0;
  const toxicityRate = total > 0 ? (toxic / total) * 100 : 0;

  const outcomeData = [
    { name: "Toxic", value: toxic },
    { name: "Safe", value: safe },
  ];

  
const categoryCounts = stats?.categories || {};

const getCategoryCount = (...keys) => {
  for (const key of keys) {
    const value = categoryCounts[key];

    if (value !== undefined && value !== null && value !== "") {
      const count = Number(value);
      return Number.isFinite(count) ? count : 0;
    }
  }

  return 0;
};

const categoryData = [
  { category: "Toxic", count: getCategoryCount("Toxic", "toxic") },
  { category: "Offensive", count: getCategoryCount("Offensive", "offensive") },
  { category: "Threat", count: getCategoryCount("Threat", "threat") },
  { category: "Insult", count: getCategoryCount("Insult", "insult") },
  {
    category: "Hate Speech",
    count: getCategoryCount("Hate Speech", "hateSpeech", "hate_speech"),
  },
  {
    category: "Custom Banned Word",
    count: getCategoryCount(
      "Custom Banned Word",
      "customBannedWord",
      "custom_banned_word"
    ),
  },
];


  const dailyAnalyses = Array.isArray(stats?.dailyAnalyses)
    ? stats.dailyAnalyses
    : [];

  const COLORS = ["#fb7185", "#34d399"];

  if (loading && !stats) {
    return (
      <section className="analytics-panel">
        Loading analytics...
      </section>
    );
  }

  if (error && !stats) {
    return (
      <section className="analytics-panel analytics-error" role="alert">
        {error}
      </section>
    );
  }

  return (
    <section className="analytics-section">
      <div className="analytics-heading">
        <div>
          <p className="analytics-eyebrow">MODEL INSIGHTS</p>
          <h2>Detection Analytics</h2>
          <p>
            Understand the results produced by your detection system.
          </p>
        </div>

        <div className="toxicity-indicator">
          <span>Toxicity rate</span>
          <strong>{toxicityRate.toFixed(1)}%</strong>
        </div>
      </div>

      <div className="analytics-filters">
        <div className="analytics-filter-field">
          <label htmlFor="start-date">Start Date</label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="analytics-filter-field">
          <label htmlFor="end-date">End Date</label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="analytics-filter-button"
          onClick={handleApplyFilter}
          disabled={loading || exporting}
        >
          Apply Filter
        </button>

        <button
          type="button"
          className="analytics-reset-button"
          onClick={handleResetFilter}
          disabled={loading || exporting}
        >
          Reset Filter
        </button>

        <button
          type="button"
          className="analytics-filter-button"
          onClick={handleExportPDF}
          disabled={exporting}
        >
          {exporting ? "Exporting..." : "Download PDF"}
        </button>

        <button
          type="button"
          className="analytics-filter-button"
          onClick={handleExportCSV}
          disabled={exporting}
        >
          {exporting ? "Exporting..." : "Download CSV"}
        </button>
      </div>

      {error && (
        <p className="analytics-error" role="alert">
          {error}
        </p>
      )}

      {loading && (
        <p className="analytics-loading">
          Updating analytics...
        </p>
      )}

      <div className="analytics-grid">
        <article className="analytics-panel">
          <h3>Safe vs. Toxic</h3>
          <p>Distribution of analyzed comments</p>

          <div className="analytics-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={outcomeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                >
                  {outcomeData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[index]}
                    />
                  ))}
                </Pie>

                <Tooltip
                  contentStyle={{
                    background: "#101522",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#e8eefc",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="analytics-panel">
          <h3>Category Breakdown</h3>
          <p>Recorded detections by category</p>

          <div className="analytics-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryData}
                margin={{
                  top: 10,
                  right: 8,
                  left: -18,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  stroke="#263146"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="category"
                  tick={{ fill: "#a5b2ca", fontSize: 11 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={55}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#a5b2ca", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#101522",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#e8eefc",
                  }}
                />
                <Bar
                  dataKey="count"
                  name="Comments"
                  fill="#60a5fa"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="analytics-panel">
          <h3>Daily Analysis Trend</h3>
          <p>Number of comments analyzed per day</p>

          <div className="analytics-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dailyAnalyses}
                margin={{
                  top: 10,
                  right: 12,
                  left: -18,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  stroke="#263146"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="_id"
                  tick={{ fill: "#a5b2ca", fontSize: 11 }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#a5b2ca", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#101522",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#e8eefc",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Analyses"
                  stroke="#60a5fa"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </section>
  );
};

export default DetectionAnalytics;
