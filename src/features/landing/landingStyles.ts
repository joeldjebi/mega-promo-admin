export const landingStyle = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

html { scroll-behavior: smooth; }

.lp-page {
  --lp-bg: #f8f8ff;
  --lp-card: #ffffff;
  --lp-border: #e4e2f4;
  --lp-accent: #5b4ae8;
  --lp-accent-light: #8b6fff;
  --lp-gold: #c0962a;
  --lp-success: #4caf7d;
  --lp-text: #171730;
  --lp-muted: #68668d;
  --lp-hint: #9a98b6;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(91, 74, 232, 0.16) 0%, transparent 68%),
    linear-gradient(180deg, #ffffff 0%, #f8f8ff 42%, #f3f2ff 100%),
    var(--lp-bg);
  color: var(--lp-text);
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.58;
  min-height: 100vh;
  overflow-x: hidden;
}

.lp-page * { box-sizing: border-box; }
.lp-page a { color: inherit; text-decoration: none; }

.lp-wrap {
  margin: 0 auto;
  max-width: 1200px;
  padding: 0 20px;
  width: 100%;
}

.lp-nav {
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.78);
  border-bottom: 1px solid var(--lp-border);
  left: 0;
  position: fixed;
  right: 0;
  top: 0;
  transition: background 220ms ease, box-shadow 220ms ease;
  z-index: 50;
}

.lp-nav.scrolled {
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 20px 60px rgba(91, 74, 232, 0.1);
}

.lp-nav-inner {
  align-items: center;
  display: flex;
  height: 64px;
  justify-content: space-between;
}

.lp-logo {
  align-items: center;
  display: inline-flex;
  font-size: 16px;
  font-weight: 800;
  gap: 9px;
}

.lp-logo img {
  background: #fff;
  border: 1px solid rgba(91, 74, 232, 0.12);
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(91, 74, 232, 0.12);
  height: 36px;
  object-fit: contain;
  padding: 5px;
  width: 36px;
}

.lp-logo strong { color: var(--lp-accent-light); }

.lp-menu {
  align-items: center;
  display: none;
  gap: 20px;
}

.lp-menu a {
  color: var(--lp-muted);
  font-size: 13px;
  font-weight: 600;
  transition: color 180ms ease;
}

.lp-menu a:hover { color: var(--lp-text); }

.lp-actions {
  align-items: center;
  display: flex;
  gap: 10px;
}

.lp-burger {
  background: var(--lp-card);
  border: 1px solid var(--lp-border);
  border-radius: 14px;
  color: var(--lp-text);
  cursor: pointer;
  display: grid;
  gap: 4px;
  height: 42px;
  padding: 10px;
  width: 42px;
}

.lp-burger span {
  background: var(--lp-text);
  border-radius: 999px;
  display: block;
  height: 2px;
}

.lp-mobile-menu {
  border-top: 1px solid var(--lp-border);
  display: grid;
  gap: 4px;
  max-height: 0;
  overflow: hidden;
  transition: max-height 240ms ease, padding 240ms ease;
}

.lp-mobile-menu.open {
  max-height: 360px;
  padding: 14px 0 20px;
}

.lp-mobile-menu a {
  border-radius: 14px;
  color: var(--lp-muted);
  font-weight: 650;
  padding: 12px 4px;
}

.lp-button {
  align-items: center;
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  font-size: 14px;
  font-weight: 750;
  gap: 8px;
  justify-content: center;
  min-height: 42px;
  padding: 0 17px;
  transition: transform 180ms ease, filter 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
  white-space: nowrap;
}

.lp-button:hover {
  filter: brightness(1.08);
  transform: translateY(-1px) scale(1.02);
}

.lp-button.primary {
  background: linear-gradient(135deg, var(--lp-accent), var(--lp-accent-light));
  box-shadow: 0 0 40px rgba(91, 74, 232, 0.18);
  color: white;
}

.lp-button.outline {
  background: rgba(255, 255, 255, 0.72);
  border-color: var(--lp-border);
  color: var(--lp-text);
}

.lp-button.light {
  background: white;
  color: var(--lp-accent);
}

.lp-section {
  padding: 58px 0;
  position: relative;
}

