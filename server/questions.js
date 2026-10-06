import { createHash } from "node:crypto";
import { z } from "zod";
const q = (
  category,
  prompt,
  choices,
  answer,
  explanation,
  hint,
  source,
  aliases = [],
) => ({
  category,
  prompt,
  choices,
  answer,
  aliases,
  explanation,
  hint,
  source,
  difficulty: 1,
});
// Editorially curated starter packs. Keys remain exclusively on the server.
export const packs = [
  [
    q(
      "History",
      "Which civilization built Machu Picchu?",
      ["Maya", "Aztec", "Inca", "Olmec"],
      "Inca",
      "Machu Picchu was built by the Inca in the 15th century.",
      "Look toward the Andes, not Central America.",
      "https://whc.unesco.org/en/list/274/",
    ),
    q(
      "Geography",
      "Which ocean is the largest?",
      ["Atlantic", "Indian", "Arctic", "Pacific"],
      "Pacific",
      "The Pacific is the largest and deepest ocean basin.",
      "Its name suggests a peaceful temperament.",
      "https://oceanservice.noaa.gov/facts/biggestocean.html",
    ),
    q(
      "Movies",
      "Who directed the original Jurassic Park?",
      ["James Cameron", "Steven Spielberg", "Ridley Scott", "George Lucas"],
      "Steven Spielberg",
      "Steven Spielberg directed the 1993 adaptation of Michael Crichton’s novel.",
      "He also brought an extraterrestrial home.",
      "https://www.universalpictures.com/movies/jurassic-park",
    ),
    q(
      "Music",
      "Which instrument typically has 88 keys?",
      ["Violin", "Trumpet", "Piano", "Clarinet"],
      "Piano",
      "A standard modern piano has 52 white keys and 36 black keys.",
      "It combines percussion with strings.",
      "https://www.britannica.com/art/piano",
    ),
    q(
      "Science",
      "What is the chemical symbol for gold?",
      ["Ag", "Au", "Gd", "Go"],
      "Au",
      "Au comes from the Latin word aurum.",
      "Its symbol comes from its Latin name.",
      "https://www.rsc.org/periodic-table/element/79/gold",
    ),
    q(
      "Food",
      "Which ingredient is the base of traditional hummus?",
      ["Lentils", "Chickpeas", "White beans", "Peas"],
      "Chickpeas",
      "Hummus combines chickpeas with tahini, lemon juice, and other seasonings.",
      "Also called garbanzo beans.",
      "https://www.britannica.com/topic/hummus",
    ),
    q(
      "Space",
      "Which planet has the shortest day?",
      ["Mars", "Saturn", "Jupiter", "Neptune"],
      "Jupiter",
      "Jupiter rotates once in roughly 10 hours.",
      "The largest planet spins surprisingly fast.",
      "https://science.nasa.gov/jupiter/facts/",
    ),
    q(
      "Literature",
      "Who wrote Frankenstein?",
      ["Jane Austen", "Mary Shelley", "Bram Stoker", "Emily Brontë"],
      "Mary Shelley",
      "Shelley’s novel was first published in 1818.",
      "Her husband was a Romantic poet.",
      "https://www.britannica.com/topic/Frankenstein",
    ),
    q(
      "Technology",
      "What does CPU stand for?",
      [],
      "Central processing unit",
      "The CPU executes instructions and performs the computer’s core calculations.",
      "Three words: the middle one describes what it does.",
      "https://www.britannica.com/technology/central-processing-unit",
      ["central processor unit"],
    ),
    q(
      "History",
      "What empire is often abbreviated HRE?",
      [],
      "Holy Roman Empire",
      "The Holy Roman Empire existed in central Europe until 1806.",
      "Despite the name, it was centered largely in German-speaking lands.",
      "https://www.britannica.com/place/Holy-Roman-Empire",
      [
        "the holy roman empire",
        "holy roman empire of the german nation",
        "HRE",
      ],
    ),
    q(
      "Space",
      "What was the first artificial satellite to orbit Earth?",
      [],
      "Sputnik 1",
      "The Soviet Union launched Sputnik 1 on October 4, 1957.",
      "Its name means a fellow traveler.",
      "https://www.nasa.gov/history/sputnik-and-the-dawn-of-the-space-age/",
      ["sputnik", "sputnik one"],
    ),
  ],
  [
    q(
      "History",
      "In which country did the Renaissance begin?",
      ["France", "Italy", "Spain", "Greece"],
      "Italy",
      "The Renaissance began in Italian cities, including Florence.",
      "Think of Florence and its Medici patrons.",
      "https://www.britannica.com/event/Renaissance",
    ),
    q(
      "Geography",
      "Which country has the city of Kyoto?",
      ["China", "Japan", "South Korea", "Thailand"],
      "Japan",
      "Kyoto served as Japan’s capital for over a thousand years.",
      "Its former capital preceded Tokyo.",
      "https://whc.unesco.org/en/list/688/",
    ),
    q(
      "Movies",
      "In The Matrix, which pill does Neo take?",
      ["Blue", "Red", "Green", "White"],
      "Red",
      "Neo chooses the red pill to learn the truth about the Matrix.",
      "It is the color associated with stop signs.",
      "https://www.warnerbros.com/movies/matrix",
    ),
    q(
      "Gaming",
      "Which company created the Mario franchise?",
      ["Sega", "Sony", "Nintendo", "Atari"],
      "Nintendo",
      "Mario is one of Nintendo’s best-known characters.",
      "It also makes the Zelda games.",
      "https://mario.nintendo.com/",
    ),
    q(
      "Science",
      "How many bones are typically in an adult human skeleton?",
      ["186", "206", "226", "246"],
      "206",
      "The typical adult skeleton has 206 bones, though individual variation exists.",
      "It is just over two hundred.",
      "https://www.britannica.com/science/human-skeleton",
    ),
    q(
      "Sports",
      "How many players per team are on court in basketball?",
      ["4", "5", "6", "7"],
      "5",
      "Standard basketball is played by two teams of five players on the court.",
      "A quintet.",
      "https://www.britannica.com/sports/basketball",
    ),
    q(
      "Space",
      "Which planet has the Great Red Spot?",
      ["Venus", "Mars", "Jupiter", "Saturn"],
      "Jupiter",
      "The Great Red Spot is a giant storm in Jupiter’s atmosphere.",
      "The largest planet also has a very large storm.",
      "https://science.nasa.gov/jupiter/facts/",
    ),
    q(
      "Literature",
      "Which novel begins with “Call me Ishmael”?",
      ["Moby-Dick", "Treasure Island", "The Odyssey", "Dracula"],
      "Moby-Dick",
      "Herman Melville’s Moby-Dick opens with that famous line.",
      "A white whale looms large.",
      "https://www.britannica.com/topic/Moby-Dick-novel",
    ),
    q(
      "Science",
      "What is the process by which plants use light to make sugars?",
      [],
      "Photosynthesis",
      "Photosynthesis converts light energy into chemical energy.",
      "Its first part means light.",
      "https://www.britannica.com/science/photosynthesis",
      ["photo synthesis"],
    ),
    q(
      "History",
      "Who was the first woman to win a Nobel Prize?",
      [],
      "Marie Curie",
      "Marie Curie shared the Nobel Prize in Physics in 1903.",
      "She studied radioactivity and later won a second Nobel Prize.",
      "https://www.nobelprize.org/prizes/physics/1903/marie-curie/facts/",
      ["curie", "maria sklodowska curie", "marie sklodowska curie"],
    ),
    q(
      "Geography",
      "What is the capital of Iceland?",
      [],
      "Reykjavik",
      "Reykjavík is Iceland’s capital and largest city.",
      "Its name translates to smoky bay.",
      "https://www.britannica.com/place/Reykjavik",
      ["reykjavík"],
    ),
  ],
].map((pack) =>
  pack.map((question, i) => ({
    ...question,
    difficulty: i < 4 ? 1 : i < 8 ? 2 : 3,
    round: [
      "Warmup",
      "Culture",
      "Curveball",
      "The Wager",
      "Final Boss",
      "Global Final",
    ][Math.floor(i / 2)],
    seconds: i >= 8 ? 30 : 25,
  })),
);
export const questionSchema = z
  .object({
    category: z.string().min(1).max(60),
    prompt: z.string().min(8).max(500),
    choices: z
      .array(z.string().min(1).max(150))
      .refine((v) => v.length === 0 || v.length === 4),
    answer: z.string().min(1).max(200),
    aliases: z.array(z.string().max(200)).max(20),
    explanation: z.string().min(10).max(800),
    hint: z.string().min(5).max(300),
    source: z.string().url(),
    difficulty: z.number().int().min(1).max(3),
    seconds: z.number().int().min(20).max(45),
    round: z.string().min(1).max(40),
  })
  .superRefine((q, ctx) => {
    if (
      q.choices.length &&
      (!q.choices.includes(q.answer) || new Set(q.choices).size !== 4)
    )
      ctx.addIssue({
        code: "custom",
        message: "Choices must be unique and include the exact answer.",
      });
  });
export function validatePack(value) {
  const rounds = [
    "Warmup",
    "Culture",
    "Curveball",
    "The Wager",
    "Final Boss",
    "Global Final",
  ];
  return z
    .array(questionSchema)
    .length(11)
    .superRefine((pack, ctx) => {
      pack.forEach((q, i) => {
        if (new URL(q.source).protocol !== "https:")
          ctx.addIssue({
            code: "custom",
            path: [i, "source"],
            message: "Question sources must use HTTPS.",
          });
        if (
          q.round !== rounds[Math.floor(i / 2)] ||
          (i < 8 ? q.choices.length !== 4 : q.choices.length !== 0) ||
          q.seconds !== (i < 8 ? 25 : 30)
        )
          ctx.addIssue({
            code: "custom",
            path: [i],
            message:
              "Question format, round or time does not match the five-round show contract.",
          });
      });
    })
    .parse(value);
}
export const digest = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const normalize = (text) =>
  text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
export function matches(question, answer) {
  return [question.answer, ...question.aliases].some(
    (a) => normalize(a) === normalize(answer),
  );
}
