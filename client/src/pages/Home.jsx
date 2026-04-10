import Navbar from "../components/navbar";
import Footer from "../components/Footer";
import { Link } from "react-router-dom";

function Home() {
  const homeGallery = [
    {
      src: "/gallery/showroom.png",
      alt: "Image of a vehicle showroom interior with cars and bikes on display",
    },
    {
      src: "/gallery/bike.png",
      alt: "Modern bike",
    },
    {
      src: "/gallery/car.png",
      alt: "Beautiful car",
    },
    {
      src: "/gallery/garage.png",
      alt: "A image of a garage",
    },
  ];

  const modules = [
    {
      title: "Vehicle Sales",
      description: "Track cars and bikes, stock, pricing, and showroom availability in one place.",
    },
    {
      title: "Bookings & Delivery",
      description: "Keep bookings, payment status, and delivery progress connected from start to finish.",
    },
    {
      title: "Customers & Employees",
      description: "Manage customer profiles, branch data, and staff records with cleaner workflows.",
    },
  ];

  const capabilities = [
    "Search showroom records quickly",
    "Monitor debit card payments",
    "Review repaired vehicle details",
    "Generate operational reports instantly",
  ];

  return (
    <div className="home-layout">
      <Navbar />
      <main className="home-page">
        <section className="hero-backdrop">
          <div className="hero-backdrop-orb hero-backdrop-orb-a" />
          <div className="hero-backdrop-orb hero-backdrop-orb-b" />
        </section>

        <section className="hero-panel">
          <div className="hero-copy">
            <span className="eyebrow">Vehicle Showroom Management</span>
            <h1>Manage the full showroom flow from inventory to revenue in one place.</h1>
            <p className="hero-text">
              AutoHub helps showroom teams manage inventory, customer records, staff, repaired vehicle notes,
              and card-based payment tracking without bouncing between disconnected tools.
            </p>

            <div className="hero-actions">
              <Link to="/login">
                <button className="primary-btn">Login</button>
              </Link>
              <Link to="/register">
                <button className="success-btn">Register</button>
              </Link>
            </div>

            <div className="hero-points">
              {capabilities.map((item) => (
                <div key={item} className="hero-point">
                  <span className="hero-point-dot" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-card-stack">
              <div className="hero-orb hero-orb-one" />
              <div className="hero-orb hero-orb-two" />
            </div>
            <div className="photo-collage home-collage">
              {homeGallery.map((item) => (
                <div key={item.src} className="photo-collage-item">
                  <img src={item.src} alt={item.alt} loading="lazy" />
                </div>
              ))}
            </div>
            <div className="hero-stats-card card">
              <p className="mini-label">Operations at a glance</p>
              <div className="hero-stat-grid">
                <div>
                  <strong>Cars + Bikes</strong>
                  <span>Unified inventory</span>
                </div>
                <div>
                  <strong>Bookings</strong>
                  <span>Pending to paid</span>
                </div>
                <div>
                  <strong>Deliveries</strong>
                  <span>Branch by branch</span>
                </div>
                <div>
                  <strong>Payments</strong>
                  <span>Debit card tracking</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="section-heading">
            <span className="eyebrow">Core Modules</span>
            <h2>Every operational area is connected, searchable, and easier to manage.</h2>
          </div>

          <div className="module-grid">
            {modules.map((module) => (
              <article key={module.title} className="module-card card">
                <h3>{module.title}</h3>
                <p>{module.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section-block split-cta">
          <div>
            <span className="eyebrow">Why AutoHub</span>
            <h2>Cleaner records, faster searches, and visibility that helps teams move faster.</h2>
            <p className="why-autohub-copy">
              The system is built to keep showroom activity connected: customer registration, booking flow,
              delivery status, repaired vehicle notes, employee records, and revenue reporting.
            </p>
          </div>

          <div className="cta-panel card">
            <h3>Start with a live dashboard</h3>
            <p>Log in to see vehicle counts, pending bookings, deliveries, and revenue tracking instantly.</p>
            <div className="hero-actions compact">
              <Link to="/dashboard">
                <button className="primary-btn">Open Dashboard</button>
              </Link>
              <Link to="/vehicles">
                <button className="ghost-btn">Browse Inventory</button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Home;