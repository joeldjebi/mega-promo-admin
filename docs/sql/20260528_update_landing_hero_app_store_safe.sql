-- MegaPromo Web - Hero landing conforme App Store
-- A executer dans Supabase SQL Editor.
-- Met a jour uniquement le bloc hero du contenu landing dynamique.

insert into public.landing_page_content (key, content)
values (
  'main',
  jsonb_build_object(
    'hero',
    jsonb_build_object(
      'badge', '🇨🇮 Plateforme promotionnelle gratuite en Côte d’Ivoire',
      'titleStart', 'Découvre.',
      'titleHighlight', 'Réponds.',
      'titleEnd', 'Profite.',
      'subtitle', 'Découvre les marques ivoiriennes à travers des campagnes interactives gratuites. Réponds aux quiz produits et reçois, selon les campagnes, des récompenses promotionnelles offertes par les partenaires.',
      'primaryCta', 'Commencer gratuitement',
      'secondaryCta', 'Voir les campagnes'
    )
  )
)
on conflict (key) do update set
  content = coalesce(public.landing_page_content.content, '{}'::jsonb)
    || jsonb_build_object(
      'hero',
      jsonb_build_object(
        'badge', '🇨🇮 Plateforme promotionnelle gratuite en Côte d’Ivoire',
        'titleStart', 'Découvre.',
        'titleHighlight', 'Réponds.',
        'titleEnd', 'Profite.',
        'subtitle', 'Découvre les marques ivoiriennes à travers des campagnes interactives gratuites. Réponds aux quiz produits et reçois, selon les campagnes, des récompenses promotionnelles offertes par les partenaires.',
        'primaryCta', 'Commencer gratuitement',
        'secondaryCta', 'Voir les campagnes'
      )
    ),
  updated_at = now();
