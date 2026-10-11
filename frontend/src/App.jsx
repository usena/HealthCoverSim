
import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:3000";

const initialForm = {
  customer_name: "",
  cover_type: "single",
  applicant1_age: "30",
  applicant1_cover_history: "yes",
  applicant2_age: "30",
  applicant2_cover_history: "yes",
  hospital_cover: "silver",
  extras_cover: "standard",
  payment_frequency: "monthly",
  annual_discount: "0",
  notes: "",
};

const money = (value) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(Number(value) || 0);

function App() {
  const [quotes, setQuotes] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [coverFilter, setCoverFilter] = useState("all");
  const [activeView, setActiveView] = useState("quotes");
  const [editingId, setEditingId] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadQuotes() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/quotes`);
      if (!response.ok) throw new Error("Could not load quotes.");
      const data = await response.json();
      setQuotes(Array.isArray(data) ? data : data.quotes || []);
    } catch (err) {
      setError(
        "Couldn't connect to the backend. Check that your Express server is running and confirm its API routes."
      );
    } finally {
      setLoading(false);
    }
  }

  async function viewQuote(id) {
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/api/quotes/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load quote details.");
      }

      setSelectedQuote(data);
      setActiveView("quotes");
    } catch (err) {
      setError(err.message || "Could not load quote details.");
    }
  }

  useEffect(() => {
    loadQuotes();
  }, []);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((quote) => {
      const term = search.trim().toLowerCase();
      const matchesSearch =
        !term ||
        String(quote.id).includes(term) ||
        (quote.customer_name || "").toLowerCase().includes(term);

      const matchesCover =
        coverFilter === "all" || quote.cover_type === coverFilter;

      return matchesSearch && matchesCover;
    });
  }, [quotes, search, coverFilter]);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "cover_type" && value === "single"
        ? {
            applicant2_age: "",
            applicant2_cover_history: "yes",
          }
        : {}),
      ...(name === "payment_frequency" && value === "monthly"
        ? { annual_discount: "0" }
        : {}),
    }));
  }

  function startNewQuote() {
    setForm(initialForm);
    setEditingId(null);
    setSelectedQuote(null);
    setError("");
    setNotice("");
    setActiveView("form");
  }

  function startEdit(quote) {
    setForm({
      customer_name: quote.customer_name ?? "",
      cover_type: quote.cover_type ?? "single",
      applicant1_age: String(quote.applicant1_age ?? 30),
      applicant1_cover_history:
        quote.applicant1_cover_history ?? "yes",
      applicant2_age:
        quote.applicant2_age == null
          ? ""
          : String(quote.applicant2_age),
      applicant2_cover_history:
        quote.applicant2_cover_history ?? "yes",
      hospital_cover: quote.hospital_cover ?? "none",
      extras_cover: quote.extras_cover ?? "none",
      payment_frequency: quote.payment_frequency ?? "monthly",
      annual_discount: String(quote.annual_discount ?? 0),
      notes: quote.notes ?? "",
    });

    setEditingId(quote.id);
    setSelectedQuote(null);
    setError("");
    setNotice("");
    setActiveView("form");
  }

  async function submitQuote(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    const payload = {
      ...form,
      applicant1_age: Number(form.applicant1_age),
      applicant2_age:
        form.cover_type === "single"
          ? null
          : Number(form.applicant2_age),
      applicant2_cover_history:
        form.cover_type === "single"
          ? null
          : form.applicant2_cover_history,
      annual_discount:
        form.payment_frequency === "yearly"
          ? Number(form.annual_discount)
          : 0,
    };

    // Basic frontend validation before sending the request.
    if (
      !Number.isInteger(payload.applicant1_age) ||
      payload.applicant1_age < 18 ||
      payload.applicant1_age > 100
    ) {
      setError("Applicant 1 age must be a whole number between 18 and 100.");
      return;
    }

    if (
      payload.cover_type !== "single" &&
      (
        !Number.isInteger(payload.applicant2_age) ||
        payload.applicant2_age < 18 ||
        payload.applicant2_age > 100
      )
    ) {
      setError("Applicant 2 age must be a whole number between 18 and 100.");
      return;
    }

    if (
      !Number.isFinite(payload.annual_discount) ||
      payload.annual_discount < 0 ||
      payload.annual_discount > 10
    ) {
      setError("Annual discount must be between 0% and 10%.");
      return;
    }

    const url = editingId
      ? `${API_URL}/api/quotes/${editingId}`
      : `${API_URL}/api/quotes`;

    try {
      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = Array.isArray(body.errors)
          ? body.errors.join(" ")
          : body.error || body.message || "Unable to save quote.";

        throw new Error(message);
      }

      await loadQuotes();

      setNotice(
        editingId
          ? "Quote updated successfully."
          : "Quote created successfully."
      );

      setActiveView("quotes");
      setSelectedQuote(null);
      setEditingId(null);
      setForm(initialForm);
    } catch (err) {
      setError(err.message || "Unable to save quote.");
    }
    }

  async function deleteQuote(quote) {
    if (!window.confirm(`Delete the quote for ${quote.customer_name}?`)) return;

    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/api/quotes/${quote.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Unable to delete quote.");

      setSelectedQuote(null);
      await loadQuotes();
      setNotice("Quote deleted successfully.");
    } catch (err) {
      setError(err.message);
    }
  }

  const single = form.cover_type === "single";
  const yearly = form.payment_frequency === "yearly";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">H</div>
          <div>
            <strong>HealthCover</strong>
            <span>SIMULATOR</span>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <button
          className={`nav-item ${activeView !== "form" ? "active" : ""}`}
          onClick={() => {
            setActiveView("quotes");
            setSelectedQuote(null);
            setError("");
          }}
        >
          <span>▦</span> Quotes
        </button>
        <button className="nav-item" onClick={startNewQuote}>
          <span>＋</span> New quote
        </button>

        <div className="sidebar-bottom">
          <div className="help-icon">i</div>
          <div>
            <strong>Quote simulator</strong>
            <p>Manage and calculate cover estimates.</p>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> {activeView === "form" ? "New quote" : "Quotes"}</div>
          <div className="topbar-right">
            <span className="status-dot" />
            <span>Insurance quote workspace</span>
            <div className="avatar">HC</div>
          </div>
        </header>

        <section className="page-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">HEALTH INSURANCE MANAGEMENT</p>
              <h1>
                {selectedQuote
                  ? `Quote #${selectedQuote.id}`
                  : activeView === "form"
                    ? editingId ? "Edit quote" : "Create a quote"
                    : "Quotes overview"}
              </h1>
              <p className="subtitle">
                {activeView === "form"
                  ? "Enter customer details and choose a cover option."
                  : "Create, search, and manage customer insurance quotes."}
              </p>
            </div>
            {activeView !== "form" && !selectedQuote && (
              <button className="primary-button" onClick={startNewQuote}>
                <span>＋</span> Create new quote
              </button>
            )}
          </div>

          {error && <div className="alert error-alert">{error}</div>}
          {notice && <div className="alert success-alert">{notice}</div>}

          {selectedQuote ? (
            <section className="panel detail-panel">
              <div className="panel-header">
                <div>
                  <h2>{selectedQuote.customer_name}</h2>
                  <p>Quote ID #{selectedQuote.id}</p>
                </div>
                <button className="secondary-button" onClick={() => setSelectedQuote(null)}>Back to quotes</button>
              </div>
              <div className="detail-grid">
                {[
                  ["Cover type", selectedQuote.cover_type],
                  ["Applicant 1 age", selectedQuote.applicant1_age],
                  ["Applicant 1 history", selectedQuote.applicant1_cover_history],
                  ["Applicant 2 age", selectedQuote.applicant2_age ?? "—"],
                  ["Applicant 2 history", selectedQuote.applicant2_cover_history ?? "—"],
                  ["Hospital cover", selectedQuote.hospital_cover],
                  ["Extras cover", selectedQuote.extras_cover],
                  ["Payment frequency", selectedQuote.payment_frequency],
                  ["Annual discount", `${selectedQuote.annual_discount ?? 0}%`],
                  ["Notes", selectedQuote.notes || "—"],
                  ["Created", selectedQuote.created_at ? new Date(selectedQuote.created_at).toLocaleString() : "—"],
                ].map(([label, value]) => (
                  <div className="detail-item" key={label}>
                    <span>{label}</span>
                    <strong>{String(value)}</strong>
                  </div>
                ))}
              </div>
              <p className="lhc-statement">Lifetime Health Cover loading applies only to hospital cover. It does not apply to extras cover.</p>
              {selectedQuote.calculation && (
                <section className="calculation-section">
                  <div className="panel-header">
                    <div>
                      <h2>Premium calculation</h2>
                      <p>Estimated insurance premium breakdown</p>
                    </div>
                  </div>

                  <div className="calculation-grid">
                    
                    <div className="calculation-item">
                      <span>Hospital cover</span>
                      <strong>
                        {money(selectedQuote.calculation.hospitalPremium)}
                      </strong>

                      <small className="calculation-formula">
                        {selectedQuote.calculation.applicants
                          ?.map((applicant) => {
                            const basePrice = Number(
                              selectedQuote.hospital_price_per_adult
                            );
                            const multiplier =
                              1 + applicant.lhcLoadingPercent / 100;

                            return `${money(basePrice)} × ${multiplier.toFixed(2)}`;
                          })
                          .join(" + ")}

                        {" = "}
                        {money(selectedQuote.calculation.hospitalPremium)}
                      </small>
                    </div>

                    <div className="calculation-item">
                      <span>Extras cover</span>
                      <strong>
                        {money(selectedQuote.calculation.extrasPremium)}
                      </strong>

                      <small className="calculation-formula">
                        {money(selectedQuote.extras_price_per_adult)}
                        {" × "}
                        {selectedQuote.cover_type === "single" ? 1 : 2}
                        {" adults = "}
                        {money(selectedQuote.calculation.extrasPremium)}
                      </small>
                    </div>


                    <div className="calculation-item">
                      <span>Family fee</span>
                      <strong>
                        {money(selectedQuote.calculation.familyFee)}
                      </strong>
                    </div>

                    <div className="calculation-item">
                      <span>Monthly premium</span>
                      <strong>
                        {money(selectedQuote.calculation.monthlyPremium)}
                      </strong>
                    </div>

                    <div className="calculation-item">
                      <span>Yearly premium before discount</span>
                      <strong>
                        {money(selectedQuote.calculation.yearlyBeforeDiscount)}
                      </strong>
                    </div>

                    <div className="calculation-item">
                      <span>Annual discount</span>
                      <strong>
                        {selectedQuote.calculation.annualDiscountPercent}%
                      </strong>
                    </div>

                    <div className="calculation-item total">
                      <span>
                        {selectedQuote.payment_frequency === "yearly"
                          ? "Final yearly premium"
                          : "Final monthly premium"}
                      </span>

                      <strong>
                        {money(
                          selectedQuote.payment_frequency === "yearly"
                            ? selectedQuote.calculation.finalTotal
                            : selectedQuote.calculation.monthlyPremium
                        )}
                      </strong>
                    </div>
                  </div>

                  {selectedQuote.calculation.applicants?.length > 0 && (
                    <div className="applicant-calculations">
                      <h3>Lifetime Health Cover breakdown</h3>

                      {selectedQuote.calculation.applicants.map((applicant) => (
                        <div
                          className="applicant-calculation"
                          key={applicant.applicant}
                        >
                          <span>
                            Applicant {applicant.applicant} (age {applicant.age})
                          </span>

                          <span>
                            Loading: {applicant.lhcLoadingPercent}%
                          </span>

                          <strong>
                            Hospital premium: {money(applicant.hospitalPremium)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedQuote.calculation.warnings?.map((warning, index) => (
                    <div className="alert warning-alert" key={index}>
                      {warning}
                    </div>
                  ))}
                </section>
                )}
              <div className="detail-actions">
                <button className="secondary-button" onClick={() => startEdit(selectedQuote)}>Edit quote</button>
                <button className="danger-button" onClick={() => deleteQuote(selectedQuote)}>Delete quote</button>
              </div>
            </section>
          ) : activeView === "form" ? (
            <form className="quote-form" onSubmit={submitQuote}>
              <section className="panel">
                <div className="panel-header">
                  <div className="section-title">
                    <span className="step-number">01</span>
                    <div><h2>Customer information</h2><p>Who is this quote for?</p></div>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="field full-width">
                    Customer name <span className="required">*</span>
                    <input name="customer_name" value={form.customer_name} onChange={updateField} placeholder="Enter full name" required maxLength={100} />
                  </label>
                  <label className="field">
                    Cover type
                    <select name="cover_type" value={form.cover_type} onChange={updateField}>
                      <option value="single">Single</option>
                      <option value="couple">Couple</option>
                      <option value="family">Family</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <div className="section-title">
                    <span className="step-number">02</span>
                    <div><h2>Applicant details</h2><p>Enter age and previous hospital cover history.</p></div>
                  </div>
                </div>
                <div className="applicant-grid">
                  <div className="applicant-card">
                    <h3>Applicant 1 <span className="mini-tag">Primary</span></h3>
                    <label className="field">Age (18–100)
                      <input type="number" name="applicant1_age" min="18" max="100" value={form.applicant1_age} onChange={updateField} required />
                    </label>
                    <label className="field">Previous hospital cover
                      <select name="applicant1_cover_history" value={form.applicant1_cover_history} onChange={updateField}>
                        <option value="yes">Yes</option><option value="no">No</option><option value="not sure">Not sure</option>
                      </select>
                    </label>
                  </div>
                  {!single && (
                    <div className="applicant-card">
                      <h3>Applicant 2 <span className="mini-tag">Partner / adult</span></h3>
                      <label className="field">Age (18–100)
                        <input type="number" name="applicant2_age" min="18" max="100" value={form.applicant2_age} onChange={updateField} required />
                      </label>
                      <label className="field">Previous hospital cover
                        <select name="applicant2_cover_history" value={form.applicant2_cover_history} onChange={updateField}>
                          <option value="yes">Yes</option><option value="no">No</option><option value="not sure">Not sure</option>
                        </select>
                      </label>
                    </div>
                  )}
                </div>
                <div className="info-note"><span>ⓘ</span> If an applicant's cover history is unknown, the quote will display a warning that the estimate may be inaccurate.</div>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <div className="section-title">
                    <span className="step-number">03</span>
                    <div><h2>Choose your cover</h2><p>Select hospital and extras cover levels.</p></div>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="field">
                    Hospital cover
                    <select name="hospital_cover" value={form.hospital_cover} onChange={updateField}>
                      <option value="none">None — $0/month</option>
                      <option value="basic">Basic — $90/month per adult</option>
                      <option value="bronze">Bronze — $120/month per adult</option>
                      <option value="silver">Silver — $160/month per adult</option>
                      <option value="gold">Gold — $220/month per adult</option>
                    </select>
                  </label>
                  <label className="field">
                    Extras cover
                    <select name="extras_cover" value={form.extras_cover} onChange={updateField}>
                      <option value="none">None — $0/month</option>
                      <option value="basic">Basic — $25/month per adult</option>
                      <option value="standard">Standard — $45/month per adult</option>
                      <option value="premium">Premium — $70/month per adult</option>
                    </select>
                  </label>
                </div>
                <p className="lhc-statement">Lifetime Health Cover loading applies only to hospital cover. It does not apply to extras cover.</p>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <div className="section-title">
                    <span className="step-number">04</span>
                    <div><h2>Payment options</h2><p>Choose how the quote will be paid.</p></div>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="field">
                    Payment frequency
                    <select name="payment_frequency" value={form.payment_frequency} onChange={updateField}>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </label>
                  {yearly && (
                    <label className="field">
                      Annual discount (0–10%)
                      <div className="input-suffix">
                        <input type="number" name="annual_discount" min="0" max="10" step="0.5" value={form.annual_discount} onChange={updateField} />
                        <span>%</span>
                      </div>
                      <small>Only available for yearly payment.</small>
                    </label>
                  )}
                  <label className="field full-width">
                    Notes <span className="optional">(optional)</span>
                    <textarea name="notes" rows="3" value={form.notes || ""} onChange={updateField} placeholder="Add any relevant notes..." maxLength={1000} />
                  </label>
                </div>
              </section>

              <div className="form-footer">
                <button type="button" className="secondary-button" onClick={() => { setActiveView("quotes"); setEditingId(null); setError(""); }}>Cancel</button>
                <button type="submit" className="primary-button">{editingId ? "Save changes" : "Create quote"} <span>→</span></button>
              </div>
            </form>
          ) : (
            <>
              <div className="stats-grid">
                <div className="stat-card"><div className="stat-top"><span>Total quotes</span><span className="stat-icon">▤</span></div><strong>{quotes.length}</strong><p>All saved customer quotes</p></div>
                <div className="stat-card"><div className="stat-top"><span>Single cover</span><span className="stat-icon">♙</span></div><strong>{quotes.filter((q) => q.cover_type === "single").length}</strong><p>Individual applicants</p></div>
                <div className="stat-card"><div className="stat-top"><span>Couple cover</span><span className="stat-icon">♧</span></div><strong>{quotes.filter((q) => q.cover_type === "couple").length}</strong><p>Two-adult applicants</p></div>
                <div className="stat-card"><div className="stat-top"><span>Family cover</span><span className="stat-icon">⌂</span></div><strong>{quotes.filter((q) => q.cover_type === "family").length}</strong><p>Family policy quotes</p></div>
              </div>

              <section className="panel table-panel">
                <div className="panel-header table-heading">
                  <div><h2>All quotes</h2><p>Browse and manage saved quotes.</p></div>
                  <button className="secondary-button refresh-button" onClick={loadQuotes}>↻ Refresh</button>
                </div>
                <div className="table-toolbar">
                  <div className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or quote ID..." aria-label="Search quotes" /></div>
                  <select value={coverFilter} onChange={(e) => setCoverFilter(e.target.value)} aria-label="Filter by cover type">
                    <option value="all">All cover types</option><option value="single">Single</option><option value="couple">Couple</option><option value="family">Family</option>
                  </select>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>QUOTE</th><th>CUSTOMER</th><th>COVER TYPE</th><th>HOSPITAL</th><th>EXTRAS</th><th>PAYMENT</th><th>CREATED</th><th></th></tr></thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan="8" className="empty-state">Loading quotes...</td></tr>
                      ) : filteredQuotes.length === 0 ? (
                        <tr><td colSpan="8" className="empty-state">{quotes.length === 0 ? "No quotes yet. Create your first quote to get started." : "No quotes match your search."}</td></tr>
                      ) : filteredQuotes.map((quote) => (
                        <tr key={quote.id}>
                          <td><button className="quote-id" onClick={() => viewQuote(quote.id)}>#{quote.id}</button></td>
                          <td><button className="customer-link" onClick={() => viewQuote(quote.id)}>{quote.customer_name}</button></td>
                          <td><span className={`cover-badge ${quote.cover_type}`}>{quote.cover_type}</span></td>
                          <td className="capitalize">{quote.hospital_cover}</td>
                          <td className="capitalize">{quote.extras_cover}</td>
                          <td className="capitalize">{quote.payment_frequency}</td>
                          <td>{quote.created_at ? new Date(quote.created_at).toLocaleDateString() : "—"}</td>
                          <td><button className="more-button" title="View quote" onClick={() => viewQuote(quote.id)}>•••</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="table-footer"><span>Showing {filteredQuotes.length} of {quotes.length} quotes</span><span>Oldest quotes first</span></div>
              </section>
            </>
          )}
          <footer className="page-footer">HealthCoverSim <span>•</span> Educational quote simulator <span>•</span> Premiums shown in AUD</footer>
        </section>
      </main>
    </div>
  );
}

export default App;
