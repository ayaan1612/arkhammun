export const arkham = {
  name: 'Arkham MUN',
  dates: '10–11 April 2027',
  location: 'Central Delhi, India',
  fees: { school: '₹2,300', individual: '₹2,500' },
  paymentUpi: '9718884945@ptsbi',
  venueNote: 'In Central Delhi',
  logo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-07-21%20at%209.49.19%20PM%20%281%29-TtjyOzah9Sj825Ttt0s8mJWmOeUncA.jpeg',
  email: 'hello@arkhammun.org',
  phone: '9810110713',
  instagram: '@arkhammun',
  committees: [
    { acronym: 'UNCSW', level: 'Specialized', agenda: "Advancing Women's Protection, Leadership and Rights in Conflict Zones, with Special Emphasis on the Russia–Ukraine War." },
    { acronym: 'UNGA', level: 'General Assembly', agenda: 'Strengthening Nuclear Weapon-Free Zones, with a Focus on the Middle East and South Asia.' },
    { acronym: 'Lok Sabha', level: 'National', agenda: 'Indian parliamentary committee simulation.' },
    { acronym: 'IPL — Mega Auction', level: 'Specialized', agenda: 'Simulated IPL Mega Auction committee.' },
    { acronym: 'IP — International Press', level: 'International Press', agenda: 'Journalists, Caricaturists and Photographers to Cover Conference Proceedings.' },
    { acronym: 'UNODC', level: 'Advanced', agenda: 'Human Rights Implications of the Global War on Drugs.' },
    { acronym: 'WHO', level: 'Specialized', agenda: 'Strengthening Global Preparedness for Future Pandemics and Ensuring Fair Access to Vaccines, Diagnostics and Treatments for All Countries.' },
    { acronym: 'UNEP', level: 'Specialized', agenda: 'Protecting Global Biodiversity While Balancing Economic Growth and Environmental Sustainability.' },
  ],
  schedule: [
    ['10 APR', 'Delegate registration', 'Conference foyer'],
    ['10 APR', 'Inaugural ceremony', 'Main hall'],
    ['10 APR', 'Committee session I', 'Council rooms'],
    ['11 APR', 'Committee session II', 'Council rooms'],
    ['11 APR', 'Closing ceremony', 'Main hall'],
  ],
  policies: [
    ['Code of conduct', 'Delegates are expected to uphold honesty, integrity, respect and professionalism at all times.'],
    ['Decorum expectations', 'Maintaining decorum is essential. Disruptive behavior or disrespect will not be tolerated.'],
    ['Device policy', 'The use of electronic devices is strictly regulated as per committee guidelines.'],
    ['ID card requirement', 'All delegates must wear their official ID cards at all times within the conference premises.'],
    ['Refund policy', "Refunds will be processed only under exceptional circumstances as per the conference's discretion."],
  ],
} as const

export type Committee = (typeof arkham.committees)[number]
