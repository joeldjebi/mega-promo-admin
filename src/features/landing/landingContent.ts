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
  blockVisibility: Record<string, boolean>
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
  contact: {
    title: string
    subtitle: string
    whatsappLabel: string
    whatsappHint: string
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
  blockVisibility: {
    navItems: true,
    hero: true,
    stats: true,
    steps: true,
    games: true,
    liveContests: true,
    playerPlans: true,
    partners: true,
    testimonials: true,
    faqs: true,
    contact: true,
    finalCta: true,
    footer: true,
    floatingLiveQuiz: true,
  },
  navItems: [
    ['Accueil', '#accueil'],
    ['Comment ça marche', '#comment-ca-marche'],
    ['Campagnes', '#concours'],
    ['Partenaires', '#partenaires'],
    ['Offres', '#tarifs'],
    ['Contact', '#contact'],
  ],
  hero: {
    badge: '🇨🇮 Plateforme promotionnelle gratuite en Côte d’Ivoire',
    titleStart: 'Découvre.',
    titleHighlight: 'Réponds.',
    titleEnd: 'Profite.',
    subtitle:
      'Découvre les marques ivoiriennes à travers des campagnes interactives gratuites. Réponds aux quiz produits et reçois, selon les campagnes, des récompenses promotionnelles offertes par les partenaires.',
    primaryCta: 'Commencer gratuitement',
    secondaryCta: 'Voir les campagnes',
  },
  stats: {
    players: 50000,
    money: 2000000,
    contests: 500,
  },
  steps: [
    ['📱', 'Inscris-toi', 'Crée ton compte en 30 secondes avec ton numéro de téléphone. Aucune carte bancaire requise.'],
    ['🧠', 'Découvre une campagne', 'Explore des quiz gratuits proposés par des marques, autour de leurs produits, services ou actions communautaires.'],
    ['🎁', 'Reçois une récompense', 'Certaines campagnes offrent des bons, avantages, invitations ou cadeaux promotionnels, sans mise ni achat obligatoire.'],
  ],
  games: [
    {
      cls: 'quiz',
      icon: '🧠',
      title: 'Quiz de marque',
      text: 'Réponds à des questions simples sur les produits, services et initiatives des entreprises partenaires.',
      tags: ['Produits', 'Services', 'Culture locale', 'Marques'],
      cta: 'Voir les quiz →',
    },
    {
      cls: 'draw',
      icon: '🎁',
      title: 'Récompenses promo',
      text: 'Profite d’avantages offerts par les marques : bons de réduction, invitations, crédits de communication ou cadeaux partenaires.',
      tags: ['Gratuit', 'Sans mise', 'Partenaires'],
      cta: 'Voir les campagnes →',
    },
    {
      cls: 'predict',
      icon: '📣',
      title: 'Événements communautaires',
      text: 'Participe à des animations autour de la culture ivoirienne, du sport, de la musique et des moments forts des marques.',
      tags: ['Culture', 'Communauté', 'Animation'],
      cta: 'Voir les événements →',
    },
  ],
  liveContests: [
    ['EN VEDETTE', "Campagne découverte MTN Côte d'Ivoire", 'Crédit de communication offert', '1 720 participants', 34, '13 jours restants', 'Participer'],
    ['QUIZ', 'Quiz produits locaux', 'Bon de réduction partenaire', '342 participants', 54, '6 jours restants', 'Répondre'],
    ['ÉVÉNEMENT', 'Culture ivoirienne en live', 'Invitation ou cadeau partenaire', '891 participants', 41, '29 jours restants', 'Découvrir'],
  ],
  playerPlans: {
    free: {
      title: 'Gratuit',
      price: '0 FCFA / mois',
      features: [
        '✅ 3 participations par jour',
        '✅ Accès aux campagnes gratuites',
        '✅ Classement général',
        '❌ Options de confort avancées',
      ],
    },
    premium: {
      title: 'Premium',
      price: '2 000 FCFA / mois',
      subtitle: 'Soit 67 FCFA par jour.',
      features: [
        '✅ Plus de participations quotidiennes',
        '✅ Options de confort dans l’application',
        '✅ Accès anticipé à certaines campagnes',
        '✅ Badge Premium sur ton profil',
      ],
    },
  },
  partners: {
    title: 'Vous êtes une marque ?',
    subtitle: 'Touchez des milliers d’Ivoiriens engagés grâce à des campagnes interactives gratuites.',
    benefits: [
      ['📢', 'Visibilité maximale', 'Vos campagnes vues par des milliers d’utilisateurs actifs chaque jour sur MegaPromo.'],
      ['🎯', 'Engagement réel', 'Les utilisateurs interagissent activement avec votre marque, pas juste un scroll passif.'],
      ['📊', 'Stats détaillées', 'Tableau de bord complet : vues, participants, partages, profil de votre audience.'],
    ],
    plans: [
      { name: 'Starter', price: '50 000 FCFA/mois', features: ['1 campagne active', 'Durée max 7 jours', 'Stats basiques'] },
      { name: 'Business', price: '150 000 FCFA/mois', features: ['3 campagnes simultanées', 'Durée max 30 jours', 'Stats avancées', '1 boost inclus'] },
      { name: 'Premium', price: '400 000 FCFA/mois', features: ['Campagnes illimitées', 'Durée illimitée', 'Stats complètes + export', '3 boosts inclus', 'Support dédié'] },
    ],
  },
  contact: {
    title: 'Besoin d’aide ?',
    subtitle:
      'Écris-nous pour une question, un partenariat ou un problème avec une campagne. WhatsApp reste le chemin le plus rapide.',
    whatsappLabel: 'Contacter sur WhatsApp',
    whatsappHint: 'Réponse rapide via l’équipe MegaPromo',
  },
  testimonials: [
    ['K', 'Konan Aimé, Cocody', "J’ai découvert une offre locale grâce à un quiz produit. L’expérience était simple, claire et gratuite."],
    ['M', 'Marie Kouassi, Yopougon', "Une marque partenaire m’a offert un bon de réduction après ma participation. J’ai beaucoup aimé le concept."],
    ['D', 'Diabaté Moussa, Bouaké', "MegaPromo me permet de découvrir des entreprises ivoiriennes et leurs nouveautés de manière interactive."],
  ],
  faqs: [
    ['C’est vraiment gratuit ?', 'Oui, l’inscription et la participation aux campagnes sont gratuites. Aucune mise, aucun pari et aucun achat obligatoire ne sont nécessaires.'],
    ['Quelles récompenses sont proposées ?', 'Selon les campagnes, les marques partenaires peuvent offrir des bons de réduction, invitations, crédits de communication ou cadeaux promotionnels.'],
    ['Combien de fois puis-je participer ?', 'En version gratuite, tu peux participer à plusieurs campagnes par jour selon les règles affichées dans l’application.'],
    ['Comment les récompenses sont attribuées ?', 'Chaque campagne affiche ses règles clairement : quiz produit, score, validation manuelle ou critères promotionnels définis par la marque partenaire.'],
    ['L’app est disponible sur iOS ?', 'MegaPromo est actuellement disponible sur Android. La version iOS arrive très prochainement.'],
    ['Je suis une entreprise, comment lancer une campagne ?', 'Contacte-nous via le formulaire partenaire ou écris-nous sur WhatsApp. Notre équipe te rappelle sous 24h.'],
  ],
  finalCta: {
    title: 'Prêt à découvrir ?',
    subtitle: 'Rejoins la communauté MegaPromo et participe gratuitement aux campagnes des marques en Côte d’Ivoire.',
    primaryCta: 'Télécharger l’app',
    secondaryCta: 'Voir les campagnes',
    storeBadge: '▶ Disponible sur Google Play',
  },
  footer: {
    description: 'Découvre. Réponds. Profite. La plateforme promotionnelle gratuite des marques en Côte d’Ivoire.',
    bottom: '© 2025 MegaPromo — Fait avec amour en Côte d’Ivoire',
  },
}

export function mergeLandingContent(
  content: Partial<LandingPageContent> | null,
): LandingPageContent {
  return {
    ...defaultLandingContent,
    ...(content ?? {}),
    blockVisibility: {
      ...defaultLandingContent.blockVisibility,
      ...(content?.blockVisibility ?? {}),
    },
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
    contact: {
      ...defaultLandingContent.contact,
      ...(content?.contact ?? {}),
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
