import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { DateRangeProvider } from "@/lib/date-context"
import { CompanyProvider } from "@/lib/company-context"
import { SessionProvider } from "@/lib/session-context"
import { MobileNavProvider } from "@/lib/mobile-nav"
import { getSessionContext } from "@/lib/auth"
import { getCompanySettings } from "@/lib/db/company"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [session, company] = await Promise.all([getSessionContext(), getCompanySettings()])
  return (
    <SessionProvider value={session}>
    <CompanyProvider initialType={company?.type} initialLogoUrl={company?.logo_url} initialName={company?.name}>
    <DateRangeProvider>
    <MobileNavProvider>
      <a href="#main-content" className="skip-link">Pular para o conteúdo</a>
      <div style={{ display: "flex", height: "100dvh", overflow: "hidden", background: "var(--bg-primary)" }}>
        <Sidebar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <Topbar />
          <main id="main-content" tabIndex={-1} style={{ flex: 1, overflowY: "auto", background: "var(--bg-primary)", outline: "none" }}>
            {children}
          </main>
        </div>
      </div>
    </MobileNavProvider>
    </DateRangeProvider>
    </CompanyProvider>
    </SessionProvider>
  )
}
