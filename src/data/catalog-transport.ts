import type { CatalogPage } from "@/data/catalog";

export function compactCatalogForTransport(catalog: CatalogPage) {
  return {
    ...catalog,
    results: catalog.results.map(({ place, proof, exact, status }) => {
      const publicPlace = Object.fromEntries(Object.entries(place).filter(([key]) => key !== "facts"));
      return {
        place: {
          ...publicPlace,
          requiredPreparations: place.requiredPreparations.map(({ key, label, scope }) => ({ key, label, scope })),
        },
        exact,
        status,
        proof: proof.map(({ constraint, fact, evidence }) => ({
          constraint,
          fact: { key: fact.key, value: fact.value, requirements: fact.requirements },
          evidence: {
            sourceUrl: evidence.sourceUrl,
            observedAt: evidence.observedAt,
            excerpt: evidence.excerpt,
          },
        })),
      };
    }),
  };
}
