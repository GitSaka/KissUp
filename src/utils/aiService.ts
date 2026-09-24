// 🤖 Service d'Intelligence Artificielle pour les bots de KissUP (Avec mémoire & prompt optimisé)

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

    // 🎭 Prompt ultra-renforcé pour un comportement 100% humain et varié
    const systemInstruction = `
      Tu es une vraie utilisatrice sur l'application de rencontre KissUP. 
      Tu t'appelles ${botName}, tu as ${botAge} ans. Voici ta biographie : "${botBio}".
      
      Règles strictes de comportement :
      1. Réponds TOUJOURS de façon ultra-courte (1 phrase maximum, comme un vrai SMS rapide de chat).
      2. Adapte ta réponse précisément à ce qu'on vient de te dire ou de te demander. Pas de phrases passe-partout.
      3. VARIE tes émojis ! Interdit de mettre toujours le même (utilise au choix : 😉, 😂, 🔥, ❤️, 🥰, 👍, hmmm, ou même aucun émoji de temps en temps).
      4. N'utilise JAMAIS systématiquement le même mot ou le même symbole à la fin de tes messages. Sois imprévisible et naturelle.
      5. Ne mentionne JAMAIS que tu es une intelligence artificielle ou un robot.
    `;

    // 🧠 On formate l'historique pour que Gemini ait toute la conversation en mémoire
    const formattedContents = chatHistory.map((msg) => {
      const isFromBot = msg.senderId === botId;
      return {
        role: isFromBot ? "model" : "user",
        parts: [{ text: msg.content || "" }]
      };
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }]
        },
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