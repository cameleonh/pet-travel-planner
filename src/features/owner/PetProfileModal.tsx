"use client";

import { useState } from "react";
import { type PetProfile, DEFAULT_AVATARS, savePetProfile } from "@/domain/pet-profile";
import type { ConditionKey } from "@/domain/types";
import { useLang } from "@/i18n/LangContext";

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
  const [breed, setBreed] = useState(initialProfile?.breed ?? "");
  const [weight, setWeight] = useState(initialProfile?.weight ?? "7.5");
  const [dangerousDog, setDangerousDog] = useState(initialProfile?.dangerousDog ?? false);

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
      breed: breed.trim(),
      weight: weight.trim(),
      size,
      dangerousDog,
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
            <label className="field-label">{lang === "ko" ? "캐릭터 선택" : "Choose Avatar"}</label>
            <div className="avatar-options">
              {DEFAULT_AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  className={`avatar-btn ${avatar === av ? "selected" : ""}`}
                  onClick={() => setAvatar(av)}
                >
                  {av}
                </button>
              ))}
            </div>
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
              <input
                id="pet-breed-input"
                type="text"
                className="pet-text-input"
                placeholder={lang === "ko" ? "예: 말티푸, 비숑, 골든리트리버" : "e.g. Poodle"}
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
              />
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
