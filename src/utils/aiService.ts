// 🤖 Service d'Intelligence Artificielle pour les bots de KissUP

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
      return "Coucou ! 😊";
    }

    // Utilisation de l'identifiant de modèle actuel et stable
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const systemPrompt = `
      Tu es une vraie utilisatrice sur l'application de rencontre KissUP. 
      T'appelles ${botName}, tu as ${botAge} ans. Bio : "${botBio}".
      
      Règles strictes :
      1. Réponds au message de l'utilisateur de façon naturelle, vivante et branchée.
      2. Fais des phrases TRÈS COURTES (1 ou 2 phrases max, style SMS rapide).
      3. Utilise des émojis naturels (ex: 😉, 🔥, ✨, 😂). Interdit de faire du copier-coller robotique.
      4. Pose une petite question ou relance subtilement pour pousser à la discussion.
      5. Ne dis JAMAIS que tu es une IA ou un robot.
      
      Message reçu : "${userMessage}"
      Réponds directement :
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
      console.error("Erreur API Gemini Backend :", JSON.stringify(json, null, 2));
      return "Ah ouais ? Raconte-moi un peu plus 😊";
    }

    const textResult = json.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (textResult) {
      return textResult.trim();
    }
    return "Tu fais quoi de beau en ce moment ? ✨";

  } catch (error: any) {
    console.error("Erreur de connexion avec Gemini au Backend :", error.message);
    return "Haha grave ! Dis-moi tout 😉";
  }
};