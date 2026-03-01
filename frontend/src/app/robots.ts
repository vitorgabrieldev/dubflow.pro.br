import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/*/entrar",
          "/*/criar-conta",
          "/*/recuperar-senha",
          "/*/redefinir-senha",
          "/*/mensagens",
          "/*/notificacoes",
          "/*/painel",
          "/*/publicar",
          "/*/nova-organizacao",
          "/*/nova-playlist",
          "/*/perfil/editar",
          "/*/perfil/conquistas",
          "/*/minhas-organizacoes",
          "/*/alterar-senha",
          "/*/playlists/*/*/watch",
          "/*/post/*/editar",
          "/*/organizations/*/editar",
          "/*/organizations/*/convidar",
          "/*/organizations/*/oportunidades/novo",
          "/*/organizations/*/oportunidades/*/editar",
          "/*/organizations/*/oportunidades/*/inscricoes",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
