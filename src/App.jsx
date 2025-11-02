import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Database,
  LogOut,
  Plus,
  Trash2,
  BarChart3,
  MessageSquare,
  CheckCircle,
  XCircle,
  Loader,
  Copy,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
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
  ResponsiveContainer,
} from "recharts";

const API_BASE_URL = "http://localhost:8000"; // Update if needed

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

function SQLTerminal({ text, isError, onCopy }) {
  const preRef = useRef(null);

  return (
    <div className="max-w-4xl w-full mx-auto">
      <div className="rounded-xl overflow-hidden shadow-lg">
        {/* Title bar with mac dots */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900">
          <div className="flex items-center gap-2">
            {/* macOS dots */}
            <div className="flex items-center gap-2 mr-3">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <span className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="text-sm text-gray-300 font-medium">SQL Query</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onCopy) onCopy(text || "");
              }}
              title="Copy SQL"
              className="flex items-center gap-2 px-3 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
          </div>
        </div>

        {/* Terminal body */}
        <div className={`px-4 py-4 bg-[#0b0f12]`}>
          <pre
            ref={preRef}
            className={`whitespace-pre-wrap break-words text-sm font-mono rounded-md p-3 min-h-[80px] ${
              isError ? "text-red-400" : "text-green-400"
            } bg-transparent`}
          >
            {text || "-- No SQL to display --"}
          </pre>
        </div>
      </div>
    </div>
  );
}

