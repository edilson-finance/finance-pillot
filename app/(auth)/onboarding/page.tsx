import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { OnboardingForm } from "./onboarding-form"

// Onboarding fica fora do layout (app) para não exigir perfil (senão um
// usuário recém-criado, ainda sem perfil, entraria em loop de redirecionamento).
// Aqui aplicamos a guarda no servidor: quem já tem perfil vai direto ao app;
// quem não está logado vai para o login. Só cadastros sem perfil veem o form.
export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile } = await supabase
    .from("profiles").select("id").eq("id", user.id).maybeSingle()
  if (profile) redirect("/dashboard")
  return <OnboardingForm />
}
