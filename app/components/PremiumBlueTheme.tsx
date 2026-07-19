export function PremiumBlueTheme() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          :root {
            --auto9-blue-premium: #4F8EA8;
            --auto9-blue-premium-light: #A7D8EA;
            --auto9-blue-premium-rgb: 79, 142, 168;
          }

          [class~="text-[#B8C7D1]"] {
            color: var(--auto9-blue-premium) !important;
          }

          [class~="text-[#4D8DFF]"] {
            color: var(--auto9-blue-premium-light) !important;
          }

          [class~="hover:text-[#B8C7D1]"]:hover {
            color: var(--auto9-blue-premium) !important;
          }

          [class~="hover:text-[#4D8DFF]"]:hover {
            color: var(--auto9-blue-premium-light) !important;
          }

          .group:hover [class~="group-hover:text-[#B8C7D1]"] {
            color: var(--auto9-blue-premium) !important;
          }

          .group:hover [class~="group-hover:text-[#4D8DFF]"] {
            color: var(--auto9-blue-premium-light) !important;
          }

          [class~="bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)]"],
          [class~="hover:bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)]"]:hover {
            background-color: var(--auto9-blue-premium) !important;
          }

          [class~="bg-[#4D8DFF]"],
          [class~="hover:bg-[#4D8DFF]"]:hover {
            background-color: var(--auto9-blue-premium-light) !important;
          }

          [class~="bg-[#B8C7D1]/5"] {
            background-color: rgba(var(--auto9-blue-premium-rgb), 0.05) !important;
          }

          [class~="bg-[#B8C7D1]/5"] {
            background-color: rgba(var(--auto9-blue-premium-rgb), 0.10) !important;
          }

          [class~="bg-[#B8C7D1]/20"] {
            background-color: rgba(var(--auto9-blue-premium-rgb), 0.20) !important;
          }

          [class~="bg-[#B8C7D1]/35"] {
            background-color: rgba(var(--auto9-blue-premium-rgb), 0.35) !important;
          }

          [class~="border-[#B8C7D1]"] {
            border-color: var(--auto9-blue-premium) !important;
          }

          [class~="border-[#B8C7D1]/20"] {
            border-color: rgba(var(--auto9-blue-premium-rgb), 0.20) !important;
          }

          [class~="border-[#B8C7D1]/20"] {
            border-color: rgba(var(--auto9-blue-premium-rgb), 0.30) !important;
          }

          [class~="border-[#B8C7D1]/25"] {
            border-color: rgba(var(--auto9-blue-premium-rgb), 0.40) !important;
          }

          [class~="border-[#B8C7D1]/20"] {
            border-color: rgba(var(--auto9-blue-premium-rgb), 0.45) !important;
          }

          [class~="border-[#B8C7D1]/60"] {
            border-color: rgba(var(--auto9-blue-premium-rgb), 0.60) !important;
          }

          [class~="hover:border-[#B8C7D1]"]:hover {
            border-color: var(--auto9-blue-premium) !important;
          }

          [class~="hover:border-[#B8C7D1]/25"]:hover {
            border-color: rgba(var(--auto9-blue-premium-rgb), 0.40) !important;
          }

          [class~="hover:border-[#B8C7D1]/20"]:hover {
            border-color: rgba(var(--auto9-blue-premium-rgb), 0.45) !important;
          }

          [class~="hover:border-[#B8C7D1]/60"]:hover {
            border-color: rgba(var(--auto9-blue-premium-rgb), 0.60) !important;
          }

          [class~="shadow-[0_0_70px_rgba(184,199,209,.18)]"] {
            box-shadow: 0 0 70px rgba(var(--auto9-blue-premium-rgb), 0.18) !important;
          }

          [class~="hover:shadow-[0_0_55px_rgba(184,199,209,.12)]"]:hover {
            box-shadow: 0 0 55px rgba(var(--auto9-blue-premium-rgb), 0.12) !important;
          }

          [class~="bg-[radial-gradient(circle_at_75%_20%,rgba(184,199,209,.30),transparent_30%)]"] {
            background-image: radial-gradient(
              circle at 75% 20%,
              rgba(var(--auto9-blue-premium-rgb), 0.30),
              transparent 30%
            ) !important;
          }

          [class~="bg-[linear-gradient(145deg,rgba(184,199,209,.16),rgba(255,255,255,.035))]"] {
            background-image: linear-gradient(
              145deg,
              rgba(var(--auto9-blue-premium-rgb), 0.16),
              rgba(255,255,255,0.035)
            ) !important;
          }

          [class~="from-[#B8C7D1]"] {
            --tw-gradient-from: var(--auto9-blue-premium) var(--tw-gradient-from-position) !important;
            --tw-gradient-to: rgba(var(--auto9-blue-premium-rgb), 0) var(--tw-gradient-to-position) !important;
          }

          [class~="via-[#B8C7D1]"] {
            --tw-gradient-to: rgba(var(--auto9-blue-premium-rgb), 0) var(--tw-gradient-to-position) !important;
            --tw-gradient-stops: var(--tw-gradient-from), var(--auto9-blue-premium) var(--tw-gradient-via-position), var(--tw-gradient-to) !important;
          }

          [class~="to-[#B8C7D1]"] {
            --tw-gradient-to: var(--auto9-blue-premium) var(--tw-gradient-to-position) !important;
          }
        `,
      }}
    />
  );
}