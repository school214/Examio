import { db, examsTable, questionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const religionExam = {
  id: "religion-hinduism-ak8",
  title: "Övningsprov: Hinduism",
  subject: "Religionskunskap",
  gradeLevel: "Årskurs 8",
  description: "Hinduism och religionens tankegångar",
  questionCount: 18,
  durationMinutes: 35,
  difficulty: "Årskurs 8",
  types: ["Flervalsfrågor", "Kortfrågor", "Resonemang"],
  status: "published",
  sections: [
    { title: "Del 1", description: "Begrepp, flervalsfrågor och matchning" },
    { title: "Del 2", description: "Kortfrågor med tydliga svar" },
    { title: "Del 3", description: "Utförliga resonemang och jämförelser" },
  ],
};

const historyExam = {
  id: "history-american-revolution-ak8",
  title: "Övningsprov: Amerikanska revolutionen",
  subject: "Historia",
  gradeLevel: "Årskurs 8",
  description: "Amerikanska revolutionen och upplysningen",
  questionCount: 6,
  durationMinutes: 25,
  difficulty: "Årskurs 8",
  types: ["Flervalsfrågor", "Kortfrågor", "Historiskt resonemang"],
  status: "published",
  sections: [
    { title: "Del 1", description: "Händelser och centrala begrepp" },
    { title: "Del 2", description: "Orsaker, konsekvenser och historiskt resonemang" },
  ],
};

const question = (
  examId: string,
  number: number,
  type: string,
  text: string,
  points: number,
  section: string,
  concepts: string[],
  options: string[],
  correctAnswer: string,
  rubric?: string,
) => ({
  id: `${examId}-q${number}`,
  examId,
  number,
  type,
  text,
  points,
  section,
  concepts,
  options,
  correctAnswer,
  rubric,
});

const religionQuestions = [
  question(religionExam.id, 1, "multiple_choice", "Vad kallas den cirkulära tidsuppfattningen inom hinduismen?", 1, "Del 1", ["samsara"], ["Samsara", "Moksha", "Dharma", "Puja"], "Samsara"),
  question(religionExam.id, 2, "multiple_choice", "Vilket begrepp beskriver världssjälen eller den yttersta verkligheten?", 1, "Del 1", ["Brahman"], ["Atman", "Brahman", "Varna", "Bhakti"], "Brahman"),
  question(religionExam.id, 3, "multiple_choice", "Vad betyder ahimsa?", 1, "Del 1", ["ahimsa"], ["Att dyrka en gud", "Icke-våld", "Att fasta", "Att återfödas"], "Icke-våld"),
  question(religionExam.id, 4, "multiple_choice", "Vilken gud förknippas ofta med att bevara världen?", 1, "Del 1", ["Vishnu"], ["Brahma", "Vishnu", "Shiva", "Ganesha"], "Vishnu"),
  question(religionExam.id, 5, "multiple_select", "Vilka av följande hör ihop med vägen mot moksha?", 2, "Del 1", ["dharma", "karma", "moksha"], ["Dharma", "Karma", "Samsara", "Moksha"], "Dharma|Karma|Moksha"),
  question(religionExam.id, 6, "matching", "Matcha begreppet med den bästa förklaringen.", 2, "Del 1", ["atman", "puja", "avatar"], [], "Atman: den individuella själen; Puja: religiös ritual; Avatar: en gudomlig gestalt"),
  question(religionExam.id, 7, "short_answer", "Vad är karma?", 2, "Del 2", ["karma"], [], "handlingar får konsekvenser", "Förklara grundidén med att handlingar påverkar framtida konsekvenser."),
  question(religionExam.id, 8, "short_answer", "Vad betyder dharma i hinduismen?", 2, "Del 2", ["dharma"], [], "plikt och ansvar", "Nämn plikt, ansvar eller den ordning som hjälper människan att leva rätt."),
  question(religionExam.id, 9, "short_answer", "Vad är målet moksha?", 2, "Del 2", ["moksha"], [], "befrielse från samsara", "Svaret ska koppla moksha till befrielse från återfödelsens kretslopp."),
  question(religionExam.id, 10, "short_answer", "Vad är puja?", 2, "Del 2", ["puja"], [], "religiös ritual eller gudstjänst", "Beskriv puja som en ritual eller form av tillbedjan."),
  question(religionExam.id, 11, "short_answer", "Vad menas med varna och jati?", 2, "Del 2", ["varna", "jati", "kastväsendet"], [], "samhällsindelning och social grupp", "Visa att varna är en större indelning och jati en mer konkret social grupp."),
  question(religionExam.id, 12, "short_answer", "Vad är Bhagavad-Gita?", 2, "Del 2", ["Bhagavad-Gita"], [], "del av Mahabharata", "Nämn att det är en viktig text och gärna samtalet mellan Krishna och Arjuna."),
  question(religionExam.id, 13, "reasoning", "Resonera kring hur karma kan påverka människors vardagsliv.", 4, "Del 3", ["karma", "dharma", "konsekvenser"], [], "handling|konsekvens|vardag", "Ett utvecklat svar förklarar sambandet mellan handlingar, karma och framtida konsekvenser samt ger ett konkret exempel."),
  question(religionExam.id, 14, "compare", "Jämför hinduismens och buddhismens syn på återfödelse och vägen vidare.", 4, "Del 3", ["hinduism", "buddhism", "reinkarnation", "nirvana"], [], "likhet|skillnad|återfödelse", "Jämför minst en likhet och en skillnad och använd relevanta begrepp."),
  question(religionExam.id, 15, "reasoning", "Förklara sambandet mellan samsara, dharma och moksha.", 4, "Del 3", ["samsara", "dharma", "moksha"], [], "samsara|dharma|moksha", "Förklara hur livet i samsara, plikten dharma och målet moksha hänger ihop."),
  question(religionExam.id, 16, "explain", "Förklara varför Ganges kan vara viktig för många hinduer.", 3, "Del 3", ["Ganges", "pilgrimsfärd"], [], "helig|rening|ritual", "Förklara religiös betydelse och ge exempel på ritual eller pilgrimsfärd."),
  question(religionExam.id, 17, "reasoning", "Resonera kring hur högtider och bhakti kan uttrycka tro.", 4, "Del 3", ["högtider", "bhakti", "puja"], [], "uttryck|gemenskap|hängivenhet", "Koppla religiösa uttryck till känslor, gemenskap och hängivenhet."),
  question(religionExam.id, 18, "reasoning", "Vad kan vara viktigt att tänka på när man beskriver kastväsendet och daliter?", 4, "Del 3", ["kastväsendet", "dalit", "samhälle"], [], "historiskt|samhälle|nyans", "Visa nyans: beskriv systemets historiska och sociala betydelse utan att förenkla människors liv till en enda kategori."),
];

const historyQuestions = [
  question(historyExam.id, 1, "multiple_choice", "Vad betydde uttrycket “no taxation without representation”?", 1, "Del 1", ["skatter", "representation"], ["Inga skatter utan representation", "Ingen handel utan kung", "Ingen lag utan domstol", "Ingen armé utan president"], "Inga skatter utan representation"),
  question(historyExam.id, 2, "short_answer", "Vad hände under Boston Tea Party?", 2, "Del 1", ["Boston Tea Party", "skatter"], [], "te kastades i havet", "Beskriv protesten mot tebeskattningen och den brittiska kontrollen."),
  question(historyExam.id, 3, "short_answer", "Vad var en viktig idé i självständighetsförklaringen 1776?", 2, "Del 1", ["självständighetsförklaringen"], [], "kolonierna förklarade sig självständiga", "Nämn koloniernas självständighet och gärna idéer om rättigheter."),
  question(historyExam.id, 4, "explain", "Förklara hur upplysningens idéer påverkade den amerikanska revolutionen.", 4, "Del 2", ["upplysningen", "John Locke", "Montesquieu"], [], "rättigheter|folksuveränitet|maktdelning", "Koppla upplysningens idéer till rättigheter, makt och kritik mot envälde."),
  question(historyExam.id, 5, "reasoning", "Resonera kring flera orsaker till den amerikanska revolutionen och deras konsekvenser.", 4, "Del 2", ["orsaker", "konsekvenser", "skatter"], [], "orsak|konsekvens|kolonier", "Använd flera orsaker och förklara hur de bidrog till utvecklingen."),
  question(historyExam.id, 6, "compare", "Jämför maktdelningsprincipen med hur presidenten, kongressen och domstolarna delar makt.", 4, "Del 2", ["Montesquieu", "maktdelning", "kongressen"], [], "president|kongress|domstol", "Förklara minst två maktcentra och hur de kan begränsa varandra."),
];

export async function seedExamio(): Promise<void> {
  const existing = await db
    .select({ id: examsTable.id })
    .from(examsTable)
    .where(eq(examsTable.id, religionExam.id))
    .limit(1);

  if (existing.length > 0) return;

  await db.insert(examsTable).values([religionExam, historyExam]);
  await db.insert(questionsTable).values([...religionQuestions, ...historyQuestions]);
}