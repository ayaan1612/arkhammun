import { ArkhamShell, PageIntro } from '@/components/arkham-shell'
import { arkham } from '@/lib/arkham-data'
export default function PoliciesPage() { return <ArkhamShell><main><PageIntro eyebrow="07 / Policies" title={<>Carry the <em>standard.</em></>}>Clear expectations create room for sharper debate, stronger diplomacy and a better conference for everyone.</PageIntro><section className="page-section policy-directory">{arkham.policies.map(([title, text], index) => <article key={title}><span>0{index + 1}</span><h2>{title}</h2><p>{text}</p></article>)}</section></main></ArkhamShell> }
