"use client";
import { useState, useEffect, useCallback } from "react";

interface Product {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  language: "fr" | "en";
  suggestedPriceUSD: number;
  tags: string[];
  kofiDescription: string;
  accentColor: string;
  pdfUrl: string;
  status: "pending" | "published";
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  "daily-planner": "Planificateur journalier",
  "weekly-planner": "Planificateur hebdomadaire",
  "monthly-planner": "Planificateur mensuel",
  "habit-tracker": "Suivi d'habitudes",
  "budget-tracker": "Suivi de budget",
  "meal-planner": "Planificateur de repas",
  "goal-planner": "Planificateur d'objectifs",
  "gratitude-journal": "Journal de gratitude",
};

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [genLang, setGenLang] = useState<"fr" | "en">("en");
  const [copied, setCopied] = useState(false);

  const fetchProducts = useCallback(async () => {
    const res = await fetch("/api/products");
    if (res.ok) setProducts(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  async function generate() {
    setGenerating(true);
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: genLang }),
    });
    if (res.ok) await fetchProducts();
    setGenerating(false);
  }

  async function markPublished(id: string) {
    await fetch("/api/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "publish" }),
    });
    await fetchProducts();
    setSelectedProduct(null);
  }

  async function deleteProduct(id: string) {
    await fetch("/api/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "delete" }),
    });
    await fetchProducts();
  }

  function copyDescription(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const pending = products.filter((p) => p.status === "pending");
  const published = products.filter((p) => p.status === "published");

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AutoPrint</h1>
          <p className="text-gray-500 text-sm mt-1">
            {pending.length} en attente · {published.length} publiés
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={genLang}
            onChange={(e) => setGenLang(e.target.value as "fr" | "en")}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="en">Anglais</option>
            <option value="fr">Français</option>
          </select>
          <button
            onClick={generate}
            disabled={generating}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? (
              <>
                <span className="animate-spin">⟳</span> Génération...
              </>
            ) : (
              "+ Générer un produit"
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total générés", value: products.length },
          { label: "En attente", value: pending.length },
          { label: "Publiés sur Ko-fi", value: published.length },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm">
            <p className="text-3xl font-bold text-gray-900">{s.value}</p>
            <p className="text-gray-500 text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Products en attente */}
      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Prêts à publier
          </h2>
          <div className="space-y-3">
            {pending.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4"
              >
                <div
                  className="w-3 h-12 rounded-full flex-shrink-0"
                  style={{ backgroundColor: p.accentColor }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 truncate">
                      {p.title}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {p.language.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm truncate">{p.subtitle}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {TYPE_LABELS[p.type] ?? p.type} · {p.suggestedPriceUSD}$ USD
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={p.pdfUrl}
                    target="_blank"
                    className="text-sm text-indigo-600 hover:underline font-medium"
                  >
                    Voir PDF
                  </a>
                  <button
                    onClick={() => setSelectedProduct(p)}
                    className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 font-medium"
                  >
                    Publier sur Ko-fi
                  </button>
                  <button
                    onClick={() => deleteProduct(p.id)}
                    className="text-red-400 hover:text-red-600 text-sm px-2"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Published */}
      {published.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Déjà publiés
          </h2>
          <div className="space-y-2">
            {published.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 opacity-70"
              >
                <div
                  className="w-2 h-8 rounded-full flex-shrink-0"
                  style={{ backgroundColor: p.accentColor }}
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-800">{p.title}</span>
                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Publié
                  </span>
                  <span className="ml-2 text-xs text-gray-400">
                    {p.language.toUpperCase()}
                  </span>
                </div>
                <a
                  href={p.pdfUrl}
                  target="_blank"
                  className="text-xs text-gray-400 hover:text-indigo-500"
                >
                  PDF
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && products.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">📄</p>
          <p className="font-medium">Aucun produit encore généré.</p>
          <p className="text-sm mt-1">Clique sur "+ Générer un produit" pour commencer.</p>
        </div>
      )}

      {/* Ko-fi Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Publier sur Ko-fi</h3>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="bg-indigo-50 rounded-xl p-4">
                <p className="font-semibold text-indigo-800 text-sm mb-2">
                  Étape 1 — Télécharge le PDF
                </p>
                <a
                  href={selectedProduct.pdfUrl}
                  target="_blank"
                  className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 inline-block"
                >
                  Télécharger le PDF
                </a>
              </div>

              {/* Step 2 */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="font-semibold text-gray-800 text-sm">
                  Étape 2 — Copie ces infos dans Ko-fi
                </p>

                <div>
                  <label className="text-xs text-gray-500 font-medium uppercase">Titre</label>
                  <div className="bg-white border rounded-lg p-2 mt-1 text-sm font-medium flex items-center justify-between">
                    <span>{selectedProduct.title}</span>
                    <button
                      onClick={() => copyDescription(selectedProduct.title)}
                      className="text-indigo-500 text-xs ml-2"
                    >
                      Copier
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-medium uppercase">Prix suggéré</label>
                  <div className="bg-white border rounded-lg p-2 mt-1 text-sm font-bold text-green-700">
                    {selectedProduct.suggestedPriceUSD} USD
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-medium uppercase">Description</label>
                  <div className="bg-white border rounded-lg p-2 mt-1 text-sm text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {selectedProduct.kofiDescription}
                  </div>
                  <button
                    onClick={() => copyDescription(selectedProduct.kofiDescription)}
                    className="text-indigo-500 text-xs mt-1 hover:underline"
                  >
                    {copied ? "Copié !" : "Copier la description"}
                  </button>
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-medium uppercase">Tags</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedProduct.tags.map((t) => (
                      <span key={t} className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-green-50 rounded-xl p-4">
                <p className="font-semibold text-green-800 text-sm mb-2">
                  Étape 3 — Publie sur Ko-fi
                </p>
                <a
                  href="https://ko-fi.com/manage/shop"
                  target="_blank"
                  className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 inline-block"
                >
                  Ouvrir Ko-fi Shop
                </a>
              </div>

              <button
                onClick={() => markPublished(selectedProduct.id)}
                className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800"
              >
                Marquer comme publié
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
