export const SUPPORTED_LOCALES = ["pt-BR", "en", "es", "ja", "fr"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pt-BR";

export const LOCALE_META: Record<Locale, { label: string; flag: string }> = {
  "pt-BR": { label: "Português (Brasil)", flag: "🇧🇷" },
  en: { label: "English", flag: "🇺🇸" },
  es: { label: "Espanol", flag: "🇪🇸" },
  ja: { label: "Japanese", flag: "🇯🇵" },
  fr: { label: "Francais", flag: "🇫🇷" },
};

export function isLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

export function resolveLocaleFromAcceptLanguage(
  acceptLanguageHeader: string | null | undefined
): Locale {
  if (!acceptLanguageHeader) {
    return DEFAULT_LOCALE;
  }

  const weighted = acceptLanguageHeader
    .split(",")
    .map((part) => {
      const [rawTag, rawQ] = part.trim().split(";q=");
      const tag = rawTag?.toLowerCase() ?? "";
      const q = rawQ ? Number.parseFloat(rawQ) : 1;
      return { tag, q: Number.isFinite(q) ? q : 1 };
    })
    .filter((item) => item.tag.length > 0)
    .sort((a, b) => b.q - a.q);

  const localeMap = SUPPORTED_LOCALES.reduce<Record<string, Locale>>((acc, locale) => {
    acc[locale.toLowerCase()] = locale;
    return acc;
  }, {});

  for (const item of weighted) {
    if (localeMap[item.tag]) {
      return localeMap[item.tag];
    }

    const languageOnly = item.tag.split("-")[0];
    const fallback = SUPPORTED_LOCALES.find(
      (locale) =>
        locale.toLowerCase() === languageOnly ||
        locale.toLowerCase().startsWith(`${languageOnly}-`)
    );

    if (fallback) {
      return fallback;
    }
  }

  return DEFAULT_LOCALE;
}

type Dictionary = {
  appName: string;
  nav: {
    feed: string;
    organizations: string;
    opportunities: string;
    playlists: string;
    notifications: string;
    dashboard: string;
    myOrganizations: string;
    publish: string;
  };
  hero: {
    title: string;
    subtitle: string;
    ctaCreateOrg: string;
    ctaUpload: string;
  };
  sections: {
    featuredOrganizations: string;
    recentPlaylists: string;
    latestPosts: string;
  };
  stats: {
    followers: string;
    posts: string;
    playlists: string;
    views: string;
  };
  cards: {
    workTitle: string;
    by: string;
    collaboratorsPending: string;
    noItems: string;
  };
  auth: {
    login: string;
    signup: string;
    logout: string;
    guestHint: string;
  };
  actions: {
    publish: string;
    like: string;
    comment: string;
    share: string;
    follow: string;
  };
};

const dictionaries: Record<Locale, Dictionary> = {
  "pt-BR": {
    appName: "DubFlow",
    nav: {
      feed: "Feed",
      organizations: "Comunidades",
      opportunities: "Oportunidades",
      playlists: "Playlists",
      notifications: "Notificações",
      dashboard: "Painel",
      myOrganizations: "Minhas comunidades",
      publish: "Criar",
    },
    hero: {
      title: "Feed de dublagens em formato de portfólio por comunidade",
      subtitle:
        "Organize por obra, temporada e episódio. Publique posts avulsos, colabore e credite todo mundo corretamente.",
      ctaCreateOrg: "Criar comunidade",
      ctaUpload: "Publicar dublagem",
    },
    sections: {
      featuredOrganizations: "Comunidades em destaque",
      recentPlaylists: "Playlists recentes",
      latestPosts: "Feed de publicações",
    },
    stats: {
      followers: "seguidores",
      posts: "episódios",
      playlists: "playlists",
      views: "visualizações",
    },
    cards: {
      workTitle: "Obra",
      by: "por",
      collaboratorsPending: "Aguardando aprovação de colaboradores",
      noItems: "Nenhum item encontrado.",
    },
    auth: {
      login: "Entrar",
      signup: "Criar conta",
      logout: "Sair",
      guestHint: "Entre para curtir, comentar e publicar.",
    },
    actions: {
      publish: "Publicar",
      like: "Curtir",
      comment: "Comentar",
      share: "Compartilhar",
      follow: "Acompanhar",
    },
  },
  en: {
    appName: "DubFlow",
    nav: {
      feed: "Feed",
      organizations: "Communities",
      opportunities: "Opportunities",
      playlists: "Playlists",
      notifications: "Notifications",
      dashboard: "Dashboard",
      myOrganizations: "My communities",
      publish: "Create",
    },
    hero: {
      title: "Dubbing feed for community portfolios",
      subtitle:
        "Organize by title, season and episode. Publish standalone posts, collaborate, and keep full cast credits.",
      ctaCreateOrg: "Create community",
      ctaUpload: "Upload dubbing",
    },
    sections: {
      featuredOrganizations: "Featured communities",
      recentPlaylists: "Recent playlists",
      latestPosts: "Publishing feed",
    },
    stats: {
      followers: "followers",
      posts: "posts",
      playlists: "playlists",
      views: "views",
    },
    cards: {
      workTitle: "Title",
      by: "by",
      collaboratorsPending: "Waiting for collaborator approvals",
      noItems: "No items found.",
    },
    auth: {
      login: "Log in",
      signup: "Create account",
      logout: "Log out",
      guestHint: "Sign in to like, comment and publish.",
    },
    actions: {
      publish: "Publish",
      like: "Like",
      comment: "Comment",
      share: "Share",
      follow: "Follow",
    },
  },
  es: {
    appName: "DubFlow",
    nav: {
      feed: "Feed",
      organizations: "Comunidades",
      opportunities: "Oportunidades",
      playlists: "Playlists",
      notifications: "Notificaciones",
      dashboard: "Panel",
      myOrganizations: "Mis comunidades",
      publish: "Crear",
    },
    hero: {
      title: "Feed de doblaje para portafolios de comunidades",
      subtitle:
        "Organiza por obra, temporada y episodio. Publica material suelto, colabora y muestra creditos completos.",
      ctaCreateOrg: "Crear comunidad",
      ctaUpload: "Publicar doblaje",
    },
    sections: {
      featuredOrganizations: "Comunidades destacadas",
      recentPlaylists: "Playlists recientes",
      latestPosts: "Feed de publicaciones",
    },
    stats: {
      followers: "seguidores",
      posts: "posts",
      playlists: "playlists",
      views: "visualizaciones",
    },
    cards: {
      workTitle: "Obra",
      by: "por",
      collaboratorsPending: "Esperando aprobacion de colaboradores",
      noItems: "No se encontraron elementos.",
    },
    auth: {
      login: "Entrar",
      signup: "Crear cuenta",
      logout: "Salir",
      guestHint: "Inicia sesion para dar like, comentar y publicar.",
    },
    actions: {
      publish: "Publicar",
      like: "Me gusta",
      comment: "Comentar",
      share: "Compartir",
      follow: "Seguir",
    },
  },
  ja: {
    appName: "DubFlow",
    nav: {
      feed: "フィード",
      organizations: "コミュニティ",
      opportunities: "オーディション",
      playlists: "プレイリスト",
      notifications: "通知",
      dashboard: "ダッシュボード",
      myOrganizations: "自分のコミュニティ",
      publish: "作成",
    },
    hero: {
      title: "コミュニティ向け吹き替えポートフォリオフィード",
      subtitle:
        "作品・シーズン・話数で整理。単体投稿、コラボ、詳細クレジットまで一括管理。",
      ctaCreateOrg: "コミュニティを作成",
      ctaUpload: "吹き替えを投稿",
    },
    sections: {
      featuredOrganizations: "注目コミュニティ",
      recentPlaylists: "最新プレイリスト",
      latestPosts: "投稿フィード",
    },
    stats: {
      followers: "フォロワー",
      posts: "投稿",
      playlists: "プレイリスト",
      views: "再生",
    },
    cards: {
      workTitle: "作品",
      by: "担当",
      collaboratorsPending: "コラボ承認待ち",
      noItems: "項目が見つかりません。",
    },
    auth: {
      login: "ログイン",
      signup: "新規登録",
      logout: "ログアウト",
      guestHint: "ログインすると、いいね・コメント・投稿ができます。",
    },
    actions: {
      publish: "投稿",
      like: "いいね",
      comment: "コメント",
      share: "共有",
      follow: "フォロー",
    },
  },
  fr: {
    appName: "DubFlow",
    nav: {
      feed: "Flux",
      organizations: "Communautes",
      opportunities: "Opportunites",
      playlists: "Playlists",
      notifications: "Notifications",
      dashboard: "Tableau",
      myOrganizations: "Mes communautes",
      publish: "Créer",
    },
    hero: {
      title: "Flux de doublage pour portfolios de communautes",
      subtitle:
        "Organisez par oeuvre, saison et episode. Publiez, collaborez et affichez des credits complets.",
      ctaCreateOrg: "Creer une communaute",
      ctaUpload: "Publier un doublage",
    },
    sections: {
      featuredOrganizations: "Communautes en vedette",
      recentPlaylists: "Playlists recentes",
      latestPosts: "Flux des publications",
    },
    stats: {
      followers: "abonnes",
      posts: "posts",
      playlists: "playlists",
      views: "vues",
    },
    cards: {
      workTitle: "Oeuvre",
      by: "par",
      collaboratorsPending: "En attente des validations des collaborateurs",
      noItems: "Aucun element trouve.",
    },
    auth: {
      login: "Connexion",
      signup: "Creer un compte",
      logout: "Deconnexion",
      guestHint: "Connectez-vous pour liker, commenter et publier.",
    },
    actions: {
      publish: "Publier",
      like: "Aimer",
      comment: "Commenter",
      share: "Partager",
      follow: "Suivre",
    },
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}
