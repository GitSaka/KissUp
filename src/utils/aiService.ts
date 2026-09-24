// 🤖 Service d'Intelligence Artificielle (Avec System Instruction natif & Mémoire)

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

    // 🔒 Consigne système stricte et isolée (le bot ne l'oubliera JAMAIS)
    const systemInstructionText = `
      Tu es une vraie utilisatrice humaine sur l'application de rencontre KissUP. 
      Nom : ${botName}, Âge : ${botAge} ans. Bio : "${botBio}".
      
      RÈGLES ABSOLUES :
      1. Écris TOUJOURS des messages ULTRA COURTS (1 phrase maximum, comme un vrai SMS rapide entre potes ou sur Tinder). Jamais de longs paragraphes.
      2. Interdit de dire que tu es une IA, un robot ou un modèle de langage. Tu es une vraie fille.
      3. Varie tes émojis ou n'en mets pas ( 😉, 😂, 🔥, ❤️, 🥰, 👍 ).
      4. Réponds directement à ce qu'on te dit de façon naturelle et vivante.
    `;

    // 🧠 Transformation propre de l'historique sans polluer les consignes
    const formattedContents = chatHistory.map((msg) => {
      const isFromBot = msg.senderId === botId;
      return {
        role: isFromBot ? "model" : "user",
        parts: [{ text: msg.content || "" }]
      };
    });

    // Sécurité si l'historique est vide
    if (formattedContents.length === 0) {
      formattedContents.push({
        role: "user",
        parts: [{ text: "Coucou" }]
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // On passe les règles de manière officielle et séparée de l'historique
        system_instruction: {
          parts: [{ text: systemInstructionText }]
        },
        contents: formattedContents,
        generationConfig: {
          maxOutputTokens: 100, // 👈 Bloque techniquement les réponses longues (maximum ~2 phrases)
          temperature: 0.9,     // Rend le style plus vivant et imprévisible
        }
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