.lp-hero {
  min-height: auto;
  overflow: hidden;
  padding: 112px 0 58px;
}

.lp-hero-grid {
  align-items: center;
  display: grid;
  gap: 34px;
}

.lp-pill,
.lp-badge {
  align-items: center;
  background: rgba(91, 74, 232, 0.08);
  border: 1px solid rgba(139, 111, 255, 0.35);
  border-radius: 999px;
  color: var(--lp-accent-light);
  display: inline-flex;
  font-size: 12px;
  font-weight: 750;
  gap: 8px;
  padding: 6px 11px;
}

.lp-badge {
  font-size: 11px;
  font-weight: 800;
  margin-bottom: 10px;
  padding: 5px 9px;
}

.lp-hero h1,
.lp-section-head h2,
.lp-final h2 {
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 0.98;
}

.lp-hero h1 {
  font-size: clamp(38px, 8vw, 68px);
  margin: 18px 0 16px;
}

.lp-gradient-text {
  background: linear-gradient(135deg, var(--lp-accent), var(--lp-accent-light));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.lp-lead {
  color: #56547a;
  font-size: clamp(15px, 1.5vw, 18px);
  max-width: 600px;
}

.lp-hero-actions,
.lp-final-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 22px;
}

.lp-stats {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 24px;
  max-width: 600px;
}

.lp-stat,
.lp-card,
.lp-app-balance,
.lp-contest-card,
.lp-faq-item {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--lp-border);
}

.lp-stat {
  border-radius: 18px;
  padding: 12px;
}

.lp-stat strong {
  display: block;
  font-size: clamp(18px, 3vw, 25px);
  font-weight: 800;
}

.lp-stat span {
  color: var(--lp-muted);
  display: block;
  font-size: 12px;
  font-weight: 650;
  margin-top: 2px;
}

.lp-stars {
  inset: 0;
  pointer-events: none;
  position: absolute;
}

.lp-stars i {
  animation: lp-twinkle 3s ease-in-out infinite;
  background: rgba(91, 74, 232, 0.5);
  border-radius: 999px;
  height: 2px;
  position: absolute;
  width: 2px;
}

.lp-phone-wrap {
  display: none;
  justify-content: center;
}

.lp-phone {
  animation: lp-float 5s ease-in-out infinite;
  background: linear-gradient(180deg, #ffffff, #ecebff);
  border: 1px solid rgba(139, 111, 255, 0.22);
  border-radius: 38px;
  box-shadow:
    0 0 0 10px rgba(91, 74, 232, 0.05),
    0 30px 100px rgba(91, 74, 232, 0.22);
  height: 500px;
  padding: 13px;
  position: relative;
  width: 250px;
}

.lp-phone-screen {
  background:
    radial-gradient(circle at 50% 0%, rgba(91, 74, 232, 0.14), transparent 44%),
    #fbfbff;
  border: 1px solid rgba(91, 74, 232, 0.1);
  border-radius: 28px;
  height: 100%;
  overflow: hidden;
  padding: 15px;
}

.lp-phone-notch {
  background: #171730;
  border-radius: 999px;
  height: 20px;
  left: 50%;
  position: absolute;
  top: 19px;
  transform: translateX(-50%);
  width: 74px;
}

.lp-app-top {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
}

.lp-app-top strong { font-size: 15px; }

.lp-app-balance,
.lp-contest-card {
  border-radius: 20px;
  margin-top: 12px;
  padding: 12px;
}

.lp-app-balance small,
.lp-contest-card small {
  color: var(--lp-muted);
  display: block;
  font-size: 11px;
  font-weight: 700;
}

.lp-app-balance strong {
  color: var(--lp-gold);
  display: block;
  font-size: 21px;
  margin-top: 2px;
}

.lp-contest-card.featured {
  border-color: rgba(139, 111, 255, 0.42);
  box-shadow: 0 0 40px rgba(91, 74, 232, 0.15);
}

.lp-progress {
  background: #e8e6f7;
  border-radius: 999px;
  height: 8px;
  margin-top: 9px;
  overflow: hidden;
}

.lp-progress span {
  background: linear-gradient(90deg, var(--lp-accent), var(--lp-accent-light));
  display: block;
  height: 100%;
}

.lp-section-head {
  margin: 0 auto 24px;
  max-width: 660px;
  text-align: center;
}

.lp-section-head h2 {
  font-size: clamp(28px, 4.6vw, 44px);
  margin: 0;
}

.lp-section-head p {
  color: var(--lp-muted);
  font-size: 15px;
  margin: 10px auto 0;
}

.lp-grid {
  display: grid;
  gap: 14px;
}

.lp-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(250, 250, 255, 0.92));
  border-radius: 22px;
  padding: 18px;
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.lp-card:hover {
  border-color: rgba(139, 111, 255, 0.34);
  box-shadow: 0 24px 60px rgba(91, 74, 232, 0.12);
  transform: translateY(-4px);
}

