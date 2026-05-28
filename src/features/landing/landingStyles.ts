export const landingStyle = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');

html { scroll-behavior: smooth; }

.lp-page {
  --lp-bg: #f8f8ff;
  --lp-card: #ffffff;
  --lp-border: #e4e2f4;
  --lp-accent: #5b4ae8;
  --lp-accent-light: #8b6fff;
  --lp-accent-soft: #f0edff;
  --lp-gold: #c0962a;
  --lp-success: #4caf7d;
  --lp-text: #171730;
  --lp-muted: #68668d;
  --lp-hint: #9a98b6;
  background: #f8f8ff;
  color: var(--lp-text);
  font-family: Montserrat, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.58;
  min-height: 100vh;
  overflow-x: hidden;
}

.lp-page * { box-sizing: border-box; }
.lp-page a { color: inherit; text-decoration: none; }
.lp-page h1,
.lp-page h2,
.lp-page h3,
.lp-page p,
.lp-page a,
.lp-page span,
.lp-page strong,
.lp-page small,
.lp-page button {
  overflow-wrap: anywhere;
}

.lp-wrap {
  margin: 0 auto;
  max-width: 1200px;
  padding: 0 20px;
  width: 100%;
}

.lp-nav {
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(228, 226, 244, 0.72);
  box-shadow: 0 10px 32px rgba(23, 23, 48, 0.06);
  left: 0;
  position: fixed;
  right: 0;
  top: 0;
  z-index: 50;
}

.lp-nav-inner {
  align-items: center;
  display: flex;
  min-height: 78px;
  justify-content: space-between;
}

.lp-logo {
  align-items: center;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(228, 226, 244, 0.82);
  border-radius: 18px;
  display: inline-flex;
  font-size: 16px;
  font-weight: 800;
  gap: 9px;
  padding: 6px 10px 6px 6px;
}

.lp-logo img {
  background: #fff;
  border: 1px solid rgba(91, 74, 232, 0.12);
  border-radius: 14px;
  box-shadow: 0 10px 24px rgba(91, 74, 232, 0.1);
  height: 38px;
  object-fit: contain;
  padding: 5px;
  width: 38px;
}

.lp-logo strong { color: var(--lp-accent); }

.lp-header-logo {
  background: transparent;
  border: 0;
  border-radius: 22px;
  padding: 4px;
}

.lp-header-logo img {
  background: transparent;
  border: 0;
  box-shadow: none;
  border-radius: 17px;
  height: 78px;
  padding: 4px;
  width: 78px;
}

.lp-menu {
  align-items: center;
  display: none;
  gap: 6px;
  min-width: 0;
}

.lp-menu a {
  color: var(--lp-muted);
  font-size: 13px;
  font-weight: 600;
  border-radius: 999px;
  padding: 9px 11px;
  transition: color 180ms ease;
}

.lp-menu a:hover {
  background: var(--lp-accent-soft);
  color: var(--lp-accent);
}

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
  background: var(--lp-accent);
  box-shadow: 0 18px 44px rgba(91, 74, 232, 0.2);
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
  padding: 120px 0 62px;
  position: relative;
}

.lp-hero::before {
  background: #f0edff;
  border: 1px solid rgba(91, 74, 232, 0.1);
  border-radius: 999px;
  content: '';
  height: 520px;
  pointer-events: none;
  position: absolute;
  right: max(-170px, calc((100vw - 1200px) / 2 - 190px));
  top: 118px;
  width: 520px;
}

.lp-hero-grid {
  align-items: center;
  display: grid;
  gap: 46px;
  position: relative;
  z-index: 1;
}

.lp-hero-grid > .lp-reveal:first-child {
  opacity: 1;
  transform: none;
  transition: none;
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
  min-height: calc(clamp(38px, 8vw, 68px) * 2.08);
}

.lp-gradient-text {
  color: var(--lp-accent);
}

.lp-typing-title {
  max-width: 780px;
}

.lp-typewriter-line {
  align-items: center;
  background: #ffffff;
  border: 1px solid rgba(91, 74, 232, 0.16);
  border-radius: 24px;
  box-shadow: 0 14px 34px rgba(23, 23, 48, 0.06);
  color: var(--lp-accent);
  display: inline-flex;
  font-weight: 900;
  line-height: 1.08;
  margin-top: 10px;
  min-height: 1.04em;
  padding: 6px 12px;
}

.lp-typewriter-text {
  display: inline-block;
  min-width: min(72vw, 12.5em);
  white-space: nowrap;
}

.lp-typewriter-line i {
  animation: lp-caret-blink 850ms steps(1) infinite;
  background: var(--lp-accent);
  border-radius: 999px;
  display: inline-block;
  height: 0.82em;
  margin-left: 8px;
  width: 5px;
}

.lp-lead {
  color: #56547a;
  font-size: clamp(15px, 1.5vw, 18px);
  max-width: 600px;
  min-height: 3.2em;
}

