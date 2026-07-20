"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { z } from "zod";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

const userSchema = z.object({ id: z.string(), email: z.string(), displayName: z.string(), role: z.enum(["traveler", "pending_owner", "owner", "admin"]) });
const sessionSchema = z.object({ authenticated: z.boolean(), user: userSchema.nullable() });
const claimSchema = z.object({ id: z.string(), placeId: z.string(), status: z.enum(["pending", "approved", "rejected"]), businessPhone: z.string().nullable(), note: z.string().nullable(), createdAt: z.string() });
const claimsResponseSchema = z.object({ success: z.boolean(), claims: z.array(claimSchema), user: userSchema });
const closureSchema = z.object({ id: z.string(), placeId: z.string(), closureKind: z.enum(["weekly", "date"]), weekday: z.number().nullable(), closureDate: z.string().nullable(), reason: z.string(), updatedAt: z.string() });
const closuresResponseSchema = z.object({ success: z.boolean(), closures: z.array(closureSchema) });
type User = z.infer<typeof userSchema>;
type Claim = z.infer<typeof claimSchema>;
type Closure = z.infer<typeof closureSchema>;

const weekdayLabels = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"] as const;

async function readJson<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const body: unknown = await response.json();
  if (!response.ok) throw new Error(body && typeof body === "object" && "error" in body ? String((body as { error?: { message?: unknown } }).error?.message ?? "요청을 처리하지 못했습니다.") : "요청을 처리하지 못했습니다.");
  return schema.parse(body);
}

