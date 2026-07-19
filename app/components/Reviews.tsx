const reviews = [
  {
    name: "Cece Lorenzo",
    car: "Avis Google · Visité en janvier",
    text: "Merci à Nicolas pour la prestation effectuée enfin un vrai professionnel qui est disponible rapidement j’ai eu l’occasion de travailler avec d’autres prestataires et je t’enverrai toutes mes voitures désormais, à bientôt !",
  },
  {
    name: "Juline Chahbouni",
    car: "Avis Google · Visité en décembre 2025",
    text: "Ma voiture redevenue comme neuve. Avec 3 enfants je pensais pas que c’était possible. Il a fait des miracles. Et l’odeur qui reste à la fin une merveille. Je recommande.",
  },
  {
    name: "TWIICE AUTO - SALON",
    car: "Avis Google · Partenaire professionnel",
    text: "Nicolas est un professionnel passionné, sérieux, réactif et extrêmement méticuleux : le meilleur de la région pour tout type de préparation. Nous recommandons +++",
  },
];

export function Reviews() {
  return (
    <section className="border-t border-white/10 bg-[#050608] px-6 py-28 md:px-12">
      <div className="mx-auto max-w-7xl">
        <p className="mb-6 text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
          Avis clients
        </p>

        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <h2 className="max-w-5xl text-5xl font-black uppercase tracking-[-0.05em] md:text-7xl">
            Ils valident AUTO 9.
          </h2>

          <div className="w-fit rounded-full border border-[#B8C7D1]/25 bg-[#B8C7D1]/5 px-6 py-4">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#B8C7D1]">
              Avis Google vérifiés
            </p>
          </div>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {reviews.map((review) => (
            <article
              key={review.name}
              className="flex min-h-[420px] flex-col rounded-3xl border border-white/10 bg-white/[0.035] p-8 transition hover:-translate-y-2 hover:border-[#B8C7D1]/20"
            >
              <p className="text-3xl leading-none text-[#B8C7D1]">★★★★★</p>

              <p className="mt-8 flex-1 text-xl leading-relaxed text-white/75">
                “{review.text}”
              </p>

              <div className="mt-10 border-t border-white/10 pt-6">
                <p className="font-black uppercase tracking-[0.2em]">
                  {review.name}
                </p>

                <p className="mt-2 text-sm text-white/40">{review.car}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
