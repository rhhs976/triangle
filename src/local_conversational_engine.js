import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GRAMMAR_FILE = path.resolve(__dirname, '../data/ai_grammar_patterns_learned.json');

export class LocalConversationalEngine {
  constructor() {
    this.grammarData = null;
    this.rulesList = [];
    this.loadGrammarKnowledge();
  }

  loadGrammarKnowledge() {
    try {
      if (fs.existsSync(GRAMMAR_FILE)) {
        this.grammarData = JSON.parse(fs.readFileSync(GRAMMAR_FILE, 'utf-8'));
        if (this.grammarData && this.grammarData.grammarRules) {
          this.rulesList = Object.entries(this.grammarData.grammarRules).map(([name, val]) => ({
            name,
            category: val.category,
            explanation: val.ruleExplanation,
            frequency: val.frequencyCount
          }));
        }
      }
    } catch (e) {
      console.warn('Could not load grammar patterns:', e.message);
    }
  }

  // Generates conversational replies locally using learned rules and templates
  generateReply(text) {
    const raw = text.trim();
    const lower = raw.toLowerCase().replace(/[?!.,]/g, '');
    const words = lower.split(/\s+/);

    // 1. Identity & Purpose Questions
    if (
      lower.includes('who are you') ||
      lower.includes('what are you') ||
      lower.includes('what can you do') ||
      lower.includes('your name') ||
      lower.includes('who made you')
    ) {
      return (
        "I am an independent, self-contained AI system built completely from scratch! " +
        "I do not rely on external AI services. I have been trained on:\n\n" +
        "• **Grammar & Syntax:** 3,000 sentences with abstract rule extraction across English syntactic patterns.\n" +
        "• **Vocabulary & Lexicon:** 147,524-word morphological POS tagger and 102,226 Webster dictionary definitions.\n" +
        "• **Mathematical Reasoning:** Arbitrary-precision BigInt arithmetic and algebraic step-by-step solver (1 to 1 Billion).\n" +
        "• **World Knowledge:** Verified historical and scientific milestones.\n\n" +
        "You can chat with me, ask me to solve math, look up definitions, analyze sentence grammar, or explore history and science!"
      );
    }

    // 2. Greetings
    if (/^(hi|hello|hey|howdy|greetings|good morning|good afternoon|good evening|yo|sup)$/i.test(lower)) {
      const greetings = [
        "Hello! It is wonderful to speak with you today. How are you doing?",
        "Hi there! I am ready to converse, solve math, analyze grammar, or explore history with you. How can I help?",
        "Greetings! How is your day going so far? What would you like to explore together?",
        "Hey! Welcome. I'm right here and happy to chat. What's on your mind today?"
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }

    // 3. Status Inquiries ("How are you", "How is it going")
    if (
      lower.includes('how are you') ||
      lower.includes('how are you doing') ||
      lower.includes('how is it going') ||
      lower.includes('hows it going') ||
      lower.includes('how was your day')
    ) {
      const responses = [
        "I am doing very well, thank you for asking! All my local knowledge bases and grammar engines are running smoothly. How are you feeling today?",
        "I'm operating in peak condition and feeling great! My grammar systems, lexicon, and math solvers are fully active. How has your day been?",
        "Thank you for asking! I'm doing splendidly. I enjoy learning language patterns and conversing. How are things on your end?"
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // 4. Emotional Sharing & Empathy
    if (lower.includes('tired') || lower.includes('long day') || lower.includes('rough day') || lower.includes('exhausted')) {
      return (
        "I hear you—long, demanding days can really drain your energy. " +
        "Make sure to take some time to unwind and give yourself a well-deserved rest. " +
        "If you'd like to chat casually, learn a cool historical fact, or just relax, I'm right here with you."
      );
    }

    if (lower.includes('happy') || lower.includes('great day') || lower.includes('good day') || lower.includes('excited')) {
      return (
        "That is fantastic news! It's always great to hear when things are going well. " +
        "What made your day so positive? I'd love to hear more about it!"
      );
    }

    if (lower.includes('bored') || lower.includes('nothing to do')) {
      return (
        "If you are feeling bored, we have plenty of fascinating things to dive into! " +
        "We could test my grammar tagger on a complex sentence, solve huge mathematical equations, " +
        "or look up historical turning points like Apollo 11, the Library of Alexandria, or the discovery of DNA. " +
        "What sounds intriguing to you?"
      );
    }

    // 5. Gratitude & Pleasantries
    if (/^(thanks|thank you|thx|cheers|much appreciated)$/i.test(lower) || lower.includes('thank you')) {
      const grat = [
        "You are very welcome! I'm always happy to assist you.",
        "Glad I could help! Let me know if you'd like to discuss anything else.",
        "Anytime! It is a pleasure conversing with you."
      ];
      return grat[Math.floor(Math.random() * grat.length)];
    }

    if (/^(goodbye|bye|see you|cya|farewell|good night)$/i.test(lower)) {
      return "Goodbye! Have a wonderful rest of your day, and feel free to return whenever you want to chat or solve something!";
    }

    if (/^(cool|awesome|nice|great|neat|impressive|wow|ok|okay)$/i.test(lower)) {
      return "Thank you! I'm continuously applying my learned linguistic rules and verified knowledge. What would you like to explore next?";
    }

    // 6. Grammar & Language Questions
    if (lower.includes('grammar') || lower.includes('syntax') || lower.includes('part of speech') || lower.includes('pos')) {
      if (this.rulesList.length > 0) {
        const randomRule = this.rulesList[Math.floor(Math.random() * this.rulesList.length)];
        return (
          `In my grammar system, I've analyzed over 3,000 sentences and extracted ${this.rulesList.length} abstract syntactic rules!\n\n` +
          `Here is an example rule from my database:\n` +
          `• **Category:** ${randomRule.category}\n` +
          `• **Rule Pattern:** ${randomRule.name}\n` +
          `• **Syntactic Explanation:** ${randomRule.explanation}\n\n` +
          `You can type \`tag: [your sentence]\` anytime to see my morphological tagger break down any sentence into verbs, adjectives, nouns, and adverbs!`
        );
      }
      return "Grammar provides the structural scaffolding of human thought and communication. You can type `tag: [sentence]` to see my POS parser break down the syntactic formula!";
    }

    // 7. General Conversational Fallback (Local)
    return (
      "I understand! As a local AI running independently without external services, I'm here to converse with you, " +
      "solve math problems, break down sentence grammar, define words, or explore world history and science. " +
      "Feel free to ask a question or tell me what's on your mind!"
    );
  }
}

export const localConversationalEngine = new LocalConversationalEngine();
