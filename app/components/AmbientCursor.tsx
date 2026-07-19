"use client";

import { useEffect, useState } from "react";

export function AmbientCursor() {
  const [position, setPosition] = useState({ x: 50, y: 20 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setPosition({
        x: (event.clientX / window.innerWidth) * 100,
        y: (event.clientY / window.innerHeight) * 100,
      });

      setVisible(true);
    };

    const handleMouseLeave = () => {
      setVisible(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-[1] hidden transition-opacity duration-700 md:block ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{
        background: `radial-gradient(circle at ${position.x}% ${position.y}%, rgba(184,199,209,0.13), transparent 22%)`,
      }}
    />
  );
}
