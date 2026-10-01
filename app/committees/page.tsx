import { ArkhamShell, PageIntro } from '@/components/arkham-shell'
import { arkham } from '@/lib/arkham-data'
import { ArrowUpRight } from 'lucide-react'

export default function CommitteesPage() { return <ArkhamShell><main><PageIntro eyebrow="02 / The rooms" title={<>Choose your <em>arena.</em></>}>Six committees, six distinct rooms for research, negotiation and conviction. Browse the verified Arkham MUN agendas below.</PageIntro><section className="page-section committee-directory">{arkham.committees.map((committee, index) => <article className="directory-card" key={committee.acronym}><div className="directory-number">0{index + 1}</div><div><span className="card-label">{committee.level}</span><h2>{committee.acronym}</h2><p>{committee.agenda}</p></div><ArrowUpRight aria-hidden="true" /></article>)}</section></main></ArkhamShell> }
