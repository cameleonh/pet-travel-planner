import Link from "next/link";

export const dynamic = "force-dynamic";

export default function OwnerLoginPage() {
  return <main className="owner-page"><section className="owner-card"><p className="eyebrow">같이갈개 운영자 센터</p><h1>반려견 동반 장소 운영자 로그인</h1><p>Google 계정으로 로그인한 뒤 장소를 등록하고, 정기 휴무와 임시 휴무만 관리하세요.</p><a className="primary-action" href="/api/auth/google">Google로 로그인</a><Link className="text-link" href="/">여행자 검색으로 돌아가기</Link></section></main>;
}