import { createClient } from "@supabase/supabase-js"

// Client Supabase com a chave SECRETA (service role) — IGNORA a RLS.
//
// Uso EXCLUSIVO no servidor (server actions / route handlers) para operações
// privilegiadas que a RLS do usuário não consegue executar — hoje, o upload da
// logo no Storage. Investigamos a fundo: mesmo com uma policy permissiva
// (WITH CHECK (true)) o Storage nega o INSERT vindo do token do usuário, mas
// aceita a chave service role. Em vez de afrouxar a segurança do bucket, a
// operação roda no servidor com esta chave.
//
// Segurança: a chave NÃO tem o prefixo NEXT_PUBLIC_, então o Next nunca a
// embute no bundle do navegador. O escopo (a empresa do usuário) é SEMPRE
// derivado da sessão autenticada ANTES de chamar este client — o caminho do
// arquivo fica preso a `${company_id}/...`, sem como gravar na pasta de outra
// empresa. NUNCA importe este módulo em componentes client.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !secret) {
    throw new Error(
      "Configuração ausente: defina SUPABASE_SERVICE_ROLE_KEY no ambiente do servidor.",
    )
  }
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
