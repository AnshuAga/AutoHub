import { useMemo, useState } from "react";
import { FaStar } from "react-icons/fa";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";

const FEEDBACK_STORAGE_KEY = "autohub-feedback-history";
const ratingLabels = {
  1: "Very Poor",
  2: "Poor",
  3: "Average",
  4: "Good",
  5: "Excellent",
};

const categoryOptions = [
  { value: "overall-experience", label: "Overall Experience" },
  { value: "vehicle-search", label: "Vehicle Search" },
  { value: "bookings", label: "Bookings & Payments" },
  { value: "delivery-tracking", label: "Delivery Tracking" },
  { value: "ui-design", label: "UI & Design" },
];

const quickHighlightSuggestions = [
  "Fast booking flow",
  "Smooth payment experience",
  "Helpful support",
  "Clear dashboard",
  "Quick delivery updates",
];

const getStoredFeedback = () => {
  try {
    const saved = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

function Feedback() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [feedbackHistory, setFeedbackHistory] = useState(getStoredFeedback);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    category: categoryOptions[0].value,
    rating: 4,
    recommend: "yes",
    message: "",
    highlights: "",
  });

  const feedbackStats = useMemo(() => {
    const total = feedbackHistory.length;
    if (!total) {
      return {
        total,
        avgRating: "0.0",
        recommendRate: 0,
      };
    }

    const avgRating = (
      feedbackHistory.reduce((sum, entry) => sum + Number(entry.rating || 0), 0) / total
    ).toFixed(1);

    const recommendYesCount = feedbackHistory.filter((entry) => entry.recommend === "yes").length;
    const recommendRate = Math.round((recommendYesCount / total) * 100);

    return {
      total,
      avgRating,
      recommendRate,
    };
  }, [feedbackHistory]);

  const historyCategories = useMemo(
    () => [...new Set(feedbackHistory.map((entry) => entry.category))],
    [feedbackHistory]
  );

  const visibleFeedback = useMemo(() => {
    if (historyFilter === "all") {
      return feedbackHistory;
    }
    return feedbackHistory.filter((entry) => entry.category === historyFilter);
  }, [feedbackHistory, historyFilter]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setStatus({
        type: "error",
        message: "Please fill name, email, and feedback message before submitting.",
      });
      return;
    }

    const newEntry = {
      id: Date.now(),
      name: formData.name.trim(),
      email: formData.email.trim(),
      category: formData.category,
      rating: Number(formData.rating),
      recommend: formData.recommend,
      message: formData.message.trim(),
      highlights: formData.highlights.trim(),
      submittedAt: new Date().toISOString(),
    };

    const updatedHistory = [newEntry, ...feedbackHistory].slice(0, 6);
    setFeedbackHistory(updatedHistory);
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(updatedHistory));

    setStatus({ type: "success", message: "Thank you. Your feedback was submitted successfully." });

    setFormData((current) => ({
      ...current,
      category: categoryOptions[0].value,
      rating: 4,
      recommend: "yes",
      message: "",
      highlights: "",
    }));
  };

  const handleAddHighlight = (text) => {
    setFormData((current) => {
      const existing = current.highlights.trim();
      if (existing.toLowerCase().includes(text.toLowerCase())) {
        return current;
      }

      return {
        ...current,
        highlights: existing ? `${existing}, ${text}` : text,
      };
    });
  };

  const handleResetFeedbackFields = () => {
    setFormData((current) => ({
      ...current,
      category: categoryOptions[0].value,
      rating: 4,
      recommend: "yes",
      message: "",
      highlights: "",
    }));
    setStatus({ type: "", message: "" });
  };

  return (
    <div>
      <Navbar />

      <div className="page-container">
        <Sidebar />

        <div className="content-container feedback-page-bg">
          <div className="feedback-hero card">
            <div>
              <span className="eyebrow">We Value Your Input</span>
              <h1 style={{ marginTop: "12px" }}>Feedback Center</h1>
              <p>
                Share your experience with AutoHub so we can improve workflows, usability, and support.
              </p>
            </div>

            <div className="feedback-kpi-row">
              <div className="feedback-kpi-pill">
                <strong>{feedbackStats.avgRating}</strong>
                <span>Average Rating</span>
              </div>
              <div className="feedback-kpi-pill">
                <strong>{feedbackStats.recommendRate}%</strong>
                <span>Would Recommend</span>
              </div>
              <div className="feedback-kpi-pill">
                <strong>{feedbackStats.total}</strong>
                <span>Submissions</span>
              </div>
            </div>
          </div>

          {status.message ? <div className={`auth-status auth-status-${status.type}`}>{status.message}</div> : null}

          <div className="feedback-grid">
            <section className="card feedback-form-card">
              <form onSubmit={handleSubmit} className="feedback-form-grid">
                <div>
                  <label>Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} />
                </div>

                <div>
                  <label>Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} />
                </div>

                <div>
                  <label>Category</label>
                  <select name="category" value={formData.category} onChange={handleChange}>
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Would you recommend AutoHub?</label>
                  <select name="recommend" value={formData.recommend} onChange={handleChange}>
                    <option value="yes">Yes</option>
                    <option value="maybe">Maybe</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div className="feedback-form-full">
                  <label>Rating</label>
                  <div className="feedback-star-wrap">
                    <div className="feedback-star-row" role="radiogroup" aria-label="Feedback rating">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`feedback-star-btn ${Number(formData.rating) >= value ? "active" : ""}`}
                          onClick={() =>
                            setFormData((current) => ({
                              ...current,
                              rating: value,
                            }))
                          }
                          aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
                        >
                          <FaStar />
                        </button>
                      ))}
                    </div>
                    <p className="feedback-rating-caption">
                      {formData.rating}/5 - {ratingLabels[formData.rating]}
                    </p>
                  </div>
                </div>

                <div className="feedback-form-full">
                  <label>What went well?</label>
                  <input
                    type="text"
                    name="highlights"
                    value={formData.highlights}
                    onChange={handleChange}
                    placeholder="Example: quick booking flow, clean dashboard"
                  />
                  <div className="feedback-chip-row">
                    {quickHighlightSuggestions.map((text) => (
                      <button
                        key={text}
                        type="button"
                        className="feedback-chip"
                        onClick={() => handleAddHighlight(text)}
                      >
                        + {text}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="feedback-form-full">
                  <label>Detailed Feedback</label>
                  <textarea
                    rows="6"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us what we should keep improving..."
                    maxLength={700}
                  />
                  <p className="feedback-character-count">{formData.message.length}/700</p>
                  <div className="feedback-meter" aria-hidden="true">
                    <span
                      className="feedback-meter-fill"
                      style={{ width: `${Math.min((formData.message.length / 700) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="feedback-form-full feedback-live-preview">
                  <strong>Live Preview</strong>
                  <span>
                    {ratingLabels[formData.rating]} | Recommend: {formData.recommend}
                  </span>
                </div>

                <div className="feedback-form-full" style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button type="button" className="ghost-btn" onClick={handleResetFeedbackFields}>
                    Reset
                  </button>
                  <button type="submit" className="primary-btn">
                    Submit Feedback
                  </button>
                </div>
              </form>
            </section>

            <aside className="card feedback-history-card">
              <h3 style={{ marginTop: 0 }}>Recent Feedback</h3>

              {feedbackHistory.length === 0 ? (
                <p>No feedback submissions yet. Your next feedback will appear here.</p>
              ) : (
                <div className="feedback-history-list">
                  <div className="feedback-history-filters">
                    <button
                      type="button"
                      className={`feedback-filter-btn ${historyFilter === "all" ? "active" : ""}`}
                      onClick={() => setHistoryFilter("all")}
                    >
                      All
                    </button>
                    {historyCategories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        className={`feedback-filter-btn ${historyFilter === category ? "active" : ""}`}
                        onClick={() => setHistoryFilter(category)}
                      >
                        {category}
                      </button>
                    ))}
                  </div>

                  {visibleFeedback.map((entry) => (
                    <article key={entry.id} className="feedback-history-item">
                      <div className="feedback-history-head">
                        <strong>{entry.name}</strong>
                        <span>{new Date(entry.submittedAt).toLocaleDateString()}</span>
                      </div>
                      <p style={{ margin: "6px 0" }}>{entry.message}</p>
                      <div className="feedback-history-meta">
                        <span>{entry.category}</span>
                        <span>Rating: {entry.rating}/5</span>
                        <span>Recommend: {entry.recommend}</span>
                      </div>
                    </article>
                  ))}

                  {visibleFeedback.length === 0 ? (
                    <p className="feedback-no-filter-result">No feedback found for this category.</p>
                  ) : null}
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Feedback;