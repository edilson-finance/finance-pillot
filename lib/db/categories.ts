import { createClient } from "@/lib/supabase/server"

export type CategoryAba = "receita" | "despesa" | "neutra"

export interface CategoryNode {
  id: string
  code: string | null
  name: string
  grupo: string | null
  kind: string
  parent_id: string | null
  is_synthetic: boolean
  active: boolean
  sort_order: number
  description: string | null
  dre_label: string | null
  dre_cor: string | null
  dre_position: string | null
  aba: CategoryAba | null
  children: CategoryNode[]
}

interface Row {
  id: string
  code: string | null
  name: string
  grupo: string | null
  kind: string
  parent_id: string | null
  is_synthetic: boolean
  active: boolean
  sort_order: number
  description: string | null
  dre_groups: { label: string; cor: string; dre_position: string; aba: CategoryAba } | null
}

export interface CategoryTree {
  receita: CategoryNode[]
  despesa: CategoryNode[]
  neutra: CategoryNode[]
}

const SELECT_COLS =
  "id, code, name, grupo, kind, parent_id, is_synthetic, active, sort_order, description, dre_groups(label, cor, dre_position, aba)"

function toNode(r: Row): CategoryNode {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    grupo: r.grupo,
    kind: r.kind,
    parent_id: r.parent_id,
    is_synthetic: r.is_synthetic,
    active: r.active,
    sort_order: r.sort_order,
    description: r.description,
    dre_label: r.dre_groups?.label ?? null,
    dre_cor: r.dre_groups?.cor ?? null,
    dre_position: r.dre_groups?.dre_position ?? null,
    aba: r.dre_groups?.aba ?? null,
    children: [],
  }
}

async function fetchRows(): Promise<CategoryNode[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categories")
    .select(SELECT_COLS)
    .order("code", { ascending: true, nullsFirst: false })
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as Row[]).map(toNode)
}

export async function listCategoryTree(): Promise<CategoryTree> {
  const nodes = await fetchRows()
  const byId = new Map<string, CategoryNode>()
  for (const n of nodes) byId.set(n.id, n)

  const roots: CategoryNode[] = []
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) byId.get(node.parent_id)!.children.push(node)
    else roots.push(node)
  }

  const sortRec = (ns: CategoryNode[]) => {
    ns.sort((a, b) => a.sort_order - b.sort_order || (a.code ?? "").localeCompare(b.code ?? ""))
    ns.forEach((n) => sortRec(n.children))
  }
  sortRec(roots)

  return {
    receita: roots.filter((n) => n.aba === "receita"),
    despesa: roots.filter((n) => n.aba === "despesa"),
    neutra: roots.filter((n) => n.aba === "neutra"),
  }
}

/** Folhas analíticas selecionáveis em lançamentos (não sintéticas, ativas). */
export async function listSelectableCategories(): Promise<CategoryNode[]> {
  const nodes = await fetchRows()
  return nodes
    .filter((n) => !n.is_synthetic && n.active)
    .sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""))
}

/**
 * Compat: usado pelos pickers de lançamentos (transactions/receivables/payables).
 * Retorna SÓ folhas analíticas, com o código embutido no nome para exibição.
 */
export async function listCategories(): Promise<{ id: string; name: string; kind: string; code: string | null }[]> {
  const leaves = await listSelectableCategories()
  return leaves.map((n) => ({
    id: n.id,
    name: n.code ? `${n.code} · ${n.name}` : n.name,
    kind: n.kind,
    code: n.code,
  }))
}
