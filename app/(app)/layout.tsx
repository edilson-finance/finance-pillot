import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { DateRangeProvider } from "@/lib/date-context"
import { CompanyProvider } from "@/lib/company-context"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CompanyProvider>
    <DateRangeProvider>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg-primary)" }}>
        <Sidebar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <Topbar />
          <main style={{ flex: 1, overflowY: "auto", background: "var(--bg-primary)" }}>
            {children}
          </main>
        </div>
      </div>
    </DateRangeProvider>
    </CompanyProvider>
  )
}
