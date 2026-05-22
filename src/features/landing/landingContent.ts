export type LandingGameItem = {
  cls: string
  icon: string
  title: string
  text: string
  tags: string[]
  cta: string
}

export type LandingPartnerPlan = {
  name: string
  price: string
  features: string[]
}

export type LandingPageContent = {
  navItems: string[][]
  hero: {
    badge: string
    titleStart: string
    titleHighlight: string
    titleEnd: string
    subtitle: string
    primaryCta: string
    secondaryCta: string
  }
  stats: {
    players: number
    money: number
    contests: number
  }
  steps: string[][]
  games: LandingGameItem[]
  liveContests: Array<[string, string, string, string, number, string, string]>
  playerPlans: {
    free: { title: string; price: string; features: string[] }
    premium: { title: string; price: string; subtitle: string; features: string[] }
  }
  partners: {
    title: string
    subtitle: string
    benefits: string[][]
    plans: LandingPartnerPlan[]
  }
  testimonials: string[][]
  faqs: string[][]
  finalCta: {
    title: string
    subtitle: string
    primaryCta: string
    secondaryCta: string
    storeBadge: string
  }
  footer: {
    description: string
    bottom: string
  }
}

export type LandingPlayerPlan = {
  id: string
  key: string
  title: string
  description: string
  price: string
  subtitle: string
  features: string[]
  featured: boolean
}

export const defaultLandingContent: LandingPageContent = {
  navItems: [
    ['Accueil', '#accueil'],
    ['Comment ça marche', '#comment-ca-marche'],
    ['Concours', '#concours'],
    ['Partenaires', '#partenaires'],
    ['Tarifs', '#tarifs'],
  ],
  hero: {
    badge: '🇨🇮 La plateforme N°1 de concours en CI',
    titleStart: 'Joue.',
    titleHighlight: 'Gagne.',
    titleEnd: 'Vis l’expérience.',
    subtitle:
      'Participe à des centaines de concours gratuits, réponds à des quiz, tente ta chance aux tirages et remporte des prix en FCFA, data et bien plus.',
    primaryCta: 'Commencer gratuitement',
    secondaryCta: 'Voir les concours',
  },
  stats: {
    players: 50000,
    money: 2000000,
    contests: 500,
  },
  steps: [
    ['📱', 'Inscris-toi', 'Crée ton compte en 30 secondes avec ton numéro de téléphone. Aucune carte bancaire requise.'],
    ['🎮', 'Choisis ton jeu', 'Quiz de culture générale, tirages au sort ou pronostics sportifs. Un nouveau concours disponible chaque jour.'],
    ['💰', 'Gagne tes prix', 'Les gains sont versés directement sur ton Wave, Orange Money ou MTN Money. En quelques minutes.'],
  ],
  games: [
    {
      cls: 'quiz',
      icon: '🧠',
      title: 'Quiz',
      text: 'Teste tes connaissances sur le football, la culture ivoirienne, la musique africaine et bien plus. Réponds vite et juste pour maximiser tes points.',
      tags: ['Culture générale', 'Sport', 'Musique', 'Tech'],
      cta: 'Voir les quiz →',
    },
    {
      cls: 'draw',
      icon: '🎰',
      title: 'Tirage au sort',
      text: 'Participe en un seul clic et laisse la chance décider. Plus tu joues, plus tu as de tickets. Les gagnants sont tirés au sort à la fin du concours.',
      tags: ['1 clic', '100% chance', 'Gratuit'],
      cta: 'Voir les tirages →',
    },
    {
      cls: 'predict',
      icon: '🔮',
      title: 'Pronostic',
      text: 'Prédit les résultats des grands événements sportifs et culturels. CAN, AFCON, matchs de foot... Si tu as raison, tu gagnes.',
      tags: ['Sport', 'Stratégie', 'Football'],
      cta: 'Voir les pronostics →',
    },
  ],
  liveContests: [
    ['EN VEDETTE', "Grand Tirage MTN Côte d'Ivoire", '50 000 FCFA de crédit MTN', '1 720 / 5 000 participants', 34, '13 jours restants', 'Participer'],
    ['QUIZ', 'Quiz Foot Africain', '25 000 FCFA', '342 participants', 54, '6 jours restants', 'Jouer'],
    ['PRONOSTIC', 'Pronostic AFCON 2025', '100 000 FCFA', '891 participants', 41, '29 jours restants', 'Pronostiquer'],
  ],
  playerPlans: {
    free: {
      title: 'Gratuit',
      price: '0 FCFA / mois',
      features: [
        '✅ 3 participations par jour',
        '✅ Accès à tous les concours',
        '✅ Classement général',
        '❌ Participations illimitées',
      ],
    },
    premium: {
      title: 'Premium',
      price: '2 000 FCFA / mois',
      subtitle: 'Soit 67 FCFA par jour.',
      features: [
        '✅ Participations illimitées',
        '✅ Double tickets aux tirages',
        '✅ Accès anticipé aux concours',
        '✅ Badge Premium sur ton profil',
      ],
    },
  },
  partners: {
    title: 'Vous êtes une marque ?',
    subtitle: 'Touchez des milliers d’Ivoiriens engagés grâce à vos concours sponsorisés.',
    benefits: [
      ['📢', 'Visibilité maximale', 'Vos concours vus par des milliers de joueurs actifs chaque jour sur MegaPromo.'],
      ['🎯', 'Engagement réel', 'Les joueurs interagissent activement avec votre marque, pas juste un scroll passif.'],
      ['📊', 'Stats détaillées', 'Tableau de bord complet : vues, participants, partages, profil de votre audience.'],
    ],
    plans: [
      { name: 'Starter', price: '50 000 FCFA/mois', features: ['1 concours actif', 'Durée max 7 jours', 'Stats basiques'] },
      { name: 'Business', price: '150 000 FCFA/mois', features: ['3 concours simultanés', 'Durée max 30 jours', 'Stats avancées', '1 boost inclus'] },
      { name: 'Premium', price: '400 000 FCFA/mois', features: ['Concours illimités', 'Durée illimitée', 'Stats complètes + export', '3 boosts inclus', 'Support dédié'] },
    ],
  },
  testimonials: [
    ['K', 'Konan Aimé, Cocody', "J’ai gagné 25 000 FCFA au quiz foot ! L’argent était sur mon Wave en moins de 10 minutes. Incroyable !"],
    ['M', 'Marie Kouassi, Yopougon', "Le tirage MTN m’a souri ! 50 000 FCFA de crédit. Je joue tous les jours maintenant, c’est trop bien !"],
    ['D', 'Diabaté Moussa, Bouaké', "Les pronostics c’est ma passion. J’ai prédit la victoire de la CI à la CAN et j’ai décroché 100 000 FCFA. Merci MegaPromo !"],
  ],
  faqs: [
    ['C’est vraiment gratuit ?', 'Oui, l’inscription et la participation aux concours sont totalement gratuites. Le Premium est optionnel et offre plus d’avantages.'],
    ['Comment je reçois mes gains ?', 'Tes gains sont versés directement sur ton Wave, Orange Money ou MTN Money. Le virement est effectué sous 24-48h après la fin du concours.'],
    ['Combien de fois puis-je participer ?', 'En version gratuite, tu peux participer à 3 concours par jour. En Premium, c’est illimité.'],
    ['Comment sont désignés les gagnants ?', 'Pour les quiz : le meilleur score gagne. Pour les tirages : tirage aléatoire certifié. Pour les pronostics : ceux qui ont bien prédit l’événement.'],
    ['L’app est disponible sur iOS ?', 'MegaPromo est actuellement disponible sur Android. La version iOS arrive très prochainement.'],
    ['Je suis une entreprise, comment sponsoriser ?', 'Contacte-nous via le formulaire partenaire ou écris-nous sur WhatsApp. Notre équipe te rappelle sous 24h.'],
  ],
  finalCta: {
    title: 'Prêt à gagner ?',
    subtitle: 'Rejoins 50 000 joueurs ivoiriens et commence à gagner dès aujourd’hui.',
    primaryCta: 'Télécharger l’app',
    secondaryCta: 'Voir les concours',
    storeBadge: '▶ Disponible sur Google Play',
  },
  footer: {
    description: 'Joue. Gagne. Vis. La plateforme premium des concours en Côte d’Ivoire et en Afrique.',
    bottom: '© 2025 MegaPromo — Fait avec amour en Côte d’Ivoire',
  },
}