.lp-card .icon {
  display: block;
  font-size: 28px;
  margin-bottom: 12px;
}

.lp-card h3 {
  color: var(--lp-text);
  font-size: 19px;
  margin: 0;
}

.lp-card p {
  color: #68668d;
  font-size: 14px;
  margin: 8px 0 0;
}

.lp-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin: 14px 0;
}

.lp-tags span {
  background: #f5f4ff;
  border: 1px solid var(--lp-border);
  border-radius: 999px;
  color: #56547a;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 9px;
}

.lp-game-card.quiz { --game-color: var(--lp-accent); }
.lp-game-card.draw { --game-color: var(--lp-gold); }
.lp-game-card.predict { --game-color: var(--lp-success); }
.lp-game-card { border-top: 3px solid var(--game-color); }

.lp-game-card a {
  color: var(--game-color);
  display: inline-flex;
  font-weight: 800;
  margin-top: 4px;
}

.lp-live-card { position: relative; }

.lp-live-card .lp-prize {
  color: var(--lp-gold);
  display: block;
  font-size: 17px;
  font-weight: 800;
  margin-top: 7px;
}

.lp-live-meta {
  align-items: center;
  color: var(--lp-muted);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: space-between;
  margin-top: 12px;
}

.lp-price-grid { align-items: stretch; }

.lp-price-card {
  display: flex;
  flex-direction: column;
}

.lp-price-card.featured {
  border-color: rgba(139, 111, 255, 0.55);
  box-shadow: 0 0 48px rgba(91, 74, 232, 0.22);
  position: relative;
}

.lp-price {
  display: block;
  font-size: 26px;
  font-weight: 800;
  margin: 10px 0 2px;
}

.lp-feature-list {
  display: grid;
  gap: 9px;
  list-style: none;
  margin: 18px 0;
  padding: 0;
}

.lp-feature-list li {
  color: #56547a;
  font-size: 14px;
  font-weight: 600;
}

.lp-partners {
  background:
    radial-gradient(circle at 50% 0%, rgba(91, 74, 232, 0.1), transparent 55%),
    #f1f0ff;
}

.lp-testimonial .avatar {
  background: linear-gradient(135deg, var(--lp-accent), var(--lp-accent-light));
  border-radius: 999px;
  display: grid;
  font-weight: 800;
  height: 40px;
  place-items: center;
  width: 40px;
}

.lp-stars-text {
  color: var(--lp-gold);
  letter-spacing: 2px;
  margin: 8px 0;
}

.lp-faq {
  margin: 0 auto;
  max-width: 800px;
}

.lp-faq-item {
  border-radius: 18px;
  margin-top: 9px;
  overflow: hidden;
}

.lp-faq-item button {
  align-items: center;
  background: transparent;
  border: 0;
  color: var(--lp-text);
  cursor: pointer;
  display: flex;
  font: inherit;
  font-size: 14px;
  font-weight: 750;
  justify-content: space-between;
  padding: 14px 16px;
  text-align: left;
  width: 100%;
}

.lp-faq-answer {
  color: #68668d;
  font-size: 14px;
  max-height: 0;
  overflow: hidden;
  padding: 0 16px;
  transition: max-height 260ms ease, padding 260ms ease;
}

.lp-faq-item.open .lp-faq-answer {
  max-height: 220px;
  padding: 0 16px 16px;
}