function App() {
  // Authentication and UI state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [showDbConfig, setShowDbConfig] = useState(false);

  // Connections
  const [dbConnections, setDbConnections] = useState([]);
  const [activeConnection, setActiveConnection] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null); // 'testing', 'success', 'error'
  const [connectionError, setConnectionError] = useState("");

  // Chat
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Loading/Saving flags
  const [isSavingConnection, setIsSavingConnection] = useState(false);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);

  // Forms
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    username: "",
    password: "",
    email: "",
  });

  const [dbForm, setDbForm] = useState({
    name: "",
    type: "mysql",
    host: "",
    port: "",
    username: "",
    password: "",
    database: "",
  });

  // Which SQL blocks are expanded (simple toggle, keyed by message index)
  const [expandedSQL, setExpandedSQL] = useState({});

  const messagesEndRef = useRef(null);

  // Auto-login for dev (remove or adapt for production)
  useEffect(() => {
    setToken("dev-token-12345");
    setIsAuthenticated(true);
  }, []);

  // Fetch connections on auth
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchConnections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch saved connections
  const fetchConnections = async () => {
    setIsLoadingConnections(true);
    try {
      const response = await fetch(`${API_BASE_URL}/connections`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDbConnections(data || []);
      } else {
        console.error("Failed to fetch connections");
      }
    } catch (error) {
      console.error("Error fetching connections:", error);
    } finally {
      setIsLoadingConnections(false);
    }
  };

  // Authentication handler
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authForm),
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        setIsAuthenticated(true);
        localStorage.setItem("token", data.token);
      } else {
        const error = await response.json();
        alert(
          error.detail ||
            "Authentication failed. Please check your credentials."
        );
      }
    } catch (error) {
      console.error("Auth error:", error);
      alert("Authentication error. Please try again.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setToken(null);
    setDbConnections([]);
    setActiveConnection(null);
    setMessages([]);
    setConnectionStatus(null);
    localStorage.removeItem("token");
    setShowDbConfig(false);
  };

  // Add new connection
  const handleAddConnection = async () => {
    if (!dbForm.name || !dbForm.database) {
      alert("Please fill in all required fields (Name, Database)");
      return;
    }

    setIsSavingConnection(true);
    try {
      const response = await fetch(`${API_BASE_URL}/connections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dbForm),
      });

      if (response.ok) {
        const data = await response.json();
        alert("Connection saved successfully!");

        // Refresh connections list
        await fetchConnections();

        // Reset form and close modal
        setDbForm({
          name: "",
          type: "mysql",
          host: "",
          port: "",
          username: "",
          password: "",
          database: "",
        });
        setShowDbConfig(false);
      } else {
        const error = await response.json();
        alert(error.detail || "Failed to save connection");
      }
    } catch (error) {
      console.error("Error saving connection:", error);
      alert("Error saving connection. Please try again.");
    } finally {
      setIsSavingConnection(false);
    }
  };

  // Test connection API
  const testConnection = async (connection) => {
    setConnectionStatus("testing");
    setConnectionError("");

    try {
      const response = await fetch(`${API_BASE_URL}/connections/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          connection_id: connection.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConnectionStatus("success");
          // Load chat history for this connection if available
          const storedMessages = localStorage.getItem(
            `chatMessages_${connection.id}`
          );
          if (storedMessages) {
            setMessages(JSON.parse(storedMessages));
          } else {
            setMessages([]);
          }
        } else {
          setConnectionStatus("error");
          setConnectionError(data.message || "Connection failed");
        }
      } else {
        const error = await response.json();
        setConnectionStatus("error");
        setConnectionError(error.detail || "Failed to test connection");
      }
    } catch (error) {
      console.error("Connection test error:", error);
      setConnectionStatus("error");
      setConnectionError("Network error. Please check your backend server.");
    }
  };

  // Select a connection (and test)
  const handleSelectConnection = async (conn) => {
    setActiveConnection(conn);
    setMessages([]);
    setConnectionStatus(null);
    setConnectionError("");

    // Test the connection
    await testConnection(conn);
  };

  // Delete connection
  const handleDeleteConnection = async (id, event) => {
    event.stopPropagation();

    if (!confirm("Are you sure you want to delete this connection?")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/connections/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Refresh connections list
        await fetchConnections();

        // Clear active connection if it was deleted
        if (activeConnection?.id === id) {
          setActiveConnection(null);
          setMessages([]);
          setConnectionStatus(null);
          localStorage.removeItem(`chatMessages_${id}`);
        }
      } else {
        alert("Failed to delete connection");
      }
    } catch (error) {
      console.error("Error deleting connection:", error);
      alert("Error deleting connection");
    }
  };

  // Heuristics to choose chart type
  const detectChartType = (data) => {
    if (!data || data.length === 0) return null;

    const keys = Object.keys(data[0]);
    const numericKeys = keys.filter(
      (key) =>
        typeof data[0][key] === "number" || !isNaN(parseFloat(data[0][key]))
    );

    if (numericKeys.length >= 1 && keys.length >= 2) {
      if (data.length <= 10) return "pie";
      return data.length > 20 ? "line" : "bar";
    }
    return null;
  };

  // Render a chart when results are appropriate
  const renderChart = (data, type) => {
    if (!data || data.length === 0) return null;

    const keys = Object.keys(data[0]);
    const labelKey = keys[0];
    const valueKeys = keys
      .slice(1)
      .filter(
        (key) =>
          typeof data[0][key] === "number" || !isNaN(parseFloat(data[0][key]))
      );

    if (type === "pie") {
      const pieData = data.slice(0, 8).map((item) => ({
        name: item[labelKey],
        value: parseFloat(item[valueKeys[0]]) || 0,
      }));

      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (type === "line") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={labelKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {valueKeys.map((key, idx) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[idx % COLORS.length]}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={labelKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          {valueKeys.map((key, idx) => (
            <Bar key={key} dataKey={key} fill={COLORS[idx % COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // Send user question to backend chat API
  const handleSendMessage = async () => {
    if (
      !inputMessage.trim() ||
      !activeConnection ||
      connectionStatus !== "success"
    )
      return;

    const userMessage = { role: "user", content: inputMessage };
    const prevMessages = [...messages, userMessage];
    setMessages(prevMessages);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: inputMessage,
          connection_id: activeConnection.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const chartType = detectChartType(data.results);

        const assistantMessage = {
          role: "assistant",
          content: data.query || "Query executed successfully",
          results: data.results,
          chartType: chartType,
        };

        const updatedMessages = [...prevMessages, assistantMessage];
        setMessages(updatedMessages);
        localStorage.setItem(
          `chatMessages_${activeConnection.id}`,
          JSON.stringify(updatedMessages)
        );
      } else {
        const error = await response.json();
        const errorMessage = {
          role: "assistant",
          content: `Error: ${error.detail || "Failed to execute query"}`,
          error: true,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Query error:", error);
      const errorMessage = {
        role: "assistant",
        content: "Network error. Please check your connection.",
        error: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy helper with small toast
  const handleCopyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text || "");
      const el = document.createElement("div");
      el.textContent = "Copied to clipboard";
      el.style.position = "fixed";
      el.style.bottom = "24px";
      el.style.right = "24px";
      el.style.padding = "8px 12px";
      el.style.background = "#10b981";
      el.style.color = "white";
      el.style.borderRadius = "8px";
      el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
      document.body.appendChild(el);
      setTimeout(() => document.body.removeChild(el), 1400);
    } catch (e) {
      console.error("Copy failed", e);
      alert("Failed to copy to clipboard");
    }
  };

  const toggleSQL = (idx) => {
    setExpandedSQL((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Render UI
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <Database className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
            Database Chat
          </h1>
          <p className="text-center text-gray-600 mb-6">
            Talk to your database in natural language
          </p>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setAuthMode("login")}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                authMode === "login"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode("register")}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                authMode === "register"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Register
            </button>
          </div>

          <div className="space-y-4">
            {authMode === "register" && (
              <input
                type="email"
                placeholder="Email"
                value={authForm.email}
                onChange={(e) =>
                  setAuthForm({ ...authForm, email: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            )}
            <input
              type="text"
              placeholder="Username"
              value={authForm.username}
              onChange={(e) =>
                setAuthForm({ ...authForm, username: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={(e) =>
                setAuthForm({ ...authForm, password: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
            <button
              onClick={handleAuth}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              {authMode === "login" ? "Login" : "Register"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-6 h-6 text-blue-600" />
              <h2 className="font-bold text-lg text-gray-800">Connections</h2>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
          <button
            onClick={() => setShowDbConfig(!showDbConfig)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Connection
          </button>
        </div>

        {showDbConfig && (
          <div className="p-4 border-b border-gray-200 bg-blue-50">
            <h3 className="font-semibold mb-3 text-gray-800">New Connection</h3>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Connection Name *"
                value={dbForm.name}
                onChange={(e) => setDbForm({ ...dbForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <select
                value={dbForm.type}
                onChange={(e) => setDbForm({ ...dbForm, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="mysql">MySQL</option>
                <option value="postgresql">PostgreSQL</option>
                <option value="sqlite">SQLite</option>
                <option value="mssql">MS SQL Server</option>
              </select>
              <input
                type="text"
                placeholder="Host *"
                value={dbForm.host}
                onChange={(e) => setDbForm({ ...dbForm, host: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="text"
                placeholder="Port (optional)"
                value={dbForm.port}
                onChange={(e) => setDbForm({ ...dbForm, port: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="text"
                placeholder="Username"
                value={dbForm.username}
                onChange={(e) =>
                  setDbForm({ ...dbForm, username: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="password"
                placeholder="Password"
                value={dbForm.password}
                onChange={(e) =>
                  setDbForm({ ...dbForm, password: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="text"
                placeholder="Database Name *"
                value={dbForm.database}
                onChange={(e) =>
                  setDbForm({ ...dbForm, database: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={handleAddConnection}
                disabled={isSavingConnection}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSavingConnection ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Connection"
                )}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {isLoadingConnections ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : dbConnections.length === 0 ? (
            <p className="text-gray-500 text-sm text-center mt-8">
              No connections yet. Add your first connection above!
            </p>
          ) : (
            <div className="space-y-3">
              {dbConnections.map((conn) => (
                <div
                  key={conn.id}
                  onClick={() => handleSelectConnection(conn)}
                  className={`group p-4 rounded-xl border cursor-pointer transition-all ${
                    activeConnection?.id === conn.id
                      ? "bg-blue-50 border-blue-400 shadow-sm"
                      : "bg-gray-50 hover:bg-gray-100 border-gray-200"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        {conn.db_connection_name}
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {conn.db_type}
                        </span>
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        📁 {conn.db_name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {conn.created_at &&
                          new Date(conn.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          testConnection(conn);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        title="Test Connection"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteConnection(conn.id, e)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                        title="Delete Connection"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConnection ? (
          <>
            <div className="bg-white shadow-sm border-b p-5 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Database className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {activeConnection.db_connection_name}
                  </h3>
                  <p className="text-sm text-gray-600 flex gap-3">
                    <span>📁 {activeConnection.db_name}</span>
                    <span>🗄️ {activeConnection.db_type}</span>
                  </p>
                </div>
              </div>

              {connectionStatus && (
                <div className="flex items-center gap-2">
                  {connectionStatus === "testing" && (
                    <>
                      <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                      <span className="text-sm text-blue-600">Testing...</span>
                    </>
                  )}
                  {connectionStatus === "success" && (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-green-600">Connected</span>
                    </>
                  )}
                  {connectionStatus === "error" && (
                    <>
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="text-sm text-red-600">Failed</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {connectionStatus === "success" ? (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">
                        Start a conversation
                      </h3>
                      <p className="text-gray-500">
                        Ask questions about your database in natural language
                      </p>
                      <div className="mt-6 space-y-2 text-sm text-gray-600">
                        <p>Try asking:</p>
                        <p className="text-blue-600">"Show me all users"</p>
                        <p className="text-blue-600">
                          "What's the total revenue this month?"
                        </p>
                        <p className="text-blue-600">
                          "List the top 10 products by sales"
                        </p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {/* User message bubble */}
                        {msg.role === "user" && (
                          <div className="max-w-3xl bg-blue-600 text-white rounded-2xl p-4 shadow-sm">
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        )}

                        {/* Assistant / system / error message rendering */}
                        {msg.role !== "user" && (
                          <div className="max-w-3xl w-full">
                            {/* If this message is an error show a red terminal */}
                            {msg.error ? (
                              <div className="mb-3">
                                <SQLTerminal
                                  text={msg.content}
                                  isError
                                  onCopy={() =>
                                    handleCopyToClipboard(msg.content)
                                  }
                                />
                              </div>
                            ) : msg.results && msg.results.length > 0 ? (
                              <>
                                {/* Toggle button for SQL (hidden by default) */}
                                <div className="mb-2">
                                  <button
                                    onClick={() => toggleSQL(idx)}
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                                  >
                                    {expandedSQL[idx] ? (
                                      <>
                                        <ChevronUp className="w-4 h-4" />
                                        <span>Hide SQL Query</span>
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="w-4 h-4" />
                                        <span>Show SQL Query</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                {/* Simple toggle — show SQL if expanded */}
                                {expandedSQL[idx] && (
                                  <SQLTerminal
                                    text={msg.content}
                                    onCopy={() =>
                                      handleCopyToClipboard(msg.content)
                                    }
                                  />
                                )}

                                {/* Results table below the terminal */}
                                <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm border-collapse">
                                      <thead>
                                        <tr className="border-b border-gray-200">
                                          {Object.keys(msg.results[0]).map(
                                            (key) => (
                                              <th
                                                key={key}
                                                className="text-left p-2 font-semibold text-gray-700"
                                              >
                                                {key}
                                              </th>
                                            )
                                          )}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {msg.results
                                          .slice(0, 10)
                                          .map((row, i) => (
                                            <tr
                                              key={i}
                                              className="border-b border-gray-100"
                                            >
                                              {Object.values(row).map(
                                                (val, j) => (
                                                  <td
                                                    key={j}
                                                    className="p-2 text-gray-700"
                                                  >
                                                    {val !== null &&
                                                    val !== undefined
                                                      ? String(val)
                                                      : "NULL"}
                                                  </td>
                                                )
                                              )}
                                            </tr>
                                          ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  {msg.results.length > 10 && (
                                    <p className="text-xs text-gray-500 mt-2">
                                      Showing 10 of {msg.results.length} results
                                    </p>
                                  )}

                                  {/* Visualization block (commented out by default) */}
                                  {/* {msg.chartType && (
                                    <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                                      <div className="flex items-center gap-2 mb-3">
                                        <BarChart3 className="w-5 h-5 text-blue-600" />
                                        <h4 className="font-semibold text-gray-800">
                                          Visualization
                                        </h4>
                                      </div>
                                      {renderChart(msg.results, msg.chartType)}
                                    </div>
                                  )} */}
                                </div>
                              </>
                            ) : (
                              // Assistant text-only response
                              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                                <p className="text-gray-800 whitespace-pre-wrap">
                                  {msg.content}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                        <div className="flex gap-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                          <div
                            className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          />
                          <div
                            className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                            style={{ animationDelay: "0.4s" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="bg-white border-t border-gray-200 p-4">
                  <div className="max-w-4xl mx-auto flex gap-3">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && !e.shiftKey && handleSendMessage()
                      }
                      placeholder="Ask a question about your database..."
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      disabled={isLoading}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isLoading || !inputMessage.trim()}
                      className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : connectionStatus === "testing" ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Loader className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Testing Connection
                  </h3>
                  <p className="text-gray-500">
                    Please wait while we verify your database connection...
                  </p>
                </div>
              </div>
            ) : connectionStatus === "error" ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-md">
                  <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Connection Failed
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Unable to connect to the database. Please check your
                    connection settings and try again.
                  </p>
                  {connectionError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">
                      {connectionError}
                    </div>
                  )}
                  <button
                    onClick={() => testConnection(activeConnection)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Database className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-gray-700 mb-2">
                No Database Selected
              </h3>
              <p className="text-gray-500">
                Select or add a database connection to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
