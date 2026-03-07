import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

import { TopNav } from "@/components/layout/top-nav";
import { MainShell } from "@/components/layout/main-shell";
import { HomeTour } from "@/components/onboarding/home-tour";
import { fetchCurrentUser } from "@/lib/api";
import { isLocale, type Locale } from "@/lib/i18n";
import {
  SEO_APP_NAME,
  SEO_DEFAULT_DESCRIPTION,
  SEO_DEFAULT_IMAGE,
  buildLocaleAlternates,
  getSiteUrl,
  parseLocalizedPathname,
  toLocalePath,
} from "@/lib/seo";

const NOINDEX_EXACT_PATHS = new Set([
  "/entrar",
  "/criar-conta",
  "/recuperar-senha",
  "/redefinir-senha",
  "/mensagens",
  "/notificacoes",
  "/painel",
  "/publicar",
  "/nova-organizacao",
  "/nova-playlist",
  "/perfil",
  "/perfil/editar",
  "/perfil/conquistas",
  "/minhas-organizacoes",
]);

function resolveSeoByPath(pathWithoutLocale: string): {
  title: string;
  description: string;
  keywords: string[];
} {
  if (pathWithoutLocale === "/") {
    return {
      title: "Feed de dublagens",
      description: "Acompanhe episódios, playlists, comunidades e oportunidades de dublagem.",
      keywords: ["dublagem", "feed", "episódios", "playlists", "comunidades"],
    };
  }

  if (pathWithoutLocale.startsWith("/comunidades")) {
    return {
      title: "Comunidades",
      description: "Explore comunidades de dublagem, siga projetos e acompanhe lançamentos.",
      keywords: ["comunidades", "dublagem", "projetos", "seguidores"],
    };
  }

  if (pathWithoutLocale.startsWith("/organizations/")) {
    if (
      /\/organizations\/[^/]+\/(editar|convidar)$/.test(pathWithoutLocale) ||
      /\/organizations\/[^/]+\/oportunidades\/novo$/.test(pathWithoutLocale) ||
      /\/organizations\/[^/]+\/oportunidades\/[^/]+\/(editar|inscricoes)$/.test(pathWithoutLocale)
    ) {
      return {
        title: "Gerenciar comunidade",
        description: "Gerencie membros, configurações e testes de dublagem da comunidade.",
        keywords: ["gerenciar comunidade", "membros", "convites", "dublagem"],
      };
    }

    return {
      title: "Comunidade",
      description: "Veja episódios, playlists e oportunidades publicadas pela comunidade.",
      keywords: ["comunidade", "playlists", "episódios", "dublagem"],
    };
  }

  if (pathWithoutLocale === "/oportunidades") {
    return {
      title: "Oportunidades de dublagem",
      description: "Encontre testes de dublagem abertos por comunidade, personagem e perfil de aparição.",
      keywords: ["oportunidades", "teste de dublagem", "papéis", "casting"],
    };
  }

  if (/^\/oportunidades\/[^/]+$/.test(pathWithoutLocale)) {
    return {
      title: "Detalhes da oportunidade",
      description: "Confira briefing, personagens e regras de inscrição do teste de dublagem.",
      keywords: ["detalhes da oportunidade", "inscrição", "personagens", "casting"],
    };
  }

  if (pathWithoutLocale === "/playlists") {
    return {
      title: "Playlists",
      description: "Descubra playlists, temporadas e episódios publicados pelas comunidades.",
      keywords: ["playlists", "temporadas", "episódios", "dublagem"],
    };
  }

  if (/^\/playlists\/[^/]+\/[^/]+\/watch$/.test(pathWithoutLocale)) {
    return {
      title: "Assistir playlist",
      description: "Player em tela dedicada para assistir episódios da playlist.",
      keywords: ["assistir", "player", "playlist", "episódio"],
    };
  }

  if (/^\/playlists\/[^/]+\/[^/]+$/.test(pathWithoutLocale)) {
    return {
      title: "Detalhes da playlist",
      description: "Veja temporadas e episódios da playlist, com reprodução contínua.",
      keywords: ["detalhes da playlist", "temporadas", "episódios", "player"],
    };
  }

  if (/^\/post\/[^/]+\/editar$/.test(pathWithoutLocale)) {
    return {
      title: "Editar episódio",
      description: "Atualize informações do episódio publicado.",
      keywords: ["editar episódio", "publicação", "dublagem"],
    };
  }

  if (/^\/post\/[^/]+$/.test(pathWithoutLocale)) {
    return {
      title: "Episódio",
      description: "Veja detalhes do episódio, mídia, créditos, comentários e interações.",
      keywords: ["episódio", "dublagem", "comentários", "créditos"],
    };
  }

  if (pathWithoutLocale.startsWith("/perfil/")) {
    return {
      title: "Perfil de dublador",
      description: "Conheça o perfil público do dublador, histórico de episódios e comunidades.",
      keywords: ["perfil", "dublador", "episódios", "comunidades"],
    };
  }

  if (pathWithoutLocale === "/status") {
    return {
      title: "Status e uptime",
      description: "Acompanhe disponibilidade e latência dos principais sistemas da plataforma.",
      keywords: ["status", "uptime", "latência", "monitoramento"],
    };
  }

  if (NOINDEX_EXACT_PATHS.has(pathWithoutLocale)) {
    return {
      title: "Área da conta",
      description: "Gerencie acesso, segurança e recursos da sua conta.",
      keywords: ["conta", "segurança", "configurações", "dublagem"],
    };
  }

  return {
    title: SEO_APP_NAME,
    description: SEO_DEFAULT_DESCRIPTION,
    keywords: ["dublagem", "comunidades", "playlists", "oportunidades"],
  };
}

