export interface LibraryDocument {
  id: string;
  title: string;
  publisher: string;
  country: string;
  language: string;
  type: "Web" | "PDF";
  topics: string[];
  url: string;
  featured: boolean;
}

export const libraryDocs: LibraryDocument[] = [
  {
    "id": "nl-rijksoverheid-noodpakket",
    "title": "Wat zit er in een noodpakket? (72 uur)",
    "publisher": "Rijksoverheid",
    "country": "NL",
    "language": "NL",
    "type": "Web",
    "topics": ["Emergency kit", "Supplies", "72 hours"],
    "url": "https://www.rijksoverheid.nl/onderwerpen/veiligheidsregios-en-crisisbeheersing/vraag-en-antwoord/wat-zit-er-in-een-noodpakket",
    "featured": true
  },
  {
    "id": "nl-denkvooruit-home",
    "title": "Denk vooruit (campagne voorbereiding noodsituaties)",
    "publisher": "Denk vooruit (NL overheid)",
    "country": "NL",
    "language": "NL",
    "type": "Web",
    "topics": ["Preparedness", "Plans", "Public guidance"],
    "url": "https://www.denkvooruit.nl/",
    "featured": true
  },
  {
    "id": "nl-denkvooruit-noodpakket",
    "title": "Stel je noodpakket samen (72 uur)",
    "publisher": "Denk vooruit",
    "country": "NL",
    "language": "NL",
    "type": "Web",
    "topics": ["Emergency kit", "Supplies", "72 hours"],
    "url": "https://www.denkvooruit.nl/bereid-je-voor/stel-je-noodpakket-samen",
    "featured": true
  },
  {
    "id": "nl-nctv-informatieboekje-news",
    "title": "Informatieboekje 'Bereid je voor op een noodsituatie' (aankondiging)",
    "publisher": "NCTV",
    "country": "NL",
    "language": "NL",
    "type": "Web",
    "topics": ["Preparedness", "Plans", "Public guidance"],
    "url": "https://www.nctv.nl/actueel/nieuws/2025/11/17/informatieboekje-bereid-je-voor-op-een-noodsituatie-gepresenteerd",
    "featured": false
  },
  {
    "id": "nl-nctv-campagne-denkvooruit",
    "title": "Overheid start campagne 'Denk vooruit' (achtergrond)",
    "publisher": "NCTV",
    "country": "NL",
    "language": "NL",
    "type": "Web",
    "topics": ["Preparedness", "Plans"],
    "url": "https://www.nctv.nl/actueel/nieuws/2025/11/03/overheid-start-campagne-denk-vooruit-voorbereiden-op-noodsituatie-steeds-belangrijker",
    "featured": false
  },
  {
    "id": "nl-voedingscentrum-noodvoorraad",
    "title": "Moet ik een noodpakket met eten en drinken in huis hebben?",
    "publisher": "Voedingscentrum",
    "country": "NL",
    "language": "NL",
    "type": "Web",
    "topics": ["Food", "Water", "72 hours"],
    "url": "https://www.voedingscentrum.nl/nl/service/vraag-en-antwoord/boodschappen-doen/moet-ik-een-noodpakket-met-eten-en-drinken-in-huis-hebben.aspx",
    "featured": false
  },
  {
    "id": "nl-nederlandwereldwijd-crisis",
    "title": "Wat moet ik doen in een crisissituatie (in het buitenland)?",
    "publisher": "NederlandWereldwijd",
    "country": "NL",
    "language": "NL",
    "type": "Web",
    "topics": ["Travel", "Crisis", "Contacts"],
    "url": "https://www.nederlandwereldwijd.nl/crisis/regelen-in-crisissituatie",
    "featured": false
  },
  {
    "id": "uk-prepare-get-prepared",
    "title": "Get prepared for emergencies (kit + planning)",
    "publisher": "GOV.UK Prepare",
    "country": "UK",
    "language": "EN",
    "type": "Web",
    "topics": ["Emergency kit", "Plans", "Power cut"],
    "url": "https://prepare.campaign.gov.uk/get-prepared-for-emergencies/",
    "featured": true
  },
  {
    "id": "uk-prepare-home",
    "title": "Prepare (home)",
    "publisher": "GOV.UK Prepare",
    "country": "UK",
    "language": "EN",
    "type": "Web",
    "topics": ["Preparedness", "Household plan"],
    "url": "https://prepare.campaign.gov.uk/",
    "featured": false
  },
  {
    "id": "uk-gov-local-plans",
    "title": "Preparing for emergencies: find out about local plans",
    "publisher": "GOV.UK",
    "country": "UK",
    "language": "EN",
    "type": "Web",
    "topics": ["Local plans", "Community"],
    "url": "https://www.gov.uk/local-planning-emergency-major-incident",
    "featured": false
  },
  {
    "id": "uk-community-emergency-plan-toolkit",
    "title": "Community Emergency Plan Toolkit (PDF)",
    "publisher": "UK Government (PDF)",
    "country": "UK",
    "language": "EN",
    "type": "PDF",
    "topics": ["Community", "Planning"],
    "url": "https://assets.publishing.service.gov.uk/media/5a74fe7be5274a59fa71692d/community_emergency_plan_toolkit.pdf",
    "featured": false
  },
  {
    "id": "uk-nidirect-household-kit",
    "title": "Household emergency kit",
    "publisher": "NI Direct",
    "country": "UK",
    "language": "EN",
    "type": "Web",
    "topics": ["Emergency kit", "Household"],
    "url": "https://www.nidirect.gov.uk/articles/household-emergency-kit",
    "featured": false
  },
  {
    "id": "us-ready-kit",
    "title": "Build A Kit (basic disaster supplies)",
    "publisher": "Ready.gov",
    "country": "US",
    "language": "EN",
    "type": "Web",
    "topics": ["Emergency kit", "Water", "Food"],
    "url": "https://www.ready.gov/kit",
    "featured": true
  },
  {
    "id": "us-ready-checklist-collection",
    "title": "Emergency Supply Kit Checklist (collection + translations)",
    "publisher": "Ready.gov",
    "country": "US",
    "language": "EN",
    "type": "Web",
    "topics": ["Checklist", "Emergency kit"],
    "url": "https://www.ready.gov/collection/emergency-supply-kit-checklist",
    "featured": false
  },
  {
    "id": "us-ready-checklist-pdf",
    "title": "Ready Emergency Supply List (PDF)",
    "publisher": "Ready.gov (PDF)",
    "country": "US",
    "language": "EN",
    "type": "PDF",
    "topics": ["Checklist", "Emergency kit"],
    "url": "https://www.ready.gov/sites/default/files/2021-01/ready_emergency-supply-kit-checklist.pdf",
    "featured": false
  },
  {
    "id": "us-ready-kids-checklist-pdf",
    "title": "Emergency Kit Checklist for Kids (PDF)",
    "publisher": "Ready.gov (PDF)",
    "country": "US",
    "language": "EN",
    "type": "PDF",
    "topics": ["Kids", "Emergency kit"],
    "url": "https://www.ready.gov/sites/default/files/2022-05/emergency_checklist_kids.pdf",
    "featured": false
  },
  {
    "id": "de-bbk-ratgeber-pdf",
    "title": "Vorsorgen für Krisen und Katastrophen (Ratgeber, PDF)",
    "publisher": "BBK (Germany) (PDF)",
    "country": "DE",
    "language": "DE",
    "type": "PDF",
    "topics": ["Preparedness", "Supplies", "Self-sufficiency"],
    "url": "https://www.bbk.bund.de/SharedDocs/Downloads/DE/Mediathek/Publikationen/Buergerinformationen/Ratgeber/BBK-Vorsorgen-fuer-Krisen-und-Katastrophen.pdf?__blob=publicationFile&v=41",
    "featured": true
  },
  {
    "id": "de-bbk-checklisten-pdf",
    "title": "Checklisten zur Vorsorge (PDF)",
    "publisher": "BBK (Germany) (PDF)",
    "country": "DE",
    "language": "DE",
    "type": "PDF",
    "topics": ["Checklist", "Supplies"],
    "url": "https://www.bbk.bund.de/SharedDocs/Downloads/DE/Mediathek/Publikationen/Buergerinformationen/Ratgeber/Checklisten-zur-Vorsorge-Krisen-und-Katastrophen.pdf?__blob=publicationFile&v=17",
    "featured": false
  },
  {
    "id": "pt-lisboa-kit-emergencia-pdf",
    "title": "Kit de emergência (PDF)",
    "publisher": "Câmara Municipal de Lisboa (PDF)",
    "country": "PT",
    "language": "PT",
    "type": "PDF",
    "topics": ["Emergency kit", "72 hours"],
    "url": "https://www.lisboa.pt/fileadmin/portal/temas/seguranca/risco_sismico/Kit_emergencia.pdf",
    "featured": true
  },
  {
    "id": "pt-enb-cartaz-kit-pdf",
    "title": "Cartaz: KIT de emergência (PDF)",
    "publisher": "ENB (Portugal) (PDF)",
    "country": "PT",
    "language": "PT",
    "type": "PDF",
    "topics": ["Emergency kit", "Checklist"],
    "url": "https://www.enb.pt/admin/docs/repositorio/Cartaz_ENB_KIT.pdf",
    "featured": false
  },
  {
    "id": "pt-loures-kit-emergencia-pdf",
    "title": "Kit de emergência (PDF)",
    "publisher": "Proteção Civil (Loures) (PDF)",
    "country": "PT",
    "language": "PT",
    "type": "PDF",
    "topics": ["Emergency kit", "72 hours"],
    "url": "https://app1.cm-loures.pt/protecaocivilloures/wp-content/uploads/2025/03/KitEmergencia_Digital_SMPC_2025_AF.pdf",
    "featured": false
  },
  {
    "id": "eu-preparedness-topic",
    "title": "Preparedness (EU Commission topic page)",
    "publisher": "European Commission",
    "country": "EU",
    "language": "EN",
    "type": "Web",
    "topics": ["Preparedness", "Policy", "72 hours"],
    "url": "https://commission.europa.eu/topics/preparedness_en",
    "featured": false
  },
  {
    "id": "eu-preparedness-strategy-news",
    "title": "EU Preparedness Union Strategy (news release)",
    "publisher": "European Commission (DG ECHO)",
    "country": "EU",
    "language": "EN",
    "type": "Web",
    "topics": ["Preparedness", "Policy"],
    "url": "https://civil-protection-humanitarian-aid.ec.europa.eu/news-stories/news/eu-preparedness-union-strategy-prevent-and-react-emerging-threats-and-crises-2025-03-26_en",
    "featured": false
  },
  {
    "id": "global-ifrc-family-safety-checklists-pdf",
    "title": "Family safety plan checklists (PDF)",
    "publisher": "IFRC (PDF)",
    "country": "Global",
    "language": "EN",
    "type": "PDF",
    "topics": ["Family plan", "Checklist"],
    "url": "https://www.ifrc.org/sites/default/files/2022-11/CHECKLISTS2-FAMILY-SAFETY-PLAN-HR.pdf",
    "featured": false
  },
  {
    "id": "global-ifrc-prepare-family-home",
    "title": "Prepare your family and home (templates + checklist)",
    "publisher": "IFRC",
    "country": "Global",
    "language": "EN",
    "type": "Web",
    "topics": ["Family plan", "Preparedness"],
    "url": "https://www.ifrc.org/document/prepare-your-family-and-home-pape-messages",
    "featured": false
  },
  {
    "id": "global-ifrc-disaster-law-checklist-pdf",
    "title": "Checklist on Law and Disaster Preparedness and Response (PDF)",
    "publisher": "IFRC (PDF)",
    "country": "Global",
    "language": "EN",
    "type": "PDF",
    "topics": ["Preparedness", "Policy"],
    "url": "https://disasterlaw.ifrc.org/sites/default/files/media/disaster_law/2020-08/DPR_Checklist_Final_EN_Screen.pdf",
    "featured": false
  },
  {
    "id": "global-ifrc-emergency-needs-assessment-pdf",
    "title": "Emergency Needs Assessment and Planning (PDF)",
    "publisher": "IFRC (PDF)",
    "country": "Global",
    "language": "EN",
    "type": "PDF",
    "topics": ["Assessment", "Planning"],
    "url": "https://www.ifrc.org/sites/default/files/2025-11/IFRC_Emergency_Needs%20Assessment_and_Planning.pdf",
    "featured": false
  }
];

// Derived constants for filters
export const countries = [...new Set(libraryDocs.map(d => d.country))];
export const languages = [...new Set(libraryDocs.map(d => d.language))];
export const allTopics = [...new Set(libraryDocs.flatMap(d => d.topics))].sort();
export const types = ["PDF", "Web"] as const;