.lp-hero-proof {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.lp-hero-proof span {
  background: #ffffff;
  border: 1px solid rgba(91, 74, 232, 0.16);
  border-radius: 999px;
  box-shadow: 0 12px 28px rgba(23, 23, 48, 0.05);
  color: var(--lp-accent);
  font-size: 12px;
  font-weight: 850;
  padding: 8px 11px;
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
  min-height: 82px;
  padding: 12px;
}

.lp-stat strong {
  display: block;
  font-size: clamp(18px, 3vw, 25px);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
  min-height: 30px;
  white-space: nowrap;
}

.lp-stat span {
  color: var(--lp-muted);
  display: block;
  font-size: 12px;
  font-weight: 650;
  margin-top: 2px;
}

.lp-stars {
  display: none;
}

.lp-stars i {
  display: none;
}

.lp-phone-wrap {
  display: none;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.lp-phone-mockup {
  display: block;
  height: auto;
  max-height: 680px;
  max-width: min(500px, 100%);
  object-fit: contain;
  width: 100%;
}

.lp-progress {
  background: #e8e6f7;
  border-radius: 999px;
  height: 8px;
  margin-top: 9px;
  overflow: hidden;
}

.lp-progress span {
  background: var(--lp-accent);
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
  background: rgba(255, 255, 255, 0.96);
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

.lp-process-section {
  background: #ffffff;
}

.lp-process-layout {
  align-items: start;
  display: grid;
  gap: 22px;
}

.lp-process-copy {
  background: var(--lp-accent);
  border-radius: 32px;
  box-shadow: 0 28px 80px rgba(91, 74, 232, 0.2);
  color: white;
  overflow: hidden;
  padding: 28px;
  position: relative;
}

.lp-process-copy::after {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  bottom: -90px;
  content: '';
  height: 210px;
  position: absolute;
  right: -80px;
  width: 210px;
}

.lp-process-copy .lp-pill {
  background: rgba(255, 255, 255, 0.16);
  border-color: rgba(255, 255, 255, 0.28);
  color: white;
}

.lp-process-copy h2 {
  font-size: clamp(34px, 5vw, 54px);
  letter-spacing: -0.5px;
  line-height: 0.98;
  margin: 22px 0 12px;
  max-width: 420px;
}

.lp-process-copy p {
  color: rgba(255, 255, 255, 0.84);
  font-size: 16px;
  margin: 0;
  max-width: 430px;
}

.lp-process-proof {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 24px;
  position: relative;
  z-index: 1;
}

.lp-process-proof span {
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  color: white;
  font-size: 12px;
  font-weight: 850;
  padding: 8px 11px;
}

.lp-steps-timeline {
  display: grid;
  gap: 14px;
  position: relative;
}

.lp-steps-timeline::before {
  background: #dedaf8;
  bottom: 20px;
  content: '';
  left: 26px;
  position: absolute;
  top: 20px;
  width: 2px;
}

.lp-step-card {
  align-items: start;
  background: #ffffff;
  border: 1px solid var(--lp-border);
  border-radius: 26px;
  box-shadow: 0 18px 54px rgba(23, 23, 48, 0.06);
  display: grid;
  gap: 14px;
  grid-template-columns: 54px minmax(0, 1fr);
  min-height: 150px;
  padding: 18px;
  position: relative;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.lp-step-body {
  min-width: 0;
  padding-right: 64px;
}

.lp-step-number {
  align-items: center;
  background: var(--lp-accent);
  border-radius: 18px;
  color: white;
  display: flex;
  font-size: 15px;
  font-weight: 950;
  height: 54px;
  justify-content: center;
  width: 54px;
}

.lp-step-icon {
  align-items: center;
  background: var(--lp-accent-soft);
  border: 1px solid rgba(91, 74, 232, 0.14);
  border-radius: 16px;
  display: flex;
  font-size: 24px;
  height: 46px;
  justify-content: center;
  position: absolute;
  right: 18px;
  top: 18px;
  transition: transform 180ms ease;
  width: 46px;
}

.lp-step-kicker {
  color: var(--lp-accent);
  display: block;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.08em;
  margin-bottom: 7px;
  text-transform: uppercase;
}

.lp-step-card h3,
.lp-participation-card h3 {
  color: var(--lp-text);
  line-height: 1.12;
  margin: 0;
}

.lp-step-card h3 {
  font-size: 21px;
  line-height: 1.18;
}

.lp-step-card p,
.lp-participation-card p {
  color: var(--lp-muted);
  font-size: 14px;
  line-height: 1.55;
  margin: 10px 0 0;
}

.lp-step-card:hover {
  border-color: rgba(91, 74, 232, 0.32);
  box-shadow: 0 28px 70px rgba(91, 74, 232, 0.12);
  transform: translateX(8px);
}

.lp-step-card:hover .lp-step-icon {
  transform: rotate(-4deg) scale(1.06);
}

.lp-showcase-section {
  background: #f8f8ff;
}

.lp-participation-grid {
  display: grid;
  gap: 16px;
}

.lp-participation-card {
  background: #ffffff;
  border: 1px solid var(--lp-border);
  border-radius: 28px;
  box-shadow: 0 18px 54px rgba(23, 23, 48, 0.06);
  display: flex;
  flex-direction: column;
  min-height: 220px;
  overflow: hidden;
  padding: 22px;
  position: relative;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.lp-participation-card::after {
  background: var(--lp-accent-soft);
  border-radius: 999px;
  content: '';
  height: 130px;
  position: absolute;
  right: -54px;
  top: -56px;
  width: 130px;
}

.lp-participation-card > * {
  position: relative;
  z-index: 1;
}

.lp-feature-icon {
  align-items: center;
  background: var(--lp-accent-soft);
  border: 1px solid rgba(91, 74, 232, 0.14);
  border-radius: 22px;
  display: flex;
  font-size: 30px;
  height: 64px;
  justify-content: center;
  margin-bottom: 18px;
  transition: transform 180ms ease;
  width: 64px;
}

.lp-participation-card h3 {
  font-size: 21px;
}

.lp-participation-card:hover {
  border-color: rgba(91, 74, 232, 0.32);
  box-shadow: 0 28px 70px rgba(91, 74, 232, 0.12);
  transform: translateY(-5px);
}

.lp-participation-card:hover .lp-feature-icon {
  transform: scale(1.06);
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
.lp-game-card {
  border-top: 4px solid var(--game-color);
}

.lp-feature-link {
  align-items: center;
  color: var(--game-color);
  display: inline-flex;
  font-weight: 800;
  margin-top: auto;
  padding-top: 14px;
}

.lp-feature-link::after {
  content: '→';
  margin-left: 7px;
  transition: transform 180ms ease;
}

.lp-participation-card:hover .lp-feature-link::after {
  transform: translateX(4px);
}

.lp-campaigns-section {
  background: #ffffff;
}

.lp-campaigns-shell {
  background: #f8f8ff;
  border: 1px solid var(--lp-border);
  border-radius: 34px;
  padding: 18px;
}

.lp-campaign-grid {
  display: grid;
  gap: 16px;
}

.lp-campaign-card {
  background: white;
  border: 1px solid var(--lp-border);
  border-radius: 28px;
  box-shadow: 0 18px 54px rgba(23, 23, 48, 0.06);
  display: flex;
  flex-direction: column;
  min-height: 330px;
  overflow: hidden;
  padding: 22px;
  position: relative;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.lp-campaign-card::after {
  background: var(--lp-accent-soft);
  border-radius: 999px;
  content: '';
  height: 150px;
  position: absolute;
  right: -70px;
  top: -72px;
  width: 150px;
}

.lp-campaign-card > * {
  position: relative;
  z-index: 1;
}

.lp-campaign-card.featured {
  border-color: rgba(91, 74, 232, 0.46);
  box-shadow: 0 30px 78px rgba(91, 74, 232, 0.16);
}

.lp-campaign-card:hover {
  border-color: rgba(91, 74, 232, 0.32);
  box-shadow: 0 28px 70px rgba(91, 74, 232, 0.12);
  transform: translateY(-5px);
}

.lp-campaign-top {
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: space-between;
  min-height: 32px;
}

.lp-campaign-top span,
.lp-campaign-top strong {
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.04em;
  padding: 8px 10px;
  text-transform: uppercase;
}

.lp-campaign-top span {
  background: var(--lp-accent);
  color: white;
}

.lp-campaign-top strong {
  background: #f4f3ff;
  color: var(--lp-accent);
}

.lp-campaign-icon {
  align-items: center;
  background: var(--lp-accent-soft);
  border: 1px solid rgba(91, 74, 232, 0.14);
  border-radius: 22px;
  display: flex;
  font-size: 30px;
  height: 62px;
  justify-content: center;
  margin: 22px 0 18px;
  width: 62px;
}

.lp-campaign-card h3 {
  color: var(--lp-text);
  font-size: 23px;
  line-height: 1.12;
  margin: 0;
}

.lp-campaign-card .lp-prize {
  color: var(--lp-gold);
  display: block;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.2;
  margin-top: 10px;
}

.lp-live-meta {
  align-items: center;
  color: var(--lp-muted);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 18px;
}

.lp-campaign-card .lp-progress {
  margin-top: 12px;
}

.lp-campaign-card .lp-button {
  margin-top: 16px;
}

.lp-campaign-proof,
.lp-centered-action {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  justify-content: center;
}

.lp-campaign-proof {
  color: #56547a;
  font-size: 13px;
  font-weight: 850;
  padding: 18px 4px 2px;
}

.lp-campaign-proof span {
  background: white;
  border: 1px solid var(--lp-border);
  border-radius: 999px;
  padding: 8px 12px;
}

.lp-centered-action {
  margin-top: 20px;
}

.lp-plans-section {
  background: #ffffff;
}

.lp-plans-head {
  margin: 0 auto 26px;
  max-width: 720px;
  text-align: center;
}

.lp-plans-head h2 {
  font-size: clamp(32px, 5vw, 52px);
  letter-spacing: -0.5px;
  line-height: 0.98;
  margin: 18px 0 12px;
}

.lp-plans-head p {
  color: var(--lp-muted);
  font-size: 16px;
  margin: 0 auto;
  max-width: 620px;
}

.lp-plans-shell {
  background: #f8f8ff;
  border: 1px solid var(--lp-border);
  border-radius: 34px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.88);
  padding: 18px;
}

.lp-price-grid {
  align-items: stretch;
  display: grid;
  gap: 18px;
}

.lp-price-card {
  background: white;
  border: 1px solid var(--lp-border);
  border-radius: 28px;
  box-shadow: 0 18px 54px rgba(23, 23, 48, 0.06);
  display: flex;
  flex-direction: column;
  min-height: 456px;
  overflow: hidden;
  padding: 22px;
  position: relative;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.lp-price-card::before {
  background: var(--lp-accent);
  border-radius: 0 0 999px 999px;
  content: '';
  height: 5px;
  left: 22px;
  position: absolute;
  right: 22px;
  top: 0;
}

.lp-price-card.featured {
  border-color: rgba(91, 74, 232, 0.48);
  box-shadow: 0 30px 78px rgba(91, 74, 232, 0.18);
  transform: translateY(-8px);
}

.lp-price-card:hover {
  border-color: rgba(91, 74, 232, 0.32);
  box-shadow: 0 28px 70px rgba(91, 74, 232, 0.12);
  transform: translateY(-5px);
}

.lp-price-card.featured:hover {
  transform: translateY(-12px);
}

.lp-price-topline {
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: space-between;
  margin: 8px 0 18px;
  min-height: 28px;
}

.lp-price-topline span,
.lp-price-topline strong {
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.06em;
  padding: 8px 11px;
  text-transform: uppercase;
}

.lp-price-topline span {
  background: #f4f3ff;
  color: var(--lp-accent);
}

.lp-price-topline strong {
  background: var(--lp-accent);
  color: white;
}

.lp-price-card-head {
  min-height: 100px;
}

.lp-price-card h3 {
  color: var(--lp-text);
  font-size: 27px;
  line-height: 1.08;
  margin: 0;
}

.lp-price-card p {
  color: var(--lp-muted);
  font-size: 14px;
  line-height: 1.5;
  margin: 10px 0 0;
}

.lp-price-box {
  background: #f7f7ff;
  border: 1px solid rgba(91, 74, 232, 0.12);
  border-radius: 22px;
  margin: 6px 0 18px;
  padding: 16px;
}

.lp-price {
  color: var(--lp-text);
  display: block;
  font-size: clamp(28px, 4vw, 38px);
  font-weight: 900;
  letter-spacing: -0.4px;
  line-height: 1.05;
  margin: 0;
}

.lp-price-box small {
  color: var(--lp-muted);
  display: block;
  font-size: 12px;
  font-weight: 750;
  margin-top: 8px;
}

.lp-feature-list {
  display: grid;
  gap: 9px;
  list-style: none;
  margin: 0 0 24px;
  padding: 0;
}

.lp-feature-list li {
  align-items: flex-start;
  color: #56547a;
  display: flex;
  font-size: 14px;
  font-weight: 650;
  gap: 9px;
  line-height: 1.35;
}

.lp-feature-list li span {
  align-items: center;
  background: rgba(31, 180, 122, 0.12);
  border-radius: 999px;
  color: #0e9f6e;
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 950;
  height: 20px;
  justify-content: center;
  margin-top: -1px;
  width: 20px;
}

.lp-feature-list li.disabled {
  color: #9996aa;
}

.lp-feature-list li.disabled span {
  background: #f0eff6;
  color: #9b97aa;
}

.lp-price-card .lp-button {
  margin-top: auto;
}

.lp-plans-note {
  align-items: center;
  color: #56547a;
  display: flex;
  flex-wrap: wrap;
  font-size: 13px;
  font-weight: 850;
  gap: 9px;
  justify-content: center;
  padding: 18px 4px 2px;
}

.lp-plans-note span {
  background: white;
  border: 1px solid var(--lp-border);
  border-radius: 999px;
  padding: 8px 12px;
}

.lp-partners {
  background: #f1f0ff;
}

.lp-partner-shell {
  display: grid;
  gap: 16px;
}

.lp-partner-intro {
  background: var(--lp-accent);
  border-radius: 34px;
  box-shadow: 0 28px 80px rgba(91, 74, 232, 0.2);
  color: white;
  padding: 28px;
}

.lp-partner-intro .lp-pill {
  background: rgba(255, 255, 255, 0.16);
  border-color: rgba(255, 255, 255, 0.28);
  color: white;
}

.lp-partner-intro h2 {
  font-size: clamp(34px, 5vw, 56px);
  letter-spacing: -0.5px;
  line-height: 0.98;
  margin: 22px 0 12px;
}

.lp-partner-intro p {
  color: rgba(255, 255, 255, 0.84);
  font-size: 16px;
  margin: 0 0 22px;
  max-width: 620px;
}

.lp-partner-benefits,
.lp-partner-plans {
  display: grid;
  gap: 12px;
}

.lp-partner-benefit,
.lp-partner-plan {
  background: white;
  border: 1px solid var(--lp-border);
  box-shadow: 0 18px 54px rgba(23, 23, 48, 0.06);
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.lp-partner-benefit {
  align-items: start;
  border-radius: 24px;
  display: grid;
  gap: 14px;
  grid-template-columns: 54px minmax(0, 1fr);
  padding: 18px;
}

.lp-partner-benefit > span {
  align-items: center;
  background: var(--lp-accent-soft);
  border-radius: 18px;
  display: flex;
  font-size: 25px;
  height: 54px;
  justify-content: center;
  width: 54px;
}

.lp-partner-benefit h3,
.lp-partner-plan h3 {
  color: var(--lp-text);
  font-size: 18px;
  margin: 0;
}

.lp-partner-benefit p {
  color: var(--lp-muted);
  font-size: 14px;
  margin: 8px 0 0;
}

.lp-partner-plan {
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  min-height: 360px;
  overflow: hidden;
  padding: 20px;
  position: relative;
}

.lp-partner-plan::before {
  background: var(--lp-accent);
  content: '';
  height: 4px;
  left: 18px;
  position: absolute;
  right: 18px;
  top: 0;
}

.lp-partner-plan.featured {
  border-color: rgba(91, 74, 232, 0.46);
  box-shadow: 0 30px 78px rgba(91, 74, 232, 0.16);
}

.lp-partner-plan-top {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  margin: 8px 0 16px;
  min-height: 28px;
}

.lp-partner-plan-top span,
.lp-partner-plan-top strong {
  border-radius: 999px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.06em;
  padding: 7px 9px;
  text-transform: uppercase;
}

.lp-partner-plan-top span {
  background: #f4f3ff;
  color: var(--lp-accent);
}

.lp-partner-plan-top strong {
  background: var(--lp-accent);
  color: white;
}

.lp-partner-price-box {
  background: #f7f7ff;
  border: 1px solid rgba(91, 74, 232, 0.12);
  border-radius: 20px;
  margin: 16px 0;
  padding: 14px;
}

.lp-partner-price-box small {
  color: var(--lp-muted);
  display: block;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.04em;
  margin-bottom: 5px;
  text-transform: uppercase;
}

.lp-partner-plan .lp-price {
  font-size: clamp(22px, 2.4vw, 30px);
}

.lp-partner-feature-list {
  margin-bottom: 22px;
}

.lp-partner-plan .lp-button {
  margin-top: auto;
}

.lp-partner-benefit:hover,
.lp-partner-plan:hover {
  border-color: rgba(91, 74, 232, 0.32);
  box-shadow: 0 28px 70px rgba(91, 74, 232, 0.12);
  transform: translateY(-4px);
}

.lp-testimonials-section {
  background: #f8f8ff;
}

.lp-testimonial-grid {
  display: grid;
  gap: 16px;
}

.lp-testimonial-card {
  background: white;
  border: 1px solid var(--lp-border);
  border-radius: 28px;
  box-shadow: 0 18px 54px rgba(23, 23, 48, 0.06);
  display: flex;
  flex-direction: column;
  min-height: 220px;
  padding: 22px;
  position: relative;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.lp-testimonial-card.featured {
  background: var(--lp-accent);
  border-color: rgba(91, 74, 232, 0.36);
  box-shadow: 0 30px 78px rgba(91, 74, 232, 0.18);
  color: white;
}

.lp-testimonial-card:hover {
  border-color: rgba(91, 74, 232, 0.32);
  box-shadow: 0 28px 70px rgba(91, 74, 232, 0.12);
  transform: translateY(-5px);
}

.lp-testimonial-head {
  align-items: center;
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
}

.lp-testimonial-card .avatar {
  background: var(--lp-accent);
  border-radius: 999px;
  color: white;
  display: grid;
  font-weight: 800;
  height: 48px;
  place-items: center;
  width: 48px;
}

.lp-testimonial-card.featured .avatar {
  background: rgba(255, 255, 255, 0.18);
}

.lp-testimonial-card h3 {
  color: var(--lp-text);
  font-size: 18px;
  margin: 0;
}

.lp-testimonial-card.featured h3,
.lp-testimonial-card.featured p {
  color: white;
}

.lp-testimonial-card p {
  color: var(--lp-muted);
  font-size: 15px;
  line-height: 1.58;
  margin: 0;
}

.lp-stars-text {
  color: var(--lp-gold);
  font-size: 12px;
  letter-spacing: 2px;
  margin-top: 4px;
}

.lp-testimonial-card.featured .lp-stars-text {
  color: #ffe39a;
}

.lp-faq-section {
  background: #ffffff;
}

.lp-faq-layout {
  align-items: start;
  display: grid;
  gap: 20px;
}

.lp-faq-copy {
  background: #f8f8ff;
  border: 1px solid var(--lp-border);
  border-radius: 32px;
  box-shadow: 0 18px 54px rgba(23, 23, 48, 0.06);
  padding: 26px;
}

.lp-faq-copy h2 {
  font-size: clamp(32px, 5vw, 52px);
  letter-spacing: -0.5px;
  line-height: 0.98;
  margin: 20px 0 12px;
}

.lp-faq-copy p {
  color: var(--lp-muted);
  font-size: 16px;
  margin: 0 0 22px;
  max-width: 520px;
}

.lp-faq {
  display: grid;
  gap: 10px;
  margin: 0;
  max-width: none;
}

.lp-faq-item {
  background: white;
  border: 1px solid var(--lp-border);
  border-radius: 22px;
  box-shadow: 0 14px 38px rgba(23, 23, 48, 0.05);
  margin-top: 0;
  overflow: hidden;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.lp-faq-item.open {
  border-color: rgba(91, 74, 232, 0.34);
  box-shadow: 0 22px 54px rgba(91, 74, 232, 0.1);
}

.lp-faq-item button {
  align-items: center;
  background: transparent;
  border: 0;
  color: var(--lp-text);
  cursor: pointer;
  display: flex;
  font: inherit;
  font-size: 15px;
  font-weight: 850;
  gap: 16px;
  justify-content: space-between;
  padding: 18px 20px;
  text-align: left;
  width: 100%;
}

.lp-faq-item button span:last-child {
  align-items: center;
  background: var(--lp-accent-soft);
  border-radius: 999px;
  color: var(--lp-accent);
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 20px;
  font-weight: 700;
  height: 34px;
  justify-content: center;
  width: 34px;
}

.lp-faq-answer {
  color: #68668d;
  font-size: 15px;
  line-height: 1.55;
  max-height: 0;
  overflow: hidden;
  padding: 0 20px;
  transition: max-height 260ms ease, padding 260ms ease;
}

.lp-faq-item.open .lp-faq-answer {
  max-height: 220px;
  padding: 0 20px 20px;
}

.lp-contact-section {
  background: #f8f8ff;
}

.lp-contact-grid {
  align-items: stretch;
  display: grid;
  gap: 20px;
}

.lp-contact-copy,
.lp-contact-form {
  background: white;
  border: 1px solid var(--lp-border);
  border-radius: 28px;
  box-shadow: 0 18px 54px rgba(23, 23, 48, 0.06);
  padding: 24px;
}

.lp-contact-copy {
  overflow: hidden;
  position: relative;
}

.lp-contact-copy::after {
  background: var(--lp-accent-soft);
  border-radius: 999px;
  content: '';
  height: 190px;
  position: absolute;
  right: -82px;
  top: -84px;
  width: 190px;
}

.lp-contact-copy > * {
  position: relative;
  z-index: 1;
}

.lp-contact-copy h2 {
  font-size: clamp(30px, 5vw, 48px);
  line-height: 1;
  margin: 0 0 10px;
}

.lp-contact-copy p {
  color: var(--lp-muted);
  margin: 0;
  max-width: 620px;
}

.lp-support-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 20px;
}

.lp-support-grid span {
  background: #f7f7ff;
  border: 1px solid rgba(91, 74, 232, 0.12);
  border-radius: 18px;
  padding: 13px;
}

.lp-support-grid strong {
  color: var(--lp-accent);
  display: block;
  font-size: 20px;
  line-height: 1;
}

.lp-support-grid small {
  color: var(--lp-muted);
  display: block;
  font-size: 11px;
  font-weight: 800;
  margin-top: 6px;
}

.lp-whatsapp-card {
  align-items: center;
  background: #18a95b;
  border-radius: 22px;
  box-shadow: 0 18px 42px rgba(32, 199, 104, 0.26);
  color: white;
  display: flex;
  gap: 12px;
  margin-top: 18px;
  padding: 16px;
}

.lp-whatsapp-card strong {
  display: block;
  font-size: 16px;
}

.lp-whatsapp-card small {
  color: rgba(255, 255, 255, 0.82);
  display: block;
  margin-top: 3px;
}

.lp-whatsapp-icon {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  display: grid;
  flex: 0 0 44px;
  height: 44px;
  place-items: center;
  width: 44px;
}

.lp-whatsapp-icon svg {
  display: block;
  fill: white;
  height: 26px;
  width: 26px;
}

.lp-contact-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.lp-contact-meta span {
  background: #f7f7ff;
  border: 1px solid rgba(91, 74, 232, 0.12);
  border-radius: 999px;
  color: var(--lp-muted);
  font-size: 12px;
  font-weight: 800;
  padding: 8px 11px;
}

.lp-contact-form {
  display: grid;
  gap: 12px;
}

.lp-form-row {
  display: grid;
  gap: 12px;
}

.lp-contact-form label {
  display: grid;
  gap: 6px;
}

.lp-contact-form label span {
  color: var(--lp-muted);
  font-size: 12px;
  font-weight: 800;
}

.lp-contact-form input,
.lp-contact-form textarea {
  background: white;
  border: 1px solid var(--lp-border);
  border-radius: 14px;
  color: var(--lp-text);
  font: inherit;
  font-size: 14px;
  outline: none;
  padding: 12px 13px;
  resize: vertical;
}

.lp-contact-form input:focus,
.lp-contact-form textarea:focus {
  border-color: var(--lp-accent-light);
  box-shadow: 0 0 0 3px rgba(139, 111, 255, 0.14);
}

.lp-contact-form .lp-button {
  width: 100%;
}

.lp-form-success,
.lp-form-error {
  border-radius: 14px;
  font-size: 13px;
  font-weight: 750;
  margin: 0;
  padding: 10px 12px;
}

.lp-form-success {
  background: rgba(63, 196, 147, 0.12);
  color: #207a58;
}

.lp-form-error {
  background: rgba(255, 90, 95, 0.12);
  color: #b82d35;
}

.lp-download-section {
  background: #ffffff;
}

.lp-final {
  background: var(--lp-accent);
  border: 1px solid rgba(139, 111, 255, 0.35);
  border-radius: 34px;
  box-shadow: 0 0 70px rgba(91, 74, 232, 0.22);
  display: grid;
  gap: 26px;
  overflow: hidden;
  padding: 30px;
  position: relative;
}

.lp-final::after {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  bottom: -140px;
  content: '';
  height: 320px;
  position: absolute;
  right: -120px;
  width: 320px;
}

.lp-final > * {
  position: relative;
  z-index: 1;
}

.lp-final-copy {
  max-width: 640px;
}

.lp-final .lp-pill {
  background: rgba(255, 255, 255, 0.16);
  border-color: rgba(255, 255, 255, 0.28);
  color: white;
}

.lp-final h2 {
  color: white;
  font-size: clamp(30px, 5vw, 50px);
  line-height: 0.98;
  margin: 18px 0 0;
}

.lp-final p {
  color: rgba(255, 255, 255, 0.86);
  font-size: 16px;
  margin: 14px 0 0;
  max-width: 620px;
}

.lp-final-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-start;
  margin-top: 24px;
}

.lp-store-button {
  align-items: center;
  background: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 22px;
  box-shadow: 0 18px 42px rgba(23, 23, 48, 0.16);
  color: var(--lp-text);
  display: inline-flex;
  gap: 12px;
  min-width: min(100%, 220px);
  padding: 12px 14px;
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.lp-store-button:hover {
  box-shadow: 0 24px 60px rgba(23, 23, 48, 0.22);
  transform: translateY(-3px);
}

.lp-store-button small {
  color: var(--lp-muted);
  display: block;
  font-size: 11px;
  font-weight: 800;
}

.lp-store-button strong {
  display: block;
  font-size: 18px;
  line-height: 1.1;
}

.lp-store-icon {
  align-items: center;
  background: var(--lp-accent-soft);
  border: 1px solid rgba(91, 74, 232, 0.14);
  border-radius: 16px;
  color: var(--lp-accent);
  display: inline-flex;
  font-size: 11px;
  font-weight: 950;
  height: 46px;
  justify-content: center;
  width: 58px;
}

.lp-store-icon svg {
  display: block;
  fill: currentColor;
  height: 27px;
  width: 27px;
}

.lp-store-button.ios .lp-store-icon {
  background: #171730;
  border-color: #171730;
  color: white;
}

.lp-store-button.android .lp-store-icon {
  background: #ecfff6;
  border-color: rgba(24, 169, 91, 0.18);
  color: #18a95b;
}

.lp-final-proof {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.lp-final-proof span {
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  color: white;
  font-size: 12px;
  font-weight: 850;
  padding: 8px 11px;
}

.lp-device-showcase {
  align-items: end;
  display: flex;
  gap: 16px;
  justify-content: center;
  min-height: 260px;
}

.lp-device-card {
  background: #ffffff;
  border: 7px solid #171730;
  border-radius: 34px;
  box-shadow: 0 26px 70px rgba(23, 23, 48, 0.28);
  display: flex;
  flex-direction: column;
  height: 238px;
  justify-content: flex-end;
  padding: 18px;
  position: relative;
  width: 128px;
}

.lp-device-card.android {
  height: 258px;
  transform: translateY(-14px);
}

.lp-device-card strong {
  color: var(--lp-text);
  font-size: 19px;
}

.lp-device-card small {
  color: var(--lp-muted);
  font-size: 12px;
  font-weight: 850;
  margin-top: 4px;
}

.lp-device-notch,
.lp-device-camera {
  background: #171730;
  position: absolute;
  top: 13px;
}

.lp-device-notch {
  border-radius: 999px;
  height: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: 52px;
}

.lp-device-camera {
  border-radius: 999px;
  height: 14px;
  left: 50%;
  transform: translateX(-50%);
  width: 14px;
}

.lp-device-bars {
  display: grid;
  gap: 7px;
  margin-top: 20px;
}

.lp-device-bars i {
  background: #f0edff;
  border-radius: 999px;
  display: block;
  height: 10px;
}

.lp-device-bars i:nth-child(2) {
  width: 76%;
}

.lp-device-bars i:nth-child(3) {
  width: 58%;
}

.lp-final .lp-button.outline {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.42);
  color: white;
}

.lp-footer {
  background: #f8f8ff;
  border-top: 1px solid var(--lp-border);
  box-shadow: 0 24px 64px rgba(23, 23, 48, 0.1);
  margin-bottom: -18vh;
  padding: 28px 0 22px;
  position: relative;
  z-index: 2;
}

.lp-footer-grid {
  background: white;
  border: 1px solid var(--lp-border);
  border-radius: 34px;
  box-shadow: 0 18px 54px rgba(23, 23, 48, 0.06);
  display: grid;
  gap: 14px;
  padding: 18px;
}

.lp-footer-brand,
.lp-footer-column {
  border-radius: 24px;
  padding: 18px;
}

.lp-footer-brand {
  background: var(--lp-accent);
  color: white;
  overflow: hidden;
  position: relative;
}

.lp-footer-brand::after {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  bottom: -84px;
  content: '';
  height: 190px;
  position: absolute;
  right: -72px;
  width: 190px;
}

.lp-footer-brand > * {
  position: relative;
  z-index: 1;
}

.lp-footer-brand .lp-logo {
  align-items: center;
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.24);
  color: white;
  display: flex;
  justify-content: center;
  margin: 0 auto;
  max-width: 230px;
  padding: 10px 16px 10px 10px;
}

.lp-footer-brand .lp-logo img {
  height: 54px;
  width: 54px;
}

.lp-footer-brand .lp-logo strong {
  font-size: 20px;
}

.lp-footer h4 {
  color: var(--lp-text);
  font-size: 14px;
  letter-spacing: 0.02em;
  margin: 0 0 14px;
}

.lp-footer a,
.lp-footer p {
  color: var(--lp-muted);
  display: block;
  margin: 8px 0 0;
}

.lp-footer-brand p {
  color: rgba(255, 255, 255, 0.84);
  font-size: 15px;
  line-height: 1.55;
  margin-top: 16px;
  max-width: 460px;
  text-align: center;
}

.lp-footer-column {
  background: #fbfbff;
  border: 1px solid rgba(228, 226, 244, 0.8);
}

.lp-footer-column a {
  align-items: center;
  border-radius: 12px;
  display: flex;
  font-size: 14px;
  font-weight: 750;
  justify-content: space-between;
  margin-top: 5px;
  padding: 8px 0;
  transition: color 180ms ease, transform 180ms ease;
}

.lp-footer-column a::after {
  color: var(--lp-hint);
  content: '→';
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 180ms ease, transform 180ms ease;
}

.lp-footer-column a:hover {
  color: var(--lp-accent);
  transform: translateX(3px);
}

.lp-footer-column a:hover::after {
  opacity: 1;
  transform: translateX(0);
}

.lp-footer-badges {
  justify-content: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.lp-footer-badges span {
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  color: white;
  font-size: 12px;
  font-weight: 850;
  padding: 8px 10px;
}

.lp-socials {
  justify-content: center;
  display: flex;
  gap: 8px;
  margin-top: 18px;
}

.lp-socials a {
  align-items: center;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 999px;
  color: white;
  display: inline-flex;
  font-size: 12px;
  font-weight: 900;
  height: 36px;
  justify-content: center;
  margin: 0;
  width: 36px;
}

.lp-socials svg {
  display: block;
  fill: currentColor;
  height: 20px;
  width: 20px;
}

.lp-bottom {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  justify-content: space-between;
  color: var(--lp-hint);
  font-size: 13px;
  margin-top: 16px;
  padding: 0 4px;
}

.lp-bottom span:last-child {
  color: var(--lp-muted);
  font-weight: 750;
}

.lp-logo-parallax {
  align-items: center;
  background: #6a5be2;
  display: flex;
  justify-content: center;
  min-height: 78vh;
  overflow: hidden;
  padding-top: 18vh;
  position: relative;
  z-index: 1;
}

.lp-logo-parallax::before,
.lp-logo-parallax::after {
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  content: '';
  opacity: 0.9;
  pointer-events: none;
  position: absolute;
}

.lp-logo-parallax::before {
  height: min(78vw, 760px);
  width: min(78vw, 760px);
}

.lp-logo-parallax::after {
  height: min(54vw, 520px);
  width: min(54vw, 520px);
}

.lp-logo-parallax-inner {
  align-items: center;
  display: grid;
  justify-items: center;
  transform: translateZ(0);
  z-index: 1;
}

.lp-logo-parallax img {
  height: clamp(150px, 28vw, 330px);
  object-fit: contain;
  width: clamp(150px, 28vw, 330px);
}

.lp-logo-parallax span {
  color: rgba(255, 255, 255, 0.9);
  font-size: clamp(30px, 6vw, 76px);
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1;
  margin-top: 18px;
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
  background: #f8f8ff;
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

@keyframes lp-parallax-logo {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-14px) scale(1.03); }
}

@keyframes lp-caret-blink {
  0%, 48% { opacity: 1; }
  49%, 100% { opacity: 0; }
}

@media (min-width: 768px) {
  .lp-hero-actions,
  .lp-final-actions {
    flex-direction: row;
    justify-content: flex-start;
  }

  .lp-final-actions { justify-content: center; }
  .lp-form-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }

  .lp-grid.two,
  .lp-price-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .lp-grid.three {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .lp-process-layout {
    grid-template-columns: minmax(280px, 0.78fr) minmax(0, 1.22fr);
  }

  .lp-process-copy {
    min-height: 100%;
  }

  .lp-participation-grid {
    grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
    grid-template-rows: repeat(2, minmax(0, 1fr));
  }

  .lp-participation-card-1 {
    grid-row: 1 / span 2;
    min-height: 430px;
    padding: 34px;
  }

  .lp-participation-card-1 .lp-feature-icon {
    height: 86px;
    width: 86px;
    font-size: 40px;
  }

  .lp-participation-card-1 h3 {
    font-size: clamp(30px, 4vw, 44px);
    max-width: 520px;
  }

  .lp-participation-card-1 p {
    font-size: 16px;
    max-width: 560px;
  }

  .lp-price-grid.two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .lp-price-grid.three {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .lp-campaign-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .lp-campaign-card.featured {
    transform: translateY(-8px);
  }

  .lp-testimonial-grid {
    grid-template-columns: minmax(0, 1.12fr) repeat(2, minmax(0, 0.94fr));
  }

  .lp-testimonial-card.featured {
    min-height: 270px;
  }

  .lp-faq-layout {
    grid-template-columns: minmax(280px, 0.82fr) minmax(0, 1.18fr);
  }

  .lp-faq-copy {
    align-self: start;
  }

  .lp-partner-shell {
    grid-template-columns: minmax(320px, 0.88fr) minmax(0, 1.12fr);
    grid-template-areas:
      'intro benefits'
      'plans plans';
  }

  .lp-partner-intro {
    grid-area: intro;
  }

  .lp-partner-benefits {
    grid-area: benefits;
  }

  .lp-partner-plans {
    grid-area: plans;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .lp-price-grid.three,
  .lp-campaign-grid,
  .lp-partner-plans {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .lp-campaign-card.featured {
    transform: translateY(-8px);
  }

  .lp-footer-grid { grid-template-columns: 1.2fr repeat(3, 1fr); }
}

@media (min-width: 1120px) {
  .lp-menu { display: flex; }
  .lp-burger { display: none; }

  .lp-hero-grid {
    grid-template-columns: minmax(0, 1.12fr) minmax(330px, 0.88fr);
  }

  .lp-phone-wrap { display: flex; }
  .lp-grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .lp-contact-grid { grid-template-columns: 0.92fr 1.08fr; }
  .lp-final {
    align-items: center;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 0.72fr);
    padding: 42px;
  }
}

@media (max-width: 767px) {
  .lp-stats { grid-template-columns: 1fr; }
  .lp-section { padding: 44px 0; }
  .lp-hero { padding-top: 104px; }
  .lp-button { width: 100%; }
  .lp-nav .lp-actions .lp-button {
    display: inline-flex;
    font-size: 12px;
    min-height: 38px;
    padding: 0 12px;
    width: auto;
  }
  .lp-wrap { padding: 0 16px; }
  .lp-nav-inner { min-height: 70px; }
  .lp-header-logo img {
    height: 64px;
    width: 64px;
  }
  .lp-mobile-menu.open {
    max-height: min(70vh, 420px);
    overflow-y: auto;
  }
  .lp-hero h1 {
    min-height: 0;
  }
  .lp-lead {
    min-height: 0;
  }
  .lp-process-copy,
  .lp-partner-intro,
  .lp-faq-copy,
  .lp-final,
  .lp-footer-grid,
  .lp-campaigns-shell,
  .lp-plans-shell {
    border-radius: 24px;
  }
  .lp-price-card.featured,
  .lp-campaign-card.featured {
    transform: none;
  }
  .lp-price-card,
  .lp-partner-plan,
  .lp-campaign-card {
    min-height: auto;
  }
  .lp-price-card-head {
    min-height: 0;
  }
  .lp-price-topline,
  .lp-partner-plan-top,
  .lp-campaign-top {
    align-items: flex-start;
    flex-direction: column;
  }
  .lp-contact-copy,
  .lp-contact-form,
  .lp-footer-brand,
  .lp-footer-column {
    padding: 18px;
  }
  .lp-support-grid { grid-template-columns: 1fr; }
  .lp-store-button { width: 100%; }
  .lp-device-showcase { min-height: 220px; }
  .lp-device-card {
    height: 205px;
    width: 108px;
  }
  .lp-device-card.android {
    height: 220px;
  }
  .lp-legal-shell { padding-top: 96px; }
  .lp-legal-card { border-radius: 20px; padding: 20px; }
  .lp-step-card,
  .lp-participation-card {
    border-radius: 22px;
    min-height: auto;
    padding: 18px;
  }

  .lp-step-icon,
  .lp-feature-icon {
    height: 54px;
    width: 54px;
  }

  .lp-step-body {
    padding-right: 0;
  }

  .lp-step-icon {
    position: static;
    margin-bottom: 10px;
  }
}

@media (max-width: 420px) {
  .lp-wrap { padding: 0 12px; }
  .lp-nav-inner { min-height: 66px; }
  .lp-header-logo img {
    height: 54px;
    width: 54px;
  }
  .lp-burger {
    height: 40px;
    width: 40px;
  }
  .lp-nav .lp-actions {
    gap: 7px;
  }
  .lp-nav .lp-actions .lp-button {
    font-size: 11px;
    min-height: 36px;
    padding: 0 9px;
  }
  .lp-hero { padding-top: 92px; }
  .lp-hero-proof,
  .lp-process-proof,
  .lp-campaign-proof,
  .lp-final-proof,
  .lp-footer-badges {
    gap: 6px;
  }
  .lp-hero-proof span,
  .lp-process-proof span,
  .lp-campaign-proof span,
  .lp-final-proof span,
  .lp-footer-badges span {
    font-size: 11px;
    padding: 7px 9px;
  }
  .lp-device-card {
    height: 180px;
    width: 94px;
  }
  .lp-device-card.android {
    height: 194px;
  }
  .lp-logo-parallax {
    min-height: 62vh;
    padding-top: 12vh;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lp-typewriter-line i {
    animation: none;
  }
}
`