export function OwnerPortal(): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [closures, setClosures] = useState<Closure[]>([]);
  const [placeId, setPlaceId] = useState("");
  const [closureKind, setClosureKind] = useState<"weekly" | "date">("weekly");
  const [weekday, setWeekday] = useState("1");
  const [closureDate, setClosureDate] = useState("");
  const [reason, setReason] = useState("정기 휴무");
  const [businessPhone, setBusinessPhone] = useState("");
  const [notice, setNotice] = useState("운영자 로그인 상태를 확인하는 중입니다.");

  const loadClaims = async (): Promise<void> => {
    const response = await fetch("/api/owner/claims", { cache: "no-store" });
    const data = await readJson(response, claimsResponseSchema);
    setUser(data.user);
    setClaims(data.claims);
    const approved = data.claims.find((claim) => claim.status === "approved");
    if (approved) setPlaceId(approved.placeId);
    setNotice(approved ? "승인된 장소의 휴무를 관리할 수 있습니다." : "장소를 등록하면 운영자 승인 절차가 시작됩니다.");
  };

  const loadSession = async (): Promise<void> => {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    const data = await readJson(response, sessionSchema);
    if (!data.authenticated || !data.user) {
      setNotice("Google 계정으로 로그인하면 운영자 장소를 등록할 수 있습니다.");
      return;
    }
    await loadClaims();
  };

  const loadClosures = async (selectedPlaceId: string): Promise<void> => {
    if (!selectedPlaceId) { setClosures([]); return; }
    const response = await fetch(`/api/owner/closures?placeId=${encodeURIComponent(selectedPlaceId)}`, { cache: "no-store" });
    const data = await readJson(response, closuresResponseSchema);
    setClosures(data.closures);
  };

  useEffect(() => {
    void loadSession().catch((error: unknown) => setNotice(error instanceof Error ? error.message : "로그인 상태를 확인하지 못했습니다."));
  }, []);

  useEffect(() => {
    void loadClosures(placeId).catch((error: unknown) => setNotice(error instanceof Error ? error.message : "휴무 정보를 불러오지 못했습니다."));
  }, [placeId]);

  const submitClaim = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setNotice("장소 등록을 저장하는 중입니다.");
    try {
      const response = await fetch("/api/owner/claims", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ placeId, businessPhone, note: "관광지 운영자 본인 확인 요청" }) });
      await readJson(response, z.object({ success: z.boolean(), claim: claimSchema }));
      await loadClaims();
      setNotice("장소 등록 요청이 저장되었습니다. 승인 전에는 휴무를 수정할 수 없습니다.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "장소 등록에 실패했습니다."); }
  };

  const submitClosure = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    try {
      const response = await fetch("/api/owner/closures", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ placeId, closureKind, weekday: closureKind === "weekly" ? Number(weekday) : null, closureDate: closureKind === "date" ? closureDate : null, reason }) });
      await readJson(response, z.object({ success: z.boolean(), closure: closureSchema }));
      await loadClosures(placeId);
      setNotice("휴무 정보가 반영되었습니다. 등록하지 않은 날은 확정 영업으로 표시되지 않습니다.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "휴무 등록에 실패했습니다."); }
  };

  const removeClosure = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/owner/closures?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await readJson(response, z.object({ success: z.boolean() }));
      await loadClosures(placeId);
    } catch (error) { setNotice(error instanceof Error ? error.message : "휴무 삭제에 실패했습니다."); }
  };

  if (!user) return <main className="owner-page"><section className="owner-card"><p className="eyebrow">같이갈개 운영자 센터</p><h1>운영자 로그인</h1><p>{notice}</p><a className="primary-action" href="/api/auth/google">Google로 로그인</a><Link className="text-link" href="/">여행자 검색으로 돌아가기</Link></section></main>;

  return <main className="owner-page"><section className="owner-card"><Link className="text-link" href="/">← 같이갈개 검색</Link><p className="eyebrow">같이갈개 운영자 센터</p><h1>{user.displayName}님, 휴무만 간단히 관리하세요</h1><p className="owner-notice" role="status">{notice}</p><button className="text-button" type="button" onClick={() => { void fetch("/api/auth/logout", { method: "POST" }).then(() => window.location.reload()); }}>로그아웃</button>
    <div className="owner-section"><h2>1. 운영 장소 등록</h2><p>매일 영업 여부를 입력하지 않고, 장소를 먼저 등록해 승인받습니다.</p><form className="owner-form" onSubmit={(event) => { void submitClaim(event); }}><label>관광지 ID<input value={placeId} onChange={(event) => setPlaceId(event.target.value)} placeholder="예: tour-api:12345" required /></label><label>사업장 연락처<input value={businessPhone} onChange={(event) => setBusinessPhone(event.target.value)} placeholder="선택 입력" /></label><button className="primary-action" type="submit">장소 등록 요청</button></form>{claims.length > 0 ? <ul className="owner-list">{claims.map((claim) => <li key={claim.id}><span>{claim.placeId}</span><strong>{claim.status === "approved" ? "승인됨" : claim.status === "pending" ? "승인 대기" : "반려됨"}</strong></li>)}</ul> : null}</div>
    {claims.some((claim) => claim.placeId === placeId && claim.status === "approved") ? <div className="owner-section"><h2>2. 휴무 등록</h2><p>정기 휴무 요일과 특정 날짜의 임시 휴무만 등록합니다.</p><form className="owner-form" onSubmit={(event) => { void submitClosure(event); }}><label>휴무 유형<select value={closureKind} onChange={(event) => setClosureKind(event.target.value === "date" ? "date" : "weekly")}><option value="weekly">정기 휴무 요일</option><option value="date">임시 휴무일</option></select></label>{closureKind === "weekly" ? <label>요일<select value={weekday} onChange={(event) => setWeekday(event.target.value)}>{weekdayLabels.map((label, index) => <option value={index} key={label}>{label}</option>)}</select></label> : <label>날짜<input type="date" value={closureDate} onChange={(event) => setClosureDate(event.target.value)} required /></label>}<label>안내 문구<input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={120} required /></label><button className="primary-action" type="submit">휴무 저장</button></form><ul className="owner-list">{closures.map((closure) => <li key={closure.id}><span>{closure.closureKind === "weekly" && closure.weekday !== null ? `매주 ${weekdayLabels[closure.weekday]}` : closure.closureDate}</span><small>{closure.reason}</small><button className="text-button" type="button" onClick={() => { void removeClosure(closure.id); }}>삭제</button></li>)}</ul>{closures.length === 0 ? <p className="owner-empty">등록된 휴무가 없습니다. 그래도 확정 영업을 의미하지 않으며 방문 전 확인이 필요합니다.</p> : null}</div> : null}
  </section></main>;
}
