const modules = [
  "Visão geral operacional",
  "Usuários e contas",
  "Organizações e membros",
  "Conteúdo (posts, playlists e mídia)",
  "Comentários e interações",
  "Oportunidades e inscrições",
  "Denúncias e takedown",
  "Reincidência e sanções",
  "Contestação (appeal)",
  "Jurídico/documental",
  "Comunicação e notificações",
  "Segurança e auditoria",
  "Suporte e atendimento",
  "Métricas e relatórios",
  "Configurações e integrações",
];

const navigation = [
  "Dashboard",
  "Moderação",
  "Jurídico",
  "Usuários",
  "Relatórios",
  "Configurações",
];

function App() {
  const logoColor = `${import.meta.env.BASE_URL}branding/logo-cor.png`;
  const logoWhite = `${import.meta.env.BASE_URL}branding/logo-white.png`;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <img src={logoWhite} alt="DubFlow" className="sidebar-logo" />
        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <button type="button" key={item} className="nav-item">
              {item}
            </button>
          ))}
        </nav>
        <span className="sidebar-badge">Admin v1 (base)</span>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div className="header-brand">
            <img src={logoColor} alt="DubFlow" className="header-logo" />
            <div>
              <p className="header-title">Painel de Gestão</p>
              <p className="header-subtitle">Base moderna em React + Vite</p>
            </div>
          </div>
          <span className="env-tag">Ambiente local</span>
        </header>

        <section className="summary-grid">
          <article className="summary-card">
            <h2>Estado do painel</h2>
            <p>Estrutura inicial pronta para evoluir módulos administrativos.</p>
          </article>
          <article className="summary-card">
            <h2>Tecnologia</h2>
            <p>React 19, Vite 7 e build estático em <code>/public/admin</code>.</p>
          </article>
          <article className="summary-card">
            <h2>Rota de acesso</h2>
            <p><code>/admin</code> (via redirecionamento local para o dev server).</p>
          </article>
        </section>

        <section className="modules-section">
          <div className="section-header">
            <h2>Módulos do painel</h2>
            <p>Estrutura inicial para organização da camada administrativa.</p>
          </div>
          <div className="modules-grid">
            {modules.map((name, index) => (
              <article key={name} className="module-card">
                <span className="module-id">Módulo {String(index + 1).padStart(2, "0")}</span>
                <h3>{name}</h3>
                <p>Status: planejado para implementação incremental.</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