export function mergeLandingContent(
  content: Partial<LandingPageContent> | null,
): LandingPageContent {
  return {
    ...defaultLandingContent,
    ...(content ?? {}),
    hero: { ...defaultLandingContent.hero, ...(content?.hero ?? {}) },
    stats: { ...defaultLandingContent.stats, ...(content?.stats ?? {}) },
    playerPlans: {
      free: {
        ...defaultLandingContent.playerPlans.free,
        ...(content?.playerPlans?.free ?? {}),
      },
      premium: {
        ...defaultLandingContent.playerPlans.premium,
        ...(content?.playerPlans?.premium ?? {}),
      },
    },
    partners: {
      ...defaultLandingContent.partners,
      ...(content?.partners ?? {}),
    },
    finalCta: {
      ...defaultLandingContent.finalCta,
      ...(content?.finalCta ?? {}),
    },
    footer: {
      ...defaultLandingContent.footer,
      ...(content?.footer ?? {}),
    },
  }
}

export function fallbackPlayerPlans(content = defaultLandingContent): LandingPlayerPlan[] {
  return [
    {
      id: 'free',
      key: 'free',
      title: content.playerPlans.free.title,
      description: '',
      price: content.playerPlans.free.price,
      subtitle: '',
      features: content.playerPlans.free.features,
      featured: false,
    },
    {
      id: 'premium',
      key: 'premium',
      title: content.playerPlans.premium.title,
      description: content.playerPlans.premium.subtitle,
      price: content.playerPlans.premium.price,
      subtitle: content.playerPlans.premium.subtitle,
      features: content.playerPlans.premium.features,
      featured: true,
    },
  ]
}
