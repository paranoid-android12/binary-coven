import Head from "next/head";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "@/styles/Landing.module.css";

const BG_FRAMES = [
  "/assets/f0.png",
  "/assets/f1.png",
  "/assets/f2.png",
  "/assets/f3.png",
  "/assets/f4.png",
  "/assets/f5.png",
  "/assets/f6.png",
  "/assets/f7.png",
];

function AnimatedBackground() {
  const [frame, setFrame] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Preload all frames
    BG_FRAMES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % BG_FRAMES.length);
    }, 125); // ~8fps to match Phaser MainMenu

    return () => clearInterval(interval);
  }, []);

  return (
    <img
      ref={imgRef}
      src={BG_FRAMES[frame]}
      alt=""
      className={styles.heroBgImage}
      draggable={false}
    />
  );
}

const FEATURES: {
  icon: string;
  iconClass?: string;
  title: string;
  desc: string;
}[] = [
  {
    icon: "/Hoe.png",
    iconClass: "featureIconHoe",
    title: "Code to Farm",
    desc: "Write Python-inspired commands to control your character. Plant, harvest, and automate your farm through code.",
  },
  {
    icon: "/assets/wheat.png",
    title: "Visual Feedback",
    desc: "See your code come to life instantly. Every command you write has a visible result on your farm.",
  },
  {
    icon: "/drone_idle.png",
    iconClass: "featureIconDrone",
    title: "Quest-Based Learning",
    desc: "Progress through structured quests that teach variables, loops, conditionals, functions, and more.",
  },
  {
    icon: "/inventory.png",
    title: "Instructor Dashboard",
    desc: "Instructors can manage sessions, curate modules, and monitor student performance in real time.",
  },
];

const SCREENSHOTS = [
  "/assets/photo_2026-05-21_16-23-17.jpg",
  "/assets/photo_2026-05-21_16-23-55.jpg",
  "/assets/photo_2026-05-21_16-24-07.jpg",
];

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>Binary Coven - Code, Optimize, Conquer</title>
        <meta
          name="description"
          content="BinaryCoven is a game-based learning tool where students learn Python programming by controlling a farm through code."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/wheat.ico" />
      </Head>

      <div className={`${styles.page} ${styles.landingActive}`}>
        {/* ===== Navbar ===== */}
        <nav className={styles.nav}>
          <img
            src="/title.png"
            alt="Binary Coven"
            className={styles.navLogo}
          />
          <div className={styles.navLinks}>
            <a href="#about" className={styles.navLink}>
              About
            </a>
            <a href="#features" className={styles.navLink}>
              Features
            </a>
            <a href="#screenshots" className={styles.navLink}>
              Preview
            </a>
            <Link href="/menu" className={styles.playNavBtn}>
              Play Now
            </Link>
          </div>
        </nav>

        {/* ===== Hero ===== */}
        <section className={styles.hero}>
          <div className={styles.heroBg}>
            <AnimatedBackground />
          </div>
          <div className={styles.heroOverlay} />

          <div className={styles.heroContent}>
            <img
              src="/assets/QUBIT.png"
              alt="Binary Coven"
              className={styles.heroLogo}
            />
            <p className={styles.heroTagline}>
              Code, Optimize, Conquer - One Block at a Time
            </p>
            <div className={styles.heroButtons}>
              <Link href="/menu" className={styles.ctaButton}>
                Play Now
              </Link>
            </div>
          </div>

          {/* Decorative sprites */}
          <div className={styles.heroSprites}>
            <div className={styles.spriteQubit} />
            <div className={styles.spriteManu} />
            <img
              src="/drone_idle.png"
              alt=""
              className={styles.spriteDrone}
              draggable={false}
            />
          </div>

          <div className={styles.scrollIndicator}>
            <div className={styles.scrollArrow} />
          </div>
        </section>

        {/* ===== About ===== */}
        <section id="about" className={`${styles.section} ${styles.aboutSection}`}>
          <div className={styles.sectionInner}>
          <div className={styles.aboutGrid}>
            <div className={styles.aboutText}>
              <h2 className={styles.sectionTitle} style={{ textAlign: "left" }}>
                What is BinaryCoven?
              </h2>
              <p>
                BinaryCoven is a game-based learning platform where students
                learn introductory programming by managing a virtual farm.
                Instead of abstract exercises, you write real code to control
                an in-game character: planting crops, automating harvests,
                and solving challenges one command at a time.
              </p>
              <p>
                Built as a Progressive Web App, it runs right in your browser.
                Instructors can create sessions, assign quest-based modules,
                and track student progress through an integrated admin panel
                making it easy to bring coding into the classroom.
              </p>
            </div>
            <div className={styles.aboutImageWrap}>
              <img
                src="/assets/f0.png"
                alt="BinaryCoven farm map"
                className={styles.aboutImage}
              />
              <span className={styles.aboutBadge}>In-Game Map</span>
            </div>
          </div>
          </div>
        </section>

        {/* ===== Features ===== */}
        <section
          id="features"
          className={`${styles.section} ${styles.featuresSection}`}
        >
          <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <p className={styles.sectionSubtitle}>
            Learn programming fundamentals through hands-on gameplay. Every
            concept is tied to a farming mechanic you can see and interact with.
          </p>
          <div className={styles.featuresGrid}>
            {FEATURES.map((f) => (
              <div key={f.title} className={styles.featureCard}>
                {f.iconClass ? (
                  <div className={styles[f.iconClass]} />
                ) : (
                  <img src={f.icon} alt="" className={styles.featureIcon} />
                )}
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
          </div>
        </section>

        {/* ===== Screenshots ===== */}
        <section
          id="screenshots"
          className={`${styles.section} ${styles.screenshotsSection}`}
        >
          <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Game Preview</h2>
          <p className={styles.sectionSubtitle}>
            A peek at what awaits you inside BinaryCoven.
          </p>
          <div className={styles.screenshotsGrid}>
            {SCREENSHOTS.map((src, i) => (
              <div key={src} className={styles.screenshotCard}>
                <img
                  src={src}
                  alt={`BinaryCoven screenshot ${i + 1}`}
                  className={styles.screenshotImage}
                />
              </div>
            ))}
          </div>
          </div>
        </section>

        {/* ===== CTA Banner ===== */}
        <section className={styles.ctaBanner}>
          <h2 className={styles.ctaTitle}>Ready to Start Farming?</h2>
          <p className={styles.ctaText}>
            Jump in and write your first lines of code.
          </p>
          <Link href="/menu" className={styles.ctaButton}>
            Play Now
          </Link>
          <img
            src="/assets/wheat.png"
            alt=""
            className={styles.ctaDecoLeft}
            draggable={false}
          />
          <img
            src="/summer_crops.png"
            alt=""
            className={styles.ctaDecoRight}
            draggable={false}
          />
        </section>

        {/* ===== Footer ===== */}
        <footer className={styles.footer}>
          <img
            src="/title.png"
            alt="Binary Coven"
            className={styles.footerLogo}
          />
          <p className={styles.footerText}>
            BinaryCoven - A game-based learning tool for introductory
            programming.
            <br />
            Gordon College &bull; Computer Studies
          </p>
        </footer>
      </div>
    </>
  );
}
