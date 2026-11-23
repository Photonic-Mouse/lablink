"use client";

import React, { useState, useEffect } from "react";
import { equipment, initialBookings, calculateScore, defaultWeights, Equipment, BookingRequest, Weights } from "@/lib/seed";
import { db } from "@/lib/db";
import { hasRequiredTraining, getRequiredTrainingModule } from "@/lib/training";
import { notifyBookingSubmitted, notifyBookingApproved, notifyBookingRejected, notifyWaitlistPromoted } from "@/lib/notifications";
import { promoteNextInWaitlist } from "@/lib/waitlist";

export default function Home() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Equipment | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFacultyQueueOpen, setIsFacultyQueueOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [shownLimit, setShownLimit] = useState(8);

  // Faculty Queue state
  const [bookings, setBookings] = useState<BookingRequest[]>(initialBookings);
  const [weights, setWeights] = useState<Weights>(defaultWeights);
  const [selectedQueueReqId, setSelectedQueueReqId] = useState<string>(initialBookings[0]?.id || "");
  const [showWeightTuner, setShowWeightTuner] = useState(false);

  // Booking Form state in modal
  const [projectTitle, setProjectTitle] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredSlot, setPreferredSlot] = useState("09:00 – 11:00");
  const [projectReason, setProjectReason] = useState("");
  const [projectClassification, setProjectClassification] = useState<"thesis" | "research" | "course" | "club" | "hobby">("thesis");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("lablinkSaved");
      if (stored) setSavedIds(JSON.parse(stored));
    } catch {}
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const toggleSave = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let updated: string[];
    if (savedIds.includes(id)) {
      updated = savedIds.filter((x) => x !== id);
      showToast("REMOVED FROM YOUR KIT");
    } else {
      updated = [...savedIds, id];
      showToast("ADDED TO YOUR KIT");
    }
    setSavedIds(updated);
    try {
      localStorage.setItem("lablinkSaved", JSON.stringify(updated));
    } catch {}
  };

  // Filter & Sort equipment catalogue
  let filteredEquipment = equipment.filter((item) => {
    const matchDept =
      activeFilter === "All" ||
      item.dept.toLowerCase() === activeFilter.toLowerCase() ||
      item.category.toLowerCase().includes(activeFilter.toLowerCase());
    const matchSearch =
      searchQuery.trim() === "" ||
      (item.name + item.dept + item.category + item.description + Object.values(item.specs).join(" "))
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    return matchDept && matchSearch;
  });

  if (sortBy === "az") {
    filteredEquipment.sort((a, b) => a.name.localeCompare(b.name));
  }

  const displayedEquipment = filteredEquipment.slice(0, shownLimit);

  // Handle Booking Submission with automated multi-factor scoring
  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    // Check safety certification
    const student = db.students[0] || {
      id: "stu-001",
      name: "Student Researcher",
      dept: "Engineering",
      year: 4,
      certs: ["oscilloscope-basics", "3d-printer-safety"],
      usageHoursLast30d: 6,
      noShows: 0,
    };

    const hasCert = hasRequiredTraining(student, selectedProduct);
    if (!hasCert && selectedProduct.trainingRequired) {
      showToast(`TRAINING REQUIRED: ${selectedProduct.trainingRequired.toUpperCase()}`);
    }

    const factors = {
      deadline: projectClassification === "thesis" ? 95 : 80,
      relevance: projectTitle.length > 10 ? 92 : 82,
      fairness: 86,
      academic: projectClassification === "thesis" ? 96 : 84,
      waiting: 80,
    };

    const score = calculateScore(factors, weights);

    const newBooking: BookingRequest = {
      id: `req-${Date.now().toString().slice(-4)}`,
      studentId: student.id,
      studentName: student.name,
      studentDept: student.dept,
      studentYear: student.year,
      equipmentIds: [selectedProduct.id],
      equipmentNames: [selectedProduct.name],
      slotStart: `${preferredDate} ${preferredSlot.split(" – ")[0]}`,
      slotEnd: `${preferredDate} ${preferredSlot.split(" – ")[1] || "13:00"}`,
      projectTitle: projectTitle || "Engineering Capstone Prototyping",
      projectType: projectClassification,
      projectSummary: projectReason || "Academic research requiring precision lab equipment.",
      deadline: `${preferredDate} (Target Date)`,
      createdAt: new Date().toISOString().replace("T", " ").slice(0, 16),
      status: "pending",
      score,
      factors,
      explanation: `Automated assessment: ${projectClassification.toUpperCase()} project. Score: ${score}/100. Submitted for faculty queue review.`,
    };

    db.bookings.unshift(newBooking);
    setBookings([newBooking, ...bookings]);
    notifyBookingSubmitted(newBooking);

    setSelectedProduct(null);
    setProjectTitle("");
    setProjectReason("");
    showToast(`REQUEST SUBMITTED · PRIORITY SCORE: ${score}/100`);
  };

  // Faculty Queue Actions
  const handleApproveQueue = (id: string) => {
    const updated = bookings.map((b) => {
      if (b.id === id) {
        const app = { ...b, status: "approved" as const, decidedBy: "Dr. Sterling (Faculty Chair)" };
        notifyBookingApproved(app);
        return app;
      }
      return b;
    });
    setBookings(updated);
    db.bookings = updated;
    showToast("BOOKING APPROVED · NOTIFICATION SENT");
  };

  const handleRejectQueue = (id: string) => {
    const updated = bookings.map((b) => {
      if (b.id === id) {
        const rej = { ...b, status: "rejected" as const, decidedBy: "Dr. Sterling (Faculty Chair)" };
        notifyBookingRejected(rej);
        return rej;
      }
      return b;
    });
    setBookings(updated);
    db.bookings = updated;
    showToast("BOOKING REJECTED");
  };

  const handleWaitlistQueue = (id: string) => {
    const updated = bookings.map((b) => (b.id === id ? { ...b, status: "waitlisted" as const } : b));
    setBookings(updated);
    db.bookings = updated;
    showToast("CANDIDATE PLACED ON WAITLIST");
  };

  const activeQueueReq = bookings.find((b) => b.id === selectedQueueReqId) || bookings[0];
  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="announcement">
        CAMPUS RESOURCE NETWORK <span>—</span> ONE CAMPUS. MORE POSSIBILITIES.{" "}
        <a href="#catalog">EXPLORE EQUIPMENT ↗</a>
      </div>

      {/* Main Header */}
      <header className="header">
        <a className="logo" href="#top">
          LAB<span>LINK</span>
          <sup>®</sup>
        </a>

        <nav className={`nav ${isNavOpen ? "open" : ""}`}>
          <a href="#catalog" onClick={() => setIsNavOpen(false)}>
            EQUIPMENT <i>⌄</i>
          </a>
          <a href="#departments" onClick={() => setIsNavOpen(false)}>
            DEPARTMENTS
          </a>
          <a href="#how" onClick={() => setIsNavOpen(false)}>
            HOW IT WORKS
          </a>
          <a href="#about" onClick={() => setIsNavOpen(false)}>
            ABOUT
          </a>
        </nav>

        <div className="head-actions">
          {/* Faculty Queue Pill Button */}
          <button
            className="queue-pill-btn"
            onClick={() => setIsFacultyQueueOpen(true)}
            aria-label="Open Faculty Queue"
          >
            <span className="dot" />
            <span>QUEUE {pendingCount > 0 ? `(${pendingCount})` : ""}</span>
          </button>

          <button
            className="icon-btn"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search"
          >
            ⌕
          </button>

          <button
            className="garage-btn"
            onClick={() => setIsDrawerOpen(true)}
          >
            MY KIT <span>{savedIds.length}</span>
          </button>

          <button
            className="menu-btn"
            onClick={() => setIsNavOpen(!isNavOpen)}
            aria-label="Toggle Menu"
          >
            ☰
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main id="top">
        {/* HERO SECTION */}
        <section className="hero">
          <div className="hero-image" />
          <div className="hero-shade" />
          <div className="hero-content">
            <div className="eyebrow light">
              <b /> THE CAMPUS LAB MARKETPLACE
            </div>
            <h1>
              MAKE
              <br />
              IT <em>HAPPEN.</em>
            </h1>
            <p>
              Big ideas need the right tools. Find and book the equipment that takes your next project further.
            </p>
            <div className="hero-ctas">
              <a className="btn btn-lime" href="#catalog">
                EXPLORE EQUIPMENT <span>↗</span>
              </a>
              <a className="text-link" href="#departments">
                FIND YOUR FIELD <span>↓</span>
              </a>
            </div>
          </div>
          <div className="hero-meta">
            <span>01 / 04</span>
            <span>ENGINEERED FOR CURIOSITY</span>
            <span>SCROLL TO EXPLORE ↓</span>
          </div>
          <div className="hero-stamp">
            BMSCE
            <br />
            <small>RESOURCE NETWORK</small>
          </div>
        </section>

        {/* MARQUEE TICKER */}
        <section className="ticker">
          <div>
            DISCOVER <b>✳</b> REQUEST <b>✳</b> BUILD <b>✳</b> REPEAT <b>✳</b> DISCOVER <b>✳</b> REQUEST <b>✳</b> BUILD <b>✳</b> REPEAT <b>✳</b> DISCOVER <b>✳</b> REQUEST <b>✳</b> BUILD <b>✳</b> REPEAT <b>✳</b>
          </div>
        </section>

        {/* INTRO SECTION */}
        <section className="intro section-pad">
          <div className="eyebrow">
            <b /> 01 — FIND YOUR EDGE
          </div>
          <div className="intro-grid">
            <h2>
              THE RIGHT
              <br />
              TOOLS CHANGE
              <br />
              <em>EVERYTHING.</em>
            </h2>
            <div className="intro-copy">
              <p>
                From precision instruments to powerful workstations, the resources you need are closer than you think.
              </p>
              <a className="circle-link" href="#catalog">
                ↘
              </a>
            </div>
          </div>
        </section>

        {/* SHOWCASE SECTION (CATALOGUE) */}
        <section className="showcase section-pad" id="catalog">
          <div className="section-top">
            <div>
              <div className="eyebrow">
                <b /> 02 — THE EQUIPMENT EDIT
              </div>
              <h2>
                BUILT TO <em>BUILD.</em>
              </h2>
            </div>
            <a
              className="under-link"
              href="#catalog"
              onClick={(e) => {
                e.preventDefault();
                setActiveFilter("All");
                setShownLimit(equipment.length);
                showToast("SHOWING ALL EQUIPMENT");
              }}
            >
              VIEW ALL EQUIPMENT ↗
            </a>
          </div>

          {/* Department Filter Tabs & Sort Dropdown */}
          <div className="filter-row">
            <div className="filters">
              {["All", "Electronics", "Robotics", "Computing", "Mechanical", "Chemistry", "Biotech"].map((f) => (
                <button
                  key={f}
                  className={`filter ${activeFilter.toLowerCase() === f.toLowerCase() ? "active" : ""}`}
                  onClick={() => {
                    setActiveFilter(f);
                    setShownLimit(8);
                  }}
                >
                  {f === "All" ? "ALL GEAR" : f.toUpperCase()}
                  {f === "All" && <small> {String(equipment.length).padStart(2, "0")}</small>}
                </button>
              ))}
            </div>

            <label className="sort-label">
              SORT BY{" "}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="featured">FEATURED</option>
                <option value="az">A — Z</option>
              </select>
            </label>
          </div>

          {/* Product Grid */}
          <div className="product-grid">
            {displayedEquipment.map((item, index) => {
              const isSaved = savedIds.includes(item.id);
              return (
                <article
                  key={item.id}
                  className="product-card"
                  onClick={() => setSelectedProduct(item)}
                >
                  <div className="product-image">
                    <img
                      loading="lazy"
                      src={item.imageUrl || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=85"}
                      alt={item.name}
                    />
                    <span className="product-tag">
                      {item.tag || (item.trainingRequired ? "TRAINING REQUIRED" : "STUDENT FAVOURITE")}
                    </span>
                    <button
                      className={`save-btn ${isSaved ? "saved" : ""}`}
                      onClick={(e) => toggleSave(item.id, e)}
                      aria-label={`Save ${item.name}`}
                    >
                      {isSaved ? "♥" : "♡"}
                    </button>
                  </div>

                  <div className="product-info">
                    <div className="product-kicker">
                      <span>{item.category.toUpperCase()}</span>
                      <span>
                        {String(index + 1).padStart(2, "0")} / {String(displayedEquipment.length).padStart(2, "0")}
                      </span>
                    </div>

                    <h3>{item.name}</h3>
                    <div className="product-spec">
                      {item.spec || Object.entries(item.specs).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(" · ") || item.dept}
                    </div>

                    <div className="product-foot">
                      <span className="availability">
                        {item.status.toUpperCase()}
                      </span>
                      <span className="details-link">VIEW DETAILS ↗</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Catalogue Bottom Pagination */}
          <div className="catalog-bottom">
            <span>
              SHOWING <b>{String(displayedEquipment.length).padStart(2, "0")}</b> OF {equipment.length} RESOURCES
            </span>
            {displayedEquipment.length < filteredEquipment.length && (
              <button
                className="outline-btn"
                onClick={() => setShownLimit(shownLimit + 8)}
              >
                LOAD MORE EQUIPMENT ↗
              </button>
            )}
          </div>
        </section>

        {/* DEPARTMENTS SECTION */}
        <section className="departments" id="departments">
          <div className="dept-heading section-pad">
            <div className="eyebrow light">
              <b /> 03 — CHOOSE YOUR DIRECTION
            </div>
            <h2>
              WHAT ARE YOU
              <br />
              <em>MAKING?</em>
            </h2>
            <p>Start with your discipline. Find the gear to take it somewhere new.</p>
          </div>

          <div className="dept-grid">
            <a
              className="dept-card dept-electronics"
              href="#catalog"
              onClick={() => {
                setActiveFilter("Electronics");
                setShownLimit(8);
              }}
            >
              <span>01 / CIRCUITS & SIGNALS</span>
              <h3>
                ELECTRONICS<span>+</span>
              </h3>
              <b>EXPLORE GEAR ↗</b>
            </a>

            <a
              className="dept-card dept-robotics"
              href="#catalog"
              onClick={() => {
                setActiveFilter("Robotics");
                setShownLimit(8);
              }}
            >
              <span>02 / MOTION & MACHINES</span>
              <h3>
                ROBOTICS<span>+</span>
              </h3>
              <b>EXPLORE GEAR ↗</b>
            </a>

            <a
              className="dept-card dept-computing"
              href="#catalog"
              onClick={() => {
                setActiveFilter("Computing");
                setShownLimit(8);
              }}
            >
              <span>03 / CODE & COMPUTE</span>
              <h3>
                COMPUTING<span>+</span>
              </h3>
              <b>EXPLORE GEAR ↗</b>
            </a>
          </div>
        </section>

        {/* MANIFESTO SECTION */}
        <section className="manifesto section-pad" id="about">
          <div className="eyebrow">
            <b /> 04 — MORE ACCESS. MORE MAKING.
          </div>
          <div className="manifesto-grid">
            <h2>
              LESS SEARCHING.
              <br />
              <em>MORE DOING.</em>
            </h2>
            <div>
              <p>
                Great projects shouldn't stall because the right equipment is out of reach. LabLink connects students with specialised campus resources through a smarter, simpler way to discover, request and book.
              </p>
              <a className="btn btn-dark" href="#how">
                HOW LABLINK WORKS <span>↗</span>
              </a>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section className="how section-pad" id="how">
          <div className="eyebrow light">
            <b /> 05 — THE PROCESS
          </div>
          <h2>
            THREE STEPS.
            <br />
            <em>ONE LESS BARRIER.</em>
          </h2>

          <div className="steps">
            <article>
              <span>01</span>
              <h3>DISCOVER</h3>
              <p>Search across departments and find the equipment your project needs.</p>
            </article>

            <article>
              <span>02</span>
              <h3>REQUEST</h3>
              <p>Choose a time, tell us about your project and send an access request.</p>
            </article>

            <article>
              <span>03</span>
              <h3>GET BUILDING</h3>
              <p>Faculty review and approve via automated priority queue. You get access and build.</p>
            </article>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer>
        <a className="logo" href="#top">
          LAB<span>LINK</span>
          <sup>®</sup>
        </a>
        <p>TOOLS FOR WHAT’S NEXT.</p>
        <div>
          <a href="#catalog">EQUIPMENT</a>
          <a href="#departments">DEPARTMENTS</a>
          <a href="#how">HOW IT WORKS</a>
          <button
            onClick={() => setIsFacultyQueueOpen(true)}
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", font: "inherit" }}
          >
            FACULTY QUEUE
          </button>
        </div>
        <small>© 2026 LABLINK · BUILT FOR CAMPUS INNOVATION</small>
      </footer>

      {/* SEARCH OVERLAY */}
      <div className={`search-overlay ${isSearchOpen ? "open" : ""}`}>
        <button
          className="close"
          onClick={() => setIsSearchOpen(false)}
        >
          ×
        </button>
        <div className="eyebrow">
          <b /> FIND YOUR NEXT TOOL
        </div>
        <input
          placeholder="Try ‘oscilloscope’ or ‘robotics’..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus={isSearchOpen}
        />
        <p>SEARCH EQUIPMENT, CATEGORIES AND DEPARTMENTS ({filteredEquipment.length} RESULTS)</p>
      </div>

      {/* MY KIT SLIDE-OUT DRAWER */}
      <div
        className={`drawer-backdrop ${isDrawerOpen ? "open" : ""}`}
        onClick={() => setIsDrawerOpen(false)}
      />
      <aside className={`drawer ${isDrawerOpen ? "open" : ""}`}>
        <button
          className="close"
          onClick={() => setIsDrawerOpen(false)}
        >
          ×
        </button>
        <div className="eyebrow">
          <b /> YOUR SHORTLIST
        </div>
        <h2>
          MY <em>KIT.</em>
        </h2>

        <div className="saved-items">
          {savedIds.length === 0 ? (
            <p className="muted">Your saved equipment will show up here.</p>
          ) : (
            savedIds.map((id) => {
              const p = equipment.find((x) => x.id === id);
              if (!p) return null;
              return (
                <div key={id} className="saved-row">
                  <img src={p.imageUrl} alt={p.name} />
                  <div>
                    <h4>{p.name}</h4>
                    <span className="product-spec">{p.dept} · {p.category}</span>
                    <br />
                    <button onClick={() => toggleSave(id)}>REMOVE</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <a
          className="btn btn-dark full"
          href="#catalog"
          onClick={() => setIsDrawerOpen(false)}
        >
          KEEP EXPLORING ↗
        </a>
      </aside>

      {/* PRODUCT DETAIL & ACCESS REQUEST MODAL */}
      <div
        className={`modal-backdrop ${selectedProduct ? "open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelectedProduct(null);
        }}
      >
        {selectedProduct && (
          <div className="modal">
            <button
              className="close"
              onClick={() => setSelectedProduct(null)}
            >
              ×
            </button>

            <div className="modal-layout">
              <div>
                <img
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                />
              </div>

              <div>
                <div className="eyebrow">
                  <b /> {selectedProduct.category.toUpperCase()} / {selectedProduct.model || selectedProduct.id.toUpperCase()}
                </div>
                <h2>{selectedProduct.name}</h2>
                <div className="availability">{selectedProduct.status.toUpperCase()}</div>
                <p>{selectedProduct.description}</p>

                <div className="spec-list">
                  {Object.entries(selectedProduct.specs).map(([k, v]) => (
                    <div key={k}>
                      <span>{k.toUpperCase()}</span>
                      <b>{v}</b>
                    </div>
                  ))}
                  <div>
                    <span>LOCATION</span>
                    <b>{selectedProduct.lab} · {selectedProduct.building}</b>
                  </div>
                  {selectedProduct.trainingRequired && (
                    <div>
                      <span>TRAINING REQUIRED</span>
                      <b style={{ color: "#d7ff35", background: "#111", padding: "2px 6px" }}>
                        {selectedProduct.trainingRequired.toUpperCase()}
                      </b>
                    </div>
                  )}
                </div>

                {/* Booking Form connected to working logic */}
                <form className="booking-form" onSubmit={handleBookingSubmit}>
                  <div className="eyebrow">
                    <b /> REQUEST ACCESS // FACULTY QUEUE
                  </div>

                  <label>PROJECT / COURSE TITLE</label>
                  <input
                    required
                    placeholder="e.g. Autonomous Drone Low-Light Vision"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                  />

                  <label>PROJECT CLASSIFICATION</label>
                  <select
                    value={projectClassification}
                    onChange={(e) => setProjectClassification(e.target.value as any)}
                  >
                    <option value="thesis">Thesis / Senior Capstone (Highest Weight)</option>
                    <option value="research">Faculty-Sponsored Research</option>
                    <option value="course">Course Assignment Lab</option>
                    <option value="club">Student Competition Club</option>
                    <option value="hobby">Exploratory / Independent</option>
                  </select>

                  <label>PREFERRED DATE</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                  />

                  <label>TIME SLOT</label>
                  <select
                    value={preferredSlot}
                    onChange={(e) => setPreferredSlot(e.target.value)}
                  >
                    <option>09:00 – 11:00</option>
                    <option>11:00 – 13:00</option>
                    <option>14:00 – 16:00</option>
                    <option>16:00 – 18:00</option>
                  </select>

                  <label>WHY DO YOU NEED IT? (RESEARCH JUSTIFICATION)</label>
                  <textarea
                    required
                    placeholder="Briefly describe what you plan to build and why this specific instrument is needed..."
                    value={projectReason}
                    onChange={(e) => setProjectReason(e.target.value)}
                  />

                  <button className="btn btn-dark" type="submit">
                    SUBMIT ACCESS REQUEST <span>↗</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FACULTY QUEUE MODAL WITH SCORE BARS */}
      <div
        className={`modal-backdrop ${isFacultyQueueOpen ? "open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsFacultyQueueOpen(false);
        }}
      >
        {isFacultyQueueOpen && (
          <div className="modal faculty-modal">
            <button
              className="close"
              onClick={() => setIsFacultyQueueOpen(false)}
            >
              ×
            </button>

            <div style={{ padding: "10px 0 20px", borderBottom: "1px solid var(--line)" }}>
              <div className="eyebrow">
                <b /> FACULTY ALLOCATION MATRIX // AUTONOMOUS SCORING
              </div>
              <h2 style={{ fontSize: "38px", margin: "10px 0 5px", letterSpacing: "-.07em" }}>
                FACULTY <em>QUEUE.</em>
              </h2>
              <p style={{ color: "#62665c", fontSize: "13px", margin: 0 }}>
                Review, approve, and calibrate multi-factor priority scores for student research equipment requests.
              </p>
            </div>

            {/* Quick Weight Tuner */}
            <div style={{ margin: "20px 0", padding: "14px", background: "white", border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ font: "10px 'DM Mono'", fontWeight: "bold" }}>
                  PRIORITY CRITERIA WEIGHT TUNER
                </span>
                <button
                  onClick={() => setShowWeightTuner(!showWeightTuner)}
                  style={{ font: "10px 'DM Mono'", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                >
                  {showWeightTuner ? "HIDE SLIDERS" : "ADJUST WEIGHTS"}
                </button>
              </div>

              {showWeightTuner && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginTop: "14px" }}>
                  {(
                    [
                      { k: "deadline", label: "Deadline", val: weights.deadline },
                      { k: "relevance", label: "Relevance", val: weights.relevance },
                      { k: "fairness", label: "Fairness", val: weights.fairness },
                      { k: "academic", label: "Academic", val: weights.academic },
                      { k: "waiting", label: "Wait Time", val: weights.waiting },
                    ] as const
                  ).map((item) => (
                    <div key={item.k}>
                      <div style={{ display: "flex", justifyContent: "space-between", font: "9px 'DM Mono'" }}>
                        <span>{item.label}</span>
                        <b>{Math.round(item.val * 100)}%</b>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="50"
                        step="5"
                        value={Math.round(item.val * 100)}
                        onChange={(e) =>
                          setWeights({ ...weights, [item.k]: Number(e.target.value) / 100 })
                        }
                        style={{ width: "100%", accentColor: "#111" }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Queue Split View */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "25px", marginTop: "20px" }}>
              {/* Left Column: Candidates List */}
              <div style={{ borderRight: "1px solid var(--line)", paddingRight: "15px", maxHeight: "420px", overflowY: "auto" }}>
                <span style={{ font: "9px 'DM Mono'", color: "#777", display: "block", marginBottom: "10px" }}>
                  CANDIDATES IN QUEUE ({bookings.length})
                </span>

                {bookings.map((req, idx) => (
                  <div
                    key={req.id}
                    onClick={() => setSelectedQueueReqId(req.id)}
                    style={{
                      padding: "12px",
                      background: activeQueueReq?.id === req.id ? "white" : "transparent",
                      border: "1px solid",
                      borderColor: activeQueueReq?.id === req.id ? "#111" : "transparent",
                      marginBottom: "8px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ font: "8px 'DM Mono'", color: "#8da62b", fontWeight: "bold" }}>
                        #{idx + 1} // {req.projectType.toUpperCase()}
                      </div>
                      <strong style={{ fontSize: "13px", display: "block" }}>{req.studentName}</strong>
                      <span style={{ fontSize: "10px", color: "#666" }}>
                        {req.equipmentNames?.[0] || req.equipmentIds[0]}
                      </span>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span style={{ font: "18px 'DM Mono'", fontWeight: "800", color: "#111" }}>
                        {req.score || 85}
                      </span>
                      <span style={{ font: "8px 'DM Mono'", display: "block", color: "#777" }}>
                        {req.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Column: Detailed Score Bars & Actions */}
              {activeQueueReq && (
                <div style={{ background: "white", padding: "20px", border: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
                    <div>
                      <span style={{ font: "9px 'DM Mono'", color: "#8da62b", fontWeight: "bold" }}>
                        PROPOSAL DETAILS
                      </span>
                      <h3 style={{ fontSize: "18px", margin: "4px 0", letterSpacing: "-.04em" }}>
                        {activeQueueReq.projectTitle}
                      </h3>
                      <p style={{ fontSize: "11px", color: "#666", margin: 0 }}>
                        {activeQueueReq.studentName} ({activeQueueReq.studentDept} · Year {activeQueueReq.studentYear})
                      </p>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span style={{ font: "28px 'DM Mono'", fontWeight: "900", color: "#111" }}>
                        {activeQueueReq.score || 88}
                      </span>
                      <span style={{ font: "8px 'DM Mono'", display: "block", color: "#777" }}>
                        TOTAL SCORE
                      </span>
                    </div>
                  </div>

                  {/* 5 MULTI-FACTOR SCORE BARS */}
                  <div style={{ margin: "16px 0", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <span style={{ font: "9px 'DM Mono'", fontWeight: "bold", color: "#111" }}>
                      SCORE BARS BREAKDOWN
                    </span>

                    {/* Bar 1: Deadline */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", font: "9px 'DM Mono'", marginBottom: "3px" }}>
                        <span>Deadline Urgency ({activeQueueReq.deadline})</span>
                        <b>{activeQueueReq.factors?.deadline || 90}%</b>
                      </div>
                      <div className="score-bar-bg">
                        <div
                          className="score-bar-fill high"
                          style={{ width: `${activeQueueReq.factors?.deadline || 90}%` }}
                        />
                      </div>
                    </div>

                    {/* Bar 2: Relevance */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", font: "9px 'DM Mono'", marginBottom: "3px" }}>
                        <span>Research & Grant Relevance</span>
                        <b>{activeQueueReq.factors?.relevance || 85}%</b>
                      </div>
                      <div className="score-bar-bg">
                        <div
                          className="score-bar-fill"
                          style={{ width: `${activeQueueReq.factors?.relevance || 85}%` }}
                        />
                      </div>
                    </div>

                    {/* Bar 3: Fairness */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", font: "9px 'DM Mono'", marginBottom: "3px" }}>
                        <span>Fairness (Anti-Monopolization Balance)</span>
                        <b>{activeQueueReq.factors?.fairness || 82}%</b>
                      </div>
                      <div className="score-bar-bg">
                        <div
                          className="score-bar-fill"
                          style={{ width: `${activeQueueReq.factors?.fairness || 82}%` }}
                        />
                      </div>
                    </div>

                    {/* Bar 4: Academic Standing */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", font: "9px 'DM Mono'", marginBottom: "3px" }}>
                        <span>Academic Standing & Capstone Priority</span>
                        <b>{activeQueueReq.factors?.academic || 95}%</b>
                      </div>
                      <div className="score-bar-bg">
                        <div
                          className="score-bar-fill high"
                          style={{ width: `${activeQueueReq.factors?.academic || 95}%` }}
                        />
                      </div>
                    </div>

                    {/* Bar 5: Waiting Time */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", font: "9px 'DM Mono'", marginBottom: "3px" }}>
                        <span>Queue Waiting Time</span>
                        <b>{activeQueueReq.factors?.waiting || 75}%</b>
                      </div>
                      <div className="score-bar-bg">
                        <div
                          className="score-bar-fill"
                          style={{ width: `${activeQueueReq.factors?.waiting || 75}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Rationale */}
                  <p style={{ font: "11px 'DM Mono'", color: "#555", background: "var(--paper)", padding: "10px", margin: "14px 0" }}>
                    {activeQueueReq.explanation || activeQueueReq.projectSummary}
                  </p>

                  {/* Decision Buttons */}
                  <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => handleRejectQueue(activeQueueReq.id)}
                      style={{ padding: "8px 14px", font: "9px 'DM Mono'", background: "#fbeaea", color: "#c93b2b", border: "none", cursor: "pointer" }}
                    >
                      REJECT
                    </button>
                    <button
                      onClick={() => handleWaitlistQueue(activeQueueReq.id)}
                      style={{ padding: "8px 14px", font: "9px 'DM Mono'", background: "#fff4e0", color: "#b26b00", border: "none", cursor: "pointer" }}
                    >
                      WAITLIST
                    </button>
                    <button
                      onClick={() => handleApproveQueue(activeQueueReq.id)}
                      style={{ padding: "8px 16px", font: "9px 'DM Mono'", background: "var(--lime)", color: "#111", border: "none", fontWeight: "bold", cursor: "pointer" }}
                    >
                      APPROVE ACCESS ↗
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* TOAST ALERTS */}
      <div className={`toast ${toastMessage ? "show" : ""}`}>
        {toastMessage}
      </div>
    </>
  );
}
