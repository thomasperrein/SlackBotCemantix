import { serve } from "https://deno.land/std@0.119.0/http/server.ts";
import { readLines } from "https://deno.land/std@0.119.0/io/mod.ts";
import { BufReader } from "https://deno.land/std@0.119.0/io/bufio.ts";
import { shuffle } from "https://deno.land/x/collections@v0.5.2/common.ts";

const words: string[] = [];
const wordFilePath = "./list°mot_fr.txt";

async function loadWords() {
  const file = await Deno.open(wordFilePath);
  const bufReader = new BufReader(file);
  let line: string | null;
  while ((line = await readLines(bufReader)) !== null) {
    words.push(line.value);
  }
  Deno.close(file.rid);
}

async function getRandomWord(): Promise<string> {
  if (words.length === 0) {
    throw new Error("No words loaded.");
  }
  return shuffle(words)[0];
}

let wordToFind: string | undefined;

async function initializeGame() {
  await loadWords();
  wordToFind = await getRandomWord();
  console.log(`Word to find: ${wordToFind}`);
}

initializeGame();

const extractGuess = async (req: Request) => {
const slackPayload = await req.formData();
const guess = await slackPayload.get("text")?.toString();
if (!guess) {
    throw Error("Guess is empty or null");
}
return guess;
};

const responseBuilder = (word: string, similarity: Number) => {
if (similarity == 1) {
    return `Well played ! The word was ${word}.`;
} else if (similarity > 0.5) {
    return `${word} is very close to the word, score : ${similarity}`;
} else if (similarity < 0.5) {
    return `${word} is quite far to the word, score : ${similarity}`;
}
};

const similarity = async (word1, word2) => {
const body = {
    sim1: word1,
    sim2: word2,
    lang: "fr",
    type: "General Word2Vec",
};
console.log("body", body);
const similarityResponse = await fetch(
    "http://nlp.polytechnique.fr/similarityscore",
    {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    }
);
console.log("similarityResponse", similarityResponse);
const similarityResponseJson = await similarityResponse.json();
console.log("similarityValue", similarityResponseJson);
return Number(similarityResponseJson.simscore);
};

async function handler(req: Request): Promise<Response> {
  try {
    const guess = await extractGuess(req);
    if (wordToFind && guess.toLowerCase() === wordToFind.toLowerCase()) {
      return new Response(`Well played! The word was ${wordToFind}.`);
    }
    const similarityResult = await similarity(guess, wordToFind || "");
    console.log(
      `Tried with word ${guess}, similarity is ${similarityResult}, word to find is ${wordToFind}`
    );
    return new Response(responseBuilder(guess, similarityResult));
  } catch (e) {
    console.error(e);
    return new Response("An error occurred: " + e.message, { status: 500 });
  }
  
  
}
  serve(handler);