function shouldNoIndex(pathWithoutLocale: string): boolean {
  if (NOINDEX_EXACT_PATHS.has(pathWithoutLocale)) {
    return true;
  }

  if (/^\/playlists\/[^/]+\/[^/]+\/watch$/.test(pathWithoutLocale)) {
    return true;
  }

  if (/^\/post\/[^/]+\/editar$/.test(pathWithoutLocale)) {
    return true;
  }

  if (/^\/organizations\/[^/]+\/(editar|convidar)$/.test(pathWithoutLocale)) {
    return true;
  }

  if (/^\/organizations\/[^/]+\/oportunidades\/novo$/.test(pathWithoutLocale)) {
    return true;
  }

  if (/^\/organizations\/[^/]+\/oportunidades\/[^/]+\/(editar|inscricoes)$/.test(pathWithoutLocale)) {
    return true;
  }

  return false;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return {};
  }

  const headerStore = await headers();
  const pathnameFromHeader = headerStore.get("x-dubflow-pathname") ?? toLocalePath(locale as Locale, "/");
  const { pathWithoutLocale } = parseLocalizedPathname(pathnameFromHeader, locale as Locale);

  const seo = resolveSeoByPath(pathWithoutLocale);
  const canonical = toLocalePath(locale as Locale, pathWithoutLocale);
  const noIndex = shouldNoIndex(pathWithoutLocale);

  return {
    title: `${seo.title} | ${SEO_APP_NAME}`,
    description: seo.description,
    keywords: seo.keywords,
    alternates: {
      canonical,
      languages: buildLocaleAlternates(pathWithoutLocale),
    },
    openGraph: {
      title: `${seo.title} | ${SEO_APP_NAME}`,
      description: seo.description,
      siteName: SEO_APP_NAME,
      url: canonical,
      type: "website",
      images: [{ url: SEO_DEFAULT_IMAGE, width: 1600, height: 600, alt: SEO_APP_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${seo.title} | ${SEO_APP_NAME}`,
      description: seo.description,
      images: [SEO_DEFAULT_IMAGE],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
          },
        }
      : {
          index: true,
          follow: true,
        },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const cookieStore = await cookies();
  const headerStore = await headers();
  const pathnameFromHeader = headerStore.get("x-dubflow-pathname") ?? toLocalePath(locale as Locale, "/");
  const { pathWithoutLocale } = parseLocalizedPathname(pathnameFromHeader, locale as Locale);
  const token = cookieStore.get("ed_token")?.value;
  const isAuthenticated = Boolean(token);
  const shouldUseBareLayout = pathWithoutLocale === "/entrar" || pathWithoutLocale === "/criar-conta";
  const currentUser = token && !shouldUseBareLayout ? await fetchCurrentUser(token) : null;
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SEO_APP_NAME,
    url: getSiteUrl(),
    description: SEO_DEFAULT_DESCRIPTION,
  };

  return (
    <div className="min-h-screen bg-[var(--color-page)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />
      {shouldUseBareLayout ? (
        children
      ) : (
        <>
          <TopNav
            locale={locale as Locale}
            isAuthenticated={isAuthenticated}
            currentUser={currentUser}
          />
          <MainShell>{children}</MainShell>
          <HomeTour locale={locale as Locale} isAuthenticated={isAuthenticated} />
        </>
      )}
    </div>
  );
}
