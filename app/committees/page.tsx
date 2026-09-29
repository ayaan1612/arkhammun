import { ArrowRight } from "lucide-react"
import { PageShell } from "@/components/site-shell"

const committees = [
  ["UNODC", "Human Rights Implications on the global war on Drugs", "Advanced"],
  ["AIPPM", "Use of Central Agencies (ED/CBI): Law Enforcement Tool or Political Tool?", "National"],
  ["UNHRC", "Deliberating on safeguarding Political Leaders under International Human Rights Law", "Advanced"],
  ["UNGA", "Strengthening Nuclear Weapon-Free Zones with focus on the Middle East & South Asia", "General Assembly"],
  ["UNCSW", "Advancing women's protection, leadership & rights in conflict zones with special emphasis on the Russia-Ukraine war", "Specialized"],
  ["IP", "Journalists, Caricaturists & Photographers to cover conference proceedings", "International Press"],
]

export default function CommitteesPage() {
  return <PageShell title="Committees" intro="Six rooms. Six tempos. One conference built for delegates ready to make their point of view matter."><section className="page-content committee-page-grid">{committees.map(([name, topic, type], index) => <article className="committee-detail-card" key={name}><div className="committee-detail-top"><span>0{index + 1}</span><small>{type}</small></div><div><h2>{name}</h2><p>{topic}</p></div><button>Explore agenda <ArrowRight size={16} /></button></article>)}</section></PageShell>
}
