"use client";

import { useRef, useState } from "react";
import {
  type PetProfile,
  DEFAULT_AVATARS,
  DOG_BREED_GROUPS,
  DOG_BREED_LIST,
  isDangerousBreed,
  savePetProfile,
} from "@/domain/pet-profile";
import type { ConditionKey } from "@/domain/types";
import { useLang } from "@/i18n/LangContext";

const CUSTOM_BREED_VALUE = "__custom__";
const PHOTO_MAX_EDGE = 256;

interface PetProfileModalProps {
  initialProfile: PetProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: PetProfile) => void;
}

export function PetProfileModal({
  initialProfile,
  isOpen,
  onClose,
  onSave,
}: PetProfileModalProps) {
  if (!isOpen) return null;
  return (
    <PetProfileForm
      initialProfile={initialProfile}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

// Downscale an uploaded photo to a small JPEG data URL so the profile fits
// comfortably in localStorage (~30-60KB).
function downscaleToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-failed"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("decode-failed"));
      image.onload = () => {
        const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("canvas-unavailable"));
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function PetProfileForm({
  initialProfile,
  onClose,
  onSave,
}: {
  initialProfile: PetProfile | null;
  onClose: () => void;
  onSave: (profile: PetProfile) => void;
}) {
  const { lang } = useLang();
  const [name, setName] = useState(initialProfile?.name ?? "보리");
  const [avatar, setAvatar] = useState(initialProfile?.avatar ?? "🐶");
  const [photo, setPhoto] = useState(initialProfile?.photo ?? "");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const savedBreed = initialProfile?.breed ?? "";
  const [breedChoice, setBreedChoice] = useState(
    savedBreed && !DOG_BREED_LIST.includes(savedBreed) ? CUSTOM_BREED_VALUE : savedBreed,
  );
  const [breedText, setBreedText] = useState(
    savedBreed && !DOG_BREED_LIST.includes(savedBreed) ? savedBreed : "",
  );
  const [weight, setWeight] = useState(initialProfile?.weight ?? "7.5");
  const [dangerousDog, setDangerousDog] = useState(initialProfile?.dangerousDog ?? false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentBreed = () => (breedChoice === CUSTOM_BREED_VALUE ? breedText : breedChoice);

  // Legally designated breeds flip the dangerous-dog checkbox on their own;
  // moving away from one clears it again unless the user re-checks manually.
  const syncDangerousDog = (nextBreed: string, previousBreed: string) => {
    if (isDangerousBreed(nextBreed)) {
      setDangerousDog(true);
    } else if (isDangerousBreed(previousBreed)) {
      setDangerousDog(false);
    }
  };

  const handleBreedSelect = (value: string) => {
    const previous = currentBreed();
    setBreedChoice(value);
    if (value !== CUSTOM_BREED_VALUE) syncDangerousDog(value, previous);
  };

  const handleBreedText = (value: string) => {
    const previous = currentBreed();
    setBreedText(value);
    syncDangerousDog(value, previous);
  };

  const handlePhotoFile = async (file: File | undefined) => {
    setPhotoError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError(lang === "ko" ? "이미지 파일을 선택해 주세요." : "Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setPhotoError(lang === "ko" ? "파일이 너무 큽니다 (최대 8MB)." : "File is too large (max 8MB).");
      return;
    }
    try {
      const dataUrl = await downscaleToDataUrl(file);
      setPhoto(dataUrl);
    } catch {
      setPhotoError(lang === "ko" ? "사진을 불러오지 못했습니다." : "Could not load the photo.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const wNum = parseFloat(weight);
    let size: ConditionKey | null = null;
    if (Number.isFinite(wNum) && wNum > 0) {
      size = wNum < 10 ? "smallDog" : wNum < 25 ? "mediumDog" : "largeDog";
    }
    const updated: PetProfile = {
      name: name.trim() || (lang === "ko" ? "댕댕이" : "My Pet"),
      avatar,
      ...(photo ? { photo } : {}),
      breed: currentBreed().trim(),
      weight: weight.trim(),
      size,
      dangerousDog: dangerousDog || isDangerousBreed(currentBreed()),
    };
    savePetProfile(updated);
    onSave(updated);
    onClose();
  };

  return (
    <div className="pet-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pet-modal-title">
      <div className="pet-modal-card">
        <div className="pet-modal-header">
          <div className="pet-modal-title-wrap">
            <span className="pet-modal-icon">🐾</span>
            <h3 id="pet-modal-title" className="pet-modal-title">
              {lang === "ko" ? "내 반려견 프로필 등록" : "Register Pet Profile"}
            </h3>
          </div>
          <button type="button" className="pet-modal-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pet-modal-form">
          <div className="avatar-picker-row">
            <label className="field-label">{lang === "ko" ? "캐릭터 · 사진 선택" : "Avatar / Photo"}</label>
            <div className="avatar-options">
              {photo ? (
                <span className={`avatar-btn selected photo`} style={{ position: "relative", padding: 0, overflow: "hidden" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded data URL preview */}
                  <img
                    src={photo}
                    alt={lang === "ko" ? "내 반려견 사진" : "My dog"}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit", display: "block" }}
                  />
                  <button
                    type="button"
                    onClick={() => setPhoto("")}
                    aria-label={lang === "ko" ? "사진 제거" : "Remove photo"}
                    style={{ position: "absolute", top: 0, right: 0, border: "none", background: "rgba(0,0,0,.55)", color: "#fff", borderRadius: "0 0 0 8px", fontSize: "12px", lineHeight: "16px", padding: "2px 6px", cursor: "pointer" }}
                  >
                    ✕
                  </button>
                </span>
              ) : null}
              {DEFAULT_AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  className={`avatar-btn ${!photo && avatar === av ? "selected" : ""}`}
                  onClick={() => { setPhoto(""); setAvatar(av); }}
                >
                  {av}
                </button>
              ))}
              <button
                type="button"
                className={`avatar-btn upload ${photo ? "" : "selected"}`}
                onClick={() => fileInputRef.current?.click()}
                title={lang === "ko" ? "사진 올리기" : "Upload photo"}
              >
                📷
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                void handlePhotoFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {photoError ? <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#dc2626" }}>{photoError}</p> : null}
          </div>

          <div className="form-field">
            <label htmlFor="pet-name-input" className="field-label">
              {lang === "ko" ? "반려견 이름" : "Pet Name"}
            </label>
            <input
              id="pet-name-input"
              type="text"
              className="pet-text-input"
              placeholder={lang === "ko" ? "예: 초코, 보리, 루이" : "e.g. Bella, Max"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-row-two">
            <div className="form-field">
              <label htmlFor="pet-breed-input" className="field-label">
                {lang === "ko" ? "견종 (선택)" : "Breed (Optional)"}
              </label>
              <select
                id="pet-breed-input"
                className="pet-text-input"
                value={breedChoice}
                onChange={(e) => handleBreedSelect(e.target.value)}
              >
                <option value="">{lang === "ko" ? "선택 안 함" : "Not selected"}</option>
                {DOG_BREED_GROUPS.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.breeds.map((breed) => (
                      <option key={breed} value={breed}>{breed}</option>
                    ))}
                  </optgroup>
                ))}
                <option value={CUSTOM_BREED_VALUE}>{lang === "ko" ? "직접 입력…" : "Enter manually…"}</option>
              </select>
              {breedChoice === CUSTOM_BREED_VALUE ? (
                <input
                  type="text"
                  className="pet-text-input"
                  style={{ marginTop: "8px" }}
                  placeholder={lang === "ko" ? "예: 말티푸, 아키타 믹스" : "e.g. Maltipoo"}
                  value={breedText}
                  onChange={(e) => handleBreedText(e.target.value)}
                />
              ) : null}
              {isDangerousBreed(currentBreed()) ? (
                <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#b45309" }}>
                  {lang === "ko"
                    ? "동물보호법상 맹견 품종입니다 — 아래 항목이 자동으로 체크됩니다."
                    : "Legally designated dangerous breed — the checkbox below is auto-checked."}
                </p>
              ) : null}
            </div>

            <div className="form-field">
              <label htmlFor="pet-weight-input" className="field-label">
                {lang === "ko" ? "몸무게 (kg)" : "Weight (kg)"}
              </label>
              <input
                id="pet-weight-input"
                type="number"
                step="0.1"
                min="0.5"
                max="90"
                className="pet-text-input"
                placeholder="7.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                required
              />
            </div>
          </div>

          <label className="checkbox-field-row">
            <input
              type="checkbox"
              checked={dangerousDog}
              onChange={(e) => setDangerousDog(e.target.checked)}
            />
            <span>
              {lang === "ko"
                ? "동물보호법상 5대 맹견 품종에 해당합니다"
                : "Belongs to restricted dog breed category"}
            </span>
          </label>

          <div className="pet-modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              {lang === "ko" ? "취소" : "Cancel"}
            </button>
            <button type="submit" className="btn-save">
              {lang === "ko" ? "프로필 저장 & 맞춤 적용" : "Save & Apply Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
