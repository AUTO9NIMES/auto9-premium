"use client";

import { useEffect, useRef, useState } from "react";

type Recognition = {
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};
type RecognitionWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export default function VoiceInput({ onTranscript }: { onTranscript: (text: string) => string }) {
  const active = useRef<Recognition | null>(null);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => () => {
    const recognition = active.current;
    if (!recognition) return;
    recognition.onresult = recognition.onerror = recognition.onend = null;
    recognition.abort();
  }, []);

  function toggle() {
    if (active.current) {
      active.current.onresult = null;
      active.current.abort();
      return;
    }

    const browser = window as RecognitionWindow;
    const Engine = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Engine) {
      setMessage("Utilise le micro de ton clavier pour dicter dans le champ.");
      return;
    }

    const recognition = new Engine();
    recognition.lang = "fr-FR";
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (!transcript) return;
      setMessage(onTranscript(transcript));
    };
    recognition.onerror = ({ error }) => {
      if (error !== "aborted") {
        setMessage("La dictée est indisponible. Utilise le micro du clavier ou saisis le rendez-vous.");
      }
    };
    recognition.onend = () => {
      active.current = null;
      setListening(false);
    };

    try {
      active.current = recognition;
      recognition.start();
      setMessage("");
      setListening(true);
    } catch {
      active.current = null;
      setListening(false);
      setMessage("Le micro est indisponible. Tu peux dicter avec le clavier.");
    }
  }

  return (
    <div className="mt-3 space-y-1">
      <button type="button" className="crm-btn" aria-pressed={listening} onClick={toggle}>
        {listening ? "Arrêter la dictée" : "Dicter un rendez-vous"}
      </button>
      <p className="crm-muted text-xs">Ton navigateur peut envoyer l’audio à son service de reconnaissance vocale.</p>
      {(listening || message) && <p role="status" className="crm-muted text-sm">{listening ? "Je t’écoute…" : message}</p>}
    </div>
  );
}
