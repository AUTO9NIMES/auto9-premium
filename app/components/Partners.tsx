const partners = [
  { src: "/partner-supercars.png", name: "Supercars" },
  { src: "/partner-driving-spirit.png", name: "Driving Spirit" },
  { src: "/partner-crystalcars.png", name: "Crystal Cars" },
  { src: "/partner-twiice.png", name: "Twiice Auto" },
  { src: "/partner-renault.png", name: "Renault" },
];

export function Partners() {
  return (
    <div className="relative z-10 px-6 pb-10 md:px-12">
      <div className="overflow-hidden border border-white/10 bg-white/[0.035] py-5 backdrop-blur">
        <div className="flex w-max animate-[scroll_28s_linear_infinite] items-center gap-16 px-8">
          {[...partners, ...partners, ...partners].map((logo, index) => (
            <img
              key={index}
              src={logo.src}
              alt={`Entreprise pour laquelle AUTO 9 a réalisé des prestations : ${logo.name}`}
              className="h-12 w-auto max-w-[160px] object-contain opacity-90 saturate-100 transition duration-300 hover:scale-105 hover:opacity-100"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
