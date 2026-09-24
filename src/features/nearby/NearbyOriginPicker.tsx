"use client";

import { useId, useState } from "react";
import type { Coordinates } from "@/domain/geo";
import { useLang } from "@/i18n/LangContext";
import { t } from "@/i18n/dictionary";

export type NearbyOrigin = { coordinates: Coordinates; name: string };

type Props = {
  referenceName: string;
  activeOrigin: NearbyOrigin | null;
  onOriginChange: (origin: NearbyOrigin | null) => void;
};

type SearchState = "idle" | "loading" | "error";

export function NearbyOriginPicker({ referenceName, activeOrigin, onOriginChange }: Props) {
  const { lang, dict } = useLang();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    if (value.length < 2 || state === "loading") return;
    setState("loading");
    setMessage(null);
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`, { signal: AbortSignal.timeout(8_000) });
      const body = await response.json().catch(() => null);
      if (response.ok && body?.success && body.data) {
        const origin: NearbyOrigin = {
          coordinates: { latitude: body.data.latitude, longitude: body.data.longitude },
          name: body.data.name ?? value,
        };
        onOriginChange(origin);
        setMessage(t(lang, "nearbyFromAddress", { name: origin.name }));
        setState("idle");
        return;
      }
      setState("error");
      setMessage(response.status === 404 ? dict.nearbyAddressNotFound : dict.nearbyAddressError);
    } catch {
      setState("error");
      setMessage(dict.nearbyAddressError);
    }
  };

  const useCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      setMessage(t(lang, "nearbyFromRefFallback", { ref: referenceName }));
      return;
    }
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onOriginChange({
          coordinates: { latitude: position.coords.latitude, longitude: position.coords.longitude },
          name: dict.nearbyMyLocationName,
        });
        setMessage(dict.nearbyMyLocationMsg);
      },
      () => setMessage(t(lang, "nearbyLocationDenied", { ref: referenceName })),
      { enableHighAccuracy: false, timeout: 4_000, maximumAge: 60_000 },
    );
  };

  const messageText = message ?? (activeOrigin
    ? t(lang, "nearbyFromAddress", { name: activeOrigin.name })
    : t(lang, "nearbyFromRef", { ref: referenceName }));

  return (
    <div className="nearby-origin">
      <form className="nearby-origin-form" onSubmit={(event) => void submit(event)}>
        <label htmlFor={inputId}>{dict.nearbyAddressLabel}</label>
        <div className="nearby-origin-row">
          <input
            id={inputId}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={dict.nearbyAddressPlaceholder}
            disabled={state === "loading"}
            autoComplete="off"
          />
          <button type="submit" disabled={query.trim().length < 2 || state === "loading"}>
            {state === "loading" ? dict.nearbyAddressLoading : dict.nearbyAddressSubmit}
          </button>
        </div>
      </form>
      <div className="nearby-origin-actions">
        <button type="button" onClick={useCurrentLocation}>{dict.nearbyMyLocation}</button>
        {activeOrigin ? (
          <button type="button" onClick={() => { onOriginChange(null); setMessage(null); }}>
            {dict.nearbyOriginReset}
          </button>
        ) : null}
      </div>
      <p className="distance-note" role="status">{messageText}. {dict.nearbyDistanceNote}</p>
    </div>
  );
}
