// 🤖 Service d'Intelligence Artificielle pour les bots de KissUP (Mémoire & Prompt Corrigés)

interface ChatMessage {
  senderId: string;
  content: string | null;
}

export const generateBotResponse = async (
  botName: string, 
  botAge: number, 
  botBio: string, 
  botId: string,
  chatHistory: ChatMessage[]
): Promise<string> => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[IA Backend] Clé API GEMINI_API_KEY manquante dans le .env.");
      return "Je suis un peu occupée là, je te revois d'ici peu ! 😊";
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;

    // 🎭 On intègre la consigne de personnalité directement dans un format de texte initial ou des contents
    // pour garantir que Gemini l'applique à 100% sans erreur de structure.
    const personaInstruction = `[CONSIGNE SYSTEME] Tu es une vraie utilisatrice sur une application de rencontre. Tu t'appelles ${botName}, tu as ${botAge} ans. Bio : "${botBio}". Règles : Fais des phrases TRÈS COURTES (1 phrase max, style SMS rapide). Varie tes émojis ( 😉, 😂, 🔥, ❤️, 🥰, 👍 ou aucun). Adapte-toi à la discussion. Ne dis jamais que tu es une IA.\n\n`;

    // 🧠 Transformation propre de l'historique pour l'API
    const formattedContents: { role: string; parts: { text: string }[] }[] = [];

    // Si on a de l'historique, on injecte la consigne au tout début du premier message utilisateur
    chatHistory.forEach((msg, index) => {
      const isFromBot = msg.senderId === botId;
      let textContent = msg.content || "";

      // Si c'est le tout premier message de l'historique et qu'il vient de l'humain, on glisse la consigne
      if (index === 0 && !isFromBot) {
        textContent = personaInstruction + textContent;
      }

      formattedContents.push({
        role: isFromBot ? "model" : "user",
        parts: [{ text: textContent }]
      });
    });

    // Sécurité au cas où l'historique serait vide
    if (formattedContents.length === 0) {
      formattedContents.push({
        role: "user",
        parts: [{ text: personaInstruction + "Coucou" }]
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: formattedContents
      })
    });

    const json = await response.json() as any;
    
    if (!response.ok) {
      console.error("Erreur API Gemini Backend :", json);
      return "Je suis un peu occupée là, je te revois d'ici peu ! 😉";
    }

    const textResult = json.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (textResult) {
      return textResult.trim();
    }
    return "Je reviens vers toi dans deux minutes 😊";

  } catch (error: any) {
    console.error("Erreur de connexion avec Gemini au Backend :", error.message);
    return "Oups, je suis prise par un truc, je te revois tout à l'heure ! 📱";
  }
};