.lp-final {
  background:
    radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.38), transparent 55%),
    linear-gradient(135deg, rgba(91, 74, 232, 0.92), rgba(139, 111, 255, 0.9));
  border: 1px solid rgba(139, 111, 255, 0.35);
  border-radius: 28px;
  box-shadow: 0 0 70px rgba(91, 74, 232, 0.22);
  padding: 34px 18px;
  text-align: center;
}

.lp-final h2 {
  color: white;
  font-size: clamp(30px, 5vw, 50px);
  margin: 0;
}

.lp-final p {
  color: rgba(255, 255, 255, 0.86);
  font-size: 15px;
  margin: 12px auto 0;
  max-width: 660px;
}

.lp-store {
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  color: white;
  display: inline-flex;
  font-weight: 800;
  gap: 8px;
  margin-top: 16px;
  padding: 8px 14px;
}

.lp-final .lp-button.outline {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.42);
  color: white;
}

.lp-footer {
  border-top: 1px solid var(--lp-border);
  padding: 38px 0 22px;
}

.lp-footer-grid {
  display: grid;
  gap: 20px;
}

.lp-footer h4 { margin: 0 0 12px; }

.lp-footer a,
.lp-footer p {
  color: var(--lp-muted);
  display: block;
  margin: 8px 0 0;
}

.lp-socials {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.lp-socials span {
  background: var(--lp-card);
  border: 1px solid var(--lp-border);
  border-radius: 999px;
  display: grid;
  height: 36px;
  place-items: center;
  width: 36px;
}

.lp-bottom {
  border-top: 1px solid var(--lp-border);
  color: var(--lp-hint);
  font-size: 13px;
  margin-top: 24px;
  padding-top: 16px;
}

.lp-reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 650ms ease, transform 650ms ease;
}

.lp-reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

.lp-legal-page {
  background:
    radial-gradient(ellipse at 50% 0%, rgba(91, 74, 232, 0.14) 0%, transparent 62%),
    linear-gradient(180deg, #ffffff 0%, #f8f8ff 100%);
}

.lp-legal-shell {
  padding: 116px 0 58px;
}

.lp-legal-hero {
  margin: 0 auto;
  max-width: 820px;
  text-align: center;
}

.lp-legal-hero h1 {
  font-size: clamp(32px, 5vw, 58px);
  letter-spacing: 0;
  line-height: 0.98;
  margin: 18px 0 12px;
}

.lp-legal-hero p {
  color: var(--lp-muted);
  margin: 0 auto;
  max-width: 620px;
}

.lp-legal-card {
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid var(--lp-border);
  border-radius: 26px;
  box-shadow: 0 24px 70px rgba(91, 74, 232, 0.12);
  margin: 28px auto 0;
  max-width: 860px;
  padding: 28px;
}

.lp-legal-card p {
  color: var(--lp-muted);
  font-size: 15px;
  margin: 0;
}

.lp-legal-card p + p { margin-top: 16px; }

.lp-legal-links {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
}

.lp-legal-links a {
  background: white;
  border: 1px solid var(--lp-border);
  border-radius: 999px;
  color: var(--lp-accent);
  font-size: 13px;
  font-weight: 800;
  padding: 10px 14px;
}

@keyframes lp-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-14px); }
}

@keyframes lp-twinkle {
  0%, 100% { opacity: 0.2; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.7); }
}

@media (min-width: 768px) {
  .lp-hero-actions,
  .lp-final-actions {
    flex-direction: row;
    justify-content: flex-start;
  }

  .lp-final-actions { justify-content: center; }

  .lp-grid.two,
  .lp-price-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .lp-grid.three {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .lp-menu { display: flex; }
  .lp-burger { display: none; }

  .lp-hero-grid {
    grid-template-columns: minmax(0, 1.12fr) minmax(330px, 0.88fr);
  }

  .lp-phone-wrap { display: flex; }
  .lp-grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .lp-footer-grid { grid-template-columns: 1.2fr repeat(3, 1fr); }
}

@media (max-width: 767px) {
  .lp-nav .lp-actions .lp-button { display: none; }
  .lp-stats { grid-template-columns: 1fr; }
  .lp-section { padding: 44px 0; }
  .lp-hero { padding-top: 96px; }
  .lp-button { width: 100%; }
  .lp-legal-shell { padding-top: 96px; }
  .lp-legal-card { border-radius: 20px; padding: 20px; }
}
`
