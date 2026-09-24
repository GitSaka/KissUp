// 🤖 Service d'Intelligence Artificiale (Avec système de secours automatique)

export const generateBotResponse = async (
  botName: string, 
  botAge: number, 
  botBio: string, 
  userMessage: string
): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[IA Backend] Clé API GEMINI_API_KEY manquante dans le .env.");
    return "Coucou ! 😊";
  }

  // 🔄 Liste des modèles à tester dans l'ordre (du plus récent au plus stable)
  const modelsToTry = [
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-1.5-pro'
  ];

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

  for (const modelName of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }]
        })
      });

      const json = await response.json() as any;

      if (response.ok) {
        const textResult = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResult) {
          console.log(`🤖 [IA Succès] Modèle utilisé avec succès : ${modelName}`);
          return textResult.trim();
        }
      } else {
        console.warn(`⚠️ Modèle ${modelName} indisponible (Code ${response.status}), tentative avec le suivant...`);
      }
    } catch (err: any) {
      console.warn(`⚠️ Erreur réseau sur ${modelName}, passage au suivant.`);
    }
  }

  // Si vraiment tous les modèles échouent (très rare)
  return "Je suis un peu occupée là, je te revois tout à l'heure ! 😉";
};