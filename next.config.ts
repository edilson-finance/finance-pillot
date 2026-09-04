import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Anexos de lançamentos (NF/boleto/comprovante) chegam via Server Action.
    // O padrão de 1MB estoura com PDFs. A Vercel limita o corpo de funções a ~4,5MB,
    // então 4MB é o teto seguro (validado também no cliente).
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  // Headers de segurança aplicados a todas as rotas. NB: Content-Security-Policy
  // NÃO está aqui de propósito — o app usa inline styles e um script de tema inline,
  // então uma CSP exige nonce dedicado (ver docs/ CSP guide) para não quebrar tudo.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Força HTTPS por 2 anos (o deploy é sempre HTTPS na Vercel).
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          // Anti-clickjacking: não permite embutir o app em iframe de outra origem.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Impede o browser de "adivinhar" o MIME type (anti MIME-sniffing).
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Não vaza a URL interna como Referer para outros sites.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Desliga APIs sensíveis do browser que o app não usa.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
