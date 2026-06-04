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
};

export default nextConfig;
