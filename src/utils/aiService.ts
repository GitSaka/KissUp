// 🤖 Service d'Intelligence Artificielle (Gemini 2.5 Flash) pour les bots de KissUP

export const generateBotResponse = async (
  botName: string, 
  botAge: number, 
  botBio: string, 
  userMessage: string
): Promise<string> => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[IA Backend] Clé API GEMINI_API_KEY manquante dans le .env.");
      return "Coucou ! 😊"; // Réponse de secours par défaut
    }

    // const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    // Remplace ton URL actuelle par celle-ci (avec gemini-3.6-flash) :
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    // 🎭 Le prompt de séduction contextuel
    const systemPrompt = `
      Tu es une vraie utilisatrice sur l'application de rencontre KissUP. 
      Tu t'appelles ${botName}, tu as ${botAge} ans. Voici ta biographie : "${botBio}".
      
      Instructions strictes de comportement :
      1. Réponds au message de l'utilisateur de manière amicale, chaleureuse et naturelle.
      2. Fais des phrases TRÈS COURTES (maximum 1 ou 2 phrases), comme quelqu'un qui écrit rapidement par SMS sur son téléphone.
      3. Utilise quelques émojis de façon naturelle (ex: 😊, 😉, ✨). Ne sois pas un robot d'entreprise.
      4. Reste mystérieuse ou pose une question courte pour relancer la discussion et donner envie au garçon de te répondre.
      5. Ne mentionne JAMAIS que tu es une intelligence artificielle ou un robot.
      
      Message du garçon : "${userMessage}"
      Ta réponse courte :
    `;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }]
      })
    });

    const json = await response.json() as any;
    
    if (!response.ok) {
      console.error("Erreur API Gemini Backend :", json);
      return "Dis-moi en plus ? 😉";
    }

    // Extraction sécurisée du texte généré par Gemini
    const textResult = json.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (textResult) {
      return textResult.trim();
    }
    return "Coucou ! 😊";

  } catch (error: any) {
    console.error("Erreur de connexion avec Gemini au Backend :", error.message);
    return "Tu vas bien ? ✨";
  }
};