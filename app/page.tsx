"use client";

import React, { useState, useEffect } from "react";
import {
  equipment,
  initialBookings,
  calculateScore,
  defaultWeights,
  Equipment,
  BookingRequest,
  Weights,
} from "@/lib/seed";
import { db } from "@/lib/db";
import { hasRequiredTraining, getRequiredTrainingModule } from "@/lib/training";
import {
  notifyBookingSubmitted,
  notifyBookingApproved,
  notifyBookingRejected,
  notifyAvailabilityFreed,
  getUserNotifications,
  markNotificationAsRead,
} from "@/lib/notifications";
import { generateProjectRecommendations, EquipmentRecommendation, ProjectExtractionResult } from "@/lib/mockLLM";
import Departments from "@/components/home/Departments";
import ShowMore from "@/components/catalogue/ShowMore";
import DemoGate from "@/components/DemoGate";

const DEPARTMENTS = [
  "All",
  "Electronics",
  "Mechanical",
  "Computer Science",
  "Chemistry",
  "Biotech",
] as const;

function EquipmentImage({
  item,
  className,
  style,
}: {
  item: Equipment;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [failed, setFailed] = useState(false);

  const deptColors: Record<string, string> = {
    Electronics: "#1e293b",
    Mechanical: "#334155",
    "Computer Science": "#172554",
    Chemistry: "#064e3b",
    Biotech: "#4c1d95",
  };

  const bg = deptColors[item.dept] || "#20251f";

  if (failed || !item.imageUrl) {
    return (
      <div
        className={className}
        style={{
          ...style,
          display: "grid",
          placeItems: "center",
          background: bg,
          width: "100%",
          height: "100%",
          color: "#fff",
          fontSize: "64px",
          userSelect: "none",
        }}
      >
        <span role="img" aria-label={item.name}>
          {item.imageEmoji || "🔬"}
        </span>
      </div>
    );
  }

  return (
    <img
      loading="lazy"
      src={item.imageUrl}
      alt={item.name}
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}

export default function Home() {
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [kitQuantities, setKitQuantities] = useState<Record<string, number>>({});
  const [selectedProduct, setSelectedProduct] = useState<Equipment | null>(null);
  const [isKitBookingOpen, setIsKitBookingOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationVersion, setNotificationVersion] = useState(0);
  const [demoEquipmentId, setDemoEquipmentId] = useState(equipment[0]?.id || "");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFacultyQueueOpen, setIsFacultyQueueOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [catalogColumns, setCatalogColumns] = useState(4);
  const [shownLimit, setShownLimit] = useState(4);
  const [isCatalogueExpanded, setIsCatalogueExpanded] = useState(false);
  const [isDemoGateOpen, setIsDemoGateOpen] = useState(true);

  // Natural Language Search API state
  const [searchResults, setSearchResults] = useState<
    Array<{ equipment: Equipment; score: number; matchReason: string }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAutoSearchOpen, setIsAutoSearchOpen] = useState(false);
  const [hasAutoSearched, setHasAutoSearched] = useState(false);
  const [projectDescription, setProjectDescription] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [autoSearchResults, setAutoSearchResults] = useState<EquipmentRecommendation[]>([]);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [requiredCertifications, setRequiredCertifications] = useState<string[]>([]);
  const [selectedAutoIds, setSelectedAutoIds] = useState<string[]>([]);
  const [autoItemQuery, setAutoItemQuery] = useState("");
  const [autoItemResults, setAutoItemResults] = useState<Array<{ equipment: Equipment; score: number; matchReason: string }>>([]);

  // Active student session (Maya Lin, Computer Science Senior)
  const currentStudent = db.students[0] || {
    id: "stu-001",
    name: "Maya Lin",
    dept: "Computer Science",
    year: 4,
    certs: ["oscilloscope-basics", "3d-printer-safety"],
    usageHoursLast30d: 6,
    noShows: 0,
  };

  const refreshLiveData = () => setNotificationVersion((version) => version + 1);
  const triggerAvailabilityEvent = (equipmentId: string, event: "cancelled" | "rejected" | "finished" | "maintenance-cleared") => {
    const savedStudentIds = savedIds.includes(equipmentId) ? [currentStudent.id] : [];
    const result = notifyAvailabilityFreed(equipmentId, event, savedStudentIds);
    setBookings([...db.bookings]);
    refreshLiveData();
    const item = equipment.find((entry) => entry.id === equipmentId);
    showToast(result.promoted ? `${item?.name || "Item"} promoted the next waitlisted student` : `${item?.name || "Item"} availability notifications sent`);
  };

  const toggleDemoMaintenance = () => {
    const item = db.equipment.find((entry) => entry.id === demoEquipmentId);
    if (!item) return;
    const wasMaintenance = item.status === "maintenance";
    item.status = wasMaintenance ? "available" : "maintenance";
    if (wasMaintenance) triggerAvailabilityEvent(item.id, "maintenance-cleared");
    else { refreshLiveData(); showToast(`${item.name} marked for maintenance`); }
  };

  // Live call to /api/search for natural language queries
  useEffect(() => {
    const closeOverlays = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsAutoSearchOpen(false);
      setIsSearchOpen(false);
      setIsNotificationsOpen(false);
      setIsOrdersOpen(false);
      setIsDrawerOpen(false);
      setIsFacultyQueueOpen(false);
    };
    window.addEventListener("keydown", closeOverlays);
    return () => window.removeEventListener("keydown", closeOverlays);
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.error("Search API error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const q = autoItemQuery.trim();
    if (!q) { setAutoItemResults([]); return; }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setAutoItemResults((await res.json()).results || []);
    }, 180);
    return () => clearTimeout(timer);
  }, [autoItemQuery]);

  const handleAutoGenerate = async () => {
    if (!projectDescription.trim()) return;
    setHasAutoSearched(true);
    setIsExtracting(true);
    try {
      const res = await fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: projectDescription }) });
      const result: ProjectExtractionResult = res.ok ? await res.json() : generateProjectRecommendations(projectDescription);
      setAutoSearchResults(result.recommendations); setExtractedSkills(result.skills); setRequiredCertifications(result.trainingRequired);
      setSelectedAutoIds(result.recommendations.map(({ equipment: item }) => item.id));
    } catch {
      const result = generateProjectRecommendations(projectDescription);
      setAutoSearchResults(result.recommendations); setExtractedSkills(result.skills); setRequiredCertifications(result.trainingRequired);
      setSelectedAutoIds(result.recommendations.map(({ equipment: item }) => item.id));
    } finally { setIsExtracting(false); }
  };

  const addAutoItemsToKit = (ids: string[]) => {
    const nextIds = Array.from(new Set([...savedIds, ...ids]));
    const nextQuantities = { ...kitQuantities };
    ids.forEach((id) => { nextQuantities[id] = nextQuantities[id] || 1; });
    setSavedIds(nextIds);
    setKitQuantities(nextQuantities);
    try { localStorage.setItem("lablinkSaved", JSON.stringify(nextIds)); } catch {}
    try { localStorage.setItem("lablinkKitQuantities", JSON.stringify(nextQuantities)); } catch {}
    showToast(`${ids.length} ITEM${ids.length === 1 ? "" : "S"} ADDED TO YOUR KIT`);
  };

  const resetAutoSearch = () => {
    setProjectDescription(""); setAutoSearchResults([]); setExtractedSkills([]); setRequiredCertifications([]);
    setSelectedAutoIds([]); setAutoItemQuery(""); setAutoItemResults([]); setHasAutoSearched(false);
  };

  // Faculty Queue state
  const [bookings, setBookings] = useState<BookingRequest[]>(initialBookings);
  const [weights, setWeights] = useState<Weights>(defaultWeights);
  const [selectedQueueReqId, setSelectedQueueReqId] = useState<string>(
    initialBookings[0]?.id || ""
  );
  const [showWeightTuner, setShowWeightTuner] = useState(false);
  const [queueView, setQueueView] = useState<"item" | "person">("item");
  const [queueSearch, setQueueSearch] = useState("");

  // Booking Form state in modal
  const [projectTitle, setProjectTitle] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredSlot, setPreferredSlot] = useState("09:00 – 11:00");
  const [projectReason, setProjectReason] = useState("");
  const [projectClassification, setProjectClassification] = useState<
    "thesis" | "research" | "course" | "club" | "hobby"
  >("thesis");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("lablinkSaved");
      const storedQuantities = localStorage.getItem("lablinkKitQuantities");
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        setSavedIds(ids);
        const parsed = storedQuantities ? JSON.parse(storedQuantities) : {};
        setKitQuantities(Object.fromEntries(ids.map((id) => [id, Number(parsed[id]) > 0 ? Number(parsed[id]) : 1])));
      }
    } catch {}
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
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
    const updatedQuantities = { ...kitQuantities };
    if (savedIds.includes(id)) delete updatedQuantities[id];
    else updatedQuantities[id] = updatedQuantities[id] || 1;
    setKitQuantities(updatedQuantities);
    try {
      localStorage.setItem("lablinkSaved", JSON.stringify(updated));
      localStorage.setItem("lablinkKitQuantities", JSON.stringify(updatedQuantities));
    } catch {}
  };

  const updateKitQuantity = (id: string, delta: number) => {
    const nextQuantity = Math.max(1, (kitQuantities[id] || 1) + delta);
    const nextQuantities = { ...kitQuantities, [id]: nextQuantity };
    setKitQuantities(nextQuantities);
    try { localStorage.setItem("lablinkKitQuantities", JSON.stringify(nextQuantities)); } catch {}
  };

  // Helper count for real department stats
  const getDeptCount = (d: string) => {
    if (d === "All") return equipment.length;
    return equipment.filter((e) => e.dept.toLowerCase() === d.toLowerCase()).length;
  };

  // Filter & Sort equipment catalogue
  let filteredEquipment = equipment.filter((item) => {
    const matchDept =
      activeFilter === "All" ||
      item.dept.toLowerCase() === activeFilter.toLowerCase();
    const matchSearch =
      searchQuery.trim() === "" ||
      (
        item.name +
        item.dept +
        item.category +
        item.description +
        Object.values(item.specs).join(" ")
      )
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    return matchDept && matchSearch;
  });

  if (sortBy === "az") {
    filteredEquipment.sort((a, b) => a.name.localeCompare(b.name));
  }

  const displayedEquipment = filteredEquipment.slice(0, shownLimit);

  useEffect(() => {
    const updateColumns = () => {
      const grid = document.querySelector<HTMLElement>(".product-grid");
      if (!grid) return;
      const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length;
      if (columns > 0) setCatalogColumns(columns);
    };
    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  useEffect(() => {
    setIsCatalogueExpanded(false);
    setShownLimit(catalogColumns);
  }, [searchQuery, sortBy, catalogColumns]);

  // Handle Booking Submission with safety validation and automated multi-factor scoring
  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct && !isKitBookingOpen) return;

    const bookingItems = selectedProduct
      ? [{ item: selectedProduct, quantity: 1 }]
      : savedIds.map((id) => ({ item: equipment.find((entry) => entry.id === id), quantity: kitQuantities[id] || 1 })).filter((entry): entry is { item: Equipment; quantity: number } => Boolean(entry.item));
    if (!bookingItems.length) return;

    // Check maintenance status
    const maintenanceItem = bookingItems.find(({ item }) => item.status === "maintenance");
    if (maintenanceItem) {
      showToast(`BOOKING BLOCKED: ${maintenanceItem.item.name} is currently under maintenance.`);
      return;
    }

    // Check training safety certification
    const trainingItem = bookingItems.find(({ item }) => item.trainingRequired && !hasRequiredTraining(currentStudent, item));
    if (trainingItem) {
      const mod = getRequiredTrainingModule(trainingItem.item);
      showToast(
        `BOOKING BLOCKED: Missing certification "${mod?.name || trainingItem.item.trainingRequired}". Complete prerequisite training before reserving.`
      );
      return;
    }

    // Dynamic Multi-Factor Scoring Engine
    const deadlineUrgency =
      projectClassification === "thesis" ? 95 :
      projectClassification === "research" ? 88 :
      projectClassification === "course" ? 82 : 70;

    const grantRelevance =
      projectClassification === "research" ? 95 :
      projectClassification === "thesis" ? 92 :
      projectTitle.length > 10 ? 85 : 78;

    const fairnessScore = Math.max(50, 100 - (currentStudent.usageHoursLast30d || 6) * 3);

    const academicStanding =
      projectClassification === "thesis" ? 96 :
      currentStudent.year >= 4 ? 90 : 82;

    const factors = {
      deadline: deadlineUrgency,
      relevance: grantRelevance,
      fairness: fairnessScore,
      academic: academicStanding,
      waiting: 85,
    };

    const score = calculateScore(factors, weights);

    const newBooking: BookingRequest = {
      id: `req-${Date.now().toString().slice(-4)}`,
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      studentDept: currentStudent.dept,
      studentYear: currentStudent.year,
      equipmentIds: bookingItems.flatMap(({ item, quantity }) => Array.from({ length: quantity }, () => item.id)),
      equipmentNames: bookingItems.map(({ item, quantity }) => `${item.name} ×${quantity}`),
      slotStart: `${preferredDate} ${preferredSlot.split(" – ")[0]}`,
      slotEnd: `${preferredDate} ${preferredSlot.split(" – ")[1] || "13:00"}`,
      projectTitle: projectTitle || "Cross-Department Research Prototyping",
      projectType: projectClassification,
      projectSummary: projectReason || "Academic research requiring precision lab equipment.",
      deadline: `${preferredDate} (Target Date)`,
      createdAt: new Date().toISOString().replace("T", " ").slice(0, 16),
      status: "pending",
      score,
      factors,
      explanation: `Automated assessment: ${projectClassification.toUpperCase()} proposal. Priority score: ${score}/100. Pending faculty review.`,
    };

    db.bookings.unshift(newBooking);
    setBookings([newBooking, ...bookings]);
    notifyBookingSubmitted(newBooking);

    setSelectedProduct(null);
    setIsKitBookingOpen(false);
    setProjectTitle("");
    setProjectReason("");
    showToast(`REQUEST SUBMITTED · PRIORITY SCORE: ${score}/100 · ADDED TO FACULTY QUEUE`);
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
    updated.find((booking) => booking.id === id)?.equipmentIds.forEach((equipmentId) => triggerAvailabilityEvent(equipmentId, "rejected"));
    showToast("BOOKING REJECTED");
  };

  const handleWaitlistQueue = (id: string) => {
    const updated = bookings.map((b) =>
      b.id === id ? { ...b, status: "waitlisted" as const } : b
    );
    setBookings(updated);
    db.bookings = updated;
    showToast("CANDIDATE PLACED ON WAITLIST");
  };

  const handleOverrideQueue = (id: string) => {
    const updated = bookings.map((b) => b.id === id ? { ...b, status: "approved" as const, decidedBy: "Faculty Override", overrideNote: "Approved by faculty override." } : b);
    setBookings(updated);
    db.bookings = updated;
    showToast("FACULTY OVERRIDE APPLIED");
  };

  const activeQueueReq = bookings.find((b) => b.id === selectedQueueReqId) || bookings[0];
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const kitItems = savedIds.map((id) => equipment.find((item) => item.id === id)).filter((item): item is Equipment => Boolean(item));
  const kitItemCount = kitItems.reduce((total, item) => total + (kitQuantities[item.id] || 1), 0);
  const kitTraining = Array.from(new Set(kitItems.map((item) => item.trainingRequired).filter((value): value is string => Boolean(value))));
  const kitMaintenance = kitItems.filter((item) => item.status === "maintenance");
  const normalizedQueueSearch = queueSearch.trim().toLowerCase();
  const queueMatches = bookings.filter((req) => {
    if (!normalizedQueueSearch) return true;
    const names = req.equipmentNames?.join(" ") || req.equipmentIds.join(" ");
    return `${req.studentName || ""} ${req.studentDept || ""} ${names} ${req.projectTitle}`.toLowerCase().includes(normalizedQueueSearch);
  });
  const queueItemGroups = Array.from(new Set(queueMatches.flatMap((req) => req.equipmentIds))).map((equipmentId) => ({
    equipment: equipment.find((item) => item.id === equipmentId),
    requests: queueMatches.filter((req) => req.equipmentIds.includes(equipmentId)).sort((a, b) => (b.score || 0) - (a.score || 0)),
  })).filter((group): group is { equipment: Equipment; requests: BookingRequest[] } => Boolean(group.equipment));
  const queuePersonGroups = Array.from(new Set(queueMatches.map((req) => req.studentId))).map((studentId) => ({
    student: db.students.find((student) => student.id === studentId),
    requests: queueMatches.filter((req) => req.studentId === studentId).sort((a, b) => (b.score || 0) - (a.score || 0)),
  })).filter((group) => Boolean(group.student));
  const renderQueueActions = (id: string) => <div className="queue-row-actions">
    <button onClick={() => handleApproveQueue(id)}>APPROVE</button>
    <button onClick={() => handleWaitlistQueue(id)}>WAITLIST</button>
    <button onClick={() => handleRejectQueue(id)}>REJECT</button>
    <button onClick={() => handleOverrideQueue(id)}>OVERRIDE</button>
  </div>;
  const myNotifications = getUserNotifications(currentStudent.id);
  const unreadNotificationCount = myNotifications.filter((notification) => !notification.read).length;
  const myOrders = bookings.filter((booking) => booking.studentId === currentStudent.id);

  return (
    <>
      {isDemoGateOpen && <DemoGate onClose={() => setIsDemoGateOpen(false)} />}
      {/* Top Announcement Bar */}
      <div className="announcement">
        BMSCE LABLINK <span>—</span> CROSS-DEPARTMENT LAB EQUIPMENT SHARING & AI-DRIVEN ALLOCATION.{" "}
        <a href="#catalog">EXPLORE {equipment.length} INSTRUMENTS ↗</a>
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

          <button className="icon-btn notification-btn" onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} aria-label="Open notifications">
            ♢{unreadNotificationCount > 0 && <span className="notification-count">{unreadNotificationCount}</span>}
          </button>

          <button className="orders-btn" onClick={() => setIsOrdersOpen(true)}>MY ORDERS</button>

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
            MY KIT <span>{kitItemCount}</span>
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

      {isNotificationsOpen && <div className="notification-panel">
        <div className="notification-panel-heading"><span>NOTIFICATIONS</span><button onClick={() => setIsNotificationsOpen(false)}>×</button></div>
        {myNotifications.length === 0 ? <p className="notification-empty">You’re all caught up.</p> : myNotifications.map((notification) => <div className={`notification-item ${notification.read ? "read" : ""}`} key={notification.id} onClick={() => { markNotificationAsRead(notification.id); refreshLiveData(); }}>
          <p>{notification.text}</p><small>{new Date(notification.at).toLocaleString()}</small>
          {notification.actionBookingId && <button onClick={(event) => { event.stopPropagation(); markNotificationAsRead(notification.id); refreshLiveData(); setIsOrdersOpen(true); }}>CONFIRM</button>}
        </div>)}
      </div>}

      {/* Main Content */}
      <main id="top">
        {/* HERO SECTION */}
        <section className="hero">
          <div className="hero-image" />
          <div className="hero-shade" />
          <div className="hero-content">
            <div className="eyebrow light">
              <b /> AI-DRIVEN UNIVERSITY LAB RESOURCE PLATFORM
            </div>
            <h1>
              MAKE<br />
              RESEARCH <em>HAPPEN.</em>
            </h1>
            <p>
              Cross-department lab equipment sharing powered by AI matching and fair,
              faculty-approved allocation. Discover and book {equipment.length} precision
              instruments across {DEPARTMENTS.length - 1} academic departments.
            </p>
            <div className="hero-ctas">
              <button className="btn btn-lime" onClick={() => { resetAutoSearch(); setIsAutoSearchOpen(true); }}>
                SEARCH AUTOMATICALLY <span>↗</span>
              </button>
              <a className="text-link" href="#departments">
                FIND YOUR DISCIPLINE <span>↓</span>
              </a>
            </div>
          </div>
          <div className="hero-meta">
            <span>01 / 05</span>
            <span>CROSS-DEPARTMENT SHARING · AI MATCHING · FACULTY-APPROVED</span>
            <span>SCROLL TO EXPLORE ↓</span>
          </div>
          <div className="hero-stamp">
            BMSCE<br />
            <small>LAB ALLOCATION</small>
          </div>
        </section>

        {/* MARQUEE TICKER */}
        <section className="ticker">
          <div>
            CROSS-DEPARTMENT SHARING <b>✳</b> AI MATCHING <b>✳</b> FAIR FACULTY-APPROVED ALLOCATION <b>✳</b> ZERO BOTTLENECKS <b>✳</b> PREVENT MONOPOLIZATION <b>✳</b> CROSS-DEPARTMENT SHARING <b>✳</b> AI MATCHING <b>✳</b> FAIR FACULTY-APPROVED ALLOCATION <b>✳</b>
          </div>
        </section>

        {/* INTRO SECTION 01 */}
        <Departments equipment={equipment} searchQuery={searchQuery} onSearchChange={setSearchQuery} onDepartmentSelect={(department) => {
          setActiveFilter(department);
          setIsCatalogueExpanded(false);
          setShownLimit(catalogColumns);
          document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
        }} />

        {/* SHOWCASE SECTION 02 (CATALOGUE) */}
        <section className="showcase section-pad" id="catalog">
          <div className="section-top">
            <div>
              <div className="eyebrow">
                <b /> 02 — THE EQUIPMENT CATALOGUE
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
                setIsCatalogueExpanded(true);
                setShownLimit(equipment.length);
                showToast("SHOWING ALL 40 INSTRUMENTS");
              }}
            >
              VIEW ALL {equipment.length} INSTRUMENTS ↗
            </a>
          </div>

          {/* Department Filter Tabs & Sort Dropdown */}
          <div className="filter-row">
            <div className="filters">
              {DEPARTMENTS.map((deptName) => {
                const count = getDeptCount(deptName);
                const isActive = activeFilter.toLowerCase() === deptName.toLowerCase();
                return (
                  <button
                    key={deptName}
                    className={`filter ${isActive ? "active" : ""}`}
                    onClick={() => {
                      setActiveFilter(deptName);
                      setIsCatalogueExpanded(false);
                      setShownLimit(catalogColumns);
                    }}
                  >
                    {deptName === "All" ? "ALL GEAR" : deptName.toUpperCase()}{" "}
                    <small>{String(count).padStart(2, "0")}</small>
                  </button>
                );
              })}
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

          {/* Product Grid with all 40 items */}
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
                    <EquipmentImage item={item} />
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
                      {item.spec ||
                        Object.entries(item.specs)
                          .slice(0, 2)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ") ||
                        item.dept}
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

          <ShowMore
            shown={displayedEquipment.length}
            total={filteredEquipment.length}
            isExpanded={isCatalogueExpanded || displayedEquipment.length >= filteredEquipment.length}
            onToggle={() => {
              if (isCatalogueExpanded || displayedEquipment.length >= filteredEquipment.length) {
                setIsCatalogueExpanded(false);
                setShownLimit(catalogColumns);
                document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
              } else {
                const nextLimit = Math.min(shownLimit + catalogColumns, filteredEquipment.length);
                setShownLimit(nextLimit);
                setIsCatalogueExpanded(nextLimit >= filteredEquipment.length);
              }
            }}
            onBrowse={() => {
              setIsCatalogueExpanded(true);
              setShownLimit(filteredEquipment.length);
              document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        </section>

        {/* MANIFESTO SECTION 04 */}
        <section className="manifesto section-pad" id="about">
          <div className="eyebrow">
            <b /> 04 — FAIR ALLOCATION ALGORITHM
          </div>
          <div className="manifesto-grid">
            <h2>
              LESS SEARCHING.<br />
              <em>MORE DOING.</em>
            </h2>
            <div>
              <p>
                Great projects shouldn't stall because the right equipment is locked behind
                departmental boundaries or monopolized by a single lab. LabLink connects students
                with specialized campus resources through AI-driven matching and a fair,
                faculty-approved allocation queue.
              </p>
              <a className="btn btn-dark" href="#how">
                HOW LABLINK WORKS <span>↗</span>
              </a>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION 05 */}
        <section className="how section-pad" id="how">
          <div className="eyebrow light">
            <b /> 05 — THE PROCESS
          </div>
          <h2>
            THREE STEPS.<br />
            <em>ONE LESS BARRIER.</em>
          </h2>

          <div className="steps">
            <article>
              <span>01</span>
              <h3>DISCOVER & MATCH</h3>
              <p>
                Search across 5 departments. AI matching finds compatible instruments and verifies
                required safety training certifications automatically.
              </p>
            </article>

            <article>
              <span>02</span>
              <h3>AI PRIORITY REQUEST</h3>
              <p>
                Choose a time and submit your research proposal. Multi-factor scoring weighs deadlines,
                research grant relevance, and fairness in real time.
              </p>
            </article>

            <article>
              <span>03</span>
              <h3>FACULTY APPROVAL</h3>
              <p>
                Department chairs review calibrated scores in the faculty queue. Approved slots send
                instant notifications so you can get building.
              </p>
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
        <p>CROSS-DEPARTMENT CAMPUS LAB ALLOCATION PLATFORM.</p>
        <div>
          <a href="#catalog">EQUIPMENT ({equipment.length})</a>
          <a href="#departments">5 DEPARTMENTS</a>
          <a href="#how">HOW IT WORKS</a>
          <button
            onClick={() => setIsFacultyQueueOpen(true)}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              font: "inherit",
            }}
          >
            FACULTY QUEUE ({pendingCount})
          </button>
        </div>
        <small>© 2026 LABLINK · BMSCE RESOURCE NETWORK · BUILT FOR CROSS-DISCIPLINARY INNOVATION</small>
      </footer>

      <div className={`search-overlay auto-search-overlay ${isAutoSearchOpen ? "open" : ""}`} style={{ background: "rgba(17, 19, 16, .62)", padding: "8vh 8%" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", background: "#e9e9e2", padding: "48px", minHeight: hasAutoSearched ? "auto" : "280px", position: "relative" }}>
        <button className="close" onClick={() => setIsAutoSearchOpen(false)}>×</button>
        <div className="eyebrow"><b /> SEARCH AUTOMATICALLY</div>
        {!hasAutoSearched && <>
          <h2>WHAT ARE YOU <em>BUILDING?</em></h2>
          <form onSubmit={(event) => { event.preventDefault(); handleAutoGenerate(); }} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <input autoFocus={isAutoSearchOpen} value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} placeholder="Paste your project description..." style={{ flex: 1 }} />
            <button className="btn btn-dark" type="submit" disabled={isExtracting} aria-label="Search">{isExtracting ? "…" : "↵"}</button>
          </form>
        </>}
        {hasAutoSearched && <>
        <h2>YOUR PROJECT <em>LAB KIT.</em></h2>
        {isExtracting && <p>Reading your project and matching instruments across the campus catalogue…</p>}
        {!isExtracting && projectDescription && autoSearchResults.length === 0 && <p>We couldn’t find a confident match yet. Try adding a method, material, or instrument type.</p>}
        {(extractedSkills.length > 0 || requiredCertifications.length > 0) && <div className="search-match-reason"><strong>EXTRACTED SKILLS:</strong> {extractedSkills.join(" · ")}<br /><strong>TRAINING:</strong> {requiredCertifications.length ? requiredCertifications.join(" · ") : "No additional certification detected"}</div>}
        {autoSearchResults.length > 0 && <div className="auto-cart-list">
          {autoSearchResults.map(({ equipment: item, estimatedHours, quantity }, index) => <div className="auto-cart-row" key={item.id}>
            <span className="auto-cart-index">{String(index + 1).padStart(2, "0")}</span>
            <input className="auto-cart-check" type="checkbox" checked={selectedAutoIds.includes(item.id)} onChange={() => setSelectedAutoIds((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id])} aria-label={`Select ${item.name}`} />
            <span className="auto-cart-emoji">{item.imageEmoji}</span>
            <div className="auto-cart-details"><strong>{item.name}</strong><span>{item.dept} · {item.category}</span></div>
            <div className="auto-cart-meta"><span>{estimatedHours} hrs</span><span>Qty {quantity}</span></div>
            <button className="auto-cart-remove" onClick={() => { setAutoSearchResults((items) => items.filter(({ equipment: current }) => current.id !== item.id)); setSelectedAutoIds((ids) => ids.filter((id) => id !== item.id)); }} aria-label={`Remove ${item.name}`}>×</button>
          </div>)}
        </div>}
        <div className="auto-add-more">
          <span>+</span><input value={autoItemQuery} onChange={(e) => setAutoItemQuery(e.target.value)} placeholder="Add more items from the catalogue" />
        </div>
        {autoItemResults.length > 0 && <div className="auto-add-results">{autoItemResults.slice(0, 5).map(({ equipment: item }) => <button key={item.id} className="auto-add-result" onClick={() => { if (!autoSearchResults.some(({ equipment: current }) => current.id === item.id)) { setAutoSearchResults((items) => [...items, { equipment: item, reason: "", estimatedHours: 4, quantity: 1 }]); setSelectedAutoIds((ids) => [...ids, item.id]); } setAutoItemQuery(""); }}>{item.imageEmoji} <span>{item.name}</span><small>ADD</small></button>)}</div>}
        <div className="hero-ctas">
          <button className="btn btn-lime" onClick={() => addAutoItemsToKit(autoSearchResults.map(({ equipment: item }) => item.id))}>ADD EVERYTHING TO KIT</button>
          <button className="btn btn-dark" onClick={() => addAutoItemsToKit(selectedAutoIds)}>ADD SELECTED TO KIT</button>
          <button className="text-link" onClick={resetAutoSearch}>START OVER</button>
        </div>
        </>}
        </div>
      </div>

      {/* SEARCH OVERLAY */}
      <div className={`search-overlay ${isSearchOpen ? "open" : ""}`}>
        <button
          className="close"
          onClick={() => {
            setIsSearchOpen(false);
            setSearchQuery("");
            setSearchResults([]);
          }}
        >
          ×
        </button>
        <div className="eyebrow">
          <b /> FIND YOUR NEXT TOOL
        </div>
        <input
          placeholder="Try ‘oscilloscope’, ‘biotech’, or ‘3d printing for drone’..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus={isSearchOpen}
        />
        <p>
          {isSearching
            ? "AI MATCHING INSTRUMENTS ACROSS 5 DEPARTMENTS..."
            : searchResults.length > 0
            ? `AI SEARCH: ${searchResults.length} INSTRUMENTS MATCHED WITH EXPLANATIONS`
            : `SEARCH ${equipment.length} INSTRUMENTS ACROSS 5 DEPARTMENTS`}
        </p>

        {/* Live Natural Language Results with Match Reasons */}
        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map(({ equipment: item, matchReason, score }) => (
              <div
                key={item.id}
                className="search-result-item"
                onClick={() => {
                  setSelectedProduct(item);
                  setIsSearchOpen(false);
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "18px" }}>{item.imageEmoji}</span>
                    <h4>{item.name}</h4>
                    <span className="availability" style={{ fontSize: "8px", marginLeft: "6px" }}>
                      {item.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="search-match-reason">
                    <span className="badge">AI MATCH {score}</span>
                    <span>{matchReason}</span>
                  </div>
                </div>
                <span style={{ font: "9px 'DM Mono'", color: "#111", borderBottom: "1px solid #111", whiteSpace: "nowrap" }}>
                  VIEW DETAILS ↗
                </span>
              </div>
            ))}
          </div>
        )}
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
        <div className="eyebrow"><b /> YOUR SHORTLIST</div>
        <h2>MY <em>KIT.</em></h2>
        <div className="kit-card">
          <div className="kit-gallery">
            {kitItems.length === 0 ? <p className="muted">Your saved equipment will show up here.</p> : kitItems.map((item) => <button className="kit-gallery-item" key={item.id} onClick={() => setSelectedProduct(item)}>
              <div className="kit-gallery-image"><EquipmentImage item={item} /></div>
              <span>{item.name}</span>
            </button>)}
          </div>
          <div className="kit-receipt">
            <div className="kit-receipt-heading"><span>LABLINK KIT</span><span>{kitItems.length} LINES</span></div>
            <div className="kit-receipt-list">
              {kitItems.map((item) => <div className="kit-receipt-row" key={item.id}>
                <div className="kit-receipt-name"><span>{item.name}</span><i /></div>
                <div className="kit-stepper"><button onClick={() => updateKitQuantity(item.id, -1)} aria-label={`Decrease ${item.name}`}>−</button><b>{kitQuantities[item.id] || 1}</b><button onClick={() => updateKitQuantity(item.id, 1)} aria-label={`Increase ${item.name}`}>+</button></div>
                <button className="kit-remove" onClick={() => toggleSave(item.id)} aria-label={`Remove ${item.name}`}>×</button>
              </div>)}
            </div>
            <div className="kit-total"><span>TOTAL ITEMS</span><strong>{kitItemCount}</strong></div>
            {kitTraining.length > 0 && <div className="kit-notice"><b>TRAINING REQUIRED</b><span>{kitTraining.join(" · ")}</span></div>}
            {kitMaintenance.length > 0 && <div className="kit-notice warning"><b>MAINTENANCE WARNING</b><span>{kitMaintenance.map((item) => item.name).join(" · ")} unavailable</span></div>}
            <button className="btn btn-dark full" disabled={kitItems.length === 0} onClick={() => setIsKitBookingOpen(true)}>REQUEST ALL ↗</button>
          </div>
        </div>
        <a className="text-link kit-keep-exploring" href="#catalog" onClick={() => setIsDrawerOpen(false)}>KEEP EXPLORING ↗</a>
      </aside>

      {isOrdersOpen && <div className="orders-backdrop" onClick={() => setIsOrdersOpen(false)}>
        <aside className="orders-panel" onClick={(event) => event.stopPropagation()}>
          <button className="close" onClick={() => setIsOrdersOpen(false)}>×</button>
          <div className="eyebrow"><b /> YOUR BOOKINGS</div>
          <h2>MY <em>ORDERS.</em></h2>
          {myOrders.length === 0 ? <p className="muted">Your booking requests will appear here.</p> : <div className="orders-list">{myOrders.map((order) => <div className="order-row" key={order.id}>
            <div><strong>{order.equipmentNames?.join(" · ") || order.equipmentIds.join(" · ")}</strong><span>{order.projectTitle}</span><small>{order.slotStart} · score {order.score || "pending"}</small></div>
            <b className={`order-status ${order.status}`}>{order.status.toUpperCase()}</b>
            {order.status === "approved" && order.decidedBy === "Availability Queue Balancer" && <button onClick={() => showToast("BOOKING CONFIRMED · SEE YOU IN THE LAB")}>CONFIRM</button>}
          </div>)}</div>}
        </aside>
      </div>}

      <div className={`modal-backdrop ${isKitBookingOpen ? "open" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setIsKitBookingOpen(false); }}>
        {isKitBookingOpen && <div className="modal kit-booking-modal">
          <button className="close" onClick={() => setIsKitBookingOpen(false)}>×</button>
          <div className="eyebrow"><b /> REQUEST ACCESS // FULL KIT</div>
          <h2>REQUEST YOUR <em>KIT.</em></h2>
          <p className="kit-booking-summary">{kitItemCount} item{kitItemCount === 1 ? "" : "s"} across {kitItems.length} instrument{kitItems.length === 1 ? "" : "s"}. The request will be reviewed as one allocation.</p>
          <form className="booking-form" onSubmit={handleBookingSubmit}>
            <label>PROJECT / COURSE TITLE</label>
            <input required placeholder="e.g. Autonomous Drone Low-Light Vision" value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} />
            <label>PROJECT CLASSIFICATION</label>
            <select value={projectClassification} onChange={(e) => setProjectClassification(e.target.value as typeof projectClassification)}>
              <option value="thesis">Thesis / Senior Capstone</option><option value="research">Faculty-Sponsored Research</option><option value="course">Course Assignment Lab</option><option value="club">Student Competition Club</option><option value="hobby">Exploratory / Independent</option>
            </select>
            <label>PREFERRED DATE (DEADLINE)</label>
            <input type="date" required value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
            <label>TIME SLOT</label>
            <select value={preferredSlot} onChange={(e) => setPreferredSlot(e.target.value)}><option>09:00 – 11:00</option><option>11:00 – 13:00</option><option>14:00 – 16:00</option><option>16:00 – 18:00</option></select>
            <label>RESEARCH JUSTIFICATION / ABSTRACT</label>
            <textarea required placeholder="Describe how this kit supports your project objectives..." value={projectReason} onChange={(e) => setProjectReason(e.target.value)} />
            <button className="btn btn-dark" type="submit">SUBMIT KIT REQUEST ↗</button>
          </form>
        </div>}
      </div>

      {/* PRODUCT DETAIL & ACCESS REQUEST MODAL */}
      <div
        className={`modal-backdrop ${selectedProduct ? "open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelectedProduct(null);
        }}
      >
        {selectedProduct && (() => {
          const isMaintenance = selectedProduct.status === "maintenance";
          const isCertified = hasRequiredTraining(currentStudent, selectedProduct);
          const requiredMod = getRequiredTrainingModule(selectedProduct);
          const isBlocked = isMaintenance || (!isCertified && Boolean(selectedProduct.trainingRequired));
          const isSelectedSaved = savedIds.includes(selectedProduct.id);

          return (
            <div className="modal">
              <button
                className="close"
                onClick={() => setSelectedProduct(null)}
              >
                ×
              </button>

              <div className="modal-layout">
                <div style={{ width: "100%", height: "390px", overflow: "hidden" }}>
                  <EquipmentImage item={selectedProduct} />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div className="eyebrow">
                      <b /> {selectedProduct.category.toUpperCase()} /{" "}
                      {selectedProduct.model || selectedProduct.id.toUpperCase()}
                    </div>
                    <button
                      onClick={() => toggleSave(selectedProduct.id)}
                      style={{
                        background: isSelectedSaved ? "var(--lime)" : "#f4f4ed",
                        border: "1px solid #c9cbc1",
                        padding: "4px 10px",
                        font: "9px 'DM Mono', monospace",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        letterSpacing: ".06em",
                      }}
                    >
                      {isSelectedSaved ? "♥ IN YOUR KIT" : "♡ SAVE TO KIT"}
                    </button>
                  </div>

                  <h2>{selectedProduct.name}</h2>
                  <div className="availability">
                    {selectedProduct.status.toUpperCase()}
                  </div>
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
                      <b>
                        {selectedProduct.lab} · {selectedProduct.building}
                      </b>
                    </div>
                    {selectedProduct.trainingRequired && (
                      <div>
                        <span>TRAINING REQUIRED</span>
                        <b
                          style={{
                            color: isCertified ? "#d7ff35" : "#e05252",
                            background: "#111",
                            padding: "2px 6px",
                          }}
                        >
                          {selectedProduct.trainingRequired.toUpperCase()}{" "}
                          {isCertified ? "(CERTIFIED ✓)" : "(MISSING ✕)"}
                        </b>
                      </div>
                    )}
                  </div>

                  {/* Booking Form connected to working logic */}
                  <form className="booking-form" onSubmit={handleBookingSubmit}>
                    <div className="eyebrow">
                      <b /> REQUEST ACCESS // AI PRIORITY QUEUE
                    </div>

                    {/* Blocking message if maintenance or missing certification */}
                    {isBlocked && (
                      <div
                        style={{
                          background: isMaintenance ? "#fbeaea" : "#fff8e6",
                          border: `1px solid ${isMaintenance ? "#e05252" : "#d4a017"}`,
                          color: isMaintenance ? "#a81d1d" : "#7d5a00",
                          padding: "12px 14px",
                          fontSize: "11px",
                          fontFamily: "'DM Mono', monospace",
                          margin: "14px 0",
                          lineHeight: 1.5,
                        }}
                      >
                        <strong style={{ display: "block", marginBottom: "4px" }}>
                          {isMaintenance
                            ? "⚠ BOOKING BLOCKED: SCHEDULED MAINTENANCE"
                            : "⚠ BOOKING BLOCKED: PREREQUISITE TRAINING MISSING"}
                        </strong>
                        {isMaintenance
                          ? `This instrument (${selectedProduct.name}) is currently undergoing scheduled maintenance and is unavailable for reservations.`
                          : `You are missing the required safety certification: "${requiredMod?.name || selectedProduct.trainingRequired}". Please complete the certification module in the safety portal before submitting an access request.`}
                      </div>
                    )}

                    <label>PROJECT / COURSE TITLE</label>
                    <input
                      required
                      placeholder="e.g. Autonomous Drone Low-Light Vision"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      disabled={isBlocked}
                    />

                    <label>PROJECT CLASSIFICATION</label>
                    <select
                      value={projectClassification}
                      onChange={(e) => setProjectClassification(e.target.value as any)}
                      disabled={isBlocked}
                    >
                      <option value="thesis">Thesis / Senior Capstone (Highest Weight)</option>
                      <option value="research">Faculty-Sponsored Research</option>
                      <option value="course">Course Assignment Lab</option>
                      <option value="club">Student Competition Club</option>
                      <option value="hobby">Exploratory / Independent</option>
                    </select>

                    <label>PREFERRED DATE (DEADLINE)</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().slice(0, 10)}
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      disabled={isBlocked}
                    />

                    <label>TIME SLOT</label>
                    <select
                      value={preferredSlot}
                      onChange={(e) => setPreferredSlot(e.target.value)}
                      disabled={isBlocked}
                    >
                      <option>09:00 – 11:00</option>
                      <option>11:00 – 13:00</option>
                      <option>14:00 – 16:00</option>
                      <option>16:00 – 18:00</option>
                    </select>

                    <label>RESEARCH JUSTIFICATION / ABSTRACT</label>
                    <textarea
                      required
                      placeholder="Describe how this cross-department instrument supports your project objectives..."
                      value={projectReason}
                      onChange={(e) => setProjectReason(e.target.value)}
                      disabled={isBlocked}
                    />

                    <button
                      className={`btn ${isBlocked ? "" : "btn-dark"}`}
                      type="submit"
                      disabled={isBlocked}
                      style={{
                        cursor: isBlocked ? "not-allowed" : "pointer",
                        background: isBlocked ? "#898c83" : "#111310",
                        color: "#fff",
                        opacity: isBlocked ? 0.75 : 1,
                      }}
                    >
                      {isMaintenance
                        ? "UNAVAILABLE · UNDER MAINTENANCE"
                        : !isCertified && selectedProduct.trainingRequired
                        ? `BLOCKED · ${selectedProduct.trainingRequired.toUpperCase()} REQUIRED`
                        : "SUBMIT ACCESS REQUEST ↗"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          );
        })()}
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

            <div className="availability-demo-controls">
              <span>AVAILABILITY DEMO</span>
              <select value={demoEquipmentId} onChange={(e) => setDemoEquipmentId(e.target.value)} aria-label="Demo equipment">
                {equipment.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
              </select>
              <button onClick={() => triggerAvailabilityEvent(demoEquipmentId, "cancelled")}>SIMULATE CANCELLATION</button>
              <button onClick={toggleDemoMaintenance}>{db.equipment.find((item) => item.id === demoEquipmentId)?.status === "maintenance" ? "CLEAR MAINTENANCE" : "SET MAINTENANCE"}</button>
            </div>

            {/* Quick Weight Tuner */}
            <div style={{ margin: "20px 0", padding: "14px", background: "white", border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ font: "10px 'DM Mono'", fontWeight: "bold" }}>
                  PRIORITY CRITERIA WEIGHT TUNER
                </span>
                <button
                  onClick={() => setShowWeightTuner(!showWeightTuner)}
                  style={{
                    font: "10px 'DM Mono'",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
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

            <div className="queue-toolbar">
              <div className="queue-toggle" role="tablist" aria-label="Queue grouping">
                <button className={queueView === "item" ? "active" : ""} onClick={() => setQueueView("item")} role="tab" aria-selected={queueView === "item"}>BY ITEM</button>
                <button className={queueView === "person" ? "active" : ""} onClick={() => setQueueView("person")} role="tab" aria-selected={queueView === "person"}>BY PERSON</button>
              </div>
              <input className="queue-search" value={queueSearch} onChange={(e) => setQueueSearch(e.target.value)} placeholder={queueView === "item" ? "Search equipment, lab, or student..." : "Search student or equipment..."} aria-label="Filter faculty queue" />
            </div>

            {/* Queue Split View */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "25px", marginTop: "20px" }}>
              {/* Left Column: Grouped Queue */}
              <div className="queue-groups-column">
                <span className="queue-column-label">{queueView === "item" ? "EQUIPMENT GROUPS" : "STUDENT GROUPS"} ({queueView === "item" ? queueItemGroups.length : queuePersonGroups.length})</span>
                {queueView === "item" ? queueItemGroups.map(({ equipment: item, requests }) => <div className="queue-group" key={item.id}>
                  <div className="queue-group-header"><div><strong>{item.name}</strong><span>{item.lab} · {item.status.toUpperCase()} · OWNER {item.ownerFacultyId}</span></div><b>{requests.length}</b></div>
                  {requests.map((req, index) => <div className={`queue-group-request ${activeQueueReq?.id === req.id ? "selected" : ""}`} key={req.id} onClick={() => setSelectedQueueReqId(req.id)}>
                    <div className="queue-request-top"><span>#{index + 1} · {req.studentName}</span><strong>{req.score || 0}</strong></div>
                    <div className="queue-request-meta"><span>{req.projectTitle}</span><em>{req.status.toUpperCase()}</em>{requests.length > 1 && <i>CONFLICT</i>}</div>
                    <div className="score-bar-bg"><div className="score-bar-fill" style={{ width: `${req.score || 0}%` }} /></div>
                    {renderQueueActions(req.id)}
                  </div>)}
                </div>) : queuePersonGroups.map(({ student, requests }) => <div className="queue-group" key={student?.id}>
                  <div className="queue-group-header"><div><strong>{student?.name}</strong><span>{student?.dept} · {student?.usageHoursLast30d}h / 30D · {student?.certs.length || 0} CERTS · {student?.noShows || 0} NO-SHOWS</span></div><b>{requests.length}</b></div>
                  {requests.map((req) => <div className={`queue-group-request ${activeQueueReq?.id === req.id ? "selected" : ""}`} key={req.id} onClick={() => setSelectedQueueReqId(req.id)}>
                    <div className="queue-request-top"><span>{req.projectTitle}</span><strong>{req.score || 0}</strong></div>
                    <div className="queue-request-meta"><span>{req.equipmentNames?.join(" · ") || req.equipmentIds.join(" · ")}</span><em>{req.status.toUpperCase()}</em></div>
                    <div className="score-bar-bg"><div className="score-bar-fill" style={{ width: `${req.score || 0}%` }} /></div>
                  </div>)}
                </div>)}
                {((queueView === "item" && queueItemGroups.length === 0) || (queueView === "person" && queuePersonGroups.length === 0)) && <p className="queue-empty">No queue entries match “{queueSearch}”.</p>}
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
                    <button
                      onClick={() => handleOverrideQueue(activeQueueReq.id)}
                      style={{ padding: "8px 14px", font: "9px 'DM Mono'", background: "#111", color: "#fff", border: "none", cursor: "pointer" }}
                    >
                      OVERRIDE
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
