import { ArkhamShell, PageIntro } from '@/components/arkham-shell'
import { arkham } from '@/lib/arkham-data'
import { Clock3 } from 'lucide-react'

export default function SchedulePage() { return <ArkhamShell><main><PageIntro eyebrow="03 / The rhythm" title={<>Two days. <em>Many voices.</em></>}>The verified conference sequence is listed below. Exact timings and rooms will be announced by the secretariat where not confirmed.</PageIntro><section className="page-section schedule-directory">{arkham.schedule.map(([date, title, place]) => <article className="schedule-item" key={title}><time>{date}</time><div><h2>{title}</h2><p>{place}</p></div><Clock3 size={18} /></article>)}</section></main></ArkhamShell> }
