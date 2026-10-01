import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  AlertTriangle,
  Bot,
  FileText,
  Settings,
  Send,
  RefreshCw,
  Search,
  Moon,
  Sun,
  Bell,
  ChevronRight,
  Activity,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Zap,
  ShieldAlert,
  Lightbulb,
  Database,
  Server,
  BrainCircuit,
  Download,
  X,
  ArrowUpRight,
  CircleDot,
  Upload,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const storedLoopToken = localStorage.getItem("loop-access-token");

if (storedLoopToken) {
  axios.defaults.headers.common.Authorization = `Bearer ${storedLoopToken}`;
}

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  const [authUser, setAuthUser] = useState(() => {
    try {
      const saved = localStorage.getItem("loop-user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [authChecking, setAuthChecking] = useState(true);
  const [users, setUsers] = useState([]);

  const [stats, setStats] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [issues, setIssues] = useState([]);
  const [trends, setTrends] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const [showFeedbackModal, setShowFeedbackModal] =
    useState(false);

  const [showIssueModal, setShowIssueModal] =
    useState(false);

  const [selectedIssue, setSelectedIssue] =
    useState(null);

  const [customerName, setCustomerName] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [source, setSource] = useState("Website");
  const [rating, setRating] = useState("5");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] =
    useState("");

  const [copilotQuestion, setCopilotQuestion] =
    useState("");

  const [copilotAnswer, setCopilotAnswer] =
    useState(null);

  const [copilotLoading, setCopilotLoading] =
    useState(false);

  const [copilotHistory, setCopilotHistory] =
    useState([]);

  /* =========================================================
     REPORT PERIOD
  ========================================================= */

  const [reportMode, setReportMode] =
    useState("month");

  const [selectedReportMonth, setSelectedReportMonth] =
    useState("");

  const [reportStartDate, setReportStartDate] =
    useState("");

  const [reportEndDate, setReportEndDate] =
    useState("");

  /* =========================================================
     BULK IMPORT
  ========================================================= */

  const fileInputRef = useRef(null);

  const [importing, setImporting] = useState(false);

  const [importMessage, setImportMessage] =
    useState("");

  const [importError, setImportError] =
    useState("");

  /* =========================================================
     NOTIFICATION CENTER
  ========================================================= */

  const [notificationOpen, setNotificationOpen] =
    useState(false);

  const [readNotificationIds, setReadNotificationIds] =
    useState(() => {
      try {
        const saved = localStorage.getItem("loop-read-notifications");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    });

  const [dismissedNotificationIds, setDismissedNotificationIds] =
    useState(() => {
      try {
        const saved = localStorage.getItem("loop-dismissed-notifications");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    });

  const [activityNotifications, setActivityNotifications] =
    useState([]);

  useEffect(() => {
    localStorage.setItem(
      "loop-read-notifications",
      JSON.stringify(readNotificationIds)
    );
  }, [readNotificationIds]);

  useEffect(() => {
    localStorage.setItem(
      "loop-dismissed-notifications",
      JSON.stringify(dismissedNotificationIds)
    );
  }, [dismissedNotificationIds]);

  useEffect(() => {
    if (!notificationOpen) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setNotificationOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () =>
      document.removeEventListener("keydown", handleEscape);
  }, [notificationOpen]);

  const addActivityNotification = (notification) => {
    const item = {
      ...notification,
      id: `${notification.type || "activity"}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    setActivityNotifications((previous) => [
      item,
      ...previous,
    ].slice(0, 8));
  };

  const generatedNotifications = useMemo(() => {
    const items = [];

    const emergingIssue = trends?.emerging_issue;

    if (emergingIssue?.name) {
      items.push({
        id: `emerging-${emergingIssue.name}-${emergingIssue.recent_count || 0}`,
        type: "critical",
        title: "Emerging issue detected",
        message: `${emergingIssue.name} has ${emergingIssue.recent_count || 0} recent occurrence(s).`,
        page: "issues",
      });
    }

    const newIssues = Array.isArray(trends?.new_issues)
      ? trends.new_issues
      : [];

    newIssues.slice(0, 3).forEach((item) => {
      items.push({
        id: `new-issue-${item.name}-${item.recent_count || 0}`,
        type: "warning",
        title: "New issue signal",
        message: `${item.name} appeared with ${item.recent_count || 0} recent occurrence(s).`,
        page: "issues",
      });
    });

    const trendingUp = Array.isArray(trends?.trending_up)
      ? trends.trending_up
      : [];

    trendingUp.slice(0, 3).forEach((item) => {
      const change = item.change_percentage;
      const changeText =
        change === null || change === undefined
          ? "crossed the trend threshold"
          : `increased by ${Number(change).toFixed(1)}%`;

      items.push({
        id: `trend-up-${item.name}-${change ?? "new"}`,
        type: "trend",
        title: "Trend threshold crossed",
        message: `${item.name} ${changeText}.`,
        page: "analytics",
      });
    });

    const currentCriticalIssues = Number(
      stats?.critical_issues || 0
    );

    if (currentCriticalIssues > 0) {
      items.push({
        id: `critical-count-${currentCriticalIssues}`,
        type: "critical",
        title: "Critical issues require attention",
        message: `${currentCriticalIssues} critical issue group(s) are currently detected.`,
        page: "issues",
      });
    }

    return [...activityNotifications, ...items].filter(
      (item) => !dismissedNotificationIds.includes(item.id)
    );
  }, [
    trends,
    stats,
    activityNotifications,
    dismissedNotificationIds,
  ]);

  const unreadNotifications = generatedNotifications.filter(
    (item) => !readNotificationIds.includes(item.id)
  );

  const unreadNotificationCount =
    unreadNotifications.length;

  const markNotificationRead = (id) => {
    setReadNotificationIds((previous) =>
      previous.includes(id)
        ? previous
        : [...previous, id]
    );
  };

  const markAllNotificationsRead = () => {
    setReadNotificationIds((previous) =>
      Array.from(
        new Set([
          ...previous,
          ...generatedNotifications.map((item) => item.id),
        ])
      )
    );
  };

  const dismissNotification = (id) => {
    setDismissedNotificationIds((previous) =>
      previous.includes(id)
        ? previous
        : [...previous, id]
    );
  };

  const handleNotificationClick = (notification) => {
    markNotificationRead(notification.id);

    if (notification.page) {
      setActivePage(notification.page);
    }

    setNotificationOpen(false);
  };

  useEffect(() => {

    const savedTheme =
      localStorage.getItem("loop-theme");

    if (savedTheme === "dark") {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      darkMode ? "dark" : "light"
    );

    localStorage.setItem(
      "loop-theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  useEffect(() => {
    const token = localStorage.getItem("loop-access-token");

    if (!token) {
      setAuthChecking(false);
      setLoading(false);
      return;
    }

    axios.defaults.headers.common.Authorization = `Bearer ${token}`;

    const bootstrapAuthentication = async () => {
      try {
        const response = await axios.get(`${API_URL}/auth/me`);
        const user = response.data;

        setAuthUser(user);
        localStorage.setItem("loop-user", JSON.stringify(user));
        await loadData(user);
      } catch (err) {
        console.error(err);
        localStorage.removeItem("loop-access-token");
        localStorage.removeItem("loop-user");
        delete axios.defaults.headers.common.Authorization;
        setAuthUser(null);
        setLoading(false);
      } finally {
        setAuthChecking(false);
      }
    };

    bootstrapAuthentication();
  }, []);

  /* =========================================================
     AUTHENTICATION + ROLE ACCESS
  ========================================================= */

  const handleLogin = async (email, password) => {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: email.trim(),
      password,
    });

    const token = response.data.access_token;
    const user = response.data.user;

    localStorage.setItem("loop-access-token", token);
    localStorage.setItem("loop-user", JSON.stringify(user));
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;

    setAuthUser(user);
    setAuthChecking(false);
    setLoading(true);

    await loadData(user);
  };

  const handleDemoLogin = async (role) => {
    const response = await axios.post(`${API_URL}/auth/demo-login`, { role });

    const token = response.data.access_token;
    const user = response.data.user;

    localStorage.setItem("loop-access-token", token);
    localStorage.setItem("loop-user", JSON.stringify(user));
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;

    setAuthUser(user);
    setShowLanding(false);
    setAuthChecking(false);
    setLoading(true);

    await loadData(user);
  };

  const handleLogout = async () => {
    try {
      if (authUser) {
        await axios.post(`${API_URL}/auth/logout`);
      }
    } catch (err) {
      console.warn("Logout request failed; clearing local session anyway.", err);
    } finally {
      localStorage.removeItem("loop-access-token");
      localStorage.removeItem("loop-user");
      delete axios.defaults.headers.common.Authorization;
      setAuthUser(null);
      setUsers([]);
      setActivePage("dashboard");
    }
  };

  const isAdmin = authUser?.role === "Admin";
  const isManager = authUser?.role === "Manager";
  const canManageData = isAdmin || isManager;

  /* =========================================================
     LOAD ALL LOOP AI DATA
  ========================================================= */

  const loadData = async (userOverride = null) => {
    const effectiveUser = userOverride || authUser;

    try {
      setError("");

      const [
        statsResponse,
        feedbackResponse,
        analyticsResponse,
        issuesResponse,
        trendsResponse,
      ] = await Promise.all([
        axios.get(`${API_URL}/dashboard/stats`),
        axios.get(`${API_URL}/feedback`),
        axios.get(`${API_URL}/analytics`),
        axios.get(`${API_URL}/issues`),
        axios.get(`${API_URL}/trends`),
      ]);

      setStats(statsResponse.data);

      setFeedback(
        Array.isArray(feedbackResponse.data)
          ? feedbackResponse.data
          : []
      );

      setAnalytics(analyticsResponse.data);

      const issueData = issuesResponse.data;

      setIssues(
        Array.isArray(issueData)
          ? issueData
          : issueData?.issues || []
      );

      /*
       * Real LOOP AI Trend Engine data.
       *
       * This comes directly from:
       * GET /trends
       */
      setTrends(
        trendsResponse.data || null
      );

      if (effectiveUser?.role === "Admin") {
        try {
          const usersResponse = await axios.get(`${API_URL}/auth/users`);
          setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : []);
        } catch (userErr) {
          console.error("Unable to load users", userErr);
          setUsers([]);
        }
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load LOOP AI data. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);

    await loadData();

    setRefreshing(false);
  };

  const handleDeleteFeedback = async (feedbackId) => {
    if (!canManageData) return;

    const confirmed = window.confirm(
      "Delete this feedback? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      await axios.delete(`${API_URL}/feedback/${feedbackId}`);

      addActivityNotification({
        type: "success",
        title: "Feedback deleted",
        message: `Feedback #${feedbackId} was permanently deleted.`,
        page: "feedback",
      });

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
          "Unable to delete this feedback record."
      );
    }
  };

  /* =========================================================
     BULK CSV / EXCEL IMPORT
  ========================================================= */

  const openFilePicker = () => {
    setImportMessage("");
    setImportError("");

    fileInputRef.current?.click();
  };

  const handleFileImport = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const fileName =
      file.name.toLowerCase();

    const allowedExtensions = [
      ".csv",
      ".xlsx",
      ".xls",
    ];

    const isValidFile =
      allowedExtensions.some(
        (extension) =>
          fileName.endsWith(extension)
      );

    if (!isValidFile) {
      setImportError(
        "Please select a CSV, XLSX or XLS file."
      );

      event.target.value = "";

      return;
    }

    try {
      setImporting(true);
      setImportMessage("");
      setImportError("");

      const formData = new FormData();

      formData.append("file", file);

      const response = await axios.post(
        `${API_URL}/feedback/import`,
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      const result = response.data;

      const importSummary =
        `Import successful — ${
          result.imported || 0
        } records added, ${
          result.skipped || 0
        } skipped, ${
          result.failed || 0
        } failed.`;

      setImportMessage(importSummary);

      addActivityNotification({
        type: "success",
        title: "Feedback import completed",
        message: importSummary,
        page: "feedback",
      });

      /*
       * Refresh everything including:
       * dashboard
       * analytics
       * issues
       * trends
       */
      await loadData();
    } catch (err) {
      console.error(err);

      const backendMessage =
        err.response?.data?.detail;

      setImportError(
        backendMessage ||
          "Unable to import the file. Please check the backend and file format."
      );
    } finally {
      setImporting(false);

      event.target.value = "";
    }
  };

  /* =========================================================
     ADD FEEDBACK
  ========================================================= */

  const submitFeedback = async (event) => {
    event.preventDefault();

    if (
      !customerName.trim() ||
      !feedbackText.trim()
    ) {
      setFeedbackMessage(
        "Please enter customer name and feedback."
      );

      return;
    }

    try {
      setSubmitting(true);
      setFeedbackMessage("");

      const response = await axios.post(
        `${API_URL}/feedback`,
        {
          customer_name:
            customerName.trim(),

          feedback_text:
            feedbackText.trim(),

          source,

          rating: Number(rating),
        }
      );

      const analysis =
        response.data?.ai_analysis;

      setFeedbackMessage(
        analysis
          ? `AI analysis complete: ${analysis.sentiment} • ${analysis.topic} • ${analysis.priority}`
          : "Feedback analyzed successfully."
      );

      setCustomerName("");
      setFeedbackText("");
      setSource("Website");
      setRating("5");

      addActivityNotification({
        type: "success",
        title: "AI analysis completed",
        message: analysis
          ? `${analysis.sentiment} • ${analysis.topic} • ${analysis.priority}`
          : "New feedback was analyzed successfully.",
        page: "feedback",
      });

      /*
       * Refresh dashboard, analytics,
       * issues and trend intelligence.
       */
      await loadData();
    } catch (err) {
      console.error(err);

      setFeedbackMessage(
        "Unable to submit feedback. Please check the backend."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================================================
     AI COPILOT
  ========================================================= */

  const askCopilot = async (
    question = copilotQuestion
  ) => {
    const finalQuestion =
      question.trim();

    if (!finalQuestion) return;

    try {
      setCopilotLoading(true);

      const response =
        await axios.post(
          `${API_URL}/copilot`,
          {
            question:
              finalQuestion,
          },
          {
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );

      const answer =
        response.data;

      setCopilotAnswer(answer);

      setCopilotHistory(
        (previous) => [
          {
            question:
              finalQuestion,
            answer,
          },
          ...previous.slice(
            0,
            4
          ),
        ]
      );

      setCopilotQuestion("");
    } catch (err) {
      console.error(err);

      setCopilotAnswer({
        answer:
          "I could not connect to the LOOP AI intelligence engine. Please make sure the backend is running.",

        evidence: [],

        recommendations: [],

        metrics: {},

        intent: "error",

        source: "LOOP AI",
      });
    } finally {
      setCopilotLoading(false);
    }
  };

  /* =========================================================
     FILTERED FEEDBACK
  ========================================================= */

  const filteredFeedback =
    useMemo(() => {
      return feedback.filter(
        (item) => {
          const text =
            `${item.customer_name || ""} ${
              item.feedback_text || ""
            } ${item.issue || ""} ${
              item.topic || ""
            }`.toLowerCase();

          const matchesSearch =
            !search.trim() ||
            text.includes(
              search.toLowerCase()
            );

          const matchesSentiment =
            sentimentFilter ===
              "All" ||
            (item.sentiment ||
              "Unknown") ===
              sentimentFilter;

          const matchesPriority =
            priorityFilter ===
              "All" ||
            (item.priority ||
              "Unknown") ===
              priorityFilter;

          return (
            matchesSearch &&
            matchesSentiment &&
            matchesPriority
          );
        }
      );
    }, [
      feedback,
      search,
      sentimentFilter,
      priorityFilter,
    ]);

  /* =========================================================
     CHART DATA
  ========================================================= */

  const sentimentData =
    useMemo(() => {
      const sentiment =
        analytics?.sentiment ||
        {};

      return [
        {
          name: "Positive",
          value: Number(
            sentiment.Positive ||
              0
          ),
        },

        {
          name: "Negative",
          value: Number(
            sentiment.Negative ||
              0
          ),
        },

        {
          name: "Neutral",
          value: Number(
            sentiment.Neutral ||
              0
          ),
        },
      ].filter(
        (item) => item.value > 0
      );
    }, [analytics]);

  const topicData =
    useMemo(() => {
      return (
        analytics?.topics || []
      ).map((item) => ({
        name:
          item.topic ||
          "Unknown",

        count: Number(
          item.count || 0
        ),
      }));
    }, [analytics]);

  const issueData =
    useMemo(() => {
      return (
        analytics?.issues || []
      ).map((item) => ({
        name:
          item.issue ||
          "Unknown",

        count: Number(
          item.count || 0
        ),
      }));
    }, [analytics]);

  const sourceData =
    useMemo(() => {
      return (
        analytics?.sources || []
      ).map((item) => ({
        name:
          item.source ||
          "Unknown",

        count: Number(
          item.count || 0
        ),
      }));
    }, [analytics]);

  const priorityData =
    useMemo(() => {
      const priority =
        analytics?.priority ||
        {};

      return [
        {
          name: "Critical",
          value: Number(
            priority.Critical ||
              0
          ),
        },

        {
          name: "High",
          value: Number(
            priority.High || 0
          ),
        },

        {
          name: "Medium",
          value: Number(
            priority.Medium ||
              0
          ),
        },

        {
          name: "Low",
          value: Number(
            priority.Low || 0
          ),
        },
      ].filter(
        (item) => item.value > 0
      );
    }, [analytics]);

  /* =========================================================
     DERIVED METRICS
  ========================================================= */

  const totalFeedback =
    Number(
      stats?.total_feedback || 0
    );

  const positivePercentage =
    Number(
      stats?.positive_percentage ||
        0
    );

  const negativePercentage =
    Number(
      stats?.negative_percentage ||
        0
    );

  const criticalIssues =
    Number(
      stats?.critical_issues || 0
    );

  const negativeCount =
    Number(stats?.negative || 0);

  const positiveCount =
    Number(stats?.positive || 0);

  const neutralCount =
    Number(stats?.neutral || 0);

  const topIssue =
    analytics?.issues?.[0]
      ?.issue ||
    issues?.[0]?.issue ||
    "No major issue detected";

  const topIssueCount =
    Number(
      analytics?.issues?.[0]
        ?.count ||
        issues?.[0]?.count ||
        0
    );

  const criticalIssueList =
    issues.filter(
      (issue) =>
        String(
          issue.priority || ""
        ).toLowerCase() ===
        "critical"
    );

  /* =========================================================
     REPORT PERIOD + PERIOD-SPECIFIC INTELLIGENCE
  ========================================================= */

  const getFeedbackDate = (item) => {
    const value = item?.created_at || item?.createdAt || item?.date;
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const toMonthKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

  const formatMonthLabel = (monthKey) => {
    if (!monthKey) return "Select month";
    const [year, month] = monthKey.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  };

  const availableReportMonths = useMemo(() => {
    const months = new Set();
    feedback.forEach((item) => {
      const date = getFeedbackDate(item);
      if (date) months.add(toMonthKey(date));
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [feedback]);

  useEffect(() => {
    if (!availableReportMonths.length) return;
    setSelectedReportMonth((current) =>
      current && availableReportMonths.includes(current)
        ? current
        : availableReportMonths[0]
    );
  }, [availableReportMonths]);

  const reportPeriod = useMemo(() => {
    let start = null;
    let end = null;
    let label = "All available feedback";

    if (reportMode === "month" && selectedReportMonth) {
      const [year, month] = selectedReportMonth.split("-").map(Number);
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 1);
      label = formatMonthLabel(selectedReportMonth);
    }

    if (reportMode === "custom" && reportStartDate) {
      start = new Date(`${reportStartDate}T00:00:00`);
      if (reportEndDate) {
        end = new Date(`${reportEndDate}T00:00:00`);
        end.setDate(end.getDate() + 1);
      } else {
        end = new Date();
        end.setDate(end.getDate() + 1);
      }
      label = reportEndDate
        ? `${new Date(`${reportStartDate}T00:00:00`).toLocaleDateString()} – ${new Date(`${reportEndDate}T00:00:00`).toLocaleDateString()}`
        : `From ${new Date(`${reportStartDate}T00:00:00`).toLocaleDateString()}`;
    }

    const hasCustomPeriod =
      reportMode !== "custom" || Boolean(reportStartDate);

    const filtered = hasCustomPeriod
      ? feedback.filter((item) => {
          const date = getFeedbackDate(item);
          if (!date) return false;
          if (start && date < start) return false;
          if (end && date >= end) return false;
          return true;
        })
      : [];

    const periodLength = start && end ? end.getTime() - start.getTime() : 0;
    const previousStart = periodLength ? new Date(start.getTime() - periodLength) : null;
    const previousEnd = start;

    const previousFeedback = previousStart && previousEnd
      ? feedback.filter((item) => {
          const date = getFeedbackDate(item);
          return date && date >= previousStart && date < previousEnd;
        })
      : [];

    const positive = filtered.filter((item) => String(item.sentiment || "").toLowerCase() === "positive").length;
    const negative = filtered.filter((item) => String(item.sentiment || "").toLowerCase() === "negative").length;
    const neutral = filtered.filter((item) => String(item.sentiment || "").toLowerCase() === "neutral").length;
    const critical = filtered.filter((item) => String(item.priority || "").toLowerCase() === "critical").length;

    const issueCounts = {};
    filtered.forEach((item) => {
      const issue = item.issue || item.topic || "General";
      issueCounts[issue] = (issueCounts[issue] || 0) + 1;
    });

    const sortedIssues = Object.entries(issueCounts).sort((a, b) => b[1] - a[1]);
    const total = filtered.length;
    const previousTotal = previousFeedback.length;
    const changePercentage = previousTotal > 0
      ? Math.round(((total - previousTotal) / previousTotal) * 100)
      : total > 0 ? 100 : 0;

    return {
      label,
      filtered,
      previousFeedback,
      total,
      positive,
      negative,
      neutral,
      critical,
      positivePercentage: total ? Math.round((positive / total) * 100) : 0,
      negativePercentage: total ? Math.round((negative / total) * 100) : 0,
      neutralPercentage: total ? Math.round((neutral / total) * 100) : 0,
      topIssue: sortedIssues[0]?.[0] || "No major issue detected",
      topIssueCount: sortedIssues[0]?.[1] || 0,
      changePercentage,
    };
  }, [feedback, reportMode, selectedReportMonth, reportStartDate, reportEndDate]);

  /* =========================================================
     ISSUE MODAL
  ========================================================= */

  const openIssueDetails = (
    issue
  ) => {
    setSelectedIssue(issue);

    setShowIssueModal(true);
  };

  /* =========================================================
     REPORT
  ========================================================= */

  const downloadReport = () => {
    const report = `
LOOP AI — CUSTOMER INTELLIGENCE REPORT
======================================

Report Period: ${reportPeriod.label}
Generated: ${new Date().toLocaleString()}

EXECUTIVE SUMMARY
-----------------
This report contains ${reportPeriod.total} customer feedback record(s) for the selected reporting period.

KEY METRICS
-----------
Total Feedback: ${reportPeriod.total}
Positive Feedback: ${reportPeriod.positive} (${reportPeriod.positivePercentage}%)
Negative Feedback: ${reportPeriod.negative} (${reportPeriod.negativePercentage}%)
Neutral Feedback: ${reportPeriod.neutral} (${reportPeriod.neutralPercentage}%)
Critical Issues: ${reportPeriod.critical}

PERIOD COMPARISON
-----------------
Previous Period Feedback: ${reportPeriod.previousFeedback.length}
Change vs Previous Period: ${reportPeriod.changePercentage >= 0 ? "+" : ""}${reportPeriod.changePercentage}%

TOP ISSUE
---------
${reportPeriod.topIssue}
Occurrences: ${reportPeriod.topIssueCount}

RECOMMENDED ACTION
------------------
Prioritize recurring critical customer issues, investigate the most frequent complaints, and monitor future feedback for improvement.

======================================
LOOP AI
AI Customer Feedback Intelligence Platform
`;

    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;

    const safePeriod = reportPeriod.label
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "");

    anchor.download = `LOOP-AI-Intelligence-Report-${safePeriod || "Custom"}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  /* =========================================================
     NAVIGATION
  ========================================================= */

  const menuItems = [
    {
      name: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["Admin", "Manager", "Analyst", "Product Manager", "Support Agent", "Viewer"],
    },
    {
      name: "feedback",
      label: "Feedback",
      icon: MessageSquare,
      roles: ["Admin", "Manager", "Analyst", "Product Manager", "Support Agent", "Viewer"],
    },
    {
      name: "analytics",
      label: "Analytics",
      icon: BarChart3,
      roles: ["Admin", "Manager", "Analyst", "Product Manager", "Support Agent", "Viewer"],
    },
    {
      name: "issues",
      label: "Issues",
      icon: AlertTriangle,
      roles: ["Admin", "Manager", "Analyst", "Product Manager", "Support Agent", "Viewer"],
    },
    {
      name: "copilot",
      label: "AI Copilot",
      icon: Bot,
      roles: ["Admin", "Manager", "Analyst", "Product Manager", "Support Agent", "Viewer"],
    },
    {
      name: "reports",
      label: "Reports",
      icon: FileText,
      roles: ["Admin", "Manager", "Analyst", "Product Manager", "Support Agent", "Viewer"],
    },
    {
      name: "workspace",
      label: "Workspace",
      icon: Activity,
      roles: ["Admin", "Manager", "Analyst", "Product Manager", "Support Agent", "Viewer"],
    },
    {
      name: "actions",
      label: "Action Center",
      icon: Zap,
      roles: ["Admin", "Manager", "Analyst", "Product Manager", "Support Agent", "Viewer"],
    },
    {
      name: "settings",
      label: "Team & Access",
      icon: Settings,
      roles: ["Admin", "Manager", "Analyst", "Product Manager", "Support Agent", "Viewer"],
    },
  ].filter((item) => item.roles.includes(authUser?.role));

  const currentPage =
    menuItems.find(
      (item) =>
        item.name ===
        activePage
    ) ||
    menuItems[0];

  /* =========================================================
     AUTHENTICATION GATE
  ========================================================= */

  if (authChecking) {
    return (
      <div className="app-loading">
        <div className="loading-orbit">
          <div className="loading-core">
            <BrainCircuit size={34} />
          </div>
        </div>
        <h2>LOOP AI</h2>
        <p>Verifying secure workspace...</p>
      </div>
    );
  }

  if (!authUser) {
    if (showLanding) {
      return <LandingScreen onEnter={() => setShowLanding(false)} />;
    }

    return (
      <LoginScreen
        onLogin={handleLogin}
        onDemoLogin={handleDemoLogin}
        onBackToLanding={() => setShowLanding(true)}
      />
    );
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-orbit">
          <div className="loading-core">
            <BrainCircuit
              size={34}
            />
          </div>
        </div>

        <h2>LOOP AI</h2>

        <p>
          Initializing customer
          intelligence...
        </p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">
            <span>L</span>
          </div>

          <div>
            <h2>LOOP AI</h2>

            <span>
              Customer Intelligence
            </span>
          </div>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-icon">
            <Activity size={16} />
          </div>

          <div>
            <strong>
              Intelligence Hub
            </strong>

            <span>
              Live workspace
            </span>
          </div>

          <CircleDot
            size={13}
            className="workspace-live"
          />
        </div>

        <div className="sidebar-section-title">
          INTELLIGENCE
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(
            (item) => {
              const Icon =
                item.icon;

              return (
                <button
                  key={
                    item.name
                  }
                  className={`nav-item ${
                    activePage ===
                    item.name
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setActivePage(
                      item.name
                    )
                  }
                >
                  <Icon size={19} />

                  <span>
                    {item.label}
                  </span>

                  {item.name ===
                    "copilot" && (
                    <span className="ai-nav-badge">
                      AI
                    </span>
                  )}
                </button>
              );
            }
          )}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-ai-card">
          <div className="sidebar-ai-icon">
            <BrainCircuit
              size={21}
            />
          </div>

          <div>
            <strong>
              LOOP Intelligence
            </strong>

            <span>
              Your feedback is
              continuously analyzed.
            </span>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">
            {(authUser?.full_name || "U")
              .split(" ")
              .map((part) => part.charAt(0))
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>

          <div className="user-info">
            <strong>
              {authUser?.full_name || "LOOP User"}
            </strong>

            <span>
              {authUser?.role || "User"}
            </span>
          </div>
        </div>
      </aside>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>LOOP AI</span>

            <ChevronRight
              size={14}
            />

            <strong>
              {currentPage.label}
            </strong>
          </div>

          <div className="topbar-actions">
            <div className="system-status">
              <span />
              AI Engine Online · {authUser?.role || "User"}
            </div>

            <button
              className="icon-button"
              onClick={() =>
                setDarkMode(
                  (value) =>
                    !value
                )
              }
              title="Toggle theme"
            >
              {darkMode ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </button>

            <button
              className="icon-button"
              onClick={
                refreshData
              }
              title="Refresh data"
            >
              <RefreshCw
                size={18}
                className={
                  refreshing
                    ? "spin"
                    : ""
                }
              />
            </button>

            <div
              style={{
                position: "relative",
              }}
            >
              <button
                className="notification-button"
                onClick={() =>
                  setNotificationOpen((value) => !value)
                }
                title="Notifications"
                aria-label="Open notifications"
                aria-expanded={notificationOpen}
                style={{
                  position: "relative",
                }}
              >
                <Bell size={18} />

                <span
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    minWidth: "18px",
                    height: "18px",
                    padding: "0 4px",
                    borderRadius: "999px",
                    display: unreadNotificationCount > 0 ? "flex" : "none",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    fontWeight: 800,
                    lineHeight: 1,
                    background: "var(--accent-color, #635bff)",
                    color: "#fff",
                    border: "2px solid var(--card-bg, #fff)",
                  }}
                >
                  {unreadNotificationCount > 9
                    ? "9+"
                    : unreadNotificationCount}
                </span>
              </button>

              {notificationOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 12px)",
                    right: 0,
                    width: "390px",
                    maxWidth: "calc(100vw - 32px)",
                    maxHeight: "560px",
                    overflow: "hidden",
                    zIndex: 1000,
                    background: "var(--card-bg, #ffffff)",
                    border: "1px solid var(--border-color, #e5e7eb)",
                    borderRadius: "18px",
                    boxShadow: "0 20px 60px rgba(15, 23, 42, 0.18)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "16px 18px",
                      borderBottom: "1px solid var(--border-color, #e5e7eb)",
                    }}
                  >
                    <div>
                      <strong
                        style={{
                          display: "block",
                          fontSize: "15px",
                        }}
                      >
                        LOOP AI Notifications
                      </strong>
                      <span
                        style={{
                          display: "block",
                          marginTop: "4px",
                          fontSize: "12px",
                          color: "var(--muted-text, #64748b)",
                        }}
                      >
                        {unreadNotificationCount} unread intelligence signal{
                          unreadNotificationCount === 1 ? "" : "s"
                        }
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <button
                        onClick={markAllNotificationsRead}
                        disabled={unreadNotificationCount === 0}
                        style={{
                          border: 0,
                          background: "transparent",
                          color: "var(--accent-color, #635bff)",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: unreadNotificationCount === 0 ? "default" : "pointer",
                          opacity: unreadNotificationCount === 0 ? 0.45 : 1,
                        }}
                      >
                        Mark all read
                      </button>

                      <button
                        onClick={() => setNotificationOpen(false)}
                        aria-label="Close notifications"
                        style={{
                          width: "30px",
                          height: "30px",
                          border: "1px solid var(--border-color, #e5e7eb)",
                          borderRadius: "9px",
                          background: "var(--surface-color, #f8fafc)",
                          color: "inherit",
                          display: "grid",
                          placeItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      maxHeight: "470px",
                      overflowY: "auto",
                    }}
                  >
                    {generatedNotifications.length > 0 ? (
                      generatedNotifications.map((notification) => {
                        const isUnread = !readNotificationIds.includes(
                          notification.id
                        );

                        const icon =
                          notification.type === "critical" ? (
                            <ShieldAlert size={17} />
                          ) : notification.type === "warning" ? (
                            <AlertTriangle size={17} />
                          ) : notification.type === "trend" ? (
                            <TrendingUp size={17} />
                          ) : (
                            <CheckCircle2 size={17} />
                          );

                        return (
                          <div
                            key={notification.id}
                            style={{
                              display: "flex",
                              gap: "10px",
                              padding: "14px 16px",
                              borderBottom: "1px solid var(--border-color, #e5e7eb)",
                              background: isUnread
                                ? "var(--notification-unread-bg, rgba(99, 91, 255, 0.055))"
                                : "transparent",
                            }}
                          >
                            <button
                              onClick={() =>
                                handleNotificationClick(notification)
                              }
                              style={{
                                flex: 1,
                                minWidth: 0,
                                display: "flex",
                                gap: "10px",
                                alignItems: "flex-start",
                                textAlign: "left",
                                border: 0,
                                background: "transparent",
                                color: "inherit",
                                padding: 0,
                                cursor: "pointer",
                              }}
                            >
                              <span
                                style={{
                                  flex: "0 0 auto",
                                  width: "34px",
                                  height: "34px",
                                  borderRadius: "10px",
                                  display: "grid",
                                  placeItems: "center",
                                  background:
                                    notification.type === "critical"
                                      ? "rgba(239, 68, 68, 0.12)"
                                      : notification.type === "warning"
                                      ? "rgba(245, 158, 11, 0.13)"
                                      : notification.type === "trend"
                                      ? "rgba(59, 130, 246, 0.12)"
                                      : "rgba(34, 197, 94, 0.12)",
                                  color:
                                    notification.type === "critical"
                                      ? "#dc2626"
                                      : notification.type === "warning"
                                      ? "#d97706"
                                      : notification.type === "trend"
                                      ? "#2563eb"
                                      : "#16a34a",
                                }}
                              >
                                {icon}
                              </span>

                              <span
                                style={{
                                  minWidth: 0,
                                  flex: 1,
                                }}
                              >
                                <strong
                                  style={{
                                    display: "block",
                                    fontSize: "12px",
                                    marginBottom: "4px",
                                  }}
                                >
                                  {notification.title}
                                </strong>

                                <span
                                  style={{
                                    display: "block",
                                    fontSize: "12px",
                                    lineHeight: 1.5,
                                    color: "var(--muted-text, #64748b)",
                                  }}
                                >
                                  {notification.message}
                                </span>
                              </span>

                              {isUnread && (
                                <span
                                  style={{
                                    flex: "0 0 auto",
                                    width: "7px",
                                    height: "7px",
                                    marginTop: "5px",
                                    borderRadius: "50%",
                                    background: "var(--accent-color, #635bff)",
                                  }}
                                />
                              )}
                            </button>

                            <button
                              onClick={() =>
                                dismissNotification(notification.id)
                              }
                              title="Dismiss notification"
                              aria-label="Dismiss notification"
                              style={{
                                flex: "0 0 auto",
                                width: "24px",
                                height: "24px",
                                border: 0,
                                background: "transparent",
                                color: "var(--muted-text, #94a3b8)",
                                display: "grid",
                                placeItems: "center",
                                cursor: "pointer",
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div
                        style={{
                          padding: "42px 24px",
                          textAlign: "center",
                        }}
                      >
                        <CheckCircle2
                          size={28}
                          style={{
                            opacity: 0.65,
                            marginBottom: "10px",
                          }}
                        />
                        <strong
                          style={{
                            display: "block",
                            fontSize: "13px",
                            marginBottom: "5px",
                          }}
                        >
                          No active notifications
                        </strong>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--muted-text, #64748b)",
                          }}
                        >
                          LOOP AI will surface important customer intelligence here.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div
              className="topbar-avatar"
              title={`${authUser?.full_name || "User"} • ${authUser?.role || "User"}`}
            >
              {(authUser?.full_name || "U")
                .split(" ")
                .map((part) => part.charAt(0))
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <button
              className="secondary-button"
              onClick={handleLogout}
              title="Sign out"
              style={{ padding: "9px 12px" }}
            >
              Sign out
            </button>
          </div>
        </header>

        {error && (
          <div className="global-error">
            <ShieldAlert
              size={18}
            />

            <span>
              {error}
            </span>

            <button
              onClick={() =>
                setError("")
              }
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* =====================================================
            DASHBOARD
        ===================================================== */}

        {activePage ===
          "dashboard" && (
          <DashboardPage
            stats={stats}
            analytics={analytics}
            trends={trends}
            totalFeedback={
              totalFeedback
            }
            positivePercentage={
              positivePercentage
            }
            negativePercentage={
              negativePercentage
            }
            criticalIssues={
              criticalIssues
            }
            sentimentData={
              sentimentData
            }
            topicData={
              topicData
            }
            issueData={
              issueData
            }
            sourceData={
              sourceData
            }
            topIssue={topIssue}
            topIssueCount={
              topIssueCount
            }
            setActivePage={
              setActivePage
            }
            refreshData={
              refreshData
            }
            openFeedback={() =>
              setShowFeedbackModal(
                true
              )
            }
          />
        )}

        {/* =====================================================
            WORKSPACE
        ===================================================== */}
        {activePage ===
          "workspace" && (
          <WorkspacePage
            stats={stats}
            analytics={analytics}
            trends={trends}
            totalFeedback={totalFeedback}
            setActivePage={setActivePage}
          />
        )}

        {/* =====================================================
            ACTION CENTER
        ===================================================== */}
        {activePage ===
          "actions" && (
          <ActionCenterPage
            issues={issues}
            criticalIssueList={criticalIssueList}
            trends={trends}
            setActivePage={setActivePage}
            openIssueDetails={openIssueDetails}
          />
        )}

        {/* =====================================================
            FEEDBACK
        ===================================================== */}

        {activePage ===
          "feedback" && (
          <FeedbackPage
            feedback={
              filteredFeedback
            }
            search={search}
            setSearch={
              setSearch
            }
            sentimentFilter={
              sentimentFilter
            }
            setSentimentFilter={
              setSentimentFilter
            }
            priorityFilter={
              priorityFilter
            }
            setPriorityFilter={
              setPriorityFilter
            }
            openFeedback={() =>
              setShowFeedbackModal(
                true
              )
            }
            openFilePicker={
              openFilePicker
            }
            canManageData={canManageData}
            onDeleteFeedback={handleDeleteFeedback}
            importing={
              importing
            }
            importMessage={
              importMessage
            }
            importError={
              importError
            }
          />
        )}

        {/* =====================================================
            ANALYTICS
        ===================================================== */}

        {activePage ===
          "analytics" && (
          <AnalyticsPage
            analytics={
              analytics
            }
            sentimentData={
              sentimentData
            }
            topicData={
              topicData
            }
            issueData={
              issueData
            }
            sourceData={
              sourceData
            }
            priorityData={
              priorityData
            }
          />
        )}

        {/* =====================================================
            ISSUES
        ===================================================== */}

        {activePage ===
          "issues" && (
          <IssuesPage
            issues={issues}
            criticalIssueList={
              criticalIssueList
            }
            openIssueDetails={
              openIssueDetails
            }
          />
        )}

        {/* =====================================================
            COPILOT
        ===================================================== */}

        {activePage ===
          "copilot" && (
          <CopilotPage
            question={
              copilotQuestion
            }
            setQuestion={
              setCopilotQuestion
            }
            answer={
              copilotAnswer
            }
            loading={
              copilotLoading
            }
            history={
              copilotHistory
            }
            askCopilot={
              askCopilot
            }
          />
        )}

        {/* =====================================================
            REPORTS
        ===================================================== */}

        {activePage ===
          "reports" && (
          <ReportsPage
            stats={stats}
            analytics={analytics}
            trends={trends}
            reportMode={reportMode}
            setReportMode={setReportMode}
            selectedReportMonth={selectedReportMonth}
            setSelectedReportMonth={setSelectedReportMonth}
            availableReportMonths={availableReportMonths}
            reportStartDate={reportStartDate}
            setReportStartDate={setReportStartDate}
            reportEndDate={reportEndDate}
            setReportEndDate={setReportEndDate}
            reportPeriod={reportPeriod}
            downloadReport={downloadReport}
          />
        )}

        {/* =====================================================
            SETTINGS
        ===================================================== */}

        {activePage ===
          "settings" && (
          <SettingsPage
            totalFeedback={totalFeedback}
            users={users}
            setUsers={setUsers}
            authUser={authUser}
            loadData={loadData}
          />
        )}
      </main>

      {/* =====================================================
          HIDDEN CSV / EXCEL FILE INPUT
      ===================================================== */}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        style={{
          display: "none",
        }}
        onChange={
          handleFileImport
        }
      />

      {/* =====================================================
          ADD FEEDBACK MODAL
      ===================================================== */}

      {showFeedbackModal && (
        <div className="modal-overlay">
          <div className="modal-card feedback-modal">
            <div className="modal-header">
              <div>
                <span className="modal-kicker">
                  LOOP INTELLIGENCE
                </span>

                <h2>
                  Add Customer
                  Feedback
                </h2>
              </div>

              <button
                className="modal-close"
                onClick={() => {
                  setShowFeedbackModal(
                    false
                  );

                  setFeedbackMessage(
                    ""
                  );
                }}
              >
                <X size={19} />
              </button>
            </div>

            <form
              className="feedback-form"
              onSubmit={
                submitFeedback
              }
            >
              <div className="form-grid">
                <label>
                  Customer Name

                  <input
                    value={
                      customerName
                    }
                    onChange={(
                      event
                    ) =>
                      setCustomerName(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="e.g. Rahul Sharma"
                  />
                </label>

                <label>
                  Source

                  <select
                    value={source}
                    onChange={(
                      event
                    ) =>
                      setSource(
                        event
                          .target
                          .value
                      )
                    }
                  >
                    <option>
                      Website
                    </option>

                    <option>
                      Email
                    </option>

                    <option>
                      Mobile App
                    </option>

                    <option>
                      Social Media
                    </option>

                    <option>
                      Support
                    </option>
                  </select>
                </label>
              </div>

              <label>
                Customer Feedback

                <textarea
                  value={
                    feedbackText
                  }
                  onChange={(
                    event
                  ) =>
                    setFeedbackText(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="Enter what the customer said..."
                  rows="5"
                />
              </label>

              <label>
                Rating

                <select
                  value={rating}
                  onChange={(
                    event
                  ) =>
                    setRating(
                      event
                        .target
                        .value
                    )
                  }
                >
                  <option value="5">
                    5 — Excellent
                  </option>

                  <option value="4">
                    4 — Good
                  </option>

                  <option value="3">
                    3 — Average
                  </option>

                  <option value="2">
                    2 — Poor
                  </option>

                  <option value="1">
                    1 — Very Poor
                  </option>
                </select>
              </label>

              {feedbackMessage && (
                <div className="analysis-result">
                  <CheckCircle2
                    size={18}
                  />

                  <span>
                    {
                      feedbackMessage
                    }
                  </span>
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setShowFeedbackModal(
                      false
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    submitting
                  }
                >
                  <Send
                    size={17}
                  />

                  {submitting
                    ? "Analyzing..."
                    : "Analyze with LOOP AI"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          ISSUE DETAILS MODAL
      ===================================================== */}

      {showIssueModal &&
        selectedIssue && (
          <div className="modal-overlay">
            <div className="modal-card issue-modal">
              <div className="modal-header">
                <div>
                  <span className="modal-kicker">
                    ISSUE INTELLIGENCE
                  </span>

                  <h2>
                    {selectedIssue.issue ||
                      selectedIssue.name ||
                      "Issue"}
                  </h2>
                </div>

                <button
                  className="modal-close"
                  onClick={() =>
                    setShowIssueModal(
                      false
                    )
                  }
                >
                  <X size={19} />
                </button>
              </div>

              <div className="issue-detail-grid">
                <div>
                  <span>
                    Occurrences
                  </span>

                  <strong>
                    {selectedIssue.count ||
                      0}
                  </strong>
                </div>

                <div>
                  <span>
                    Priority
                  </span>

                  <strong className="critical-text">
                    {selectedIssue.priority ||
                      "Critical"}
                  </strong>
                </div>

                <div>
                  <span>
                    Topic
                  </span>

                  <strong>
                    {selectedIssue.topic ||
                      "Customer Experience"}
                  </strong>
                </div>
              </div>

              <div className="recommendation-box">
                <div className="recommendation-icon">
                  <Lightbulb
                    size={21}
                  />
                </div>

                <div>
                  <strong>
                    Recommended
                    investigation
                  </strong>

                  <p>
                    Review the
                    recurring
                    customer
                    feedback
                    connected with
                    this issue,
                    identify the
                    operational
                    cause, and
                    monitor future
                    feedback after
                    corrective
                    action.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

function LandingScreen({ onEnter }) {
  const features = [
    [BrainCircuit, "AI-powered analysis", "Turn raw customer comments into sentiment, topics, issues and priorities."],
    [TrendingUp, "Trend intelligence", "Spot recurring problems and emerging customer concerns before they grow."],
    [ShieldCheck, "Secure workspace", "Role-based access keeps operational and analytical capabilities separated."],
    [Zap, "Action-focused insights", "Move from feedback to recommended actions with one connected intelligence workflow."],
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #07111f 0%, #0d1b31 52%, #102b46 100%)",
        color: "#f8fafc",
        fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        overflow: "auto",
      }}
    >
      <header style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: "linear-gradient(135deg, #38bdf8, #6366f1)", fontWeight: 900, fontSize: 22 }}>L</div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 850, letterSpacing: "-0.02em" }}>LOOP AI</div>
            <div style={{ fontSize: 11, color: "#94a3b8", letterSpacing: "0.08em" }}>CUSTOMER INTELLIGENCE</div>
          </div>
        </div>
        <button onClick={onEnter} style={{ border: "1px solid rgba(255,255,255,.18)", background: "rgba(255,255,255,.08)", color: "#fff", borderRadius: 10, padding: "10px 17px", cursor: "pointer", fontWeight: 700 }}>Sign in</button>
      </header>

      <main>
        <section style={{ maxWidth: 1180, margin: "0 auto", padding: "72px 28px 58px", display: "grid", gridTemplateColumns: "1.08fr .92fr", gap: 56, alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 11px", borderRadius: 999, background: "rgba(56,189,248,.1)", border: "1px solid rgba(56,189,248,.2)", color: "#7dd3fc", fontSize: 12, fontWeight: 800, letterSpacing: ".08em" }}>
              <CircleDot size={14} /> AI CUSTOMER FEEDBACK INTELLIGENCE
            </div>
            <h1 style={{ fontSize: "clamp(42px, 6vw, 72px)", lineHeight: 1.02, letterSpacing: "-0.055em", margin: "22px 0 22px", maxWidth: 720 }}>
              Listen to customers. <span style={{ color: "#67e8f9" }}>Understand what matters.</span>
            </h1>
            <p style={{ maxWidth: 650, color: "#b6c4d7", fontSize: 18, lineHeight: 1.7, margin: 0 }}>
              LOOP AI transforms customer feedback into actionable intelligence — automatically detecting sentiment, recurring issues, emerging trends and business priorities.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 30 }}>
              <button onClick={onEnter} style={{ display: "inline-flex", alignItems: "center", gap: 10, border: 0, borderRadius: 12, padding: "14px 20px", background: "linear-gradient(135deg, #38bdf8, #6366f1)", color: "white", fontWeight: 850, fontSize: 15, cursor: "pointer", boxShadow: "0 12px 35px rgba(56,189,248,.18)" }}>
                Enter LOOP AI <ArrowRight size={18} />
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 5px", color: "#94a3b8", fontSize: 13 }}>
                <ShieldCheck size={17} /> Secure role-based workspace
              </div>
            </div>
          </div>

          <div style={{ position: "relative", minHeight: 380, borderRadius: 26, padding: 18, background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 30px 80px rgba(0,0,0,.25)" }}>
            <div style={{ height: "100%", minHeight: 340, borderRadius: 18, background: "#0b1424", border: "1px solid rgba(255,255,255,.08)", padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
                <div><div style={{ color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em" }}>LOOP intelligence</div><strong style={{ fontSize: 20 }}>Customer Overview</strong></div>
                <div style={{ color: "#67e8f9", fontSize: 12, fontWeight: 800 }}>LIVE AI</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
                {[['Feedback','2,480'],['Positive','68%'],['Critical','12']].map(([a,b]) => <div key={a} style={{ padding: 13, borderRadius: 12, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.06)" }}><div style={{ color: "#94a3b8", fontSize: 10 }}>{a}</div><strong style={{ display: "block", marginTop: 5, fontSize: 19 }}>{b}</strong></div>)}
              </div>
              <div style={{ padding: 15, borderRadius: 14, background: "rgba(56,189,248,.05)", border: "1px solid rgba(56,189,248,.12)" }}>
                <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 14 }}>AI issue signals</div>
                {[['Payment failures', 82], ['Delivery delays', 64], ['App performance', 48]].map(([name,value]) => <div key={name} style={{ marginBottom: 13 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 5 }}><span>{name}</span><span style={{ color: "#67e8f9" }}>{value}%</span></div><div style={{ height: 7, borderRadius: 99, background: "#1e293b", overflow: "hidden" }}><div style={{ width: `${value}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#38bdf8,#818cf8)" }} /></div></div>)}
              </div>
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 28px 65px" }}>
          <div style={{ textAlign: "center", marginBottom: 30 }}><div style={{ color: "#67e8f9", fontSize: 12, fontWeight: 850, letterSpacing: ".1em" }}>ONE CONNECTED WORKFLOW</div><h2 style={{ fontSize: 30, margin: "9px 0 0" }}>From feedback to action</h2></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
            {features.map(([Icon,title,text]) => <div key={title} style={{ padding: 21, borderRadius: 16, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ width: 40, height: 40, borderRadius: 11, display: "grid", placeItems: "center", background: "rgba(56,189,248,.1)", color: "#67e8f9", marginBottom: 15 }}><Icon size={20} /></div><h3 style={{ margin: "0 0 8px", fontSize: 16 }}>{title}</h3><p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.6, fontSize: 13 }}>{text}</p></div>)}
          </div>
        </section>

        <section style={{ borderTop: "1px solid rgba(255,255,255,.07)", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
          <div style={{ maxWidth: 1180, margin: "0 auto", padding: "30px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div><strong style={{ fontSize: 17 }}>Ready to explore the intelligence workspace?</strong><div style={{ color: "#94a3b8", fontSize: 13, marginTop: 5 }}>Use the evaluator role buttons on the secure sign-in screen.</div></div>
            <button onClick={onEnter} style={{ display: "inline-flex", alignItems: "center", gap: 8, border: 0, borderRadius: 10, padding: "12px 17px", background: "#f8fafc", color: "#0f172a", fontWeight: 800, cursor: "pointer" }}>Continue <ArrowRight size={17} /></button>
          </div>
        </section>
      </main>

      <footer style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 28px 30px", display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: 12 }}>
        <span>© 2026 LOOP AI</span><span>AI Customer Feedback Intelligence Platform</span>
      </footer>
    </div>
  );
}

function LoginScreen({ onLogin, onDemoLogin, onBackToLanding }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [demoLoading, setDemoLoading] = useState("");

  const demoLogin = async (role) => {
    setError("");
    try {
      setDemoLoading(role);
      await onDemoLogin(role);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
          `Unable to start the ${role} demo. Please try again.`
      );
    } finally {
      setDemoLoading("");
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      setSubmitting(true);
      await onLogin(email.trim(), password);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
          "Invalid email or password. Please check your credentials and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="loop-login-page">
      <div className="loop-login-shell">
        <section className="loop-login-brand-panel">
          <div className="loop-brand-topline">
            <div className="loop-login-brand-block">
              <div className="loop-login-logo">L</div>
              <div>
                <div className="loop-login-brand-name">LOOP AI</div>
                <div className="loop-login-brand-subtitle">Secure Customer Intelligence</div>
              </div>
            </div>
            <div className="loop-security-badge">
              <ShieldCheck size={15} />
              Enterprise Grade Security
            </div>
          </div>

          <div className="loop-brand-copy">
            <span className="loop-brand-eyebrow">AI CUSTOMER INTELLIGENCE PLATFORM</span>
            <h1>
              Turn Customer Feedback<br />
              into <span>Business Intelligence</span>
            </h1>
            <p>
              Capture feedback, detect issues, discover insights and drive better
              business decisions with AI.
            </p>
          </div>

          <div className="loop-feature-list">
            <div className="loop-feature-item">
              <div className="loop-feature-icon"><ShieldCheck size={21} /></div>
              <div>
                <strong>Secure &amp; Reliable</strong>
                <span>Enterprise-grade security to keep your feedback data safe.</span>
              </div>
            </div>
            <div className="loop-feature-item">
              <div className="loop-feature-icon"><BarChart3 size={21} /></div>
              <div>
                <strong>AI-Powered Insights</strong>
                <span>Analyze sentiment, topics, issues and priorities automatically.</span>
              </div>
            </div>
            <div className="loop-feature-item">
              <div className="loop-feature-icon"><Activity size={21} /></div>
              <div>
                <strong>Real-time Intelligence</strong>
                <span>Monitor trends and critical issues through live dashboards.</span>
              </div>
            </div>
            <div className="loop-feature-item">
              <div className="loop-feature-icon"><Settings size={21} /></div>
              <div>
                <strong>Role-Based Access</strong>
                <span>Granular access for Admins, Managers and Analysts.</span>
              </div>
            </div>
          </div>

          <div className="loop-login-dashboard-art" aria-hidden="true">
            <div className="loop-art-glow" />
            <div className="loop-art-ring loop-art-ring-one" />
            <div className="loop-art-ring loop-art-ring-two" />
            <div className="loop-art-screen">
              <div className="loop-art-toolbar"><i /><i /><i /></div>
              <div className="loop-art-content">
                <div className="loop-art-donut"><span>AI</span></div>
                <div className="loop-art-bars">
                  <i style={{ height: "35%" }} />
                  <i style={{ height: "58%" }} />
                  <i style={{ height: "45%" }} />
                  <i style={{ height: "76%" }} />
                  <i style={{ height: "64%" }} />
                  <i style={{ height: "88%" }} />
                </div>
              </div>
              <div className="loop-art-line" />
            </div>
            <div className="loop-art-chip loop-art-chip-one">
              <strong>82%</strong><span>Resolution Rate</span>
            </div>
            <div className="loop-art-chip loop-art-chip-two">
              <ShieldAlert size={14} /><span>Issue Detected</span>
            </div>
          </div>

          <div className="loop-brand-footer">© 2026 LOOP AI. All rights reserved.</div>
        </section>

        <section className="loop-login-form-panel">
          <div className="loop-login-card">
            <div className="loop-login-card-logo-wrap">
              <div className="loop-login-card-logo">L</div>
              <div className="loop-login-logo-dots" />
            </div>

            <div className="loop-login-heading">
              <span>SECURE WORKSPACE</span>
              <h2>Welcome Back</h2>
              <p>Sign in to access your LOOP AI workspace</p>
            </div>

            <button
              type="button"
              onClick={onBackToLanding}
              style={{
                alignSelf: "flex-start",
                border: "none",
                background: "transparent",
                color: "#64748b",
                cursor: "pointer",
                fontSize: "13px",
                marginBottom: "16px",
                padding: 0,
              }}
            >
              ← Back to LOOP AI overview
            </button>

            <div style={{ marginBottom: "18px" }}>
              <div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", color: "#64748b", marginBottom: "8px" }}>
                EVALUATOR ACCESS
              </div>
              <div style={{ fontSize: "12px", lineHeight: 1.55, color: "#64748b", marginBottom: "10px" }}>
                Public evaluation access is limited to the read-only Viewer role. Admin, Manager and Analyst accounts must use authenticated credentials.
              </div>
              <button
                type="button"
                onClick={() => demoLogin("Viewer")}
                disabled={Boolean(demoLoading)}
                style={{
                  width: "100%",
                  border: "1px solid #dbe3ef",
                  borderRadius: "12px",
                  background: "#f8fafc",
                  padding: "11px 12px",
                  cursor: demoLoading ? "wait" : "pointer",
                  textAlign: "left",
                  opacity: demoLoading && demoLoading !== "Viewer" ? 0.55 : 1,
                }}
              >
                <strong style={{ display: "block", color: "#172033", fontSize: "13px" }}>
                  {demoLoading === "Viewer" ? "Opening..." : "Continue as Viewer"}
                </strong>
                <span style={{ display: "block", color: "#64748b", fontSize: "11px", marginTop: "2px" }}>
                  Read-only demo access • no password required
                </span>
              </button>
            </div>

            <div className="loop-login-divider" style={{ marginBottom: "18px" }}><span>OR SIGN IN WITH ACCOUNT</span></div>

            <form onSubmit={submit} className="loop-login-form">
              <label>
                <span>Email Address</span>
                <div className="loop-input-wrap">
                  <Mail size={18} />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </div>
              </label>

              <label>
                <div className="loop-password-label">
                  <span>Password</span>
                  <button type="button" onClick={() => setError("Password recovery is not configured yet.")}>Forgot Password?</button>
                </div>
                <div className="loop-input-wrap">
                  <LockKeyhole size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="loop-password-toggle"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              <div className="loop-login-options">
                <label className="loop-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
              </div>

              {error && (
                <div className="loop-login-error">
                  <ShieldAlert size={17} />
                  <span>{error}</span>
                </div>
              )}

              <button className="loop-login-submit" type="submit" disabled={submitting}>
                <span>{submitting ? "Signing in..." : "Sign In to LOOP AI"}</span>
                {!submitting && <ArrowRight size={19} />}
              </button>
            </form>

            <div className="loop-login-divider"><span>OR</span></div>

            <button
              type="button"
              className="loop-google-button"
              onClick={() => setError("Google sign-in is not connected yet. Use your LOOP AI account.")}
            >
              <span className="loop-google-icon">G</span>
              Sign in with Google
            </button>

            <div className="loop-request-access">
              <span>New to LOOP AI?</span>
              <button
                type="button"
                onClick={() => setError("Account access is managed by the LOOP AI administrator.")}
              >
                Request access <ArrowRight size={15} />
              </button>
            </div>
          </div>

          <div className="loop-login-trust-bar">
            <div><ShieldCheck size={20} /><span><strong>Secure Login</strong><small>Protected access</small></span></div>
            <div><LockKeyhole size={20} /><span><strong>Encrypted Connection</strong><small>SSL/TLS protected</small></span></div>
            <div><ShieldCheck size={20} /><span><strong>Your data is protected</strong><small>Privacy focused</small></span></div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function DashboardPage({
  stats,
  analytics,
  trends,
  totalFeedback,
  positivePercentage,
  negativePercentage,
  criticalIssues,
  sentimentData,
  topicData,
  issueData,
  sourceData,
  topIssue,
  topIssueCount,
  setActivePage,
  refreshData,
  openFeedback,
}) {
  const neutralPercentage =
    totalFeedback > 0
      ? Math.round(
          ((Number(
            stats?.neutral
          ) || 0) /
            totalFeedback) *
            100
        )
      : 0;

  return (
    <div className="page-container">
      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="dashboard-hero">
        <div className="hero-content">
          <span className="hero-eyebrow">
            <Zap size={14} />
            AI CUSTOMER INTELLIGENCE
          </span>

          <h1>
            Transform customer
            feedback
            <br />
            into{" "}
            <span>
              actionable intelligence.
            </span>
          </h1>

          <p>
            LOOP AI transforms raw
            customer feedback into
            sentiment, issues,
            priorities and decisions
            your team can act on.
          </p>

          <div className="hero-actions">
            <button
              className="primary-button"
              onClick={
                openFeedback
              }
            >
              <MessageSquare
                size={17}
              />
              Analyze Feedback
            </button>

            <button
              className="secondary-button hero-secondary"
              onClick={() =>
                setActivePage(
                  "copilot"
                )
              }
            >
              <Bot size={17} />
              Ask LOOP AI
            </button>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-ring ring-one" />

          <div className="hero-ring ring-two" />

          <div className="hero-ai-core">
            <BrainCircuit
              size={45}
            />

            <span>AI</span>
          </div>

          <div className="floating-insight insight-one">
            <TrendingDown
              size={15}
            />

            <span>
              Negative trend
            </span>
          </div>

          <div className="floating-insight insight-two">
            <ShieldAlert
              size={15}
            />

            <span>
              {criticalIssues} critical
            </span>
          </div>

          <div className="floating-insight insight-three">
            <Activity size={15} />

            <span>
              Live analysis
            </span>
          </div>
        </div>
      </section>

      {/* =====================================================
          KPI CARDS
      ===================================================== */}

      <div className="kpi-grid">
        <MetricCard
          icon={
            <MessageSquare
              size={20}
            />
          }
          label="Total Feedback"
          value={
            totalFeedback
          }
          description="Customer responses analyzed"
          type="purple"
        />

        <MetricCard
          icon={
            <TrendingUp
              size={20}
            />
          }
          label="Positive"
          value={`${positivePercentage}%`}
          description="Positive sentiment"
          type="green"
        />

        <MetricCard
          icon={
            <TrendingDown
              size={20}
            />
          }
          label="Negative"
          value={`${negativePercentage}%`}
          description="Needs attention"
          type="red"
        />

        <MetricCard
          icon={
            <ShieldAlert
              size={20}
            />
          }
          label="Critical Issues"
          value={
            criticalIssues
          }
          description="Requires investigation"
          type="orange"
        />
      </div>

      {/* =====================================================
          TREND INTELLIGENCE
      ===================================================== */}

      <TrendIntelligence
        trends={trends}
        setActivePage={
          setActivePage
        }
      />

      {/* =====================================================
          AI SUMMARY
      ===================================================== */}

      <div className="intelligence-strip">
        <div className="intelligence-strip-icon">
          <BrainCircuit
            size={20}
          />
        </div>

        <div>
          <span>
            LOOP AI INTELLIGENCE
          </span>

          <p>
            {analytics?.summary ||
              "Your feedback intelligence summary will appear here."}
          </p>
        </div>

        <button
          onClick={() =>
            setActivePage(
              "analytics"
            )
          }
        >
          Explore analytics

          <ArrowUpRight
            size={16}
          />
        </button>
      </div>

      {/* =====================================================
          SENTIMENT + ISSUES
      ===================================================== */}

      <div className="dashboard-grid">
        <section className="dashboard-card">
          <CardHeader
            icon={
              <Activity
                size={17}
              />
            }
            title="Customer Sentiment"
            subtitle="Current feedback distribution"
            action="Analytics"
            onAction={() =>
              setActivePage(
                "analytics"
              )
            }
          />

          <div className="sentiment-chart">
            {sentimentData.length >
            0 ? (
              <>
                <ResponsiveContainer
                  width="100%"
                  height={230}
                >
                  <PieChart>
                    <Pie
                      data={
                        sentimentData
                      }
                      dataKey="value"
                      nameKey="name"
                      innerRadius={
                        65
                      }
                      outerRadius={
                        92
                      }
                      paddingAngle={
                        4
                      }
                    >
                      {sentimentData.map(
                        (
                          entry,
                          index
                        ) => (
                          <Cell
                            key={
                              entry.name
                            }
                            fill={
                              [
                                "var(--chart-positive)",
                                "var(--chart-negative)",
                                "var(--chart-neutral)",
                              ][
                                index
                              ]
                            }
                          />
                        )
                      )}
                    </Pie>

                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="chart-center">
                  <strong>
                    {
                      totalFeedback
                    }
                  </strong>

                  <span>
                    Total
                  </span>
                </div>
              </>
            ) : (
              <EmptyState
                icon={
                  <Activity
                    size={25}
                  />
                }
                text="No analyzed sentiment yet"
              />
            )}
          </div>

          <div className="sentiment-legend">
            <LegendItem
              label="Positive"
              value={
                stats?.positive ||
                0
              }
              type="positive"
            />

            <LegendItem
              label="Negative"
              value={
                stats?.negative ||
                0
              }
              type="negative"
            />

            <LegendItem
              label="Neutral"
              value={
                stats?.neutral ||
                0
              }
              type="neutral"
            />
          </div>
        </section>

        <section className="dashboard-card">
          <CardHeader
            icon={
              <AlertTriangle
                size={17}
              />
            }
            title="Top Customer Issues"
            subtitle="Recurring problems detected by LOOP AI"
            action="View issues"
            onAction={() =>
              setActivePage(
                "issues"
              )
            }
          />

          <div className="top-issue-highlight">
            <div className="top-issue-icon">
              <ShieldAlert
                size={22}
              />
            </div>

            <div>
              <span>
                HIGHEST FREQUENCY ISSUE
              </span>

              <strong>
                {topIssue}
              </strong>

              <p>
                {
                  topIssueCount
                }{" "}
                occurrence
                {topIssueCount !==
                1
                  ? "s"
                  : ""}{" "}
                detected
              </p>
            </div>

            <button
              onClick={() =>
                setActivePage(
                  "issues"
                )
              }
            >
              <ArrowUpRight
                size={17}
              />
            </button>
          </div>

          <div className="mini-ranking">
            {issueData.length >
            0 ? (
              issueData
                .slice(0, 4)
                .map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      className="ranking-row"
                      key={
                        item.name
                      }
                    >
                      <span className="ranking-number">
                        0
                        {index +
                          1}
                      </span>

                      <div className="ranking-main">
                        <div>
                          <strong>
                            {
                              item.name
                            }
                          </strong>

                          <span>
                            {
                              item.count
                            }{" "}
                            feedback
                          </span>
                        </div>

                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.min(
                                100,
                                (item.count /
                                  Math.max(
                                    ...issueData.map(
                                      (
                                        x
                                      ) =>
                                        x.count
                                    )
                                  )) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                )
            ) : (
              <EmptyState
                icon={
                  <CheckCircle2
                    size={25}
                  />
                }
                text="No recurring issues detected"
              />
            )}
          </div>
        </section>
      </div>

      {/* =====================================================
          TOPICS + SOURCES
      ===================================================== */}

      <div className="two-column">
        <section className="dashboard-card">
          <CardHeader
            icon={
              <BarChart3
                size={17}
              />
            }
            title="Topics"
            subtitle="What customers talk about"
          />

          {topicData.length >
          0 ? (
            <div className="topic-list">
              {topicData
                .slice(0, 5)
                .map(
                  (topic) => (
                    <div
                      className="topic-row"
                      key={
                        topic.name
                      }
                    >
                      <div className="topic-icon">
                        <CircleDot
                          size={16}
                        />
                      </div>

                      <div className="topic-main">
                        <div>
                          <strong>
                            {
                              topic.name
                            }
                          </strong>

                          <span>
                            {
                              topic.count
                            }
                          </span>
                        </div>

                        <div className="topic-progress">
                          <div
                            style={{
                              width: `${Math.min(
                                100,
                                (topic.count /
                                  Math.max(
                                    ...topicData.map(
                                      (
                                        x
                                      ) =>
                                        x.count
                                    )
                                  )) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                )}
            </div>
          ) : (
            <EmptyState
              icon={
                <BarChart3
                  size={25}
                />
              }
              text="Topic analysis will appear here"
            />
          )}
        </section>

        <section className="dashboard-card">
          <CardHeader
            icon={
              <Database
                size={17}
              />
            }
            title="Feedback Sources"
            subtitle="Where customer feedback comes from"
          />

          {sourceData.length >
          0 ? (
            <ResponsiveContainer
              width="100%"
              height={230}
            >
              <BarChart
                data={
                  sourceData
                }
                layout="vertical"
                margin={{
                  top: 10,
                  right: 20,
                  left: 20,
                  bottom: 10,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--chart-grid)"
                />

                <XAxis
                  type="number"
                  stroke="var(--chart-axis)"
                />

                <YAxis
                  dataKey="name"
                  type="category"
                  width={90}
                  stroke="var(--chart-axis)"
                />

                <Tooltip />

                <Bar
                  dataKey="count"
                  fill="var(--chart-primary)"
                  radius={[
                    0,
                    7,
                    7,
                    0,
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={
                <Database
                  size={25}
                />
              }
              text="No source data available"
            />
          )}
        </section>
      </div>

      {/* =====================================================
          AI INSIGHT
      ===================================================== */}

      <section className="ai-insight-card">
        <div className="ai-card-glow" />

        <div className="ai-insight-icon">
          <BrainCircuit
            size={25}
          />
        </div>

        <div className="ai-insight-body">
          <span className="ai-label">
            LOOP AI INSIGHT ENGINE
          </span>

          <h3>
            Your feedback is telling a
            story.
          </h3>

          <p>
            {negativePercentage >
            50
              ? `Negative feedback currently represents ${negativePercentage}% of analyzed responses. ${topIssue} is the most frequent issue and should be investigated using the underlying customer feedback.`
              : "Customer feedback is currently showing a relatively balanced pattern. Continue monitoring recurring issues and sentiment changes."}
          </p>
        </div>

        <button
          className="ai-explore-button"
          onClick={() =>
            setActivePage(
              "copilot"
            )
          }
        >
          Ask AI

          <ArrowUpRight
            size={16}
          />
        </button>
      </section>
    </div>
  );
}

/* =========================================================
   TREND INTELLIGENCE
========================================================= */

function TrendIntelligence({
  trends,
  setActivePage,
}) {
  const recentCount =
    Number(
      trends?.analysis_period
        ?.recent_feedback_count ||
        0
    );

  const previousCount =
    Number(
      trends?.analysis_period
        ?.previous_feedback_count ||
        0
    );

  const threshold =
    Number(
      trends?.trend_threshold_percentage ||
        20
    );

  const emergingIssue =
    trends?.emerging_issue;

  const newIssues =
    Array.isArray(
      trends?.new_issues
    )
      ? trends.new_issues
      : [];

  const trendingUp =
    Array.isArray(
      trends?.trending_up
    )
      ? trends.trending_up
      : [];

  const trendingDown =
    Array.isArray(
      trends?.trending_down
    )
      ? trends.trending_down
      : [];

  const significantTrends =
    Array.isArray(
      trends?.significant_trends
    )
      ? trends.significant_trends
      : [];

  const getStatusClass = (
    status
  ) => {
    const normalized =
      String(
        status || ""
      ).toLowerCase();

    if (
      normalized ===
      "increasing"
    ) {
      return "trend-up";
    }

    if (
      normalized ===
      "decreasing"
    ) {
      return "trend-down";
    }

    if (
      normalized === "new"
    ) {
      return "trend-new";
    }

    return "trend-stable";
  };

  const formatChange = (
    change
  ) => {
    if (
      change === null ||
      change === undefined ||
      change === ""
    ) {
      return "New signal";
    }

    const numeric =
      Number(change);

    if (
      Number.isNaN(
        numeric
      )
    ) {
      return "—";
    }

    return `${
      numeric > 0
        ? "+"
        : ""
    }${numeric.toFixed(
      1
    )}%`;
  };

  const TrendRow = ({
    item,
  }) => (
    <div
      style={{
        display: "flex",
        alignItems:
          "center",
        justifyContent:
          "space-between",
        gap: "12px",
        padding:
          "12px 0",
        borderBottom:
          "1px solid var(--border-color)",
      }}
    >
      <div
        style={{
          minWidth: 0,
          flex: 1,
        }}
      >
        <strong
          style={{
            display:
              "block",
            marginBottom:
              "4px",
          }}
        >
          {item.name}
        </strong>

        <span
          style={{
            fontSize:
              "12px",
            color:
              "var(--text-muted)",
          }}
        >
          {item.recent_count} recent
          {" • "}
          {item.previous_count} previous
        </span>
      </div>

      <div
        style={{
          display:
            "flex",
          alignItems:
            "center",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <span
          className={`trend-status ${getStatusClass(
            item.status
          )}`}
          style={{
            display:
              "inline-flex",
            alignItems:
              "center",
            gap: "4px",
            padding:
              "5px 9px",
            borderRadius:
              "999px",
            fontSize:
              "11px",
            fontWeight: 700,
          }}
        >
          {item.status ===
          "Increasing" ? (
            <TrendingUp
              size={12}
            />
          ) : item.status ===
            "Decreasing" ? (
            <TrendingDown
              size={12}
            />
          ) : item.status ===
            "New" ? (
            <Zap size={12} />
          ) : (
            <Activity
              size={12}
            />
          )}

          {item.status}
        </span>

        <span
          style={{
            fontSize:
              "12px",
            fontWeight: 700,
            minWidth:
              "58px",
            textAlign:
              "right",
          }}
        >
          {formatChange(
            item.change_percentage
          )}
        </span>
      </div>
    </div>
  );

  return (
    <section
      className="dashboard-card"
      style={{
        marginBottom:
          "24px",
      }}
    >
      <CardHeader
        icon={
          <Activity
            size={17}
          />
        }
        title="Trend Intelligence"
        subtitle={`LOOP AI monitors feedback changes using a ${threshold}% significance threshold`}
        action="Ask LOOP AI"
        onAction={() =>
          setActivePage(
            "copilot"
          )
        }
      />

      {/* =====================================================
          TREND SUMMARY
      ===================================================== */}

      <div
        style={{
          display:
            "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginBottom:
            "20px",
        }}
      >
        <div
          style={{
            padding:
              "16px",
            borderRadius:
              "14px",
            background:
              "var(--surface-soft)",
            border:
              "1px solid var(--border-color)",
          }}
        >
          <span
            style={{
              display:
                "block",
              fontSize:
                "11px",
              fontWeight: 700,
              color:
                "var(--text-muted)",
              marginBottom:
                "7px",
            }}
          >
            RECENT 7 DAYS
          </span>

          <strong
            style={{
              fontSize:
                "24px",
            }}
          >
            {recentCount}
          </strong>

          <span
            style={{
              display:
                "block",
              fontSize:
                "12px",
              color:
                "var(--text-muted)",
              marginTop:
                "4px",
            }}
          >
            feedback records
          </span>
        </div>

        <div
          style={{
            padding:
              "16px",
            borderRadius:
              "14px",
            background:
              "var(--surface-soft)",
            border:
              "1px solid var(--border-color)",
          }}
        >
          <span
            style={{
              display:
                "block",
              fontSize:
                "11px",
              fontWeight: 700,
              color:
                "var(--text-muted)",
              marginBottom:
                "7px",
            }}
          >
            PREVIOUS 7 DAYS
          </span>

          <strong
            style={{
              fontSize:
                "24px",
            }}
          >
            {previousCount}
          </strong>

          <span
            style={{
              display:
                "block",
              fontSize:
                "12px",
              color:
                "var(--text-muted)",
              marginTop:
                "4px",
            }}
          >
            comparison period
          </span>
        </div>

        <div
          style={{
            padding:
              "16px",
            borderRadius:
              "14px",
            background:
              "var(--surface-soft)",
            border:
              "1px solid var(--border-color)",
          }}
        >
          <span
            style={{
              display:
                "block",
              fontSize:
                "11px",
              fontWeight: 700,
              color:
                "var(--text-muted)",
              marginBottom:
                "7px",
            }}
          >
            TREND THRESHOLD
          </span>

          <strong
            style={{
              fontSize:
                "24px",
            }}
          >
            {threshold}%
          </strong>

          <span
            style={{
              display:
                "block",
              fontSize:
                "12px",
              color:
                "var(--text-muted)",
              marginTop:
                "4px",
            }}
          >
            significant change
          </span>
        </div>

        <div
          style={{
            padding:
              "16px",
            borderRadius:
              "14px",
            background:
              "var(--surface-soft)",
            border:
              "1px solid var(--border-color)",
          }}
        >
          <span
            style={{
              display:
                "block",
              fontSize:
                "11px",
              fontWeight: 700,
              color:
                "var(--text-muted)",
              marginBottom:
                "7px",
            }}
          >
            NEW ISSUES
          </span>

          <strong
            style={{
              fontSize:
                "24px",
            }}
          >
            {
              newIssues.length
            }
          </strong>

          <span
            style={{
              display:
                "block",
              fontSize:
                "12px",
              color:
                "var(--text-muted)",
              marginTop:
                "4px",
            }}
          >
            newly detected signals
          </span>
        </div>
      </div>

      {/* =====================================================
          EMERGING ISSUE
      ===================================================== */}

      {emergingIssue ? (
        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            gap: "15px",
            padding:
              "16px",
            marginBottom:
              "20px",
            borderRadius:
              "15px",
            background:
              "var(--surface-soft)",
            border:
              "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              width:
                "44px",
              height:
                "44px",
              borderRadius:
                "12px",
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              background:
                "rgba(239, 68, 68, 0.10)",
              flexShrink: 0,
            }}
          >
            <ShieldAlert
              size={21}
            />
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <span
              style={{
                display:
                  "block",
                fontSize:
                  "11px",
                fontWeight: 800,
                letterSpacing:
                  "0.06em",
                marginBottom:
                  "4px",
              }}
            >
              EMERGING ISSUE
            </span>

            <strong
              style={{
                display:
                  "block",
                fontSize:
                  "17px",
                marginBottom:
                  "3px",
              }}
            >
              {emergingIssue.name}
            </strong>

            <span
              style={{
                fontSize:
                  "12px",
                color:
                  "var(--text-muted)",
              }}
            >
              {
                emergingIssue.recent_count
              }{" "}
              recent occurrence
              {Number(
                emergingIssue.recent_count ||
                  0
              ) !== 1
                ? "s"
                : ""}{" "}
              detected by LOOP AI
            </span>
          </div>

          <span
            className="trend-status trend-new"
            style={{
              padding:
                "6px 10px",
              borderRadius:
                "999px",
              fontSize:
                "11px",
              fontWeight: 800,
            }}
          >
            {emergingIssue.status ||
              "New"}
          </span>
        </div>
      ) : (
        <div
          style={{
            padding:
              "16px",
            marginBottom:
              "20px",
            borderRadius:
              "15px",
            background:
              "var(--surface-soft)",
            border:
              "1px solid var(--border-color)",
          }}
        >
          <strong>
            No emerging issue detected
          </strong>

          <p
            style={{
              margin:
                "5px 0 0",
              color:
                "var(--text-muted)",
              fontSize:
                "13px",
            }}
          >
            LOOP AI will display a
            signal here when a new
            or significantly
            increasing issue is
            detected.
          </p>
        </div>
      )}

      {/* =====================================================
          TREND COLUMNS
      ===================================================== */}

      <div
        style={{
          display:
            "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
        }}
      >
        <div>
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              marginBottom:
                "4px",
            }}
          >
            <strong>
              New Signals
            </strong>

            <span
              style={{
                fontSize:
                  "12px",
                color:
                  "var(--text-muted)",
              }}
            >
              {
                newIssues.length
              }
            </span>
          </div>

          {newIssues.length >
          0 ? (
            newIssues
              .slice(0, 5)
              .map(
                (item) => (
                  <TrendRow
                    key={
                      item.name
                    }
                    item={item}
                  />
                )
              )
          ) : (
            <div
              style={{
                padding:
                  "18px 0",
                color:
                  "var(--text-muted)",
                fontSize:
                  "13px",
              }}
            >
              No new issue
              signals.
            </div>
          )}
        </div>

        <div>
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              marginBottom:
                "4px",
            }}
          >
            <strong>
              Increasing
            </strong>

            <span
              style={{
                fontSize:
                  "12px",
                color:
                  "var(--text-muted)",
              }}
            >
              {
                trendingUp.length
              }
            </span>
          </div>

          {trendingUp.length >
          0 ? (
            trendingUp
              .slice(0, 5)
              .map(
                (item) => (
                  <TrendRow
                    key={
                      item.name
                    }
                    item={item}
                  />
                )
              )
          ) : (
            <div
              style={{
                padding:
                  "18px 0",
                color:
                  "var(--text-muted)",
                fontSize:
                  "13px",
              }}
            >
              No issues have
              crossed the{" "}
              {threshold}%
              increase
              threshold yet.
            </div>
          )}
        </div>

        <div>
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              marginBottom:
                "4px",
            }}
          >
            <strong>
              Decreasing
            </strong>

            <span
              style={{
                fontSize:
                  "12px",
                color:
                  "var(--text-muted)",
              }}
            >
              {
                trendingDown.length
              }
            </span>
          </div>

          {trendingDown.length >
          0 ? (
            trendingDown
              .slice(0, 5)
              .map(
                (item) => (
                  <TrendRow
                    key={
                      item.name
                    }
                    item={item}
                  />
                )
              )
          ) : (
            <div
              style={{
                padding:
                  "18px 0",
                color:
                  "var(--text-muted)",
                fontSize:
                  "13px",
              }}
            >
              No decreasing
              issue signals
              detected yet.
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          SIGNIFICANT TREND SUMMARY
      ===================================================== */}

      {significantTrends.length >
        0 && (
        <div
          style={{
            marginTop:
              "20px",
            paddingTop:
              "16px",
            borderTop:
              "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: "7px",
              marginBottom:
                "10px",
            }}
          >
            <Zap size={15} />

            <strong
              style={{
                fontSize:
                  "13px",
              }}
            >
              Significant Signals
            </strong>
          </div>

          <div
            style={{
              display:
                "flex",
              flexWrap:
                "wrap",
              gap: "8px",
            }}
          >
            {significantTrends
              .slice(0, 8)
              .map(
                (item) => (
                  <span
                    key={
                      item.name
                    }
                    style={{
                      display:
                        "inline-flex",
                      alignItems:
                        "center",
                      gap: "5px",
                      padding:
                        "7px 10px",
                      borderRadius:
                        "999px",
                      border:
                        "1px solid var(--border-color)",
                      fontSize:
                        "11px",
                      fontWeight: 700,
                    }}
                  >
                    {item.name}

                    <span
                      style={{
                        opacity:
                          0.65,
                      }}
                    >
                      •
                    </span>

                    {
                      item.status
                    }
                  </span>
                )
              )}
          </div>
        </div>
      )}
    </section>
  );
}

/* =========================================================
   FEEDBACK
========================================================= */

function FeedbackPage({
  feedback,
  search,
  setSearch,
  sentimentFilter,
  setSentimentFilter,
  priorityFilter,
  setPriorityFilter,
  openFeedback,
  openFilePicker,
  canManageData,
  onDeleteFeedback,
  importing,
  importMessage,
  importError,
}) {
  return (
    <div className="page-container">
      <PageHeading
        eyebrow="CUSTOMER VOICE"
        title="Feedback Intelligence"
        description="Review, search and understand every customer response."
        action={
          <div
            style={{
              display:
                "flex",
              gap: "10px",
              flexWrap:
                "wrap",
            }}
          >
            {canManageData && (
              <button
                className="secondary-button"
                onClick={openFilePicker}
                disabled={importing}
              >
                <Upload size={17} />
                {importing ? "Importing..." : "Import CSV / Excel"}
              </button>
            )}

            <button
              className="primary-button"
              onClick={
                openFeedback
              }
            >
              <MessageSquare
                size={17}
              />

              Add Feedback
            </button>
          </div>
        }
      />

      {(importMessage ||
        importError) && (
        <div
          className="analysis-result"
          style={{
            marginBottom:
              "18px",
          }}
        >
          {importError ? (
            <ShieldAlert
              size={18}
            />
          ) : (
            <CheckCircle2
              size={18}
            />
          )}

          <span>
            {importError ||
              importMessage}
          </span>
        </div>
      )}

      <div className="filter-bar">
        <div className="search-box">
          <Search size={17} />

          <input
            value={search}
            onChange={(
              event
            ) =>
              setSearch(
                event.target
                  .value
              )
            }
            placeholder="Search customer, issue, topic..."
          />
        </div>

        <select
          className="filter-select"
          value={
            sentimentFilter
          }
          onChange={(
            event
          ) =>
            setSentimentFilter(
              event.target
                .value
            )
          }
        >
          <option>
            All
          </option>

          <option>
            Positive
          </option>

          <option>
            Negative
          </option>

          <option>
            Neutral
          </option>
        </select>

        <select
          className="filter-select"
          value={
            priorityFilter
          }
          onChange={(
            event
          ) =>
            setPriorityFilter(
              event.target
                .value
            )
          }
        >
          <option>
            All
          </option>

          <option>
            Critical
          </option>

          <option>
            High
          </option>

          <option>
            Medium
          </option>

          <option>
            Low
          </option>
        </select>

        <span className="result-count">
          {feedback.length}{" "}
          records
        </span>
      </div>

      <div className="feedback-table-wrapper">
        <table className="feedback-table">
          <thead>
            <tr>
              <th>
                Customer
              </th>

              <th>
                Feedback
              </th>

              <th>
                Sentiment
              </th>

              <th>
                Topic
              </th>

              <th>
                Issue
              </th>

              <th>
                Priority
              </th>

              <th>
                Source
              </th>

              <th>
                Rating
              </th>

              {canManageData && (
                <th>
                  Action
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {feedback.map(
              (item) => (
                <tr
                  key={
                    item.id
                  }
                >
                  <td>
                    <div className="customer-cell">
                      <div className="table-avatar">
                        {(
                          item.customer_name ||
                          "C"
                        )
                          .charAt(
                            0
                          )
                          .toUpperCase()}
                      </div>

                      <div>
                        <strong>
                          {item.customer_name ||
                            "Unknown"}
                        </strong>

                        <span>
                          #{item.id}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className="feedback-preview">
                      {
                        item.feedback_text
                      }
                    </div>
                  </td>

                  <td>
                    <span
                      className={`sentiment-badge ${String(
                        item.sentiment ||
                          "unknown"
                      ).toLowerCase()}`}
                    >
                      {item.sentiment ||
                        "Unknown"}
                    </span>
                  </td>

                  <td>
                    {item.topic ||
                      "—"}
                  </td>

                  <td>
                    <strong>
                      {item.issue ||
                        "—"}
                    </strong>
                  </td>

                  <td>
                    <span
                      className={`priority-badge ${String(
                        item.priority ||
                          "unknown"
                      ).toLowerCase()}`}
                    >
                      {item.priority ||
                        "Unknown"}
                    </span>
                  </td>

                  <td>
                    <span className="source-badge">
                      {item.source ||
                        "Unknown"}
                    </span>
                  </td>

                  <td>
                    <strong>
                      {item.rating ??
                        "—"}
                      /5
                    </strong>
                  </td>

                  {canManageData && (
                    <td>
                      <button
                        type="button"
                        className="delete-feedback-button"
                        onClick={() =>
                          onDeleteFeedback(item.id)
                        }
                        title="Delete feedback"
                        aria-label={`Delete feedback ${item.id}`}
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              )
            )}
          </tbody>
        </table>

        {feedback.length ===
          0 && (
          <EmptyState
            icon={
              <MessageSquare
                size={30}
              />
            }
            text="No feedback matches your filters"
          />
        )}
      </div>
    </div>
  );
}

/* =========================================================
   ANALYTICS
========================================================= */

function AnalyticsPage({
  analytics,
  sentimentData,
  topicData,
  issueData,
  sourceData,
  priorityData,
}) {
  const total =
    sentimentData.reduce(
      (sum, item) =>
        sum + item.value,
      0
    );

  return (
    <div className="page-container">
      <PageHeading
        eyebrow="DATA INTELLIGENCE"
        title="Analytics"
        description="Understand customer sentiment, topics, issues and channels."
      />

      <div className="analytics-summary-grid">
        <AnalyticsMiniCard
          icon={
            <Activity size={19} />
          }
          title="Analyzed"
          value={
            analytics?.total_analyzed ||
            0
          }
          description="Feedback analyzed"
        />

        <AnalyticsMiniCard
          icon={
            <TrendingDown
              size={19}
            />
          }
          title="Negative"
          value={
            analytics?.sentiment
              ?.Negative || 0
          }
          description="Negative responses"
        />

        <AnalyticsMiniCard
          icon={
            <AlertTriangle
              size={19}
            />
          }
          title="Critical"
          value={
            analytics?.priority
              ?.Critical || 0
          }
          description="Critical issues"
        />

        <AnalyticsMiniCard
          icon={
            <BarChart3
              size={19}
            />
          }
          title="Top Topic"
          value={
            analytics?.topics?.[0]
              ?.topic || "—"
          }
          description="Most discussed topic"
        />
      </div>

      <div className="analytics-grid">
        <section className="analytics-large-card">
          <CardHeader
            icon={
              <Activity size={17} />
            }
            title="Sentiment Distribution"
            subtitle="How customers feel"
          />

          <div className="large-chart sentiment-large-chart">
            {sentimentData.length >
            0 ? (
              <ResponsiveContainer
                width="100%"
                height={330}
              >
                <PieChart>
                  <Pie
                    data={
                      sentimentData
                    }
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={85}
                    outerRadius={125}
                    paddingAngle={4}
                  >
                    {sentimentData.map(
                      (
                        entry,
                        index
                      ) => (
                        <Cell
                          key={
                            entry.name
                          }
                          fill={
                            [
                              "var(--chart-positive)",
                              "var(--chart-negative)",
                              "var(--chart-neutral)",
                            ][
                              index
                            ]
                          }
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip />

                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={
                  <Activity
                    size={30}
                  />
                }
                text="No sentiment data"
              />
            )}

            <div className="large-chart-center">
              <strong>
                {total}
              </strong>

              <span>
                Analyzed
              </span>
            </div>
          </div>
        </section>

        <section className="analytics-large-card">
          <CardHeader
            icon={
              <BarChart3
                size={17}
              />
            }
            title="Topics"
            subtitle="Customer conversation areas"
          />

          {topicData.length >
          0 ? (
            <ResponsiveContainer
              width="100%"
              height={330}
            >
              <BarChart
                data={
                  topicData
                }
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--chart-grid)"
                />

                <XAxis
                  dataKey="name"
                  stroke="var(--chart-axis)"
                />

                <YAxis
                  stroke="var(--chart-axis)"
                />

                <Tooltip />

                <Bar
                  dataKey="count"
                  fill="var(--chart-primary)"
                  radius={[
                    7,
                    7,
                    0,
                    0,
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={
                <BarChart3
                  size={30}
                />
              }
              text="No topic data"
            />
          )}
        </section>

        <section className="analytics-large-card">
          <CardHeader
            icon={
              <AlertTriangle
                size={17}
              />
            }
            title="Issue Frequency"
            subtitle="Recurring customer problems"
          />

          {issueData.length >
          0 ? (
            <ResponsiveContainer
              width="100%"
              height={330}
            >
              <BarChart
                data={
                  issueData
                }
                layout="vertical"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--chart-grid)"
                />

                <XAxis
                  type="number"
                  stroke="var(--chart-axis)"
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  stroke="var(--chart-axis)"
                />

                <Tooltip />

                <Bar
                  dataKey="count"
                  fill="var(--chart-negative)"
                  radius={[
                    0,
                    7,
                    7,
                    0,
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={
                <AlertTriangle
                  size={30}
                />
              }
              text="No issues detected"
            />
          )}
        </section>

        <section className="analytics-large-card">
          <CardHeader
            icon={
              <Database size={17} />
            }
            title="Feedback Sources"
            subtitle="Channel distribution"
          />

          {sourceData.length >
          0 ? (
            <ResponsiveContainer
              width="100%"
              height={330}
            >
              <AreaChart
                data={
                  sourceData
                }
              >
                <defs>
                  <linearGradient
                    id="sourceGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--chart-primary)"
                      stopOpacity={
                        0.35
                      }
                    />

                    <stop
                      offset="95%"
                      stopColor="var(--chart-primary)"
                      stopOpacity={
                        0
                      }
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--chart-grid)"
                />

                <XAxis
                  dataKey="name"
                  stroke="var(--chart-axis)"
                />

                <YAxis
                  stroke="var(--chart-axis)"
                />

                <Tooltip />

                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="var(--chart-primary)"
                  fill="url(#sourceGradient)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={
                <Database
                  size={30}
                />
              }
              text="No source data"
            />
          )}
        </section>
      </div>

      <section className="dashboard-card">
        <CardHeader
          icon={
            <ShieldAlert
              size={17}
            />
          }
          title="Priority Distribution"
          subtitle="Operational urgency across feedback"
        />

        {priorityData.length >
        0 ? (
          <ResponsiveContainer
            width="100%"
            height={260}
          >
            <BarChart
              data={
                priorityData
              }
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--chart-grid)"
              />

              <XAxis
                dataKey="name"
                stroke="var(--chart-axis)"
              />

              <YAxis
                stroke="var(--chart-axis)"
              />

              <Tooltip />

              <Bar
                dataKey="value"
                fill="var(--chart-warning)"
                radius={[
                  8,
                  8,
                  0,
                  0,
                ]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            icon={
              <ShieldAlert
                size={30}
              />
            }
            text="No priority data"
          />
        )}
      </section>
    </div>
  );
}

/* =========================================================
   ISSUES
========================================================= */

function IssuesPage({
  issues,
  criticalIssueList,
  openIssueDetails,
}) {
  return (
    <div className="page-container">
      <PageHeading
        eyebrow="OPERATIONAL INTELLIGENCE"
        title="Issue Command Center"
        description="Identify recurring customer problems and prioritize what needs attention."
      />

      <div className="issue-overview-grid">
        <div className="issue-overview-card critical">
          <ShieldAlert
            size={22}
          />

          <span>
            Critical
          </span>

          <strong>
            {
              criticalIssueList.length
            }
          </strong>
        </div>

        <div className="issue-overview-card">
          <AlertTriangle
            size={22}
          />

          <span>
            Total Issues
          </span>

          <strong>
            {issues.length}
          </strong>
        </div>

        <div className="issue-overview-card">
          <Activity size={22} />

          <span>
            Recurring Signals
          </span>

          <strong>
            {
              issues.filter(
                (item) =>
                  Number(
                    item.count ||
                      0
                  ) > 1
              ).length
            }
          </strong>
        </div>
      </div>

      {issues.length >
      0 ? (
        <div className="issue-grid">
          {issues.map(
            (
              issue,
              index
            ) => (
              <div
                className="issue-card"
                key={
                  issue.issue ||
                  issue.name ||
                  index
                }
              >
                <div className="issue-card-top">
                  <div className="issue-icon">
                    <AlertTriangle
                      size={21}
                    />
                  </div>

                  <span
                    className={`priority-badge ${String(
                      issue.priority ||
                        "critical"
                    ).toLowerCase()}`}
                  >
                    {issue.priority ||
                      "Critical"}
                  </span>
                </div>

                <div className="issue-card-content">
                  <span className="issue-topic">
                    {issue.topic ||
                      "Customer Experience"}
                  </span>

                  <h3>
                    {issue.issue ||
                      issue.name ||
                      "Detected Issue"}
                  </h3>

                  <div className="issue-count">
                    <strong>
                      {issue.count ||
                        0}
                    </strong>

                    <span>
                      occurrence
                      {Number(
                        issue.count ||
                          0
                      ) !== 1
                        ? "s"
                        : ""}
                    </span>
                  </div>
                </div>

                <div className="issue-card-footer">
                  <span>
                    LOOP AI detected
                    this recurring
                    signal.
                  </span>

                  <button
                    onClick={() =>
                      openIssueDetails(
                        issue
                      )
                    }
                  >
                    View details

                    <ArrowUpRight
                      size={15}
                    />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      ) : (
        <div className="empty-large">
          <CheckCircle2
            size={42}
          />

          <h3>
            No issues detected
          </h3>

          <p>
            LOOP AI has not
            identified any
            recurring customer
            issues yet.
          </p>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   COPILOT
========================================================= */

function CopilotPage({
  question,
  setQuestion,
  answer,
  loading,
  history,
  askCopilot,
}) {
  const quickQuestions = [
    "How many customers complained?",
    "What are customers unhappy about?",
    "Which issue needs attention first?",
    "Which channel has the most complaints?",
    "What should the product team fix?",
    "What issues are trending?",
    "Give me an executive summary",
  ];

  const metrics =
    answer?.metrics || {};

  const evidence =
    Array.isArray(
      answer?.evidence
    )
      ? answer.evidence
      : [];

  const recommendations =
    Array.isArray(
      answer?.recommendations
    )
      ? answer.recommendations
      : [];

  const metricEntries =
    Object.entries(
      metrics
    ).filter(
      ([, value]) =>
        value !== null &&
        value !== undefined &&
        value !== ""
    );

  const formatMetricLabel = (
    key
  ) => {
    return key
      .replace(
        /_/g,
        " "
      )
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );
  };

  const getEvidenceText = (
    item
  ) => {
    if (
      typeof item ===
      "string"
    ) {
      return item;
    }

    return (
      item?.feedback ||
      item?.feedback_text ||
      item?.text ||
      "Customer feedback record"
    );
  };

  return (
    <div className="copilot-page">
      <section className="copilot-hero">
        <div className="copilot-hero-background">
          <div className="copilot-grid-pattern" />

          <div className="copilot-glow" />
        </div>

        <div className="copilot-hero-content">
          <span className="copilot-badge">
            <Bot size={15} />
            LOOP INTELLIGENCE
          </span>

          <h1>
            Ask your customer
            data
            <br />
            <span>
              anything.
            </span>
          </h1>

          <p>
            LOOP AI turns your
            feedback database into
            an interactive
            intelligence assistant.
          </p>

          <div className="copilot-input-wrapper">
            <Bot
              size={20}
              className="copilot-input-icon"
            />

            <input
              value={question}
              onChange={(
                event
              ) =>
                setQuestion(
                  event.target
                    .value
                )
              }
              onKeyDown={(
                event
              ) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  askCopilot();
                }
              }}
              placeholder="Ask about customers, complaints, issues or trends..."
            />

            <button
              onClick={() =>
                askCopilot()
              }
              disabled={loading}
            >
              <Send size={17} />

              {loading
                ? "Thinking..."
                : "Ask"}
            </button>
          </div>
        </div>
      </section>

      <div className="quick-question-section">
        <span>
          QUICK INTELLIGENCE
        </span>

        <div className="quick-question-grid">
          {quickQuestions.map(
            (item) => (
              <button
                key={item}
                onClick={() =>
                  askCopilot(
                    item
                  )
                }
              >
                <Zap size={15} />

                {item}
              </button>
            )
          )}
        </div>
      </div>

      {answer && (
        <section className="copilot-answer-card">
          <div className="copilot-answer-header">
            <div className="copilot-answer-title">
              <div className="copilot-answer-icon">
                <BrainCircuit
                  size={20}
                />
              </div>

              <div>
                <span>
                  LOOP ANALYSIS
                </span>

                <h3>
                  AI Customer
                  Intelligence
                </h3>
              </div>
            </div>

            <span className="live-ai-badge">
              LIVE AI
            </span>
          </div>

          <div className="copilot-answer-body">
            <div className="copilot-answer-text">
              {answer.answer ||
                answer.response ||
                answer.message ||
                "No answer returned."}
            </div>

            {(answer.intent ||
              answer.source) && (
              <div
                style={{
                  display:
                    "flex",
                  gap: "10px",
                  flexWrap:
                    "wrap",
                  marginTop:
                    "16px",
                  marginBottom:
                    "20px",
                }}
              >
                {answer.intent && (
                  <span className="source-badge">
                    Intent:{" "}
                    {formatMetricLabel(
                      answer.intent
                    )}
                  </span>
                )}

                {answer.source && (
                  <span className="source-badge">
                    Source:{" "}
                    {
                      answer.source
                    }
                  </span>
                )}
              </div>
            )}

            {metricEntries.length >
              0 && (
              <div className="copilot-section">
                <h4>
                  <Activity
                    size={16}
                  />
                  Key Metrics
                </h4>

                <div className="analytics-summary-grid">
                  {metricEntries.map(
                    ([
                      key,
                      value,
                    ]) => (
                      <div
                        className="analytics-mini-card"
                        key={
                          key
                        }
                      >
                        <div className="analytics-mini-icon">
                          <CircleDot
                            size={18}
                          />
                        </div>

                        <div>
                          <span>
                            {formatMetricLabel(
                              key
                            )}
                          </span>

                          <strong>
                            {String(
                              value
                            )}
                          </strong>

                          <small>
                            LOOP AI metric
                          </small>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {evidence.length >
              0 && (
              <div className="copilot-section">
                <h4>
                  <Database
                    size={16}
                  />
                  Evidence from
                  Customer Feedback
                </h4>

                <div className="evidence-list">
                  {evidence.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        className="evidence-item"
                        key={
                          item?.id ||
                          `${index}-${getEvidenceText(
                            item
                          )}`
                        }
                        style={{
                          alignItems:
                            "flex-start",
                        }}
                      >
                        <span className="evidence-marker">
                          {index +
                            1}
                        </span>

                        <div
                          style={{
                            display:
                              "flex",
                            flexDirection:
                              "column",
                            gap: "7px",
                            width:
                              "100%",
                          }}
                        >
                          <strong>
                            {item?.customer_name ||
                              "Customer"}
                          </strong>

                          <span>
                            {getEvidenceText(
                              item
                            )}
                          </span>

                          {typeof item ===
                            "object" && (
                            <div
                              style={{
                                display:
                                  "flex",
                                flexWrap:
                                  "wrap",
                                gap: "7px",
                              }}
                            >
                              {item.topic && (
                                <span className="source-badge">
                                  Topic:{" "}
                                  {
                                    item.topic
                                  }
                                </span>
                              )}

                              {item.issue && (
                                <span className="source-badge">
                                  Issue:{" "}
                                  {
                                    item.issue
                                  }
                                </span>
                              )}

                              {item.sentiment && (
                                <span
                                  className={`sentiment-badge ${String(
                                    item.sentiment
                                  ).toLowerCase()}`}
                                >
                                  {
                                    item.sentiment
                                  }
                                </span>
                              )}

                              {item.priority && (
                                <span
                                  className={`priority-badge ${String(
                                    item.priority
                                  ).toLowerCase()}`}
                                >
                                  {
                                    item.priority
                                  }
                                </span>
                              )}

                              {item.rating !==
                                undefined &&
                                item.rating !==
                                  null && (
                                  <span className="source-badge">
                                    Rating:{" "}
                                    {
                                      item.rating
                                    }
                                    /5
                                  </span>
                                )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {recommendations.length >
              0 && (
              <div className="copilot-section">
                <h4>
                  <Lightbulb
                    size={16}
                  />
                  Recommended
                  Actions
                </h4>

                <div className="recommendation-list">
                  {recommendations.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        className="recommendation-item"
                        key={
                          index
                        }
                      >
                        <CheckCircle2
                          size={
                            17
                          }
                        />

                        <span>
                          {typeof item ===
                          "string"
                            ? item
                            : item.action ||
                              item.text ||
                              JSON.stringify(
                                item
                              )}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="copilot-capabilities">
        <h2>
          What LOOP AI can help you
          understand
        </h2>

        <div className="capability-grid">
          <CapabilityCard
            icon={
              <TrendingDown
                size={21}
              />
            }
            title="Sentiment"
            text="Understand positive, negative and neutral customer reactions."
          />

          <CapabilityCard
            icon={
              <AlertTriangle
                size={21}
              />
            }
            title="Issues"
            text="Find recurring problems and identify operational priorities."
          />

          <CapabilityCard
            icon={
              <BarChart3
                size={21}
              />
            }
            title="Analytics"
            text="Explore patterns across topics, sources and priorities."
          />

          <CapabilityCard
            icon={
              <Lightbulb
                size={21}
              />
            }
            title="Actions"
            text="Turn customer signals into practical next steps."
          />
        </div>
      </div>

      {history.length >
        0 && (
        <div className="copilot-history">
          <h3>
            Recent Questions
          </h3>

          {history.map(
            (
              item,
              index
            ) => (
              <button
                key={
                  index
                }
                onClick={() =>
                  askCopilot(
                    item.question
                  )
                }
              >
                <MessageSquare
                  size={16}
                />

                {
                  item.question
                }

                <ChevronRight
                  size={15}
                />
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   REPORTS
========================================================= */

function ReportsPage({
  stats,
  analytics,
  trends,
  reportMode,
  setReportMode,
  selectedReportMonth,
  setSelectedReportMonth,
  availableReportMonths,
  reportStartDate,
  setReportStartDate,
  reportEndDate,
  setReportEndDate,
  reportPeriod,
  downloadReport,
}) {
  const emergingIssue = trends?.emerging_issue;

  return (
    <div className="page-container">
      <PageHeading
        eyebrow="EXECUTIVE INTELLIGENCE"
        title="Voice of Customer Report"
        description="Generate a focused customer intelligence report for a month or any custom date range."
        action={
          <button
            className="primary-button"
            onClick={downloadReport}
            disabled={!reportPeriod.total}
          >
            <Download size={17} />
            Download Report
          </button>
        }
      />

      <section className="report-period-card">
        <div className="report-period-heading">
          <div>
            <span className="report-section-label">REPORT PERIOD</span>
            <h3>Choose exactly what you want to download</h3>
            <p>Select a month for a monthly report or choose your own start and end dates.</p>
          </div>
          <div className="report-period-count">
            <strong>{reportPeriod.total}</strong>
            <span>matching feedback</span>
          </div>
        </div>

        <div className="report-period-tabs">
          <button type="button" className={reportMode === "month" ? "report-period-tab active" : "report-period-tab"} onClick={() => setReportMode("month")}>Monthly Report</button>
          <button type="button" className={reportMode === "custom" ? "report-period-tab active" : "report-period-tab"} onClick={() => setReportMode("custom")}>Custom Date Range</button>
        </div>

        {reportMode === "month" ? (
          <div className="report-period-controls">
            <label className="report-field">
              <span>Select Month</span>
              <select value={selectedReportMonth} onChange={(event) => setSelectedReportMonth(event.target.value)}>
                {availableReportMonths.length ? availableReportMonths.map((month) => (
                  <option key={month} value={month}>
                    {new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                  </option>
                )) : <option value="">No months available</option>}
              </select>
            </label>
            <div className="report-period-summary">
              <span>Report period</span>
              <strong>{reportPeriod.label}</strong>
            </div>
          </div>
        ) : (
          <div className="report-period-controls custom">
            <label className="report-field">
              <span>From Date</span>
              <input type="date" value={reportStartDate} onChange={(event) => setReportStartDate(event.target.value)} />
            </label>
            <label className="report-field">
              <span>To Date</span>
              <input type="date" min={reportStartDate || undefined} value={reportEndDate} onChange={(event) => setReportEndDate(event.target.value)} />
            </label>
            <div className="report-period-summary">
              <span>Report period</span>
              <strong>{reportPeriod.label}</strong>
            </div>
          </div>
        )}

        {!reportPeriod.total && (
          <div className="report-empty-state">
            <FileText size={18} />
            <span>No feedback records were found for this period. Choose another month or date range.</span>
          </div>
        )}
      </section>

      <section className="report-preview">
        <div className="report-header">
          <div className="report-brand">
            <div className="brand-mark small">L</div>
            <div><strong>LOOP AI</strong><span>Customer Intelligence Platform</span></div>
          </div>
          <div className="report-date">
            <span>REPORT PERIOD</span>
            <strong>{reportPeriod.label}</strong>
          </div>
        </div>

        <div className="report-title">
          <span>VOICE OF CUSTOMER</span>
          <h2>Customer Intelligence Report</h2>
          <p>AI-powered analysis of customer feedback and operational signals for the selected period.</p>
        </div>

        <div className="report-kpi-grid">
          <div><span>Total Feedback</span><strong>{reportPeriod.total}</strong></div>
          <div><span>Positive</span><strong>{reportPeriod.positivePercentage}%</strong></div>
          <div><span>Negative</span><strong>{reportPeriod.negativePercentage}%</strong></div>
          <div><span>Critical Issues</span><strong>{reportPeriod.critical}</strong></div>
        </div>

        <div className="report-columns">
          <div className="report-section">
            <span className="report-section-label">PERIOD SUMMARY</span>
            <p>{reportPeriod.total ? `${reportPeriod.total} feedback record(s) were received during ${reportPeriod.label}. ${reportPeriod.negative} were negative, ${reportPeriod.positive} were positive, and ${reportPeriod.neutral} were neutral.` : "No feedback is available for the selected period."}</p>
          </div>
          <div className="report-section">
            <span className="report-section-label">TOP ISSUE</span>
            <div className="report-highlight">
              <AlertTriangle size={21} />
              <div><strong>{reportPeriod.topIssue}</strong><span>{reportPeriod.topIssueCount} occurrence{reportPeriod.topIssueCount !== 1 ? "s" : ""}</span></div>
            </div>
          </div>
        </div>

        <div className="report-columns">
          <div className="report-section">
            <span className="report-section-label">PERIOD COMPARISON</span>
            <div className="report-highlight">
              <Activity size={21} />
              <div>
                <strong>{reportPeriod.changePercentage >= 0 ? `+${reportPeriod.changePercentage}%` : `${reportPeriod.changePercentage}%`}</strong>
                <span>feedback compared with the previous period</span>
              </div>
            </div>
          </div>
          <div className="report-section">
            <span className="report-section-label">TREND INTELLIGENCE</span>
            <div className="report-highlight">
              <TrendingUp size={21} />
              <div>
                <strong>{emergingIssue?.name || "No emerging issue"}</strong>
                <span>{emergingIssue ? `${emergingIssue.recent_count || 0} recent occurrence(s) detected` : "LOOP AI is monitoring current feedback signals."}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="report-section">
          <span className="report-section-label">RECOMMENDED FOCUS</span>
          <div className="report-list-row"><CheckCircle2 size={17} /><span>Prioritize recurring critical customer issues from the selected period.</span></div>
          <div className="report-list-row"><CheckCircle2 size={17} /><span>Investigate the evidence behind the highest-frequency complaints.</span></div>
          <div className="report-list-row"><CheckCircle2 size={17} /><span>Compare future reporting periods to measure improvement.</span></div>
        </div>

        <div className="report-footer">LOOP AI • Customer Feedback Intelligence Platform</div>
      </section>
    </div>
  );
}

/* =========================================================
   SETTINGS
========================================================= */

function WorkspacePage({ stats, analytics, trends, totalFeedback, setActivePage }) {
  const recent = Number(trends?.analysis_period?.recent_feedback_count || 0);
  const previous = Number(trends?.analysis_period?.previous_feedback_count || 0);
  const change = previous ? Math.round(((recent - previous) / previous) * 100) : (recent ? 100 : 0);
  const negative = Number(stats?.negative || analytics?.sentiment?.Negative || 0);
  const critical = Number(stats?.critical || 0);

  return (
    <div className="page-container">
      <PageHeading eyebrow="WORKSPACE" title="Intelligence Workspace" description="A live operating view of customer feedback, risks and emerging signals." />
      <div className="stats-grid">
        <MetricCard icon={<Database size={20} />} label="Total Feedback" value={totalFeedback} />
        <MetricCard icon={<Activity size={20} />} label="Recent Feedback" value={recent} />
        <MetricCard icon={<TrendingDown size={20} />} label="Negative Signals" value={negative} />
        <MetricCard icon={<ShieldAlert size={20} />} label="Critical Issues" value={critical} />
      </div>
      <div className="settings-grid" style={{ marginTop: "20px" }}>
        <section className="settings-card">
          <div className="settings-card-header"><div className="settings-card-icon"><Activity size={20} /></div><div><h3>Workspace Health</h3><span>Current intelligence activity</span></div></div>
          <div className="setting-row"><div><strong>Feedback activity</strong><span>Recent vs previous period</span></div><strong>{change >= 0 ? `+${change}%` : `${change}%`}</strong></div>
          <div className="setting-row"><div><strong>Emerging issue</strong><span>Detected from recent feedback</span></div><strong>{trends?.emerging_issue?.name || "None detected"}</strong></div>
          <div className="setting-row"><div><strong>Top concern</strong><span>Most frequent issue</span></div><strong>{analytics?.top_issue?.name || analytics?.top_issue || "No issue"}</strong></div>
        </section>
        <section className="settings-card">
          <div className="settings-card-header"><div className="settings-card-icon"><Zap size={20} /></div><div><h3>Quick Actions</h3><span>Move directly to operational views</span></div></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "10px" }}>
            <button className="primary-button" onClick={() => setActivePage("feedback")}>Review Feedback</button>
            <button className="secondary-button" onClick={() => setActivePage("issues")}>Review Issues</button>
            <button className="secondary-button" onClick={() => setActivePage("analytics")}>Open Analytics</button>
            <button className="secondary-button" onClick={() => setActivePage("copilot")}>Ask AI Copilot</button>
          </div>
        </section>
      </div>
    </div>
  );
}

function ActionCenterPage({ issues, criticalIssueList, trends, setActivePage, openIssueDetails }) {
  const critical = criticalIssueList?.length ? criticalIssueList : (issues || []).filter((item) => String(item.priority || "").toLowerCase() === "critical");
  const emerging = trends?.emerging_issue;
  return (
    <div className="page-container">
      <PageHeading eyebrow="ACTION CENTER" title="Recommended Actions" description="Turn customer intelligence into focused operational follow-up." />
      <section className="settings-card" style={{ marginBottom: "18px" }}>
        <div className="settings-card-header"><div className="settings-card-icon"><Lightbulb size={20} /></div><div><h3>LOOP Recommendation</h3><span>Prioritize recurring critical issues and monitor feedback after fixes.</span></div></div>
        <div className="setting-row"><div><strong>{emerging?.name || "No emerging issue detected"}</strong><span>{emerging ? `${emerging.recent_count || 0} recent occurrence(s)` : "Current intelligence does not show a new emerging issue."}</span></div><span className="system-positive">Monitor</span></div>
      </section>
      <section className="settings-card">
        <div className="settings-card-header"><div className="settings-card-icon"><ShieldAlert size={20} /></div><div><h3>Critical Issues</h3><span>Issues requiring investigation</span></div></div>
        {critical.length ? critical.slice(0, 8).map((item, index) => (
          <button key={item.id || item.issue || index} onClick={() => openIssueDetails(item)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", border: 0, borderBottom: "1px solid var(--border-color, #e2e8f0)", background: "transparent", color: "inherit", cursor: "pointer", textAlign: "left" }}>
            <span><strong style={{ display: "block" }}>{item.issue || item.name || "Critical issue"}</strong><span style={{ color: "var(--muted-text, #64748b)", fontSize: "12px" }}>{item.count || item.occurrences || 1} occurrence(s)</span></span><ChevronRight size={17} />
          </button>
        )) : <div style={{ padding: "28px 0", textAlign: "center" }}><CheckCircle2 size={24} /><strong style={{ display: "block", marginTop: "8px" }}>No critical issues detected</strong></div>}
      </section>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "18px" }}>
        <button className="secondary-button" onClick={() => setActivePage("issues")}>Open Issue Command Center</button>
        <button className="secondary-button" onClick={() => setActivePage("copilot")}>Get AI Recommendations</button>
      </div>
    </div>
  );
}

function SettingsPage({
  totalFeedback,
  users,
  setUsers,
  authUser,
  loadData,
}) {
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [userMessage, setUserMessage] = useState("");

  const updateUserRole = async (userId, role) => {
    try {
      setUpdatingUserId(userId);
      setUserMessage("");

      await axios.patch(`${API_URL}/auth/users/${userId}/role`, { role });

      setUsers((previous) =>
        previous.map((user) =>
          user.id === userId ? { ...user, role } : user
        )
      );

      setUserMessage("User role updated successfully.");
      await loadData();
    } catch (err) {
      console.error(err);
      setUserMessage(
        err.response?.data?.detail || "Unable to update the user role."
      );
    } finally {
      setUpdatingUserId(null);
    }
  };
  return (
    <div className="page-container">
      <PageHeading
        eyebrow="PLATFORM"
        title="Team & Access"
        description="Manage workspace access and understand the LOOP AI operating model."
      />

      <div className="settings-grid">
        <section className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <Server size={20} />
            </div>

            <div>
              <h3>
                System Status
              </h3>

              <span>
                Current LOOP AI
                environment
              </span>
            </div>
          </div>

          <div className="setting-row">
            <div>
              <strong>
                Frontend
              </strong>

              <span>
                React + Vite
              </span>
            </div>

            <span className="system-positive">
              Online
            </span>
          </div>

          <div className="setting-row">
            <div>
              <strong>
                Backend
              </strong>

              <span>
                FastAPI
              </span>
            </div>

            <span className="system-positive">
              Online
            </span>
          </div>

          <div className="setting-row">
            <div>
              <strong>
                Database
              </strong>

              <span>
                MySQL
              </span>
            </div>

            <span className="system-positive">
              Connected
            </span>
          </div>

          <div className="setting-row">
            <div>
              <strong>
                Feedback Records
              </strong>

              <span>
                Current database
                records
              </span>
            </div>

            <strong>
              {totalFeedback}
            </strong>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <BrainCircuit
                size={20}
              />
            </div>

            <div>
              <h3>
                AI Pipeline
              </h3>

              <span>
                How LOOP turns
                feedback into insight
              </span>
            </div>
          </div>

          <div className="architecture-stack">
            <ArchitectureItem
              number="01"
              title="Collect"
              text="Customer feedback enters the platform."
            />

            <ArchitectureItem
              number="02"
              title="Analyze"
              text="Sentiment, topics, issues and priority are detected."
            />

            <ArchitectureItem
              number="03"
              title="Understand"
              text="Analytics reveal recurring customer signals."
            />

            <ArchitectureItem
              number="04"
              title="Act"
              text="Teams receive intelligence and recommended actions."
            />
          </div>
        </section>
      </div>

      {authUser?.role === "Admin" ? (
      <section className="settings-card" style={{ marginBottom: "22px" }}>
        <div className="settings-card-header">
          <div className="settings-card-icon">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3>User Access Management</h3>
            <span>Admin-only role and account visibility</span>
          </div>
        </div>

        {userMessage && (
          <div className="analysis-result" style={{ marginBottom: "14px" }}>
            <CheckCircle2 size={17} />
            <span>{userMessage}</span>
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table className="feedback-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.full_name}</strong></td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      value={user.role}
                      disabled={updatingUserId === user.id || user.id === authUser?.id}
                      onChange={(event) => updateUserRole(user.id, event.target.value)}
                      style={{ padding: "7px 9px", borderRadius: "8px" }}
                    >
                      <option>Admin</option>
                      <option>Manager</option>
                      <option>Analyst</option>
                      <option>Product Manager</option>
                      <option>Support Agent</option>
                      <option>Viewer</option>
                    </select>
                  </td>
                  <td>
                    <span className="system-positive">
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      ) : (
        <section className="settings-card" style={{ marginBottom: "22px" }}>
          <div className="settings-card-header"><div className="settings-card-icon"><ShieldAlert size={20} /></div><div><h3>Access Overview</h3><span>Role management is restricted to Admin users.</span></div></div>
          <div className="setting-row"><div><strong>Current role</strong><span>Your active LOOP AI workspace role</span></div><span className="system-positive">{authUser?.role || "User"}</span></div>
          <div className="setting-row"><div><strong>Permissions</strong><span>Workspace intelligence and analysis</span></div><strong>Active</strong></div>
          <p style={{ margin: "14px 0 0", color: "var(--muted-text, #64748b)", fontSize: "13px" }}>Only an Admin can change team roles or account access.</p>
        </section>
      )}

      <section className="settings-card methodology-card">
        <div className="settings-card-header">
          <div className="settings-card-icon">
            <Zap size={20} />
          </div>

          <div>
            <h3>
              The LOOP Methodology
            </h3>

            <span>
              From customer voice to
              business action
            </span>
          </div>
        </div>

        <div className="methodology-grid">
          <MethodologyStep
            letter="L"
            title="Listen"
            text="Collect customer voice from multiple channels."
          />

          <MethodologyStep
            letter="O"
            title="Organize"
            text="Structure feedback into topics and issues."
          />

          <MethodologyStep
            letter="O"
            title="Understand"
            text="Use AI analysis to identify sentiment and patterns."
          />

          <MethodologyStep
            letter="P"
            title="Prioritize"
            text="Identify the issues that need attention."
          />

          <MethodologyStep
            letter="→"
            title="Act"
            text="Turn intelligence into measurable action."
          />
        </div>
      </section>
    </div>
  );
}

/* =========================================================
   REUSABLE COMPONENTS
========================================================= */

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}) {
  return (
    <div className="page-heading">
      <div>
        <span>
          {eyebrow}
        </span>

        <h1>
          {title}
        </h1>

        <p>
          {description}
        </p>
      </div>

      {action && (
        <div className="page-heading-action">
          {action}
        </div>
      )}
    </div>
  );
}

function CardHeader({
  icon,
  title,
  subtitle,
  action,
  onAction,
}) {
  return (
    <div className="card-header">
      <div className="card-header-left">
        <div className="card-icon">
          {icon}
        </div>

        <div>
          <h3>
            {title}
          </h3>

          <span>
            {subtitle}
          </span>
        </div>
      </div>

      {action && (
        <button
          className="card-link"
          onClick={onAction}
        >
          {action}

          <ArrowUpRight
            size={14}
          />
        </button>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  description,
  type,
}) {
  return (
    <div
      className={`metric-card ${type}`}
    >
      <div className="metric-icon">
        {icon}
      </div>

      <div className="metric-content">
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {description}
        </small>
      </div>
    </div>
  );
}

function AnalyticsMiniCard({
  icon,
  title,
  value,
  description,
}) {
  return (
    <div className="analytics-mini-card">
      <div className="analytics-mini-icon">
        {icon}
      </div>

      <div>
        <span>
          {title}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {description}
        </small>
      </div>
    </div>
  );
}

function LegendItem({
  label,
  value,
  type,
}) {
  return (
    <div className="legend-item">
      <div className="legend-left">
        <span
          className={`legend-dot ${type}`}
        />

        <span>
          {label}
        </span>
      </div>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function EmptyState({
  icon,
  text,
}) {
  return (
    <div className="empty-state">
      {icon}

      <span>
        {text}
      </span>
    </div>
  );
}

function CapabilityCard({
  icon,
  title,
  text,
}) {
  return (
    <div className="capability-card">
      <div className="capability-icon">
        {icon}
      </div>

      <div>
        <h3>
          {title}
        </h3>

        <p>
          {text}
        </p>
      </div>
    </div>
  );
}

function ArchitectureItem({
  number,
  title,
  text,
}) {
  return (
    <div className="architecture-item">
      <div className="architecture-number">
        {number}
      </div>

      <div>
        <strong>
          {title}
        </strong>

        <span>
          {text}
        </span>
      </div>
    </div>
  );
}

function MethodologyStep({
  letter,
  title,
  text,
}) {
  return (
    <div className="methodology-step">
      <div className="methodology-letter">
        {letter}
      </div>

      <div>
        <strong>
          {title}
        </strong>

        <span>
          {text}
        </span>
      </div>
    </div>
  );
}

export default App;